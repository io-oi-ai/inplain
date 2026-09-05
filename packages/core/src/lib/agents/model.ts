import { anthropic, createAnthropic } from "@ai-sdk/anthropic";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { google, createGoogleGenerativeAI } from "@ai-sdk/google";
import { deepseek, createDeepSeek } from "@ai-sdk/deepseek";
import { ollama, createOllama } from "ollama-ai-provider-v2";
import type { LanguageModel } from "ai";

import type { AgentRole } from "./types";
import {
  type ModelConfig,
  type ProviderName,
  assertRoleSupported,
  getModelConfig,
} from "./config";

/**
 * Plain gateway 模式 —— PLAIN_GATEWAY_URL + PLAIN_API_KEY + PLAIN_AGENT_ID 同时存在时,
 * 覆盖 anthropic/openai/google/deepseek 的 baseURL,所有调用走 gateway。
 * Gateway 接受这些 provider 的**原生协议**(不像 custom 走 OpenAI 兼容)。
 *
 * 这条路径让 CLI / desktop / web app 都能在配了 PLAIN_API_KEY 时无缝走 gateway,
 * 无需改 agent 代码。
 */
function gatewayBaseFor(provider: ProviderName): string | null {
  const base = process.env.PLAIN_GATEWAY_URL;
  if (!base) return null;
  const agentId = process.env.PLAIN_AGENT_ID ?? "default";
  // 路径形如 https://www.inplain.app/api/gateway/v1/agent/<agentId>
  const root = `${base.replace(/\/$/, "")}/agent/${encodeURIComponent(agentId)}`;
  // 显式 provider 前缀:让 gateway detectProvider 精确命中(不靠 endpoint 默认推断)。
  // 2026-08-04:sheet 走这条老路径(@/lib/agents/model),Moonshot 欠费时必须确保
  //   deepseek 请求真路由到 deepseek。与 @/lib/agent/provider 的 gatewayBaseFor 一致。
  if (provider === "deepseek" || provider === "openai")
    return `${root}/${provider}/v1`;
  if (provider === "moonshot")
    return `${root}/v1`;
  if (provider === "google") return root; // gemini 用完整 path,gateway 端按 v1beta 转
  return root; // anthropic 默认
}

function getProvider(name: ProviderName) {
  // gateway 模式:用 createXxx 注入 baseURL + apiKey(PLAIN_API_KEY 走 gateway 鉴权)
  const gwBase = gatewayBaseFor(name);
  if (gwBase && process.env.PLAIN_API_KEY) {
    const apiKey = process.env.PLAIN_API_KEY;
    if (name === "anthropic") return createAnthropic({ baseURL: gwBase, apiKey });
    if (name === "openai") return createOpenAI({ baseURL: gwBase, apiKey });
    if (name === "google")
      return createGoogleGenerativeAI({ baseURL: gwBase, apiKey });
    if (name === "deepseek") return createDeepSeek({ baseURL: gwBase, apiKey });
    if (name === "moonshot") {
      // Moonshot 用 OpenAI 兼容协议 · 通过 createOpenAI 走 gateway
      // instantiate() 会调 .chat(modelId) 强制 chat-completions · 不需要这里再调一次
      return createOpenAI({ baseURL: gwBase, apiKey });
    }
    // ollama / custom 不走 gateway
  }

  switch (name) {
    case "anthropic":
      return anthropic;
    case "openai":
      return openai;
    case "google":
      return google;
    case "deepseek":
      return deepseek;
    case "moonshot": {
      // 直连 Moonshot(没设 PLAIN_GATEWAY_URL 的本地 dev 模式)
      // V27-J · prod 上把 PLAIN_BACKEND_MOONSHOT_KEY 当 fallback ·
      // 跟新 provider/index.ts:200 行的 fallback 保持一致 · 避免老 model.ts 漏拿。
      const baseURL =
        process.env.MOONSHOT_BASE_URL ?? "https://api.moonshot.cn/v1";
      const apiKey =
        process.env.MOONSHOT_API_KEY ?? process.env.PLAIN_BACKEND_MOONSHOT_KEY;
      if (!apiKey) {
        throw new Error(
          "Moonshot not configured. Set MOONSHOT_API_KEY / PLAIN_BACKEND_MOONSHOT_KEY (or login via Plain gateway with PLAIN_API_KEY).",
        );
      }
      return createOpenAI({ baseURL, apiKey });
    }
    case "ollama":
      return ollama;
    case "custom": {
      const baseURL = process.env.CUSTOM_GATEWAY_URL;
      const apiKey = process.env.CUSTOM_GATEWAY_KEY;
      if (!baseURL || !apiKey) {
        throw new Error(
          "Custom gateway not configured. Set CUSTOM_GATEWAY_URL and CUSTOM_GATEWAY_KEY.",
        );
      }
      return createOpenAI({ baseURL, apiKey });
    }
  }
}

/**
 * 把 (provider, modelId) 变成可调用的 LanguageModel。
 * custom 走 .chat() 强制用 /chat/completions 端点（兼容 OpenAI 协议的第三方 gateway
 * 通常没实现 OpenAI 新出的 /responses 端点，例如 Moonshot/Kimi、各种代理等）。
 */
function instantiate(cfg: ModelConfig): LanguageModel {
  const provider = getProvider(cfg.provider);
  // custom / moonshot 走 OpenAI 兼容,强制用 .chat() 指向 /chat/completions
  // (Moonshot 没实现 OpenAI 新出的 /responses 端点)
  if (cfg.provider === "custom" || cfg.provider === "moonshot") {
    const op = provider as ReturnType<typeof createOpenAI>;
    return op.chat(cfg.modelId);
  }
  return (provider as (id: string) => LanguageModel)(cfg.modelId);
}

/**
 * 整个 agent 层拿模型的唯一入口。
 * 禁止在 agent 代码里直接 import @ai-sdk/*。
 */
export function selectModel(role: AgentRole): LanguageModel {
  const cfg: ModelConfig = getModelConfig(role);
  assertRoleSupported(role, cfg);
  return instantiate(cfg);
}

/**
 * 给 bench/ 实验用：直接按配置取模型，不走 role。
 */
export function selectModelByConfig(cfg: ModelConfig): LanguageModel {
  return instantiate(cfg);
}

// 保持 create* 导出，bench/ 需要动态构造 provider（自定义 baseURL 等）时会用
export {
  createAnthropic,
  createOpenAI,
  createGoogleGenerativeAI,
  createDeepSeek,
  createOllama,
};
