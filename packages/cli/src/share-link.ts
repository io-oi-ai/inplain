/**
 * 把一份 artifact source 变成可分享的链接。
 *
 * 给 MCP 用 —— agent 生成完 deck/doc/sheet 后,返回给它的应该是一个人类能打开的
 * 链接,而不是一坨 Markdown。这是 "AI agent 直接产出可分享成品" 这个卖点的兑现处。
 *
 * 走 POST /api/share 的 snapshot 模式(见 src/app/api/share/route.ts):
 *   - **不需要登录**,也不需要先把文档推到 workspace —— 传 {kind, source} 即可
 *   - 有 PLAIN_API_KEY 时带上,share 会归到该账号名下(plain share ls 能看到)
 *   - 没有 key 也能发,落成匿名 share
 *
 * 与 cli/src/commands/share.ts 的区别:那条命令是给已存在的 cloud doc 建链接
 * (需要 docId + 登录),这里是直接从 source 建,不落 workspace。
 */

import { gatewayBase } from "./gateway-client";
import { loadConfig } from "./config";

export type ShareLinkResult = {
  id: string;
  url: string;
};

/** share API 的 origin —— 与 gateway base 同 host(自托管时跟着走自己的域名) */
function shareOrigin(): string {
  try {
    const u = new URL(gatewayBase());
    return `${u.protocol}//${u.host}`;
  } catch {
    return "https://inplain.app";
  }
}

/**
 * 创建分享链接。失败抛 Error —— 调用方决定是降级返回 source 还是报错。
 *
 * 刻意不调 gateway-client 的 apiKey():那个函数在缺 key 时会 fail() 杀进程,
 * 而这里 key 是可选的(匿名也能发),不能让它把 MCP server 带走。
 */
export async function createShareLink(input: {
  kind: "deck" | "doc" | "sheet";
  source: string;
  title?: string;
}): Promise<ShareLinkResult> {
  const key = process.env.PLAIN_API_KEY ?? loadConfig().apiKey;

  const headers: Record<string, string> = { "content-type": "application/json" };
  if (key) headers.authorization = `Bearer ${key}`;

  const res = await fetch(`${shareOrigin()}/api/share`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      kind: input.kind,
      source: input.source,
      title: input.title,
      mode: "snapshot",
    }),
  });

  if (!res.ok) {
    let msg = `share api ${res.status}`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = `${msg}: ${j.error}`;
    } catch {
      // 响应不是 JSON · 保留状态码
    }
    throw new Error(msg);
  }

  const j = (await res.json()) as { id?: string; url?: string };
  if (!j.url || !j.id) throw new Error("share api returned no url");
  return { id: j.id, url: j.url };
}
