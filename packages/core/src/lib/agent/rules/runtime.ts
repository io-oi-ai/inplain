/**
 * V26-D · Rule runtime · 给 Agent 用的 streaming rule 引擎
 *
 * 在 Agent 的 stream loop 里:每收到一个 delta 就调 RuleRuntime.scan(buffer)。
 * scan 返回命中的 rule 列表 · runtime 自动:
 * - 记 hit count(防 maxHits 超过后停止再触发)
 * - emit rule_hit 事件(EvRuleHit)
 * - 决定是否要中断(action.kind === "abort_and_retry")
 *
 * 没接 Agent 之前 · 这个 runtime 可以独立测(纯函数 · 输入 buffer 输出 actions)。
 */

import type { AgentEvent } from "../core/events";
import type { RuleAction, RuleExecution, RuleHitCounter, StreamingRule } from "./types";

export type RuleRuntimeOptions = {
  /** 规则集 */
  rules: StreamingRule[];
  /** emit 事件的 hook(由 Agent 提供) */
  emit: (e: AgentEvent) => void;
};

export class RuleRuntime {
  private readonly rules: StreamingRule[];
  private readonly hits: RuleHitCounter = new Map();
  private readonly emit: (e: AgentEvent) => void;
  /** 已经命中过的位置 · 防同一 substring 重复触发 */
  private readonly seenMatches = new Set<string>();
  /** session 级注入的 reminder 列表(下一 turn 都要带) */
  private readonly sessionReminders: string[] = [];

  constructor(opts: RuleRuntimeOptions) {
    this.rules = opts.rules;
    this.emit = opts.emit;
  }

  /**
   * 扫一次 buffer · 返回需要中断的 reminder(若有)
   * - 如果有 abort 类 rule 命中 · 返回 reminder 字符串
   * - 否则(只有 warn 命中)· 返回 null · stream 继续
   */
  scan(buffer: string): { abort: boolean; reminder?: string; hits: RuleExecution[] } {
    const newHits: RuleExecution[] = [];
    let shouldAbort = false;
    let abortReminder: string | undefined;

    for (const rule of this.rules) {
      const max = rule.maxHits ?? Infinity;
      const currentHits = this.hits.get(rule.code) ?? 0;
      if (currentHits >= max) continue;

      const m = rule.match(buffer);
      if (!m) continue;

      // 防同一 match 反复 emit:用 code+matched+index 作 key
      const key = `${rule.code}|${m.matched}|${m.index}`;
      if (this.seenMatches.has(key)) continue;
      this.seenMatches.add(key);

      this.hits.set(rule.code, currentHits + 1);

      const exec: RuleExecution = {
        rule,
        match: m,
        applied: rule.action,
      };
      newHits.push(exec);

      // emit 事件给 UI
      this.emit({
        type: "rule_hit",
        ruleCode: rule.code,
        snippet: contextSnippet(buffer, m.index, m.matched.length),
        reminderInjected: extractReminderText(rule.action) ?? "",
      });

      // 处理 action
      if (rule.action.kind === "abort_and_retry") {
        shouldAbort = true;
        abortReminder = rule.action.reminder;
      } else if (rule.action.kind === "session_remind") {
        if (!this.sessionReminders.includes(rule.action.reminder)) {
          this.sessionReminders.push(rule.action.reminder);
        }
      }
      // warn 类不打断 · 已经 emit 给 UI 就够了
    }

    return { abort: shouldAbort, reminder: abortReminder, hits: newHits };
  }

  /** 拿当前 session 的 reminder 列表 · 下一 turn prompt 时拼到 system message 末尾 */
  getSessionReminders(): readonly string[] {
    return this.sessionReminders;
  }

  /** 拿命中统计 · 给 retro / debugging 用 */
  getHitCounts(): ReadonlyMap<string, number> {
    return this.hits;
  }

  /** 重置(给单元测试 / 新 session 用) */
  reset(): void {
    this.hits.clear();
    this.seenMatches.clear();
    this.sessionReminders.length = 0;
  }
}

function contextSnippet(buffer: string, index: number, matchLen: number): string {
  const start = Math.max(0, index - 20);
  const end = Math.min(buffer.length, index + matchLen + 20);
  const head = start > 0 ? "…" : "";
  const tail = end < buffer.length ? "…" : "";
  return `${head}${buffer.slice(start, end)}${tail}`;
}

function extractReminderText(a: RuleAction): string | undefined {
  if (a.kind === "warn") return a.reminder;
  return a.reminder; // abort / session_remind 都有 reminder 字段
}
