import type { AgentRole } from "./types";

export type ProviderName =
  | "anthropic"
  | "openai"
  | "google"
  | "deepseek"
  | "moonshot" // Kimi K2 — Plain 当前主用,OpenAI 兼容协议
  | "ollama"
  | "custom"; // 任意 OpenAI 兼容 gateway(自研网关 / 代理 / 私有部署)

export type ModelConfig = {
  provider: ProviderName;
  modelId: string;
};

/**
 * M1 默认值 —— 未跑实验前的占位。
 *
 * TODO(M1-bench): 跑完 bench/ 实验后，根据 Pareto 前沿更新这里的默认值。
 * 参考 plan 文件 "M1 决策表模板"。
 *
 * 三类默认策略：
 * - router: 快 + 便宜（分类任务，精度阈值 90%+）
 * - generator: 平衡（schema 合规 + 内容质量）
 * - editor: 最强（patch 合法性 > 95%）
 */
// Plain 当前主用 Kimi K2 系列(成本 $0.6/$2.5 per 1M,远低于 Claude),
// 所有 role 默认走 Moonshot;BUILD_TIME 想换 provider 通过 env 覆盖。
//
// V27-G(2026-05-31)· kimi-k2-0905-preview 已下线 · Moonshot 返 404 ·
// 切到 kimi-k2.6(262K context · 支持 reasoning · 多模态)。
// 老 modelId 不要再写回这里。
// 2026-06-14 · 三个 role 切回 Moonshot kimi-k2.6。原因:
//   DeepSeek 不原生支持 structured output(@ai-sdk compatibility mode 把 schema 注入
//   system prompt),长素材(如 fetch_url 读 15K 字)+ deck schema 叠加后**稳定空回**
//   (NO_OUTPUT / AI_NoOutputGeneratedError),retry 也救不回。Moonshot kimi-k2.6
//   原生 structured output(provider caps structuredOutputs:true)+ 262K context +
//   reasoning,实测长素材 structured deck 生成稳定。账户已重新充值(新 key 2026-06-14)。
// ⚠ k2.6 是推理模型:先出 reasoning 再出 content,max_tokens 要给足(否则 reasoning
//   吃光 token → content 空)。baseURL=api.moonshot.cn/v1(.cn 账户,.ai 国际无效)。
const BUILTIN_DEFAULTS: Record<AgentRole, ModelConfig> = {
  router: { provider: "moonshot", modelId: "moonshot-v1-128k" },
  generator: { provider: "moonshot", modelId: "moonshot-v1-128k" },
  editor: { provider: "moonshot", modelId: "moonshot-v1-128k" },
};

const ROLE_ENV: Record<AgentRole, { provider: string; modelId: string }> = {
  router: { provider: "ROUTER_PROVIDER", modelId: "ROUTER_MODEL" },
  generator: { provider: "GENERATOR_PROVIDER", modelId: "GENERATOR_MODEL" },
  editor: { provider: "EDITOR_PROVIDER", modelId: "EDITOR_MODEL" },
};

function isProvider(v: string | undefined): v is ProviderName {
  return (
    !!v &&
    ["anthropic", "openai", "google", "deepseek", "moonshot", "ollama", "custom"].includes(v)
  );
}

/**
 * V27-G · 已下线 / 不可用的旧 model ID 黑名单
 *
 * Moonshot 偶尔会下线旧 preview 版 · 但 prod env 不一定同步更新。
 * 这里把已知失效的 ID 列在黑名单 · 命中后自动 fallback 到 BUILTIN_DEFAULTS · 避免 404。
 *
 * 不在黑名单的旧版本 · env 优先级仍然高于 BUILTIN_DEFAULTS。
 */
const RETIRED_MODEL_IDS = new Set([
  "kimi-k2-0905-preview",  // 2026-05 下线 · 404
  "kimi-k2-turbo-preview", // 2026-05 下线 · 404 · prod env GENERATOR_MODEL 当时用这个
  "kimi-k2-0711-preview",  // 早期预览版 · 谨防
]);

/**
 * V27-G · 已下线 model ID 的 fallback 表
 *
 * 这里干两件事:
 *   1. modelId 换成 kimi-k2.6(当前可用)
 *   2. provider 换成 moonshot 直连(custom gateway 可能后端也没维护)
 *
 * provider 切到 moonshot 后 · provider/index.ts 会自动用 PLAIN_BACKEND_MOONSHOT_KEY ·
 * 不需要额外 env。
 */
const RETIRED_MODEL_FALLBACK: ModelConfig = {
  provider: "moonshot",
  modelId: "moonshot-v1-128k",
};

/**
 * 容灾 fallback provider · 主 provider 调用失败(余额不足/5xx/超时)时自动切。
 * 单一供应商余额/服务异常不该拖垮全站生成。可被 env FALLBACK_PROVIDER /
 * FALLBACK_MODEL 覆盖。
 *
 * ⚠ 型号别写旧的:deepseek 侧一律用 **deepseek-v4-pro**(与 wrangler.jsonc 三角色
 * 一致)。不要用 deepseek-v4-flash —— 实测「结构化弱,deck/sheet 长 structured
 * 空回(raw="")」(2026-08-04,见 wrangler.jsonc 注释);也别留 deepseek-chat 那种
 * 上一代 id,主力都换代了 fallback 还指旧型号等于容灾时踩另一个坑。
 */
