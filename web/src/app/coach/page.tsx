"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Send,
  Sparkles,
  AlertCircle,
  Download,
  CheckCircle2,
  Loader2,
  User as UserIcon,
  XCircle,
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
import { extractActions } from "@/lib/coach/actions";
import type {
  ActionRecord,
  ChatMessage,
  EngineStatus,
} from "@/lib/coach/types";

const SUGGESTED_PROMPTS = [
  "I have a home loan with HDFC, 35 lakhs at 8.6% for 20 years, started 3 years ago",
  "Add rent of 35k due on the 5th",
  "My salary is 1.2L per month",
  "Which EMI should I close first to save the most interest?",
  "What if I get a 2 lakh bonus, where should it go?",
];

export default function CoachPage() {
  const [mounted, setMounted] = useState(false);
  const [hasGPU, setHasGPU] = useState<boolean | null>(null);
  const [cached, setCached] = useState<boolean | null>(null);
  const [status, setStatus] = useState<EngineStatus>(getStatus());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [pendingActions, setPendingActions] = useState<ActionRecord[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const gpu = hasWebGPU();
    setHasGPU(gpu);
    isModelCached().then((isCached) => {
      setCached(isCached);
      // If the model is already cached, auto-load it from IndexedDB so the
      // user lands directly in the chat without clicking a button.
      if (isCached && gpu) {
        getEngine().catch(() => {});
      }
    });
    const unsub = subscribeStatus(setStatus);
    return () => {
      unsub();
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamingText]);

  const ready = status.state === "ready";
  const downloading = status.state === "downloading" || status.state === "checking";

  const startEngine = async () => {
    try {
      await getEngine();
    } catch {
      // status will reflect error
    }
  };

  const handleSubmit = async (eOrText: FormEvent | string) => {
    const text = typeof eOrText === "string" ? eOrText : input.trim();
    if (typeof eOrText !== "string") {
      (eOrText as FormEvent).preventDefault();
    }
    if (!text || streaming) return;

    if (!ready) {
      await startEngine();
      if (getStatus().state !== "ready") return;
    }

    const userMessage: ChatMessage = { role: "user", content: text };
    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput("");
    setStreaming(true);
    setStreamingText("");
    setPendingActions([]);

    const controller = new AbortController();
    abortRef.current = controller;

    let liveText = "";
    const result = await streamChat(
      newHistory,
      {
        onToken: (d) => {
          liveText += d;
          setStreamingText(stripActionTags(liveText));
        },
        onActions: (acts) => setPendingActions(acts),
      },
      controller.signal,
    );

    setStreamingText("");
    setStreaming(false);

    const finalMessage: ChatMessage = result.error
      ? { role: "assistant", content: `⚠️ ${result.error}` }
      : {
          role: "assistant",
          content: result.assistantText || "(empty response — try rephrasing)",
          actions: result.actions,
        };

    setMessages((prev) => [...prev, finalMessage]);
  };

  if (!mounted) return null;

  // WebGPU not available
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

  // First-time pre-load screen — only when the model is NOT in the cache.
  // If `cached` is null we're still checking; if true, we're auto-loading
  // and the chat UI handles the brief loading state inline.
  if (!ready && messages.length === 0 && cached === false) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title="DebtOS Coach"
          description="A private AI assistant that runs entirely in your browser. Helps you optimize debt and add EMIs, bills, and cards from plain text."
        />

        <Card>
          <CardHeader>
            <CardTitle>How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-white/70">
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>100% local — model weights download once (~1.6 GB) then run offline. Nothing leaves your device.</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>Free forever — no API key, no account, no usage limits.</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>Chat naturally: <em>&ldquo;Add my HDFC home loan, 35L at 8.6% for 20 years&rdquo;</em> — Coach extracts the fields and adds the entry.</span>
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
                  {cached ? "Load model" : `Download model (Llama-3.2-3B, ~1.6 GB)`}
                </Button>
                <p className="mt-2 text-xs text-white/40">
                  First time only. After that it loads instantly on every visit.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>What you can ask</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {SUGGESTED_PROMPTS.map((p) => (
                <div
                  key={p}
                  className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs text-white/70"
                >
                  &ldquo;{p}&rdquo;
                </div>
              ))}
            </div>
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
          messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setMessages([])}>
              <XCircle className="h-3.5 w-3.5" />
              Clear
            </Button>
          )
        }
      />

      {downloading && <DownloadProgress status={status} />}

      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {messages.length === 0 && ready && (
          <div className="space-y-2 py-8 text-center">
            <Bot className="mx-auto h-8 w-8 text-white/30" />
            <p className="text-sm text-white/50">Ask anything about your finances, or describe something to add.</p>
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
          {messages.map((m, i) => (
            <Bubble key={i} message={m} />
          ))}
        </AnimatePresence>

        {streaming && (
          <Bubble
            message={{
              role: "assistant",
              content: streamingText || "…",
            }}
            streaming
          />
        )}

        {pendingActions.length > 0 && streaming && (
          <div className="space-y-1">
            {pendingActions.map((a, i) => (
              <ActionPill key={i} action={a} />
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="sticky bottom-0 bg-zinc-950/40 pt-2 backdrop-blur-xl">
        <div className="flex gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={ready ? "Ask anything, or describe a new EMI / bill / card…" : "Loading model…"}
            disabled={!ready || streaming}
            className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
          <Button type="submit" size="icon" disabled={!ready || streaming || !input.trim()}>
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Bubble({ message, streaming }: { message: ChatMessage; streaming?: boolean }) {
  const isUser = message.role === "user";
  const text = isUser ? message.content : stripActionTags(message.content);
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
      <div className={`max-w-[80%] space-y-2`}>
        <div
          className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "bg-white text-black"
              : "bg-white/[0.04] text-white/90 border border-white/8"
          }`}
        >
          {text}
          {streaming && <span className="ml-1 inline-block h-3 w-1.5 animate-pulse bg-current/50" />}
        </div>
        {message.actions && message.actions.length > 0 && (
          <div className="space-y-1">
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

function ActionPill({ action }: { action: ActionRecord }) {
  const isError = action.kind === "error";
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] ${
        isError
          ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      }`}
    >
      {isError ? <AlertCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
      <span>{action.summary}</span>
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

function stripActionTags(text: string) {
  const { cleanedText } = extractActions(text);
  return cleanedText;
}
