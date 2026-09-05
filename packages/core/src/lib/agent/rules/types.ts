/**
 * V26-D · Streaming rule 类型 · 借 oh-my-pi time-traveling stream rules
 *
 * 一条 Rule = 在 LLM token stream 上实时跑的检测器。
 * 命中时可以:
 * 1. 立即 emit rule_hit 事件给 UI("我刚被规则拦了 · 重写中")
 * 2. 中断当前 stream(让 LLM 不继续烧 token)
 * 3. 在下一 prompt 注入 system reminder(用 <system-reminder> 标签)
 * 4. 同点 retry(LLM 看到 reminder 重写)
 *
 * 比传统 lint 优势:
 * - 错误 50 token 时已经被拦 · 不是 1000 token 后再 retry
 * - reminder 跨 turn 保留(下一次 user prompt 时 LLM 仍记得不要那么写)
 * - 不烧 prompt token(只有命中才注入 · 没命中规则成本 = 0)
 */

import type { AgentEvent } from "../core/events";

/** Rule 命中时的动作 */
export type RuleAction =
  /** 仅 emit · 不中断 · 不注入 reminder · 适合"提示但不强制" */
  | { kind: "warn"; reminder?: string }
  /** 中断当前 stream · 注入 reminder · 下一 turn LLM 看到后重写 */
  | { kind: "abort_and_retry"; reminder: string }
  /** 跨整个 session 注入 reminder(每个 turn 都有)· 适合"全 session 强约束" */
  | { kind: "session_remind"; reminder: string };

/** 一条 Streaming Rule */
export type StreamingRule = {
  /** 唯一 code · 跟现有 SlopCode 体系对齐 */
  code: string;
  /** 人类可读说明 */
  description: string;
  /** 匹配模式 · 在累积的 token buffer 上跑 */
  match: (buffer: string) => RuleMatch | null;
  /** 命中后的动作 */
  action: RuleAction;
  /** 该规则在本 session 命中过多少次(防 reminder 反复注入引起死循环) */
  maxHits?: number;
};

export type RuleMatch = {
  /** 命中 substring */
  matched: string;
  /** 命中起始 index(在 buffer 中) */
  index: number;
};

/** Rule 执行结果 · 给 Agent 用 */
export type RuleExecution = {
  rule: StreamingRule;
  match: RuleMatch;
  /** 已执行的 action */
  applied: RuleAction;
};

/** Rule 注册表的 hit 计数 · session 内 in-memory */
export type RuleHitCounter = Map<string, number>;

/** 给 Agent 注入的 hook · rule 命中时调 · 让 Agent 决定后续动作 */
export type RuleHitListener = (
  exec: RuleExecution,
  ctx: { emit: (e: AgentEvent) => void },
) => void | Promise<void>;
