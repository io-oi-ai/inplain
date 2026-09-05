/**
 * V26-B · Provider 抽象层 · 替代 src/lib/agents/model.ts
 *
 * 借 pi-ai 接口:`getModel("anthropic", "claude-sonnet-4-7@20260101")` 单一入口。
 *
 * 4 个职责:
 * 1. 把 (providerName, modelId) 变成 ai-sdk 的 LanguageModel
 * 2. 管理 Plain gateway 模式(baseURL override · PLAIN_API_KEY 鉴权)
 * 3. 管理直连模式的 env keys
 * 4. 暴露 capability matrix(streaming / structuredOutputs / toolUse / promptCache)
 *
 * 接口设计跟 pi-ai 对齐 · 后续若想换成 pi-ai npm 包 · 几乎不用改 caller。
 *
 * 不做:
 * - ❌ 不抄 pi-ai 的 OAuth flow(V26.x 评估 · 当前不需要)
 * - ❌ 不抄 token/cost tracking(Plain gateway 已经在 /api/gateway 层做)
 */

import { anthropic, createAnthropic } from "@ai-sdk/anthropic";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { google, createGoogleGenerativeAI } from "@ai-sdk/google";
import { deepseek, createDeepSeek } from "@ai-sdk/deepseek";
import { ollama } from "ollama-ai-provider-v2";
import type { LanguageModel } from "ai";

// ─────────────────────────────────────────────────────────
// 名字 + 能力矩阵
// ─────────────────────────────────────────────────────────

export type ProviderName =
  | "anthropic"
  | "openai"
  | "google"
  | "deepseek"
  | "moonshot"  // Kimi K2 系列 · OpenAI 兼容
  | "ollama"
  | "custom";   // 任意 OpenAI 兼容 gateway

export type Capabilities = {
  streaming: boolean;
  structuredOutputs: boolean;
  toolUse: boolean;
  promptCache: boolean;
};

const PROVIDER_CAPS: Record<ProviderName, Capabilities> = {
  anthropic: { streaming: true, structuredOutputs: true, toolUse: true, promptCache: true },
  openai:    { streaming: true, structuredOutputs: true, toolUse: true, promptCache: true },
  google:    { streaming: true, structuredOutputs: true, toolUse: true, promptCache: false },
  deepseek:  { streaming: true, structuredOutputs: true, toolUse: true, promptCache: false },
  moonshot:  { streaming: true, structuredOutputs: true, toolUse: true, promptCache: true },
  ollama:    { streaming: true, structuredOutputs: false, toolUse: true, promptCache: false },
  custom:    { streaming: true, structuredOutputs: true, toolUse: true, promptCache: false },
};

export function getCapabilities(provider: ProviderName): Capabilities {
  return PROVIDER_CAPS[provider];
}

export function isProvider(v: unknown): v is ProviderName {
  if (typeof v !== "string") return false;
  return v in PROVIDER_CAPS;
}

// ─────────────────────────────────────────────────────────
// Gateway 模式 · Plain 自家 LLM gateway 的 baseURL override
// ─────────────────────────────────────────────────────────

export type GatewayConfig = {
  /** Plain gateway 根 URL · 如 https://www.inplain.app/api/gateway/v1 */
  baseURL: string;
  /** Plain API key · 用户 plain login 后保存到 ~/.config/plain/config.json */
  apiKey: string;
  /** Agent id · 给计费埋点 · 默认 "default" */
  agentId?: string;
};

/** 从 env 自动构建 gateway · 没设就返 null */
export function gatewayFromEnv(): GatewayConfig | null {
  const baseURL = process.env.PLAIN_GATEWAY_URL;
  const apiKey = process.env.PLAIN_API_KEY;
  if (!baseURL || !apiKey) return null;
  return {
    baseURL,
    apiKey,
    agentId: process.env.PLAIN_AGENT_ID ?? "default",
  };
}

/**
 * 算 gateway 端给指定 provider 的真实 baseURL。
 * Gateway 接受各 provider 原生协议 · 路径形如:
 *   https://<base>/agent/<agentId>      ← anthropic / google
 *   https://<base>/agent/<agentId>/v1   ← openai / deepseek / moonshot (chat-completions 需要 /v1)
 */
function gatewayBaseFor(provider: ProviderName, gw: GatewayConfig): string {
  const agentId = gw.agentId ?? "default";
  const root = `${gw.baseURL.replace(/\/$/, "")}/agent/${encodeURIComponent(agentId)}`;
  // 显式 provider 前缀:让 gateway detectProvider 精确命中该 provider,不靠 endpoint 默认推断。
  // (2026-08-03:Moonshot 欠费,必须确保 deepseek 请求真的路由到 deepseek,不被默认判成别的。)
  if (provider === "deepseek" || provider === "openai") {
    return `${root}/${provider}/v1`;
  }
  if (provider === "moonshot") {
    return `${root}/v1`;
  }
  if (provider === "google") return root;
  return root; // anthropic 默认
}

// ─────────────────────────────────────────────────────────
// getModel · 主入口
// ─────────────────────────────────────────────────────────

