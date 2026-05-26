"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Send,
  Sparkles,
  AlertCircle,
  Download,
  Loader2,
  User as UserIcon,
  XCircle,
  Paperclip,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Code as CodeIcon,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DEFAULT_MODEL,
  getEngine,
  getStatus,
  hasWebGPU,
  isModelCached,
  subscribeStatus,
} from "@/lib/coach/engine";
import { streamChat } from "@/lib/coach/chat";
import { sanitizeStreamingText } from "@/lib/coach/actions";
import {
  attachmentsToPrompt,
  extractFile,
  type ExtractedFile,
} from "@/lib/coach/file-extract";
import { parseAndAddEmisFromText } from "@/lib/coach/table-parser";
import type { ActionRecord, ChatMessage, EngineStatus } from "@/lib/coach/types";
import { WorkingPill, ThinkingPill } from "@/components/coach/working-pill";
import { ActionPill } from "@/components/coach/action-pill";

const SUGGESTED_PROMPTS = [
  "I have a home loan with HDFC, 35 lakhs at 8.6% for 20 years, started 3 years ago",
  "Add rent of 35k due on the 5th",
  "My salary is 1.2L per month",
  "Which EMI should I close first to save the most interest?",
];

type ChatRow =
  | { kind: "message"; message: ChatMessage }
  | { kind: "attachments"; items: ExtractedFile[] };

type StagedFile =
  | { id: string; status: "extracting"; file: File; progress: string }
  | { id: string; status: "ready"; data: ExtractedFile }
  | { id: string; status: "error"; file: File; error: string };

