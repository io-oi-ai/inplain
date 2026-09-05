/**
 * V26-A · AgentEvent · 跟随 pi-agent-core 的事件协议
 *
 * 10 种事件覆盖 agent 生命周期所有节点。所有 surface(web SSE / cli stdout /
 * desktop in-process / mcp wrap)都吃这一份事件流。
 *
 * 设计原则:
 * - 事件只描述"发生了什么",不携带 UI 渲染逻辑(那是 surface 层的事)
 * - delta 事件累积起来 = 最终 message(增量,不是替换)
 * - tool_execution_* 三件套独立成 phase,不挤进 message_*
 * - 失败用 error 字段表达,不抛 Exception(让 subscribe 链路稳定)
 *
 * 借鉴来源:https://github.com/earendil-works/pi(packages/agent README)
 */

import type { AgentMessage, ToolResultPayload } from "./message";
import type { JsonPatchOp, Intent } from "@/lib/agents/types";

/** prompt() 入口事件:agent 开始处理一次用户请求 */
export type EvAgentStart = {
  type: "agent_start";
  /** 用户输入(原始 prompt 文本,未做 transform) */
  prompt: string;
  /** 当前文档 id(如果有上下文) */
  docId?: string;
};

/** 一次 LLM 回合开始(可能因 tool calling 触发多回合) */
export type EvTurnStart = {
  type: "turn_start";
  /** 第几个 turn,从 1 开始(同一次 prompt 内累计) */
  turnIndex: number;
};

/** 单条 message 开始(user / assistant / toolResult / 自定义) */
export type EvMessageStart = {
  type: "message_start";
  message: AgentMessage;
};

/** message 增量更新(LLM streaming token / tool partial result) */
export type EvMessageUpdate = {
  type: "message_update";
  /** 当前 message 完整快照(包含累积 delta) */
  message: AgentMessage;
  /** 本次增量(给 UI 做 typing effect 用) */
  delta?: {
    kind: "text" | "thinking" | "tool_call_args";
    text: string;
  };
};

/** message 完成 */
export type EvMessageEnd = {
  type: "message_end";
  message: AgentMessage;
};

/** 工具调用开始 */
export type EvToolExecutionStart = {
  type: "tool_execution_start";
  toolCallId: string;
  toolName: string;
  args: unknown;
};

/** 工具执行中产出局部进度(给 UI 显示"正在生成第 3 页"等) */
export type EvToolExecutionUpdate = {
  type: "tool_execution_update";
  toolCallId: string;
  toolName: string;
  /** 局部结果(streamObject 中间状态 / rule_hit / progress 等) */
  partial: unknown;
  /** 进度提示(给 UI 用) */
  hint?: string;
};

/** 工具调用完成 · result 是完整产物 */
export type EvToolExecutionEnd = {
  type: "tool_execution_end";
  toolCallId: string;
  toolName: string;
  result: ToolResultPayload;
};

/** 一个 turn 完成(可能还会接下一个 turn) */
export type EvTurnEnd = {
  type: "turn_end";
  turnIndex: number;
  /** 这一回合产生的所有 toolResult(按 assistant 源序排列) */
  toolResults: Array<{ toolCallId: string; toolName: string; result: ToolResultPayload }>;
};

/** 整次 prompt() 完成(所有 turn 跑完) */
export type EvAgentEnd = {
  type: "agent_end";
  /** 这次 prompt 期间所有 message 的完整列表(append 后的全部内容) */
  messages: AgentMessage[];
};

/**
 * 失败事件 · pi 把 error 当 agent_end 的 error 字段;我们保留独立 type 让
 * subscribe 端能精确 switch,更符合现状 streamAgent 的 emit 习惯。
 */
export type EvError = {
  type: "error";
  /** 机器可读 error code · 跟 src/lib/agents/errors.ts 对齐 */
  code: string;
  /** 人可读 message */
  message: string;
  /** 出错时已 emit 的 message(让 UI 能展示部分内容) */
  partialMessages?: AgentMessage[];
};

// ─────────────────────────────────────────────────────────
// Plain 特定扩展事件 · 不在 pi 标准里,但 Plain 流程需要
// ─────────────────────────────────────────────────────────

/** route 阶段产出 intent(在 prompt 进 tool 之前先分类) */
export type EvIntent = {
  type: "intent";
  intent: Intent;
};

/**
 * agent reasoning trace · LLM 中间思考步骤(plan/slide/rationale/progress)
 * Plain 现有 ChatTurn.thoughts 字段的供应源,Log tab 直接显示。
 */
export type EvReasoning = {
  type: "reasoning";
  source: "plan" | "slide" | "rationale" | "progress";
  text: string;
};

/**
 * patch · Plain 双轨架构的核心 · LLM 不重写整个文档时输出 RFC 6902 ops
 * 客户端 apply 后再渲染。
 */
export type EvPatch = {
  type: "patch";
  ops: JsonPatchOp[];
  rationale: string;
  /** 哪个文档(若 agent 同时改多文档) */
  docId?: string;
};

/**
 * doc 完成 · 文档级最终产物(generate 路径)
 * Plain 用它来更新 useWorkspace · 取代旧"final markdown source"
 */
export type EvDoc = {
  type: "doc";
  kind: "deck" | "doc" | "sheet";
  /** 源文本(serialized Plain DSL v2/v3) */
  source: string;
  /** 可选 · 结构化 doc(避免 caller 再 parse 一遍) */
  doc?: unknown;
};

/**
 * rule_hit · V26-D 的核心 · streaming rule 命中时 emit
 * surface 用来给用户提示"我刚被规则拦了,重写中"
 */
export type EvRuleHit = {
  type: "rule_hit";
  ruleCode: string;
  /** rule 命中位置上下文 */
  snippet: string;
  /** 系统注入的提醒文本 */
  reminderInjected: string;
};

/** 所有事件的判别联合 · agent.subscribe 接收的就是这个 */
export type AgentEvent =
  | EvAgentStart
  | EvTurnStart
  | EvMessageStart
  | EvMessageUpdate
  | EvMessageEnd
  | EvToolExecutionStart
  | EvToolExecutionUpdate
  | EvToolExecutionEnd
  | EvTurnEnd
  | EvAgentEnd
  | EvError
  | EvIntent
  | EvReasoning
  | EvPatch
  | EvDoc
  | EvRuleHit;

/** subscribe 回调签名 · 任何 surface 都接它 */
export type AgentEventListener = (event: AgentEvent) => void;

/**
 * 标记一个事件是否会被 LLM 看到(serialize 进下一轮 context)。
 * - UI-only 事件(reasoning / rule_hit / patch 等)不进 LLM context · 留在 UI 层
 * - message_* 是真消息 · 进 context
 *
 * 这跟 convert-to-llm 的过滤逻辑一致 · 作为 single source of truth。
 */
export function isLlmVisibleEvent(e: AgentEvent): boolean {
  switch (e.type) {
    case "message_start":
    case "message_update":
    case "message_end":
    case "tool_execution_end":
      return true;
    default:
      return false;
  }
}
