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
