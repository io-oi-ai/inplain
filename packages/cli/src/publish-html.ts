/**
 * 把一个**已经做好的本地 HTML 文件**变成线上链接。
 *
 * 走 POST /api/share/from-html —— 和网页端拖拽区同一条路径,同一套闸门。
 *
 * 与同目录 share-link.ts 的区别(两者都存在是有原因的):
 *   share-link.ts   拿 deck/doc/sheet 的 **source**(Markdown/CSV)去 /api/share,
 *                   内容会经过 Plain 的渲染管线变成成品页。
 *   publish-html.ts 拿**用户自己的 HTML 原文**去 /api/share/from-html,
 *                   服务端**原样托管、不改一个字节**。
 *
 * 为什么需要这条路:实测 html-to-url 是 Plain 唯一在转化的入口(Bing 该词簇
 * CTR 23%),但此前**只有网页端有**——CLI 的 `plain push` 只接受 Markdown
 * (inferKind 只匹配 .md / frontmatter),`plain share` 需要云端 docId。
 * 而重度用户正是批量场景(实测单人 651 次/月),恰恰最需要命令行。
 *
 * ## 鉴权
 *
 * 有 key(PLAIN_API_KEY 或 `plain login` 写入的 config)→ 以登录身份发布:
 * 链接**长期保留**,走月度发布配额。
 * 没 key → 匿名发布:7 天过期 + 同 IP 每小时 5 个的限流。
 *
 * 服务端 getCurrentUser() 本就支持 `Bearer plain_pk_*`(auth-server.ts 的
 * fallback 分支),所以这条路**不需要服务端改任何代码**。
 *
 * ## ⚠️ 安全:这里不消毒 HTML,也不应该消毒
 *
 * 「拖什么进来线上就是什么」是产品承诺,任何改写都违背用户心智。
 * 安全由**渲染侧隔离**保证:/s/[id] 用 srcdoc + sandbox 且不带
 * allow-same-origin(见 from-html/route.ts 的 renderMode:"raw-html" 契约)。
 * CLI 侧只做一件事:上传前提醒用户自己看一眼内容(见 commands/publish.ts)。
 */

import { readFileSync, statSync } from "node:fs";
import { basename } from "node:path";
import { gatewayBase } from "./gateway-client";
import { loadConfig } from "./config";

export type PublishResult = {
  id: string;
  url: string;
  /** true = 以匿名身份发布(没带 key),链接会过期 */
  anonymous: boolean;
  /** 匿名时的存活天数;登录发布为 null */
  ttlDays: number | null;
  expiresAt: string | null;
};

/** 服务端 MAX_HTML_BYTES 是 2MB。本地先挡一次,省掉一次必然失败的上传。 */
const MAX_HTML_BYTES = 2 * 1024 * 1024;

/** 与 share-link.ts 同款 origin 推导 —— 自托管时跟着自己的域名走 */
function apiOrigin(): string {
  try {
    const u = new URL(gatewayBase());
    return `${u.protocol}//${u.host}`;
  } catch {
    return "https://inplain.app";
  }
}

/**
 * 看起来像不像一份 HTML 文档。
 *
 * ⚠ 必须和服务端 from-html/route.ts 的 looksLikeHtml **保持同一套正则** ——
 * 本地判定宽于服务端会让用户白传一次再被拒,窄于服务端则会拦下本可成功的文件。
 */
function looksLikeHtml(s: string): boolean {
  return /<\s*(!doctype\s+html|html|head|body|div|section|h1|p|table|svg)\b/i.test(s);
}

/**
 * 粗查 HTML 里引用的**本地相对路径**资源。
 *
 * 这是实测最常见的翻车点:HTML 里写 `<img src="./img/x.png">`,
 * 发布后那些文件不在服务器上 → 页面打开是一堆裂图,用户以为是产品坏了。
 * 发布前提示一句,比发布后让他自己猜便宜得多。
 *
 * 只认明确的相对路径:排除 http(s):// · // · data: · blob: · # · 绝对路径 /。
 * 宁可漏报不可误报 —— 误报会让提示变成噪音,用户很快就不看了。
 */
