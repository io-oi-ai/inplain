/**
 * DeepSeek 上关掉 thinking —— **每一个** generateText/generateObject 调用都要带。
 *
 * ⚠ 这不是优化,是修一个会让功能彻底不可用的错。deepseek 的 thinking 模式
 * 要求把上一轮 assistant 的 `reasoning_content` **原样回传**,否则报:
 *   "The `reasoning_content` in the thinking mode must be passed back to the API."
 * 而 Plain 的 message → LlmMessage 转换只保留 text + toolCalls,
 * 于是"第一轮能回、第二轮必挂"。结构化产物上还有第二个症状:
 * thinking 会耗光 token 导致**空回**(2026-08-07 踩过)。
 *
 * 为什么单独一个文件:这个 guard 已经被漏掉三次了 —— run-generation.ts 的
 * 注释写着「route 里那份内联实现曾漏掉它」,而 2026-08-24 又在
 * agent-v31/edit-content 和 agent/core/agent.ts 上各漏一次(生产报错)。
 * 每个 call site 各写一份 `if (provider.startsWith("deepseek"))` 的做法
 * 保证了下一个新 call site 还会漏。所以收成一处,统一 spread:
 *
 *   const r = await generateText({ model, prompt, ...noThinking(model) });
 *
 * 返回 `{}` 而不是 undefined,这样 spread 永远合法。
 */
import type { LanguageModel } from "ai";

export function noThinking(
  model: LanguageModel,
): { providerOptions?: { deepseek: { thinking: { type: "disabled" } } } } {
  if (typeof model !== "string" && model.provider?.startsWith("deepseek")) {
    return { providerOptions: { deepseek: { thinking: { type: "disabled" } } } };
  }
  return {};
}