export type GetModelOptions = {
  /** 显式 gateway 配置 · 不传则尝试 env */
  gateway?: GatewayConfig | null;
  /** 直连模式的 apiKey 覆盖(不传则用 env) */
  apiKey?: string;
  /** 直连模式的 baseURL 覆盖(custom / moonshot / ollama 用) */
  baseURL?: string;
};

/**
 * 拿 LanguageModel · 单一入口
 *
 * 优先级:
 * 1. opts.gateway 显式传 → 走 gateway
 * 2. opts.gateway 没传但 env 有(PLAIN_GATEWAY_URL + PLAIN_API_KEY)→ 走 gateway
 * 3. 否则走直连(用 opts.apiKey / opts.baseURL / 各 provider env)
 */
export function getModel(
  provider: ProviderName,
  modelId: string,
  opts: GetModelOptions = {},
): LanguageModel {
  const gw = opts.gateway ?? gatewayFromEnv();

  // Gateway 模式
  if (gw && provider !== "ollama" && provider !== "custom") {
    const baseURL = gatewayBaseFor(provider, gw);
    return instantiateWithBase(provider, modelId, baseURL, gw.apiKey);
  }

  // 直连模式
  return instantiateDirect(provider, modelId, opts);
}

function instantiateWithBase(
  provider: ProviderName,
  modelId: string,
  baseURL: string,
  apiKey: string,
): LanguageModel {
  switch (provider) {
    case "anthropic":
      return createAnthropic({ baseURL, apiKey })(modelId);
    case "openai":
    case "moonshot":
      // moonshot 用 OpenAI 兼容协议 · 走 .chat() 强制 /chat/completions
      // (Moonshot 没实现 OpenAI 新 /responses 端点)
      return createOpenAI({ baseURL, apiKey }).chat(modelId);
    case "google":
      return createGoogleGenerativeAI({ baseURL, apiKey })(modelId);
    case "deepseek":
      return createDeepSeek({ baseURL, apiKey })(modelId);
    case "ollama":
    case "custom":
      // 这两不走 gateway 路径 · 通过 instantiateDirect 处理
      throw new Error(`provider ${provider} cannot use gateway baseURL`);
  }
}

function instantiateDirect(
  provider: ProviderName,
  modelId: string,
  opts: GetModelOptions,
): LanguageModel {
  switch (provider) {
    case "anthropic": {
      if (opts.apiKey) return createAnthropic({ apiKey: opts.apiKey })(modelId);
      return anthropic(modelId);
    }
    case "openai": {
      if (opts.apiKey) return createOpenAI({ apiKey: opts.apiKey })(modelId);
      return openai(modelId);
    }
    case "google": {
      if (opts.apiKey)
        return createGoogleGenerativeAI({ apiKey: opts.apiKey })(modelId);
      return google(modelId);
    }
    case "deepseek": {
      if (opts.apiKey) return createDeepSeek({ apiKey: opts.apiKey })(modelId);
      return deepseek(modelId);
    }
    case "moonshot": {
      const baseURL = opts.baseURL ?? process.env.MOONSHOT_BASE_URL ?? "https://api.moonshot.cn/v1";
      // V27-G · prod 上把 PLAIN_BACKEND_MOONSHOT_KEY 当 fallback ·
      // gateway 路径下 server-side 用这个 · 直接连 Moonshot 也用同一个。
      const apiKey = opts.apiKey ?? process.env.MOONSHOT_API_KEY ?? process.env.PLAIN_BACKEND_MOONSHOT_KEY;
      if (!apiKey) {
        throw new Error(
          "Moonshot not configured · set MOONSHOT_API_KEY / PLAIN_BACKEND_MOONSHOT_KEY · 或走 Plain gateway 配 PLAIN_API_KEY",
        );
      }
      return createOpenAI({ baseURL, apiKey }).chat(modelId);
    }
    case "ollama": {
      // ollama 默认走本地 · 不需要 apiKey
      return ollama(modelId);
    }
    case "custom": {
      const baseURL = opts.baseURL ?? process.env.CUSTOM_GATEWAY_URL;
      const apiKey = opts.apiKey ?? process.env.CUSTOM_GATEWAY_KEY;
      if (!baseURL || !apiKey) {
        throw new Error(
          "Custom gateway not configured · set CUSTOM_GATEWAY_URL + CUSTOM_GATEWAY_KEY (or pass opts.baseURL/apiKey)",
        );
      }
      return createOpenAI({ baseURL, apiKey }).chat(modelId);
    }
  }
}

// ─────────────────────────────────────────────────────────
// 兼容旧 selectModel(role) · 让 V26-C tool 注册时可以走 role
// 这一段在所有 caller 切到 getModel(name, id) 后删
// ─────────────────────────────────────────────────────────

import type { AgentRole } from "@/lib/agents/types";
import { getModelConfig } from "@/lib/agents/config";

/**
 * 兼容层 · 老 caller(routeIntent / generate / edit)调 selectModel(role) · 这里 forward 到 getModel。
 * V26-C tool 重写完成后 · 删此 export · 调用方直接走 getModel(name, id)。
 */
export function selectModel(role: AgentRole): LanguageModel {
  const cfg = getModelConfig(role);
  return getModel(cfg.provider as ProviderName, cfg.modelId);
}
