/**
 * LLM backend 决议。
 *
 * 两条路,按优先级:
 *   1. **Plain gateway**(PLAIN_API_KEY,由 `plain login` 写入)
 *      —— 托管模式。CLI 和 Web 端走同一套 auth + 计费。
 *   2. **BYOK 直连**(ANTHROPIC_API_KEY / OPENAI_API_KEY / … 任一)
 *      —— 自托管 / 本地模式。不经过 Plain 服务器,token 直接算在你自己的 provider 账上。
 *      Ollama 无需 key,设 OLLAMA_BASE_URL 或 PLAIN_PROVIDER=ollama 即可全本地跑。
 *
 * 两条都没有才报错。
 *
 * 为什么要有第 2 条:开源自托管者没有 inplain.app 账号,若强制 `plain login`,
 * 装完 CLI / MCP 第一件事就是撞墙。底层 provider 层(src/lib/agent/provider/index.ts
 * 的 getModel 优先级 3)本来就支持直连,这里只是把闸放开并选对 provider。
 *
 * Agent identification(仅 gateway 模式):
 *   - gateway URL 嵌 agent-id: <gateway>/v1/agent/<id>/...
 *   - gateway 端解析 path,记账时知道是哪个 agent 调的
 */

import { progress } from "./output";

export type LlmBackend =
  | { kind: "gateway"; agentId: string }
  | { kind: "direct"; provider: string }
  | { kind: "missing" };

const DEFAULT_GATEWAY = "https://inplain.app/api/gateway/v1";

/**
 * BYOK 探测顺序 —— 谁的 key 在 env 里就用谁。
 * 顺序即偏好:先 structured output 稳的,再通用的。
 */
const BYOK_PROVIDERS: ReadonlyArray<{ provider: string; env: string }> = [
  { provider: "anthropic", env: "ANTHROPIC_API_KEY" },
  { provider: "openai", env: "OPENAI_API_KEY" },
  { provider: "google", env: "GOOGLE_GENERATIVE_AI_API_KEY" },
  { provider: "moonshot", env: "MOONSHOT_API_KEY" },
  { provider: "deepseek", env: "DEEPSEEK_API_KEY" },
];

/**
 * 每个 provider 的默认 modelId。
 *
 * 必须有这张表:BUILTIN_DEFAULTS(src/lib/agents/config.ts)三个 role 写死
 * moonshot-v1-128k —— 那是 gateway 模式下的选择。BYOK 时只改 provider 不改 model,
 * 就会拿着 ANTHROPIC_API_KEY 去请求 "moonshot-v1-128k",必然 404。
 *
 * 选型偏好 structured output 稳的型号 —— deck/doc/sheet 生成全靠 schema 约束。
 */
const BYOK_DEFAULT_MODEL: Record<string, string> = {
  anthropic: "claude-sonnet-5",
  openai: "gpt-5",
  google: "gemini-2.5-pro",
  moonshot: "kimi-k2.6",
  deepseek: "deepseek-chat",
  ollama: "llama3.1",
};

/** 找到第一个有 key 的 provider · 都没有则看是不是要走 ollama(无需 key) */
function detectByok(): string | null {
  const explicit = process.env.PLAIN_PROVIDER;
  if (explicit) return explicit;
  for (const { provider, env } of BYOK_PROVIDERS) {
    if (process.env[env]) return provider;
  }
  // Ollama 不需要 key · 显式设了 base url 就认为用户想本地跑
  if (process.env.OLLAMA_BASE_URL) return "ollama";
  return null;
}

/**
 * 决定本次 CLI 调用走哪个 backend,把对应 env 写到 process.env。
 * 调用方应在每个会调 LLM 的命令开头调一次。返回 backend 信息用于日志。
 */
export function setupLlmEnv(opts?: { agentId?: string }): LlmBackend {
  // 1 · Plain gateway(托管模式)
  if (process.env.PLAIN_API_KEY) {
    const agentId = opts?.agentId ?? process.env.PLAIN_AGENT_ID ?? "default";
    if (!process.env.PLAIN_GATEWAY_URL) {
      process.env.PLAIN_GATEWAY_URL = DEFAULT_GATEWAY;
    }
    process.env.PLAIN_AGENT_ID = agentId;
    // 不强制 DEFAULT_PROVIDER —— 让 BUILTIN_DEFAULTS 走 gateway
    return { kind: "gateway", agentId };
  }

  // 2 · BYOK 直连(自托管 / 本地模式)
  const byok = detectByok();
  if (byok) {
    // 三个 role 都指向探测到的 provider + 该 provider 的默认 model。
    // provider 和 model 必须一起设:BUILTIN_DEFAULTS 的 modelId 是 moonshot 专用的,
    // 只改 provider 会拿着 anthropic key 去请求 moonshot-v1-128k → 404。
    // 已显式设过的 role env 不动(用户优先)。
    const model = BYOK_DEFAULT_MODEL[byok];
    for (const role of ["ROUTER", "GENERATOR", "EDITOR"] as const) {
      if (!process.env[`${role}_PROVIDER`]) {
        process.env[`${role}_PROVIDER`] = byok;
        // 只在 provider 也由我们设定时才设 model —— 用户若显式指定了 provider,
        // model 的选择权也归他(可能他要用同 provider 的另一个型号)。
        if (model && !process.env[`${role}_MODEL`]) {
          process.env[`${role}_MODEL`] = model;
        }
      }
    }
    return { kind: "direct", provider: byok };
  }

  return { kind: "missing" };
}

/**
 * 在调 LLM 前断言 backend 已就绪,否则给出可执行的错误指引。
 *
 * `throwOnMissing`:MCP server 场景传 true —— 那里不能 process.exit,
 * 否则整个 server 进程被杀掉,客户端只看到连接断开而非可读错误。
 */
export function requireLlmEnv(opts?: {
  agentId?: string;
  throwOnMissing?: boolean;
}): LlmBackend {
  const backend = setupLlmEnv(opts);
  if (backend.kind === "missing") {
    const msg =
      "Plain has no LLM backend configured. Pick one:\n" +
      "\n" +
      "  1. Use your own API key (self-hosted / local):\n" +
      "       export ANTHROPIC_API_KEY=sk-...     # or OPENAI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY,\n" +
      "                                           #    MOONSHOT_API_KEY, DEEPSEEK_API_KEY\n" +
      "     Fully local with Ollama:\n" +
      "       export OLLAMA_BASE_URL=http://localhost:11434\n" +
      "\n" +
      "  2. Use a hosted Plain account:\n" +
      "       plain login\n" +
      "     Usage is billed against your subscription credits, same as the web app.\n";
    if (opts?.throwOnMissing) throw new Error(msg);
    process.stderr.write(`✗ ${msg}`);
    process.exit(1);
  }
  if (backend.kind === "gateway") {
    progress(`backend: plain gateway (agent=${backend.agentId})`);
  } else {
    progress(`backend: direct (provider=${backend.provider})`);
  }
  return backend;
}