function newStagedId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function CoachPage() {
  const [mounted, setMounted] = useState(false);
  const [hasGPU, setHasGPU] = useState<boolean | null>(null);
  const [cached, setCached] = useState<boolean | null>(null);
  const [status, setStatus] = useState<EngineStatus>(getStatus());
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [input, setInput] = useState("");
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingWorking, setStreamingWorking] = useState(false);
  const [streamingRawWindow, setStreamingRawWindow] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    const gpu = hasWebGPU();
    setHasGPU(gpu);
    isModelCached().then((isCached) => {
      setCached(isCached);
      if (isCached && gpu) getEngine().catch(() => {});
    });
    const unsub = subscribeStatus(setStatus);
    return () => {
      unsub();
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [rows, streamingText, streamingWorking]);

  const ready = status.state === "ready";
  const downloading = status.state === "downloading" || status.state === "checking";

  const startEngine = async () => {
    try {
      await getEngine();
    } catch { /* error shown via status */ }
  };

  const onFilesSelected = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const items = Array.from(files).map<StagedFile>((f) => ({
      id: newStagedId(),
      status: "extracting",
      file: f,
      progress: "Reading…",
    }));
    setStaged((prev) => [...prev, ...items]);
    for (const item of items) {
      if (item.status !== "extracting") continue;
      try {
        const data = await extractFile(item.file, (msg) => {
          setStaged((prev) =>
            prev.map((s) =>
              s.id === item.id && s.status === "extracting"
                ? { ...s, progress: msg }
                : s,
            ),
          );
        });
        setStaged((prev) =>
          prev.map((s) => (s.id === item.id ? { id: s.id, status: "ready", data } : s)),
        );
      } catch (err) {
        setStaged((prev) =>
          prev.map((s) =>
            s.id === item.id
              ? {
                  id: s.id,
                  status: "error",
                  file: item.file,
                  error: err instanceof Error ? err.message : String(err),
                }
              : s,
          ),
        );
      }
    }
  }, []);

  const removeStaged = (id: string) =>
    setStaged((prev) => prev.filter((s) => s.id !== id));

  const handleSubmit = async (eOrText: FormEvent | string) => {
    const inputText = typeof eOrText === "string" ? eOrText : input.trim();
    if (typeof eOrText !== "string") {
      (eOrText as FormEvent).preventDefault();
    }

    const readyAttachments = staged
      .filter((s): s is Extract<StagedFile, { status: "ready" }> => s.status === "ready")
      .map((s) => s.data);

    if (!inputText && readyAttachments.length === 0) return;
    if (streaming) return;

    if (!ready) {
      await startEngine();
      if (getStatus().state !== "ready") return;
    }

    const attachmentText = attachmentsToPrompt(readyAttachments);
    const fullInput = attachmentText + (inputText || "");
    const userMessage: ChatMessage = {
      role: "user",
      content: fullInput || "(attached files)",
    };

    const newRows: ChatRow[] = [...rows];
    if (readyAttachments.length) newRows.push({ kind: "attachments", items: readyAttachments });
    newRows.push({ kind: "message", message: userMessage });
    setInput("");
    setStaged([]);

    // -----------------------------------------------------------------
    // Step 1: deterministic table parsing (fast, reliable, no LLM).
    // Catches markdown tables and CSV-from-Excel. Adds EMIs directly.
    // -----------------------------------------------------------------
    const tableResult = parseAndAddEmisFromText(fullInput);
    if (tableResult.parsed.length > 0) {
      const summaryLines: string[] = [];
      summaryLines.push(
        `Parsed ${tableResult.parsed.length} EMI${tableResult.parsed.length === 1 ? "" : "s"} from the table.`,
      );
      if (tableResult.rowsSkipped > 0) {
        summaryLines.push(
          `${tableResult.rowsSkipped} row${tableResult.rowsSkipped === 1 ? "" : "s"} skipped (incomplete data).`,
        );
      }
      newRows.push({
        kind: "message",
        message: {
          role: "assistant",
          content: summaryLines.join(" "),
          actions: tableResult.parsed,
        },
      });
    }

    setRows(newRows);

    // -----------------------------------------------------------------
    // Step 2: if the user typed a question alongside the table (or had
    // no parseable table at all), send the remaining query to the LLM
    // so it can give advice grounded in the now-current state.
    // -----------------------------------------------------------------
    const llmQuery = (tableResult.parsed.length > 0 ? tableResult.remainingText : fullInput).trim();
    const shouldCallLlm =
      tableResult.parsed.length === 0
        ? fullInput.length > 0
        : llmQuery.length >= 8;
    if (!shouldCallLlm) return;

    setStreaming(true);
    setStreamingText("");
    setStreamingWorking(false);
    setStreamingRawWindow("");

    const parsedSomething = tableResult.parsed.length > 0;
    const finalLlmContent = parsedSomething
      ? `${tableResult.parsed.length} entries have already been added to the system. Answer the user's question in plain prose only — do NOT emit any <action> blocks or JSON; just talk normally.\n\nUser: ${llmQuery || "Advise on what was just added."}`
      : llmQuery;

    const llmHistory: ChatMessage[] = [
      ...newRows
        .filter((r): r is { kind: "message"; message: ChatMessage } => r.kind === "message")
        .slice(0, -1)
        .map((r) => r.message),
      { role: "user" as const, content: finalLlmContent },
    ];

    const controller = new AbortController();
    abortRef.current = controller;

    let liveText = "";
    const result = await streamChat(
      llmHistory,
      {
        onToken: (d) => {
          liveText += d;
          const { text, working } = sanitizeStreamingText(liveText);
          setStreamingText(text);
          setStreamingWorking(working);
          if (working) setStreamingRawWindow(liveText.slice(-400));
        },
        onActions: () => {},
      },
      controller.signal,
    );

    setStreamingText("");
    setStreamingWorking(false);
    setStreamingRawWindow("");
    setStreaming(false);

    const finalMessage: ChatMessage = result.error
      ? { role: "assistant", content: `⚠️ ${result.error}` }
      : {
          role: "assistant",
          content: result.assistantText || "(no answer — try rephrasing)",
          actions: result.actions,
        };

    setRows((prev) => [...prev, { kind: "message", message: finalMessage }]);
  };

  // Image paste: when the user pastes a screenshot, treat it as a file upload.
  useEffect(() => {
    if (!mounted) return;
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;
      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.kind === "file" && it.type.startsWith("image/")) {
          const f = it.getAsFile();
          if (f) imageFiles.push(f);
        }
      }
      if (imageFiles.length === 0) return;
      e.preventDefault();
      const dt = new DataTransfer();
      imageFiles.forEach((f) => dt.items.add(f));
      onFilesSelected(dt.files);
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  // onFilesSelected closes over staged.length; safe to leave out since it only
  // affects the index of the NEW chip and we never reorder. Re-attaching every
  // render would also work but adds noise.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  if (!mounted) return null;

  if (hasGPU === false) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="DebtOS Coach" />
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 p-6">
            <AlertCircle className="mt-0.5 h-5 w-5 text-amber-300" />
            <div>
              <div className="font-medium text-white">WebGPU is required</div>
              <p className="mt-1 text-sm text-white/70">
                Coach runs a small AI model entirely in your browser using WebGPU. Your browser does not support it. Try Chrome, Edge, or recent Safari on a desktop or laptop.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ready && rows.length === 0 && cached === false) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title="DebtOS Coach"
          description="A private AI assistant that runs entirely in your browser. Helps you optimize debt and add EMIs, bills, and cards from plain text or files."
        />

        <Card>
          <CardHeader>
            <CardTitle>How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-white/70">
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>100% local — model downloads once (~1.6 GB), then runs offline. Nothing leaves your device.</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>Free forever — no API key, no account, no usage limits.</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>Drop in Excel, PDFs, images, or just type. Coach parses entries and adds them.</span>
              </li>
            </ul>

            {downloading ? (
              <DownloadProgress status={status} />
            ) : status.state === "error" ? (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-sm text-rose-200">
                {status.message}
              </div>
            ) : (
              <div className="pt-2">
                <Button onClick={startEngine}>
                  <Download className="h-4 w-4" />
                  Download model (Llama-3.2-3B, ~1.6 GB)
                </Button>
                <p className="mt-2 text-xs text-white/40">
                  First time only. After that the page loads straight into chat.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-100px)] max-w-3xl flex-col">
      <PageHeader
        title="DebtOS Coach"
        description={ready ? `Running locally · ${DEFAULT_MODEL}` : "Loading model…"}
        action={
          rows.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setRows([])}>
              <XCircle className="h-3.5 w-3.5" />
              Clear
            </Button>
          )
        }
      />

      {downloading && <DownloadProgress status={status} />}

      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {rows.length === 0 && ready && (
          <div className="space-y-2 py-8 text-center">
            <Bot className="mx-auto h-8 w-8 text-white/30" />
            <p className="text-sm text-white/50">Ask anything, paste a table, or attach a file.</p>
            <div className="mx-auto mt-4 grid max-w-xl grid-cols-1 gap-2">
              {SUGGESTED_PROMPTS.slice(0, 3).map((p) => (
                <button
                  key={p}
                  onClick={() => handleSubmit(p)}
                  className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5 text-left text-xs text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {rows.map((row, i) =>
            row.kind === "message" ? (
              <Bubble key={i} message={row.message} />
            ) : (
              <AttachmentsRow key={i} items={row.items} />
            ),
          )}
        </AnimatePresence>

        {streaming && (
          <StreamingBubble
            text={streamingText}
            working={streamingWorking}
            workingDetail={streamingRawWindow}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="sticky bottom-0 bg-zinc-950/40 pt-2 backdrop-blur-xl">
        {staged.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {staged.map((s) => (
              <StagedChip key={s.id} staged={s} onRemove={() => removeStaged(s.id)} />
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!ready || streaming}
            className="grid h-9 w-9 place-items-center rounded-lg text-white/50 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30"
            title="Attach file (xlsx, pdf, image, csv, code, text)"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.json,.js,.ts,.tsx,.py,.html,.css"
            onChange={(e) => {
              onFilesSelected(e.target.files);
              e.target.value = "";
            }}
          />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as FormEvent);
              }
            }}
            placeholder={ready ? "Type, paste, or attach a file…" : "Loading model…"}
            disabled={!ready || streaming}
            rows={1}
            className="flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none"
            style={{ maxHeight: "120px" }}
          />
          <Button type="submit" size="icon" disabled={!ready || streaming || (!input.trim() && staged.every((s) => s.status !== "ready"))}>
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500">
          <Bot className="h-3.5 w-3.5 text-white" />
        </div>
      )}
      <div className="max-w-[80%] space-y-2">
        <div
          className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser ? "bg-white text-black" : "bg-white/[0.04] text-white/90 border border-white/8"
          }`}
        >
          {isUser ? truncateUserDisplay(message.content) : message.content}
        </div>
        {message.actions && message.actions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.actions.map((a, i) => (
              <ActionPill key={i} action={a} />
            ))}
          </div>
        )}
      </div>
      {isUser && (
        <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10">
          <UserIcon className="h-3.5 w-3.5 text-white/70" />
        </div>
      )}
    </motion.div>
  );
}

function StreamingBubble({
  text,
  working,
  workingDetail,
}: {
  text: string;
  working: boolean;
  workingDetail: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
      <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500">
        <Bot className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="max-w-[80%] space-y-2">
        {text ? (
          <div className="whitespace-pre-wrap rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-2.5 text-sm leading-relaxed text-white/90">
            {text}
            <span className="ml-1 inline-block h-3 w-1.5 animate-pulse bg-current/40" />
          </div>
        ) : !working ? (
          <ThinkingPill />
        ) : null}
        {working && (
          <div>
            <WorkingPill label="Updating your finances" detail={workingDetail} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AttachmentsRow({ items }: { items: ExtractedFile[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end gap-2">
      <div className="flex max-w-[80%] flex-wrap justify-end gap-1.5">
        {items.map((it, i) => (
          <FileChip key={i} kind={it.kind} name={it.filename} bytes={it.bytes} />
        ))}
      </div>
    </motion.div>
  );
}

function FileChip({ kind, name, bytes }: { kind: ExtractedFile["kind"]; name: string; bytes: number }) {
  const Icon =
    kind === "xlsx" ? FileSpreadsheet
    : kind === "pdf" ? FileText
    : kind === "image" ? ImageIcon
    : kind === "code" ? CodeIcon
    : FileText;
  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-white/80">
      <Icon className="h-3.5 w-3.5 text-white/50" />
      <span className="max-w-[12rem] truncate">{name}</span>
      <span className="text-white/30">{(bytes / 1024).toFixed(1)}kb</span>
    </div>
  );
}

function StagedChip({ staged, onRemove }: { staged: StagedFile; onRemove: () => void }) {
  if (staged.status === "extracting") {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-white/60">
        <Loader2 className="h-3 w-3 animate-spin text-indigo-300" />
        <span className="max-w-[10rem] truncate">{staged.file.name}</span>
        <span className="text-white/30">{staged.progress}</span>
      </div>
    );
  }
  if (staged.status === "error") {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-200">
        <AlertCircle className="h-3 w-3" />
        <span className="max-w-[10rem] truncate">{staged.file.name}</span>
        <button onClick={onRemove} className="ml-1 opacity-60 hover:opacity-100">
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }
  const kind = staged.data.kind;
  const Icon =
    kind === "xlsx" ? FileSpreadsheet
    : kind === "pdf" ? FileText
    : kind === "image" ? ImageIcon
    : kind === "code" ? CodeIcon
    : FileText;
  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-100">
      <Icon className="h-3.5 w-3.5" />
      <span className="max-w-[10rem] truncate">{staged.data.filename}</span>
      <span className="text-emerald-300/60">{(staged.data.text.length / 1024).toFixed(1)}k chars</span>
      <button onClick={onRemove} className="ml-1 opacity-60 hover:opacity-100">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function DownloadProgress({ status }: { status: EngineStatus }) {
  if (status.state !== "downloading" && status.state !== "checking") return null;
  const pct = status.state === "downloading" ? Math.round(status.progress * 100) : 0;
  const text = status.state === "downloading" ? status.text : "Initializing…";
  return (
    <div className="my-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 text-sm text-white/80">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{text}</span>
        <span className="ml-auto tabular text-white/60">{pct}%</span>
      </div>
      <Progress value={pct} className="mt-2" barClassName="bg-gradient-to-r from-indigo-400 to-fuchsia-400" />
    </div>
  );
}

// Hide attachment prose from the visible user bubble (it's already shown as chips above).
function truncateUserDisplay(content: string): string {
  const cut = content.indexOf("\n\n");
  if (content.startsWith("--- Attachment:") && cut > 0) {
    // Strip the attachment dump, show just the user's actual question (after blank line).
    const afterDump = content.lastIndexOf("\n\n");
    return content.slice(afterDump).trim() || "(attachments)";
  }
  return content;
}

