/**
 * V26-A · AgentMessage(UI / Plain 自定义)vs LlmMessage(协议三种)
 *
 * 这是 pi-agent-core 的核心抽象 · 解决"UI 字段污染 LLM context"的老问题。
 *
 * 数据流:
 *   AgentMessage[]  ← 持久化层 / UI 渲染层(可含任意自定义字段)
 *        ↓ transformContext()    剪老消息 / 注入 cross-ref / compaction
 *   AgentMessage[]
 *        ↓ convertToLlm()        过滤 UI-only 消息 / 转 LLM 标准三种
 *   LlmMessage[]    ← 喂给 @ai-sdk/* 的标准格式
 *        ↓
 *      LLM
 *
 * 设计原则:
 * - AgentMessage 是 superset · LlmMessage 是 subset
 * - 加字段不破 LLM context · 加自定义 message 类型也不破
 * - convert/transform 是用户提供的 hook · 默认实现内置,但可覆盖
 */

import type { JsonPatchOp, Intent } from "@/lib/agents/types";

// ─────────────────────────────────────────────────────────
// LlmMessage · 只有 LLM 认的三种
// ─────────────────────────────────────────────────────────

export type LlmTextPart = { type: "text"; text: string };

export type LlmImagePart = {
  type: "image";
  /** data URL 或外部 URL */
  url: string;
  mimeType?: string;
};

export type LlmToolCall = {
  type: "tool_call";
  toolCallId: string;
  toolName: string;
  args: unknown;
};

export type LlmContent = LlmTextPart | LlmImagePart | LlmToolCall;

/** 用户消息 · 接收文本 / 图 / 工具结果引用 */
export type LlmUserMessage = {
  role: "user";
  content: string | LlmContent[];
};

/** LLM 回复消息 · 含 text + 可选 tool_call(s) */
export type LlmAssistantMessage = {
  role: "assistant";
  content: string | LlmContent[];
};

/** 工具执行结果 · 喂回 LLM 让它看到结果 */
export type LlmToolResultMessage = {
  role: "tool";
  toolCallId: string;
  /** 文本结果(JSON / markdown / plain text 都行,LLM 自行理解) */
  content: string;
  /** 工具是否失败 · LLM 用来决定要不要 retry */
  isError?: boolean;
};

export type LlmMessage = LlmUserMessage | LlmAssistantMessage | LlmToolResultMessage;

// ─────────────────────────────────────────────────────────
// AgentMessage · superset · UI 渲染 / 持久化用
// ─────────────────────────────────────────────────────────

/**
 * 工具结果 payload · 可以是结构化数据(zod-validated)、文本、文件、或者错误。
 * 比 LlmToolResultMessage.content(string)表达力强。
 */
export type ToolResultPayload =
  | { kind: "structured"; data: unknown }
  | { kind: "text"; text: string }
  | { kind: "doc"; docKind: "deck" | "doc" | "sheet"; source: string; doc?: unknown }
  | { kind: "patch"; ops: JsonPatchOp[]; rationale: string }
  | { kind: "error"; code: string; message: string };

/** 用户消息(同 LLM) · 但保留 createdAt / id 给 UI */
export type AgentUserMessage = {
  type: "user";
  id: string;
  createdAt: number;
  content: string;
  /** 图片附件(Plain V19+ user 可拖文件) */
  attachments?: Array<{ url: string; mimeType?: string; alt?: string }>;
};

/** LLM 回复消息 · 比 LLM 多 thoughts/intent/status/error */
export type AgentAssistantMessage = {
  type: "assistant";
  id: string;
  createdAt: number;
  /** 累积文本(streaming 时部分,完成后全部) */
  content: string;
  /** thinking 字段(Anthropic/Google 的 reasoning 模式) */
  thinking?: string;
  /** 工具调用(本回合 assistant 想调的工具) */
  toolCalls?: LlmToolCall[];
  /** Plain-specific: 推理步骤时序列表 · Log tab 显示 */
  thoughts?: Array<{
    source: "plan" | "slide" | "rationale" | "progress";
    text: string;
    ts: number;
  }>;
  /** Plain-specific: router 分类出的 intent */
  intent?: Intent;
  /** 状态(pending = streaming · ok = done · error = 失败 · undone = 用户撤销) */
  status: "pending" | "ok" | "error" | "undone";
  /** error 时填(LLM 报错 / tool 失败 / schema 拒绝等) */
  errorMessage?: string;
};

/** 工具结果 message(给 UI 显示"已经生成 deck"卡片) */
export type AgentToolResultMessage = {
  type: "tool_result";
  id: string;
  createdAt: number;
  toolCallId: string;
  toolName: string;
  result: ToolResultPayload;
};

/**
 * UI-only · 不进 LLM context · 比如"guided question"chip / "patch preview" 卡片 /
 * "system notice"等。convertToLlm 自动过滤。
 */
export type AgentUiMessage = {
  type: "ui";
  id: string;
  createdAt: number;
  /** UI 专用 kind · surface 自己解读 · 比如 "guided_question" / "patch_preview" */
  uiKind: string;
  /** UI payload · 任意 JSON-serializable 数据 */
  data: unknown;
};

export type AgentMessage =
  | AgentUserMessage
  | AgentAssistantMessage
  | AgentToolResultMessage
  | AgentUiMessage;

// ─────────────────────────────────────────────────────────
// Helpers · 构造空 message · update message · UI 字段操作
// ─────────────────────────────────────────────────────────

