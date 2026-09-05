/**
 * V32 S2 · 统一渲染器唯一入口
 *
 *   renderReport(doc, template?, opts?) → 完整 self-contained HTML
 *
 * 核心思想(见 memory project_plain_v32_unified_blocks §2):
 *   present 不是渲染分支 —— 一份 block DOM,present/report 只在 CSS/包裹层不同。
 *     - report:blocks 顺序垂直流(套 DOC_BASE_CSS + .v32-flow)
 *     - present:splitIntoSlides 切屏,每屏 .slide(套 VIEWPORT_BASE_CSS + STAGE_SCALER_JS letterbox)
 *   mode 缺省取 doc.meta.defaultMode。
 *
 * 模板没实现某 block → 回退 FALLBACK_RENDERERS(素模板)。S2 不带真模板。
 */
import { marked } from "marked";
import type { Block, Document } from "../content/schema";
import type { RenderCtx, TemplateV32 } from "../templates/types";
import { FALLBACK_RENDERERS } from "./block-renderers";
import { VISUAL_EDIT_SCRIPT } from "@/lib/export/visual-edit-script";
import {
  splitIntoSlides,
  V32_BLANK_THEME_CSS,
  V32_REPORT_CSS,
  V32_PRESENT_CSS,
} from "./present";
import {
  escapeHtml,
  editAttrs,
  DOC_BASE_CSS,
  VIEWPORT_BASE_CSS,
  STAGE_SCALER_JS,
  DECK_PAGE_ANIM_CSS,
} from "./util";

// V32 S2 · markdown 同步渲染(marked 无异步扩展时是同步的)
//
// XSS 两道防线,缺一不可:
//
// ① 原生 HTML:marked 18 移除了内置 sanitize,默认放行源里的 <script>/<img onerror>。
//    prose/callout 的 body 是不可信内容 → 先把 < > 转义成实体,marked 就把它们当纯文本。
//    markdown 语法(**bold** / 列表 / [链接])不用 < >,不受影响。等于"关掉内联 HTML"。
//
// ② 危险 URL scheme:①**挡不住** markdown 自己的链接语法 —— `[x](javascript:alert(1))`
//    通篇没有 < >,会被 marked 正常渲成 <a href="javascript:alert(1)">。图片
//    `![x](javascript:…)` 同理进 src。实测 javascript: / vbscript: / data:text/html
//    三类都能穿过第 ① 道。所以渲染后再过一遍 href/src,把危险 scheme 换成 "#"。
//    做在输出侧(而不是解析前用正则删 payload):正则改源容易被大小写/空白/编码绕过,
//    改属性值是最后一道闸门,更难绕。
const DANGEROUS_URL =
  /^\s*(?:javascript|vbscript|data|file|blob)\s*:/i;

/** 把 href/src 里的危险 scheme 掐掉(保留可见文案,只废掉跳转) */
function sanitizeUrlAttrs(html: string): string {
  return html.replace(
    /\s(href|src)\s*=\s*"([^"]*)"/gi,
    (whole, attr: string, url: string) => {
      // 属性值此时已是 HTML 实体形式,先解码再判断 —— 否则 &#106;avascript: 之类能绕过
      const decoded = url
        .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
        .replace(/&#(\d+);?/g, (_, d) => String.fromCodePoint(Number(d)))
        .replace(/&colon;/gi, ":")
        .replace(/&amp;/gi, "&")
        // 控制字符/空白被浏览器忽略(java\tscript: 仍会执行)→ 判断前一律剔除
        .replace(/[\u0000-\u0020\u00a0\u2028\u2029]/g, "");
      // data: 只放行图片(data:image/png;base64,… 是 Plain 内嵌图的正常用法)
      if (/^data:image\//i.test(decoded)) return whole;
      return DANGEROUS_URL.test(decoded) ? ` ${attr}="#"` : whole;
    },
  );
}

