/**
 * 从 LLM 输出里抠 HTML 文档 —— 5 级 fallback。
 *
 * 借鉴 nexu-io/html-anything 的 `next/src/lib/extract-html.ts`(Apache-2.0)。
 *
 * 现在 deck-generate / doc-generate 的 LLM 输出都是结构化 Markdown,
 * 但偶发情况下模型会:
 *   - 在 Markdown 外面包 ```html / ```markdown fence
 *   - 加 "好的,以下是…" 前言
 *   - 直接吐 <!DOCTYPE html>(被诱导走 HTML 路线时)
 *
 * 我们的 router 路径需要一个稳的提取器,在拿不到结构化 patch 时,
 * 至少能把 raw HTML 救回来给预览面板用,不让用户看到一片空白。
 *
 * 注意:本函数只在 raw HTML fallback 路径上用 —— 正常 Marp / Markdown
 * 输出走 source-* 反序列化,跟这里无关。
 */

const TAILWIND_CDN = "https://cdn.tailwindcss.com";

/** 抠出 HTML 文档主体。空输入返回空串。 */
export function extractHtml(streamed: string): string {
  if (!streamed) return "";

  // 1. ```html fence → 取内层
  const fence = streamed.match(/```(?:html|HTML)?\s*([\s\S]*?)```/);
  if (fence) {
    const inner = fence[1].trim();
    if (inner.startsWith("<")) return inner;
  }

  // 2. <!DOCTYPE html ... </html>
  const doctypeStart = streamed.search(/<!DOCTYPE\s+html/i);
  if (doctypeStart !== -1) {
    const closeIdx = streamed.lastIndexOf("</html>");
    if (closeIdx !== -1) {
      return streamed.slice(doctypeStart, closeIdx + "</html>".length);
    }
    // 流式中,只有开头 → 返回从 doctype 到末尾
    return streamed.slice(doctypeStart);
  }

  // 3. <html ...> ... </html>
  const htmlStart = streamed.search(/<html[\s>]/i);
  if (htmlStart !== -1) {
    const closeIdx = streamed.lastIndexOf("</html>");
    if (closeIdx !== -1) {
      return streamed.slice(htmlStart, closeIdx + "</html>".length);
    }
    return streamed.slice(htmlStart);
  }

  // 4. 以 `<` 开头(片段),信任它
  if (streamed.trimStart().startsWith("<")) {
    return streamed;
  }

  // 5. 最坏情况:模型只吐了纯文本(没 fence、没 tag)
  //    包一层最小 scaffold,把内容当成 <pre> 显示,至少不空白。
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><script src="${TAILWIND_CDN}"></script></head><body class="p-8 font-sans"><pre class="whitespace-pre-wrap">${escapeHtml(
    streamed,
  )}</pre></body></html>`;
}

/** 流式渲染兜底:输出可能没闭合,补全 </body></html> 让 iframe 可增量渲染。 */
export function previewHtml(streamed: string): string {
  const html = extractHtml(streamed);
  if (!html) return "";
  if (/<\/html>/i.test(html)) return html;
  return html + "\n</body>\n</html>";
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
