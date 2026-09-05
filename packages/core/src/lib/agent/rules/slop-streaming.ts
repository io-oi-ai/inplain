/**
 * V26-D · Streaming slop detector · 用老 detectSlop 的 SlopMatch 转 StreamingRule
 *
 * 工作方式:
 * - 老 detectSlop(text) 一次性扫一段完整文字
 * - 这里改成"对累积 token buffer 持续扫" · 每次 delta 后调一次
 * - 命中后根据 SlopCode 决定 RuleAction:
 *   - BAIT_PHRASE / SLOGAN_REWRITE → abort_and_retry(严重 · 必须停)
 *   - VAGUE_VERB / MARKETING_HYPE / FUZZY_NUMBER / SLANG_VERB → warn(提示但不停)
 *   - 其他 → warn
 *
 * 性能:
 * - detectSlop 内部是正则数组 · 单次 < 1ms · 接受 per-delta 调用
 * - 大段文本扫多次会重复 · 用 lastScanned 优化只扫新增部分(但要带前后缀防边界丢)
 */

import { detectSlop, type SlopMatch, type SlopCode } from "@/lib/agents/slop-detector";
import type { RuleAction, RuleMatch, StreamingRule } from "./types";

/** SlopCode → RuleAction 映射 */
function actionForSlopCode(code: SlopCode, reminder: string): RuleAction {
  switch (code) {
    case "BAIT_PHRASE":
    case "SLOGAN_REWRITE":
    case "EMOJI_DECOR":
    case "FILLER_COPY":
      // 严重 slop · 必须中断 + retry(占位/lorem 文案等同钓鱼标题:明显的"没用心")
      return { kind: "abort_and_retry", reminder };
    case "VAGUE_VERB":
    case "VAGUE_NOUN":
    case "MARKETING_HYPE":
    case "FUZZY_NUMBER":
    case "SYNONYM_REDUNDANCY":
    case "SLANG_VERB":
      // 轻度 slop · 提示但不打断(防止过度敏感引起死循环 retry)
      return { kind: "warn", reminder };
  }
}

/**
 * 构造一组 StreamingRule · 从 detectSlop 的输出聚合
 *
 * 用法:Agent 把这组 rules 喂给 runtime · 每个 delta 后跑 .match(buffer)
 */
export function buildSlopStreamingRules(opts: {
  /** 严重 slop 的 reminder 文案(用户自定义可选) */
  abortReminder?: string;
  /** 轻 slop 的 reminder 文案 */
  warnReminder?: string;
  /** 单条 rule session 内最多命中次数 · 防 LLM 跟规则死循环(默认 3) */
  maxHits?: number;
} = {}): StreamingRule[] {
  const abortReminder = opts.abortReminder ??
    "你的输出包含 Plain 禁用的 slop 模式(钓鱼标题 / slogan / emoji 装饰等)· 立即停 · 用直陈写法重写。";
  const warnReminder = opts.warnReminder ??
    "你的输出含轻度 slop(打造/赋能/许多/海量等)· 可继续 · 但不要再加新的同类词。";
  const maxHits = opts.maxHits ?? 3;

  // 我们不为每个 SlopCode 创建独立 rule · 而是 1 个统一 rule 用 detectSlop 内部扫
  // (避免重复跑正则)
  return [
    {
      code: "PLAIN_SLOP",
      description: "Plain anti-slop · 9 类信号 · 借鉴 oh-my-pi time-traveling stream rules",
      maxHits,
      match: (buffer: string): RuleMatch | null => {
        const matches: SlopMatch[] = detectSlop(buffer);
        if (matches.length === 0) return null;
        // 取**最严重**的一条(优先 abort 类)· 没有就取第一条
        const severe = matches.find((m) =>
          m.code === "BAIT_PHRASE" || m.code === "SLOGAN_REWRITE" ||
          m.code === "EMOJI_DECOR" || m.code === "FILLER_COPY",
        );
        const pick = severe ?? matches[0];
        return { matched: pick.match, index: pick.index };
      },
      // action 根据命中的具体 code 动态选 · 但 StreamingRule.action 是静态字段
      // 退而求其次:全部走 warn · 严重 case 在 hook 里再判
      // (真严格场景把这条 rule 拆成两条 · 一条 abort 一条 warn · 用不同 match 函数)
      action: {
        kind: "warn",
        reminder: warnReminder,
      },
    },
    // 单独一条 abort 规则 · 只匹钓鱼标题 / slogan 那几个最严重的
    {
      code: "PLAIN_SLOP_CRITICAL",
      description: "Plain critical slop · 钓鱼标题 / slogan / 装饰 emoji",
      maxHits,
      match: (buffer: string): RuleMatch | null => {
        const matches: SlopMatch[] = detectSlop(buffer);
        const severe = matches.find((m) =>
          m.code === "BAIT_PHRASE" || m.code === "SLOGAN_REWRITE" ||
          m.code === "EMOJI_DECOR" || m.code === "FILLER_COPY",
        );
        if (!severe) return null;
        return { matched: severe.match, index: severe.index };
      },
      action: {
        kind: "abort_and_retry",
        reminder: abortReminder,
      },
    },
  ];
}

/** 默认 Plain 全套规则 · 给 Agent 直接用 */
export const PLAIN_DEFAULT_RULES = buildSlopStreamingRules();

// 保留 actionForSlopCode 给未来扩展用(比如把 9 个 SlopCode 拆成 9 条 rule)
export { actionForSlopCode };