export function getFallbackModelConfig(role: AgentRole): ModelConfig | null {
  const primary = getModelConfig(role);
  const fbProvider = process.env.FALLBACK_PROVIDER;
  const fbModel = process.env.FALLBACK_MODEL;
  if (isProvider(fbProvider) && fbModel) {
    // 配了显式 fallback · 但不能跟主 provider 同一个(那不叫 fallback)
    if (fbProvider !== primary.provider) return { provider: fbProvider, modelId: fbModel };
  }
  // 默认:主力非 deepseek → fallback deepseek;主力是 deepseek → fallback moonshot
  if (primary.provider !== "deepseek") {
    return { provider: "deepseek", modelId: "deepseek-v4-pro" };
  }
  return { provider: "moonshot", modelId: "moonshot-v1-128k" };
}

/**
 * 判断一个 LLM 调用错误是否值得 fallback 到备用 provider。
 * 余额不足 / 配额 / 5xx / 超时 / 网络 → 值得切;客户端参数错(4xx 非 429)→ 不切(切了也错)。
 */
export function shouldFallback(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("insufficient") ||      // 余额不足(moonshot 余额空就是这个)
    msg.includes("balance") ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("429") ||
    msg.includes("500") || msg.includes("502") || msg.includes("503") || msg.includes("504") ||
    msg.includes("timeout") || msg.includes("timed out") ||
    msg.includes("fetch failed") || msg.includes("econnreset") ||
    msg.includes("overloaded") || msg.includes("unavailable") ||
    // 2026-08-07 · 推理模型的 reasoning 回传约束报错(moonshot kimi thinking /
    // deepseek reasoner 在多轮编辑或参数不匹配时抛 "reasoning_content must be
    // passed back")。属于 provider 端的特性性拒绝,不是我们的请求本身错 —— 换一家
    // provider 就能救。不加这条:工作台 chat 编辑全线报 AGENT_ERROR 且 fallback
    // 根本不触发(线上真事故)。
    msg.includes("reasoning_content") || msg.includes("thinking mode") ||
    // 账户被停(欠费/风控)· moonshot 报 "account ... is suspended"
    msg.includes("suspended")
  );
}

export function getModelConfig(role: AgentRole): ModelConfig {
  const env = ROLE_ENV[role];
  const providerEnv = process.env[env.provider];
  const modelEnv = process.env[env.modelId];

  // V27-G · env 命中黑名单 · provider+modelId 一起换到 RETIRED_MODEL_FALLBACK ·
  // 同时跳过坏的 custom gateway · 直连 Moonshot。
  if (isProvider(providerEnv) && modelEnv && RETIRED_MODEL_IDS.has(modelEnv)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[plain/model] env ${env.modelId}="${modelEnv}" (provider="${providerEnv}") 已下线 · 改用 ${RETIRED_MODEL_FALLBACK.provider}/${RETIRED_MODEL_FALLBACK.modelId}`,
      );
    }
    return { ...RETIRED_MODEL_FALLBACK };
  }

  if (isProvider(providerEnv) && modelEnv) {
    return { provider: providerEnv, modelId: modelEnv };
  }

  const globalProvider = process.env.DEFAULT_PROVIDER;
  const globalModel = process.env.DEFAULT_MODEL;
  if (
    isProvider(globalProvider) &&
    globalModel &&
    !RETIRED_MODEL_IDS.has(globalModel)
  ) {
    return { provider: globalProvider, modelId: globalModel };
  }
  if (
    isProvider(globalProvider) &&
    globalModel &&
    RETIRED_MODEL_IDS.has(globalModel)
  ) {
    return { ...RETIRED_MODEL_FALLBACK };
  }
  return BUILTIN_DEFAULTS[role];
}

/**
 * Capability matrix —— 借鉴 pi-mono 设计。
 * 记录每个 provider / 模型族支持的能力，select 时可校验。
 */
export type Capabilities = {
  streaming: boolean;
  structuredOutputs: boolean;
  toolUse: boolean;
  promptCache: boolean;
};

const PROVIDER_CAPS: Record<ProviderName, Capabilities> = {
  anthropic: { streaming: true, structuredOutputs: true, toolUse: true, promptCache: true },
  openai: { streaming: true, structuredOutputs: true, toolUse: true, promptCache: true },
  google: { streaming: true, structuredOutputs: true, toolUse: true, promptCache: false },
  deepseek: { streaming: true, structuredOutputs: true, toolUse: true, promptCache: false },
  // Moonshot Kimi K2 — OpenAI 兼容协议;K2.6+ 支持 prompt cache(75% 折扣)
  moonshot: { streaming: true, structuredOutputs: true, toolUse: true, promptCache: true },
  ollama: { streaming: true, structuredOutputs: false, toolUse: true, promptCache: false },
  // custom gateway 走 OpenAI 兼容协议,按最通用能力假设;用户需自行确保后端支持
  custom: { streaming: true, structuredOutputs: true, toolUse: true, promptCache: false },
};

export function getCapabilities(provider: ProviderName): Capabilities {
  return PROVIDER_CAPS[provider];
}

/**
 * 根据 role 所需能力校验 model config。
 * editor / generator 需要 structured outputs；router 也需要。
 */
export function assertRoleSupported(role: AgentRole, cfg: ModelConfig): void {
  const caps = getCapabilities(cfg.provider);
  if (!caps.structuredOutputs) {
    throw new Error(
      `Provider "${cfg.provider}" does not support structured outputs; ` +
        `cannot use for role "${role}". Switch provider via ${ROLE_ENV[role].provider} env var.`,
    );
  }
}