export function findLocalRefs(html: string): string[] {
  const out = new Set<string>();
  const re = /(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const v = m[1].trim();
    if (!v) continue;
    if (/^(https?:)?\/\//i.test(v)) continue; // 外链 / 协议相对
    if (/^(data|blob|mailto|tel|javascript):/i.test(v)) continue;
    if (v.startsWith("#")) continue; // 页内锚点
    if (v.startsWith("/")) continue; // 绝对路径 —— 发布后指向站点根,不是本地文件
    out.add(v);
  }
  return [...out];
}

export type PublishInput = {
  /** 本地 .html 文件路径 */
  file: string;
  /** 覆盖标题(默认从 <title> 抽,抽不到用文件名) */
  title?: string;
};

/**
 * 读本地 HTML 并发布。
 *
 * 失败一律抛 Error,由命令层决定怎么呈现 —— 这里不碰 process.exit,
 * 因为同一个函数也要能被 MCP server 调(那里杀进程会带走整个 server)。
 */
export async function publishHtmlFile(input: PublishInput): Promise<PublishResult> {
  const { file } = input;

  let st: ReturnType<typeof statSync>;
  try {
    st = statSync(file);
  } catch {
    throw new Error(`file not found: ${file}`);
  }
  if (!st.isFile()) throw new Error(`not a file: ${file}`);

  // 先按字节挡 —— 和服务端同一口径(中文 3 字节/字,按字符数算会放进 3 倍大的东西)
  if (st.size > MAX_HTML_BYTES) {
    throw new Error(
      `file is ${(st.size / 1024 / 1024).toFixed(1)}MB, over the ${MAX_HTML_BYTES / 1024 / 1024}MB limit`,
    );
  }

  const html = readFileSync(file, "utf8");
  if (!html.trim()) throw new Error("file is empty");
  if (!looksLikeHtml(html)) {
    throw new Error(`${basename(file)} does not look like an HTML document`);
  }

  const key = process.env.PLAIN_API_KEY ?? loadConfig().apiKey;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (key) headers.authorization = `Bearer ${key}`;

  const res = await fetch(`${apiOrigin()}/api/share/from-html`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      html,
      title: input.title,
      filename: basename(file),
    }),
  });

  if (!res.ok) {
    // 服务端对不同失败给了不同状态码和结构化字段,逐个翻成人能读懂的话。
    // 直接把状态码甩给用户是很差的体验 —— web2md 那边就因为「显示 400」吃过 3 星差评
    // (memory project_web2md_bare_status_code_ux)。
    let j: Record<string, unknown> = {};
    try {
      j = (await res.json()) as Record<string, unknown>;
    } catch {
      // 非 JSON 响应,下面按状态码兜底
    }
    const serverMsg = typeof j.message === "string" ? j.message : "";

    if (res.status === 402) {
      const used = j.used ?? "?";
      const quota = j.quota ?? "?";
      throw new Error(
        `monthly publish quota reached (${used}/${quota}).\n` +
          `  Buy a publish pack at ${apiOrigin()}/pricing to keep going.`,
      );
    }
    if (res.status === 429) {
      throw new Error(
        key
          ? serverMsg || "rate limited, try again shortly"
          : "rate limited: anonymous publishing allows 5 per hour.\n" +
            "  Run `plain login` to publish as yourself without this limit.",
      );
    }
    if (res.status === 413) {
      throw new Error(serverMsg || "file too large (2MB limit)");
    }
    if (res.status === 400) {
      throw new Error(serverMsg || "server rejected the file as not valid HTML");
    }
    throw new Error(serverMsg || `publish failed (${res.status})`);
  }

  const j = (await res.json()) as Partial<PublishResult>;
  if (!j.url || !j.id) throw new Error("server returned no url");
  return {
    id: j.id,
    url: j.url,
    anonymous: Boolean(j.anonymous),
    ttlDays: j.ttlDays ?? null,
    expiresAt: j.expiresAt ?? null,
  };
}
