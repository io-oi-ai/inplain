/**
 * LLM 调用选项构造器 —— Plain 全 agent 唯一真相源。
 *
 * 解决两件事:
 *   1. Prompt cache(Anthropic ephemeral cache):system prompt 不变,
 *      多次调用同一模型时第二次起 TTFT -60% / cost -90%。
 *   2. 调用面统一:所有 generator/editor 用同一组 helper,避免每个文件
 *      自己拼 system + providerOptions。
 *
 * 文章参考: https://www.anthropic.com/engineering/managed-agents
 *   "Decoupling brain from hands" — harness(我们)和 model 的接口要稳定,
 *   cache 是这层接口里"看不见的优化",写一次,所有 agent 调用受益。
 *
 * 实现说明 — AI SDK 5 的 system message 选项:
 *   - SDK 的 `system` 字段可以是 string | SystemModelMessage | SystemModelMessage[]
 *   - SystemModelMessage.content 必须是 string(SDK 限制),所以 cacheControl 标在
 *     SystemModelMessage 自己的 providerOptions 上,而不是 content 数组的某个 part 上
 *   - 这等价于"对整个 system message 打 cache 边界",对我们的场景(一个 system prompt)
 *     完全够用
 */

import type { SystemModelMessage } from "ai";
import { getCapabilities, type ProviderName } from "./config";

/**
 * streamObject / generateObject 接受 `system` 字段为 SystemModelMessage(或 string)。
 * 我们返回 SystemModelMessage 让调用方:
 *   const system = buildCachedSystem(...);
 *   streamObject({ model, system, prompt, ... });
 */
export type CachedSystem = SystemModelMessage | string;

/**
 * 构造带 ephemeral cache 的 system message。
 *
 * 调用方:
 *   const system = buildCachedSystem({
 *     provider: "anthropic",
 *     prompt: DECK_GEN_PROMPT,
 *   });
 *   streamObject({ model, schema, system, prompt: userPrompt, ... });
 *
 * 行为:
 *   - 支持 cache 的 provider(anthropic / openai): 标 ephemeral
 *   - 不支持的(google / deepseek / ollama / custom): 退化为普通 string
 */
export function buildCachedSystem(input: {
  provider: ProviderName;
  prompt: string;
}): CachedSystem {
  const supportsCache = getCapabilities(input.provider).promptCache;
  if (!supportsCache) {
    return input.prompt;
  }
  return {
    role: "system",
    content: input.prompt,
    providerOptions: {
      anthropic: { cacheControl: { type: "ephemeral" } },
      openai: { cache: { type: "ephemeral" } },
    },
  };
}

/**
 * Router 版本(目前等价于 buildCachedSystem,留个独立 hook 是为了未来挂 few-shot)。
 *
 * Router 是热点 — 每个 chat turn 都跑一次 — cache 收益最大。
 */
export function buildCachedRouterSystem(input: {
  provider: ProviderName;
  prompt: string;
  fewShotExamples?: string;
}): CachedSystem {
  const fullPrompt = input.fewShotExamples
    ? `${input.prompt}\n\n${input.fewShotExamples}`
    : input.prompt;
  return buildCachedSystem({ provider: input.provider, prompt: fullPrompt });
}