function md(src: string): string {
  const safe = String(src ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = marked.parse(safe, { gfm: true, breaks: false, async: false }) as string;
  return sanitizeUrlAttrs(html);
}

/**
 * 渲染单个 block:先看模板覆盖,没有再回退兜底 renderer。
 * pathPrefix 用 block.id(不用下标 · 对齐拍板:防插删漂移)。
 */
function renderBlock(block: Block, baseCtx: Omit<RenderCtx, "pathPrefix" | "renderChild">, template?: TemplateV32): string {
  const ctx: RenderCtx = {
    ...baseCtx,
    pathPrefix: `/blocks/${block.id}`,
    // group 递归:子块同样走"模板覆盖 or 兜底"
    renderChild: (child) => renderBlock(child, baseCtx, template),
  };
  const custom = template?.blocks?.[block.type];
  const fn = custom ?? FALLBACK_RENDERERS[block.type];
  return fn(block, ctx);
}

export function renderReport(
  doc: Document,
  template?: TemplateV32,
  opts?: { mode?: "report" | "present"; editable?: boolean },
): string {
  const mode = opts?.mode ?? doc.meta.defaultMode ?? "report";
  const density = doc.meta.density ?? "high";
  const title = doc.meta.title ?? "Untitled";
  const slug = template?.meta.slug ?? "v32-blank";

  // 每个 block renderer 都拿这套复用工具(escape/edit/md 复用 v31 util + marked)
  const baseCtx: Omit<RenderCtx, "pathPrefix" | "renderChild"> = {
    mode,
    density,
    esc: escapeHtml,
    edit: editAttrs,
    md,
  };

  const themeCss = template?.themeCss ?? V32_BLANK_THEME_CSS;
  const fonts = template?.fonts ?? "";

  // editable:注入 VISUAL_EDIT_SCRIPT(点选编辑 + 块手柄 + 拖拽重排)。
  // **默认关** —— 分享链接 / showcase / 导出产物都不该带编辑器脚本;
  // 只有工作台预览显式传 true。
  const editScript = opts?.editable ? VISUAL_EDIT_SCRIPT : "";

  if (mode === "present") {
    return renderPresent(doc, { baseCtx, template, title, slug, fonts, themeCss, editScript });
  }
  return renderReportMode(doc, { baseCtx, template, title, slug, fonts, themeCss, editScript });
}

// ── report mode:垂直流(套 DOC_BASE_CSS + .v32-flow)──────────
function renderReportMode(
  doc: Document,
  ctx: {
    baseCtx: Omit<RenderCtx, "pathPrefix" | "renderChild">;
    template?: TemplateV32;
    title: string;
    slug: string;
    fonts: string;
    themeCss: string;
    editScript: string;
  },
): string {
  const body = doc.blocks.map((b) => renderBlock(b, ctx.baseCtx, ctx.template)).join("\n");
  const pageHtml = `<main class="doc-page"><article class="doc-article v32-flow">${body}</article></main>`;
  return `<!DOCTYPE html>
<html lang="zh-CN" data-plain-template="${escapeHtml(ctx.slug)}" data-plain-kind="report" data-v32-mode="report">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(ctx.title)}</title>
${ctx.fonts}
<style>${DOC_BASE_CSS}</style>
<style>${V32_BLANK_THEME_CSS}</style>
<style>${V32_REPORT_CSS}</style>
<style>${ctx.themeCss}</style>
</head>
<body>
${pageHtml}
${ctx.editScript}
</body>
</html>`;
}

// ── present mode:切屏 letterbox(套 VIEWPORT_BASE_CSS + STAGE_SCALER_JS)──
function renderPresent(
  doc: Document,
  ctx: {
    baseCtx: Omit<RenderCtx, "pathPrefix" | "renderChild">;
    template?: TemplateV32;
    title: string;
    slug: string;
    fonts: string;
    themeCss: string;
    editScript: string;
  },
): string {
  const slides = splitIntoSlides(doc.blocks);
  const slidesHtml = slides
    .map((blocks) => {
      const inner = blocks.map((b) => renderBlock(b, ctx.baseCtx, ctx.template)).join("\n");
      return `<section class="slide"><div class="v32-slide-inner">${inner}</div></section>`;
    })
    .join("\n");

  const chrome = `<div class="pagenum" aria-hidden="true">01 / ${String(slides.length).padStart(2, "0")}</div>${ctx.template?.presentChrome ?? ""}`;

  return `<!DOCTYPE html>
<html lang="zh-CN" data-plain-template="${escapeHtml(ctx.slug)}" data-plain-kind="present" data-v32-mode="present">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(ctx.title)}</title>
${ctx.fonts}
<style>${VIEWPORT_BASE_CSS}</style>
<style>${V32_BLANK_THEME_CSS}</style>
<style>${V32_PRESENT_CSS}</style>
<style>${DECK_PAGE_ANIM_CSS}</style>
<style>${ctx.themeCss}</style>
</head>
<body>
<div class="deck-viewport">
  <div class="deck-stage">
    ${slidesHtml}
    ${chrome}
  </div>
  <button class="deck-nav deck-nav-prev" aria-label="上一页" type="button">‹</button>
  <button class="deck-nav deck-nav-next" aria-label="下一页" type="button">›</button>
  <button class="deck-mode-toggle" aria-label="切换浏览模式" type="button" title="幻灯片 / 长页滚动">☰ 滚动</button>
</div>
<script>${STAGE_SCALER_JS}</script>
${ctx.editScript}
</body>
</html>`;
}

/**
 * 渲一次,同时拿到「存库版」和「工作台版」。
 *
 * ⚠ 为什么值得单独一个函数:多条路径都要同时产出这两份
 * (regenerate-theme / edit-doc / patch-content / edit-content),
 * 而它们原本都写成**调两次 renderReport**。但 editable 的唯一作用是
 * 在 `</body>` 前多塞一段 VISUAL_EDIT_SCRIPT(见上面 editScript 的用法)——
 * 结构、CSS、内容一模一样。为一段固定脚本把 80KB 的文档重渲一遍是纯浪费,
 * 直接在 clean 版上做一次字符串插入即可。
 *
 * 万一将来 editable 变成"会影响结构"的开关,这里的 assert 会失效 ——
 * 所以做了兜底:找不到 </body> 就退回真渲两次,宁可慢也不产出坏 HTML。
 */
export function renderReportPair(
  doc: Document,
  template?: TemplateV32,
  opts?: { mode?: "report" | "present" },
): { html: string; editableHtml: string } {
  const html = renderReport(doc, template, opts);
  // clean 版末尾是 `${pageHtml}\n${editScript}\n</body>`,editScript 为空 → "\n\n</body>"。
  // 脚本要插在这两个换行**之间**(占据 editScript 原本的位置),才和真渲染逐字节一致。
  const marker = "\n\n</body>";
  const at = html.lastIndexOf(marker);
  if (at < 0) {
    // 结构不符合预期 → 老老实实渲第二遍,宁可慢也不产出坏 HTML
    return { html, editableHtml: renderReport(doc, template, { ...opts, editable: true }) };
  }
  const editableHtml =
    html.slice(0, at + 1) + VISUAL_EDIT_SCRIPT + html.slice(at + 1);
  return { html, editableHtml };
}
