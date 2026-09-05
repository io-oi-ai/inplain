/**
 * Plain CLI 配置存储。
 *
 * 路径(XDG 优先,fallback 到 ~/.config/plain):
 *   $XDG_CONFIG_HOME/plain/config.json  或  ~/.config/plain/config.json
 *
 * 字段:
 *   apiKey         — Plain gateway 的 PAT(plain login 后写入)
 *   gatewayUrl     — gateway base URL(默认 https://inplain.app/api/gateway/v1)
 *   defaultAgentId — 给按 agent license 计费埋点用,plain 命令默认带这个 agent-id
 *
 * env 永远 override 配置文件(便于 CI / 临时切换):
 *   PLAIN_API_KEY > config.apiKey
 *   PLAIN_GATEWAY_URL > config.gatewayUrl
 *   PLAIN_AGENT_ID > config.defaultAgentId
 *
 * 不存 BYOK 的 ANTHROPIC_API_KEY 等——那是 SDK 自己读的,我们不重复持久化。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

export type Config = {
  apiKey?: string;
  /** V27-M · API key 过期时间(ISO)· null = 永久(老 key 兼容) */
  apiKeyExpiresAt?: string | null;
  gatewayUrl?: string;
  defaultAgentId?: string;
  /**
   * V27-Q · 默认 project · `plain project use <id>` 设置 · 之后所有 push/generate/import 自动带。
   * `plain project use --clear` 取消(回到 null)。
   * 命令行 --project <id> 临时覆盖。
   */
  defaultProjectId?: string;
};

export function configPath(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg ? xdg : join(homedir(), ".config");
  return join(base, "plain", "config.json");
}

export function loadConfig(): Config {
  const p = configPath();
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, "utf8")) as Config;
  } catch {
    // 损坏的 config 视作空,不让 CLI 崩
    return {};
  }
}

export function saveConfig(cfg: Config): void {
  const p = configPath();
  mkdirSync(dirname(p), { recursive: true });
  // 0o600:只有当前用户可读,api key 是敏感信息
  writeFileSync(p, JSON.stringify(cfg, null, 2) + "\n", { mode: 0o600 });
}

/**
 * 把 config 提升到 process.env,供 llm-client.ts 的 setupLlmEnv() 消费。
 * env 优先,config 兜底——这是 CLI 启动时调一次的 boot step。
 */
export function applyConfigToEnv(): void {
  const cfg = loadConfig();
  if (!process.env.PLAIN_API_KEY && cfg.apiKey) {
    process.env.PLAIN_API_KEY = cfg.apiKey;
  }
  if (!process.env.PLAIN_GATEWAY_URL && cfg.gatewayUrl) {
    process.env.PLAIN_GATEWAY_URL = cfg.gatewayUrl;
  }
  if (!process.env.PLAIN_AGENT_ID && cfg.defaultAgentId) {
    process.env.PLAIN_AGENT_ID = cfg.defaultAgentId;
  }
  if (!process.env.PLAIN_PROJECT_ID && cfg.defaultProjectId) {
    process.env.PLAIN_PROJECT_ID = cfg.defaultProjectId;
  }
}

/**
 * V27-Q · 决议当前命令该用哪个 project_id:
 *   命令行 --project > PLAIN_PROJECT_ID env > config.defaultProjectId > undefined
 */
export function resolveProjectId(cmdLineFlag?: string): string | undefined {
  if (cmdLineFlag) return cmdLineFlag;
  if (process.env.PLAIN_PROJECT_ID) return process.env.PLAIN_PROJECT_ID;
  const cfg = loadConfig();
  return cfg.defaultProjectId;
}
