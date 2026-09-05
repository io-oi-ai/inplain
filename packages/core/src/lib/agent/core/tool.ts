/**
 * V26-A.3 · Tool 抽象 · 跟 pi-agent-core 的 ToolDefinition 同语义
 *
 * 一个 Tool 描述:LLM 想做某件事时(generate-deck / edit-sheet 等),
 * Agent 通过 Tool 协议执行,返回结构化结果 emit 回 LLM。
 *
 * Plain 当前的 generator/editor 都是 Tool:
 *   - input · zod schema(LLM 给的参数)
 *   - output · zod schema(给 LLM 看的结果) · 或 stream output(streaming generate 用)
 *   - execute · 真正跑的函数 · 接收 input + AgentContext 拿 emit hook
 *
 * 设计原则:
 * - Tool 是 stateless · 任何 state 通过 AgentContext 传入
 * - execute 内部可以 emit 中间事件(reasoning / progress / patch)
 * - 失败用 ToolResultPayload.kind="error" 表达 · 不抛(让 Agent loop 稳定)
 */

import type { z } from "zod";
import type { AgentEvent } from "./events";
import type { ToolResultPayload } from "./message";

/**
 * 工具执行上下文 · 跨 turn 传递的 hook 集合
 * tool 内部用这些 hook 把中间状态报给 Agent · Agent 再 emit 给 listener
 */
export type ToolContext = {
  /** 本次 tool call 的唯一 id(让 emit 事件能 correlate 回 tool_execution_start) */
  toolCallId: string;
  /** 推 reasoning trace · LLM 中间思考步骤(plan/slide/rationale/progress) */
  emitReasoning: (source: "plan" | "slide" | "rationale" | "progress", text: string) => void;
  /** 推 patch · RFC 6902 JSON Patch · edit-* 工具用 */
  emitPatch: (ops: unknown[], rationale: string, docId?: string) => void;
  /** 推 partial · streaming generate 时 LLM 增量结果 · UI 显示进度 */
  emitPartial: (partial: unknown, hint?: string) => void;
  /** 推任意自定义事件(给 V26-D rule_hit 等用) */
  emit: (event: AgentEvent) => void;
  /** 取消 signal · tool 内部应该尊重 */
  signal?: AbortSignal;
  /**
   * V27-B · 从 server 拿 current source(给 edit-* tool 用)
   * - web 工作台 caller 配了 sourceResolver · 返回真实 source
   * - CLI / desktop / MCP 没配 · 返回 null · tool 应该 fallback 到 args.currentSource
   */
  getSource?: (docId: string) => Promise<string | null>;
  /**
   * 计费 · tool 内部 LLM 调用(generate/edit 的 streamObject)拿到 usage 后调,
   * 上报给 Agent 累加。不提供 / 不计费场景下 tool 应安全跳过(可选链)。
   */
  reportUsage?: (u: { inputTokens: number; outputTokens: number }) => void;
};

/**
 * Tool 定义 · 一个 Plain agent 工具
 *
 * Generic 参数:
 * - I · input zod schema 的 infer type
 * - O · output 的 type · 由 ToolResultPayload.kind 决定 · 不用 zod 约束
 *       (caller execute 自己保证返回 valid ToolResultPayload)
 */
export type Tool<I = unknown> = {
  /** 工具名 · LLM 看到的名字 · 全局唯一(snake_case 习惯) */
  name: string;
  /** 工具描述 · LLM 用它决定何时调 · 用 markdown / 1-2 段足够 */
  description: string;
  /** input zod schema · Agent 把 LLM 返回的 args 用它校验 */
  input: z.ZodType<I>;
  /** 执行函数 · 返回 ToolResultPayload(成功 / 失败) */
  execute: (args: I, ctx: ToolContext) => Promise<ToolResultPayload>;
  /** 是否 streaming(execute 内部会多次 emitPartial) · 默认 false */
  streaming?: boolean;
};

/** Tool 注册表 · Agent 构造时传入
 *  注:用 Tool<any> 让 Plain 6 个 Tool<具体 input zod infer type> 能 assign 进来。
 *  Agent runtime 内部用 input zod 校验 · 不依赖 generic 安全。 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToolRegistry = ReadonlyArray<Tool<any>>;

/**
 * 用 typeof helper 让 Tool 定义时不用显式写 `Tool<MyInput>`,
 * 调用 `defineTool({ ... })` TypeScript 自动 infer。
 */
export function defineTool<I>(t: {
  name: string;
  description: string;
  input: z.ZodType<I>;
  execute: (args: I, ctx: ToolContext) => Promise<ToolResultPayload>;
  streaming?: boolean;
}): Tool<I> {
  return t;
}
