/**
 * Model picker —— 给定 role + 任务 hint + 用户 tier,挑最合适的 model config。
 *
 * 文章参考: https://www.anthropic.com/engineering/managed-agents
 *   "Harnesses encode assumptions that go stale as models improve."
 *   把"模型选择"从 generator 函数里拆出来 — 模型升级 / tier 映射改一处即可。
 *
 * 决策维度:
 *   1. role: router / generator / editor (来自 config.ts)
 *   2. taskHint: 任务复杂度提示
 *      - "short"  prompt < 100 字 → 偏 haiku
 *      - "feature" 长文模式(deck feature / 长 doc) → 偏 opus
 *      - "patch"  edit 操作(确定性高) → sonnet 够
 *      - 默认 → role 的 BUILTIN 默认值
 *   3. userTier: free / pro / team / enterprise
 *      - free 限 haiku + 少量 sonnet
 *      - pro / team 全开
 *      - enterprise 优先 opus
 *
 * 调用方:
 *   const cfg = pickModelConfig({ role: "generator", hint: "feature", tier: "pro" });
 *   const model = selectModelByConfig(cfg);
 */

import type { LanguageModel } from "ai";
import { selectModelByConfig } from "./model";
import { getModelConfig, type ModelConfig } from "./config";
import type { AgentRole } from "./types";

export type TaskHint = "short" | "default" | "feature" | "patch";
export type UserTier = "free" | "pro" | "max" | "team";

export type PickInput = {
  role: AgentRole;
  hint?: TaskHint;
  tier?: UserTier;
};

/**
 * Tier × hint 决策表(只在 BUILTIN_DEFAULTS 之上做"升档/降档")。
 * 如果用户自己设了 ROUTER_PROVIDER / GENERATOR_PROVIDER 等 env,
 * env 优先级最高(由 getModelConfig 处理),这里的策略不生效 —
 * 这是设计的:env 是"产品方手动覆盖",picker 是"产品方没覆盖时的兜底策略"。
 */
function pickAnthropicModelId(role: AgentRole, hint: TaskHint, tier: UserTier): string {
  // router: 永远 haiku — 分类任务 sonnet 是浪费。tier 不影响。
  if (role === "router") return "claude-haiku-4-5";

  // generator / editor: 按 hint × tier 调档
  if (role === "generator") {
    if (hint === "feature") {
      // 长文: free 也用 sonnet(haiku 写不了 18-28 页 monocle deck);pro+ 上 opus
      return tier === "free" ? "claude-sonnet-4-6" : "claude-opus-4-7";
    }
    if (hint === "short") {
      // 短 prompt: free 用 haiku,pro+ 上 sonnet
      return tier === "free" ? "claude-haiku-4-5" : "claude-sonnet-4-6";
    }
    // default: free 用 sonnet,pro+ 也是 sonnet(default 不需要 opus)
    return "claude-sonnet-4-6";
  }

  // editor: patch 任务 deterministic,sonnet 足够。free 也给 sonnet(否则 patch 失败率高)。
  if (hint === "patch") return "claude-sonnet-4-6";
  return "claude-sonnet-4-6";
}

export function pickModelConfig(input: PickInput): ModelConfig {
  // 先看 env 是否显式覆盖了这个 role(getModelConfig 已处理 env 逻辑)
  const envCfg = getModelConfig(input.role);
  // 如果 envCfg 来自 env(provider 不是默认 anthropic 或 modelId 跟 BUILTIN 不同),直接用
  // 简单判断:provider 不是 anthropic → 用户显式覆盖了,不动
  if (envCfg.provider !== "anthropic") return envCfg;
  // 用户没覆盖 → 用我们的 anthropic 模型档位策略
  const tier = input.tier ?? "free";
  const hint = input.hint ?? "default";
  return {
    provider: "anthropic",
    modelId: pickAnthropicModelId(input.role, hint, tier),
  };
}

/** 一站式: pick + instantiate */
export function pickModel(input: PickInput): LanguageModel {
  return selectModelByConfig(pickModelConfig(input));
}

/**
 * 推断 task hint:不需要用户显式传,从 prompt + mode 推断。
 *   - prompt < 80 字 + 不是 feature → "short"
 *   - mode === "feature" → "feature"
 *   - action === "edit" → "patch"
 *   - 其余 → "default"
 */
export function inferHint(input: {
  promptLength: number;
  mode?: "brief" | "feature";
  action?: "generate" | "edit";
}): TaskHint {
  if (input.action === "edit") return "patch";
  if (input.mode === "feature") return "feature";
  if (input.promptLength < 80) return "short";
  return "default";
}
