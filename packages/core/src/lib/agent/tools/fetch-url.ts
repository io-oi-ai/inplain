/**
 * fetch_url Tool · 读取一个公开 URL 的文本内容(markdown / 纯文本 / HTML)
 *
 * 动机:用户常说"把这个文档内容替换为 https://....md"——LLM 自己看不到 URL 里的东西。
 * 这个工具让 agent 先 fetch URL 拿到正文,再接力调 edit_/generate_ 用这内容改文档。
 *
 * 安全(SSRF 防护):
 *   - 只允许 http(s)
 *   - 拒绝 localhost / 内网 / 私有 IP / .internal 等(防内网探测)
 *   - 响应体截断到 200KB(防超大文件拖垮 LLM context)
 *   - 只取文本类响应(text/* · markdown · json · 空 content-type 也放行按文本读)
 *
 * 返回 { kind: "text", text } · LLM 拿到后在下一个 turn 调 edit_doc/generate_* 落地。
 */
import { z } from "zod";
import { defineTool } from "../core/tool";
import { readOwnAssetText } from "@/lib/blob";

const MAX_BYTES = 200 * 1024; // 200KB 硬上限(防超大文件拖垮 context)
// 生成场景软上限:素材太长 + structured schema 注入会让 DeepSeek 这类不原生支持
// structured output 的模型空回(NO_OUTPUT)。超过这个长度时截断 + 引导模型按要点生成。
const GEN_SAFE_CHARS = 8_000;

/** 长素材截到安全线 + 附引导,降低 structured 生成空回概率 */
function clampForGeneration(text: string): string {
  if (text.length <= GEN_SAFE_CHARS) return text;
  return (
    text.slice(0, GEN_SAFE_CHARS) +
    `\n\n…(原文较长,以上为前 ${GEN_SAFE_CHARS.toLocaleString()} 字。` +
    `请基于以上要点生成,不要逐字照搬,提炼结构与核心信息。)`
  );
}

const FetchUrlInput = z.object({
  url: z.string().url(),
});

/** 私有 / 保留地址判断 · 防 SSRF 打内网 */
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (
    h === "localhost" ||
    h === "0.0.0.0" ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    h.endsWith(".localhost")
  ) {
    return true;
  }
  // IPv4 私有 / 回环 / 链路本地段
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 127) return true; // 127/8 回环
    if (a === 10) return true; // 10/8
    if (a === 0) return true; // 0/8
    if (a === 169 && b === 254) return true; // 169.254/16 link-local
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
    if (a === 192 && b === 168) return true; // 192.168/16
  }
  // IPv6 回环 / 链路本地 / 唯一本地
  if (h === "::1" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) {
    return true;
  }
  return false;
}

export const fetchUrlTool = defineTool({
  name: "fetch_url",
  description: `读取一个公开 URL 的文本内容(markdown / 纯文本 / HTML)。
用户说"把内容替换为 https://...""按这个链接的内容改""参考这个 URL 生成"时:
先调 fetch_url 拿到正文,再在下一步调 edit_<kind> 或 generate_<kind> 用这内容落地到文档。
只支持公开 http(s) URL · 返回文本(超大内容会截断)。`,
  input: FetchUrlInput,
  execute: async (args, ctx) => {
    let parsed: URL;
    try {
      parsed = new URL(args.url);
    } catch {
      return { kind: "error", code: "FETCH_URL_INVALID", message: `不是合法 URL: ${args.url}` };
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        kind: "error",
        code: "FETCH_URL_PROTOCOL",
        message: `只支持 http/https · 收到 ${parsed.protocol}`,
      };
    }
    if (isBlockedHost(parsed.hostname)) {
      return {
        kind: "error",
        code: "FETCH_URL_BLOCKED",
        message: `拒绝访问内网 / 本地地址: ${parsed.hostname}`,
      };
    }

    ctx.emitReasoning("progress", `读取 ${parsed.hostname} 的内容…`);

    // 自己的 R2 资产域(assets.inplain.app)→ 走 binding 内部直读,不绕外网。
    // 更快 · 不依赖 custom domain SSL · 不撞 global_fetch_strictly_public flag。
    // (用户上传的素材就在这里,之前绕外网撞 530 导致 agent 连续失败停止。)
    try {
      const own = await readOwnAssetText(parsed.toString(), MAX_BYTES);
      if (own.ok) {
        if (!own.text.trim()) {
          return { kind: "error", code: "FETCH_URL_EMPTY", message: "素材内容为空。" };
        }
        return { kind: "text", text: clampForGeneration(own.text) };
      }
    } catch {
      // R2 直读失败 → 回退到外网 fetch(下面)
    }

    try {
      // 10s 超时(CF Workers 单请求上限 ~30s,10s 给 fetch 够用,不卡 agent 太久)
      const timeoutCtrl = new AbortController();
      const timeoutId = setTimeout(() => timeoutCtrl.abort(), 10_000);
      const combined = ctx.signal
        ? AbortSignal.any([ctx.signal, timeoutCtrl.signal])
        : timeoutCtrl.signal;
      const r = await fetch(parsed.toString(), {
        method: "GET",
        redirect: "follow",
        headers: { "user-agent": "PlainBot/1.0 (+https://inplain.app)" },
        signal: combined,
      });
      clearTimeout(timeoutId);
      if (!r.ok) {
        return {
          kind: "error",
          code: "FETCH_URL_HTTP",
          message: `URL 返回 HTTP ${r.status} ${r.statusText}`,
        };
      }
      const ct = (r.headers.get("content-type") ?? "").toLowerCase();
      // 拒绝明显的二进制类型(图片 / 视频 / 压缩包 / pdf)· 其余按文本读
      if (/^(image|video|audio|application\/(zip|octet-stream|pdf|x-))/.test(ct)) {
        return {
          kind: "error",
          code: "FETCH_URL_NOT_TEXT",
          message: `URL 不是文本内容(content-type: ${ct || "未知"}),无法作为文档内容读取。`,
        };
      }
      const raw = await r.text();
      if (!raw.trim()) {
        return { kind: "error", code: "FETCH_URL_EMPTY", message: "URL 返回空内容。" };
      }
      return { kind: "text", text: clampForGeneration(raw) };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        kind: "error",
        code: "FETCH_URL_FAILED",
        message: `读取 URL 失败: ${msg}`,
      };
    }
  },
});
