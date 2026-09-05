/**
 * Plain gateway 客户端 helper —— 给 workspace / 未来的 share / billing 等命令共用。
 *
 * 不重复 login.ts 的 OAuth 流;只负责拿到 PLAIN_API_KEY 后,
 * 把 /api/gateway/v1/<path> 请求拼出来 + 自动加 Authorization。
 *
 * gatewayBase 解析顺序(跟 login.ts 对齐):
 *   PLAIN_GATEWAY_URL > config.gatewayUrl > https://inplain.app/api/gateway/v1
 */
import { loadConfig } from "./config";
import { fail } from "./output";

export function gatewayBase(): string {
  return (
    process.env.PLAIN_GATEWAY_URL ??
    loadConfig().gatewayUrl ??
    "https://inplain.app/api/gateway/v1"
  );
}

export function apiKey(): string {
  const k = process.env.PLAIN_API_KEY ?? loadConfig().apiKey;
  if (!k) {
    fail("not logged in. Run `plain login` first.");
  }
  return k!;
}

export type GatewayFetchOpts = {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  /** 已经拼好 query string 的相对路径,如 "workspace/documents?kind=deck" */
  path: string;
  /** JSON body(对象会自动 stringify) */
  body?: unknown;
};

/**
 * 调 gateway。失败抛 Error,带 status code + 服务端 error 信息。
 * 调用方自己 catch 决定 fail() 还是降级。
 */
export async function gatewayFetch<T = unknown>(opts: GatewayFetchOpts): Promise<T> {
  const url = `${gatewayBase().replace(/\/+$/, "")}/${opts.path.replace(/^\/+/, "")}`;
  const headers: Record<string, string> = {
    authorization: `Bearer ${apiKey()}`,
  };
  let body: string | undefined;
  if (opts.body !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  let r: Response;
  try {
    r = await fetch(url, {
      method: opts.method ?? "GET",
      headers,
      body,
    });
  } catch (e) {
    throw new Error(`gateway unreachable: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!r.ok) {
    let msg = `gateway ${r.status}`;
    try {
      const j = (await r.json()) as { error?: string | { message?: string } };
      if (typeof j.error === "string") msg = `${msg}: ${j.error}`;
      else if (j.error && typeof j.error === "object" && j.error.message) {
        msg = `${msg}: ${j.error.message}`;
      }
    } catch {
      // 非 JSON
    }
    throw new Error(msg);
  }
  return (await r.json()) as T;
}
