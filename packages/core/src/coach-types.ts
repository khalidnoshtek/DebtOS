export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  role: ChatRole;
  content: string;
  actions?: ActionRecord[];
};

export type ActionRecord = {
  kind: "add_emi" | "add_card" | "add_bill" | "update_profile" | "error";
  summary: string;
  detail?: string;
  args?: Record<string, unknown>;
};

export type EngineStatus =
  | { state: "uninitialized" }
  | { state: "checking" }
  | { state: "downloading"; progress: number; text: string }
  | { state: "ready"; modelId: string }
  | { state: "error"; message: string };

// Lightweight attachment metadata for chat history (no extracted text — only
// the chip needs to render after a reload).
export type AttachmentChip = {
  filename: string;
  kind: "text" | "csv" | "xlsx" | "pdf" | "image" | "code";
  bytes: number;
};

// A row in the coach chat — either a chat message or an attachment chip row.
export type CoachRow =
  | { kind: "message"; message: ChatMessage }
  | { kind: "attachments"; items: AttachmentChip[] };