let _idCounter = 0;
/** 生成本进程唯一 message id · 协作场景应当用 nanoid 替代 */
export function genMessageId(): string {
  _idCounter += 1;
  return `m_${Date.now()}_${_idCounter}`;
}

/** 创建一个空的 pending assistant message(streaming 起点) */
export function emptyAssistantMessage(): AgentAssistantMessage {
  return {
    type: "assistant",
    id: genMessageId(),
    createdAt: Date.now(),
    content: "",
    status: "pending",
  };
}

/** 创建一个 user message */
export function userMessage(content: string, attachments?: AgentUserMessage["attachments"]): AgentUserMessage {
  return {
    type: "user",
    id: genMessageId(),
    createdAt: Date.now(),
    content,
    attachments,
  };
}

/** 追加 thought 给 assistant message(immutable copy) */
export function withThought(
  msg: AgentAssistantMessage,
  source: "plan" | "slide" | "rationale" | "progress",
  text: string,
): AgentAssistantMessage {
  return {
    ...msg,
    thoughts: [...(msg.thoughts ?? []), { source, text, ts: Date.now() }],
  };
}

/** 累加 delta 文本到 assistant message 的 content(给 message_update 用) */
export function appendDelta(msg: AgentAssistantMessage, delta: string): AgentAssistantMessage {
  return { ...msg, content: msg.content + delta };
}

/** 标记 message 完成 */
export function markDone(msg: AgentAssistantMessage): AgentAssistantMessage {
  return { ...msg, status: "ok" };
}

/** 标记 message 错误 */
export function markError(msg: AgentAssistantMessage, code: string, message: string): AgentAssistantMessage {
  return { ...msg, status: "error", errorMessage: `${code}: ${message}` };
}

// ─────────────────────────────────────────────────────────
// 默认 convertToLlm · UI message 过滤 + assistant.toolCalls 转 LLM content
// ─────────────────────────────────────────────────────────

/**
 * 默认 convertToLlm · 把 AgentMessage[] 转成 LlmMessage[]
 *
 * 规则:
 * - AgentUiMessage 完全丢掉(UI-only · 不给 LLM 看)
 * - AgentUserMessage.attachments → LLM image part
 * - AgentAssistantMessage.thoughts / intent / status / errorMessage 丢掉(UI-only)
 * - AgentAssistantMessage.toolCalls 转成 LLM content 里的 tool_call part
 * - AgentToolResultMessage 转 LlmToolResultMessage · 把 payload 序列化成字符串
 *
 * caller 可以覆盖这个函数实现自定义规则(比如 sheet 工具结果要 truncate 等)。
 */
export function convertToLlm(messages: AgentMessage[]): LlmMessage[] {
  const out: LlmMessage[] = [];
  for (const m of messages) {
    switch (m.type) {
      case "ui":
        continue; // UI-only · drop
      case "user": {
        if (m.attachments && m.attachments.length > 0) {
          const parts: LlmContent[] = [{ type: "text", text: m.content }];
          for (const a of m.attachments) {
            parts.push({ type: "image", url: a.url, mimeType: a.mimeType });
          }
          out.push({ role: "user", content: parts });
        } else {
          out.push({ role: "user", content: m.content });
        }
        break;
      }
      case "assistant": {
        // ⚠ 必须输出 ai-sdk 标准 ModelMessage 格式(generateText 严格校验;
        //   streamText 之前宽松没报)。tool-call part:type "tool-call" + input。
        //
        // ⚠ thinking 必须回传,不能当 UI-only 丢掉:reasoning 类模型
        //   (deepseek thinking / Anthropic extended thinking)要求上一轮的
        //   reasoning 原样回到 history,否则报
        //   "The `reasoning_content` in the thinking mode must be passed back"。
        //   ai-sdk 的标准 part 名是 "reasoning"。
        if (m.toolCalls && m.toolCalls.length > 0) {
          const parts: unknown[] = [];
          if (m.thinking) parts.push({ type: "reasoning", text: m.thinking });
          if (m.content) parts.push({ type: "text", text: m.content });
          for (const tc of m.toolCalls) {
            parts.push({
              type: "tool-call",
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
              input: tc.args,
            });
          }
          out.push({ role: "assistant", content: parts } as unknown as LlmMessage);
        } else if (m.thinking) {
          out.push({
            role: "assistant",
            content: [
              { type: "reasoning", text: m.thinking },
              ...(m.content ? [{ type: "text", text: m.content }] : []),
            ],
          } as unknown as LlmMessage);
        } else {
          out.push({ role: "assistant", content: m.content });
        }
        break;
      }
      case "tool_result":
        // ai-sdk 标准:tool message 的 content 是 tool-result part 数组
        out.push({
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: m.toolCallId,
              toolName: m.toolName ?? "tool",
              output: { type: "text", value: serializeToolResult(m.result) },
            },
          ],
        } as unknown as LlmMessage);
        break;
    }
  }
  return out;
}

function serializeToolResult(r: ToolResultPayload): string {
  switch (r.kind) {
    case "text":
      return r.text;
    case "structured":
      return JSON.stringify(r.data, null, 2);
    case "doc":
      return `[${r.docKind} generated · ${r.source.length} chars]\n\n${r.source.slice(0, 4000)}${r.source.length > 4000 ? "\n... (truncated)" : ""}`;
    case "patch":
      return `[patch applied · ${r.ops.length} ops]\n${r.rationale}`;
    case "error":
      return `[error ${r.code}] ${r.message}`;
  }
}
