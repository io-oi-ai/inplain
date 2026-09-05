/**
 * V26-A · transformContext · 把"全量 chat 历史"剪/补成"喂 LLM 那一刻的合理 context"
 *
 * 目的:
 * - 截老消息(超 token budget)
 * - 注入外部上下文(@deck:abc:s3 → 实际内容展开)
 * - 把"用户撤销"的 assistant 消息从 context 里抹掉(等价于 git checkout 老版本)
 * - 给 compaction hook 留口(V26.x 实现长 session 自动摘要)
 *
 * 设计原则:
 * - 接收 AgentMessage[] · 输出 AgentMessage[] (同型别)· caller 后续走 convertToLlm
 * - 纯函数 · 不带 IO · 跨 surface 共享
 * - 用户可以传 custom hook 替换 / 串联 · 默认实现给出来
 *
 * 借鉴来源:pi-agent-core `transformContext` hook
 */

import type { AgentMessage } from "./message";

export type TransformContext = (messages: AgentMessage[]) => AgentMessage[] | Promise<AgentMessage[]>;

/** Plain 默认 transform 配置 */
export type PlainTransformOptions = {
  /** 保留最近 N 条 user/assistant pair(默认 6 · 跟 useChatHistory 老 limit 一致) */
  recentPairs?: number;
  /** 把 status="undone" 的 assistant 消息丢掉(默认 true) */
  dropUndone?: boolean;
  /** 把 status="error" 的 assistant 消息丢掉(默认 true) */
  dropError?: boolean;
  /** 把 type="ui" 的消息丢掉(默认 true · 不该让 LLM 看到 UI chip) */
  dropUi?: boolean;
};

/**
 * 默认 transform · 做 3 件事:
 * 1. 丢掉 ui / undone / error 消息
 * 2. 保留最近 N 对 user/assistant(从尾倒数)
 * 3. 保留所有非 user/assistant 消息(比如 tool_result 仍要在 context 里)
 *
 * 这个实现是 stateless · 不会 mutate 入参。
 */
export function defaultTransform(opts: PlainTransformOptions = {}): TransformContext {
  const {
    recentPairs = 6,
    dropUndone = true,
    dropError = true,
    dropUi = true,
  } = opts;

  return (messages) => {
    // Step 1 · drop ui / undone / error
    let filtered = messages.filter((m) => {
      if (dropUi && m.type === "ui") return false;
      if (m.type === "assistant") {
        if (dropUndone && m.status === "undone") return false;
        if (dropError && m.status === "error") return false;
      }
      return true;
    });

    // Step 2 · 保留最近 N 对 + 所有非 user/assistant
    // 策略:从尾往前数,user/assistant 计 1,数到 N 对就截断之前的同类消息;
    //      非 user/assistant 的消息(tool_result)只要落在保留窗内就保留。
    let userCount = 0;
    let assistantCount = 0;
    const keepIdx = new Set<number>();
    for (let i = filtered.length - 1; i >= 0; i--) {
      const m = filtered[i];
      if (m.type === "user") {
        if (userCount < recentPairs) {
          keepIdx.add(i);
          userCount++;
        }
      } else if (m.type === "assistant") {
        if (assistantCount < recentPairs) {
          keepIdx.add(i);
          assistantCount++;
        }
      } else {
        // tool_result / ui(if not dropped) · 全部保留 · LLM 需要看到 tool 输出
        keepIdx.add(i);
      }
    }
    filtered = filtered.filter((_, i) => keepIdx.has(i));

    return filtered;
  };
}

/**
 * 组合多个 transform · 顺序应用 · pi 的 `pipe` 等价物
 *
 * 用法:
 *   const t = composeTransforms(
 *     defaultTransform({ recentPairs: 6 }),
 *     expandCrossRefs(workspace),     // V26-C 加
 *     compactIfLong(8000),            // V26.x 加
 *   );
 */
export function composeTransforms(...transforms: TransformContext[]): TransformContext {
  return async (messages) => {
    let cur = messages;
    for (const t of transforms) {
      cur = await t(cur);
    }
    return cur;
  };
}
