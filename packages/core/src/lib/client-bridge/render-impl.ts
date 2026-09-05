/**
 * Render 实现层 —— 纯函数,源 → HTML。
 *
 * 这份代码和 src/app/api/render/route.ts 的 renderDeck/renderDoc/renderSheet
 * 等价(逻辑同步保持)。两边为什么都留:
 * - server route 在 web (SSR) 模式继续跑,延迟低、可预热
 * - 这里在 desktop (Tauri webview) 跑,SSG 后没 server 可用
 *
 * 长期可以让 server route 反向调用本模块以单一来源——但目前两份独立维护,
 * 因为 server route 还有 readOnly 等场景未必每个 desktop 都需要。
 */

import { Marp } from "@/lib/marp-shared";
import { marked } from "marked";
import {
  sourceToSheet,
  replaceRefs,
  parseSheetEmbed,
  resolveRef,
  sheetToHtmlTable,
  type DocKind,
  type SheetDoc,
  type WorkspaceContext,
} from "@/core";
import { VISUAL_EDIT_SCRIPT } from "@/lib/export/visual-edit-script";
import { THEME_TOGGLE_SCRIPT } from "@/lib/render-theme/toggle";
import {
  DOC_CSS,
  parseFrontMatter,
  escapeHtml,
  tokensToDocCss,
} from "@/lib/render-theme/doc";
import { ALL_THEME_TOKENS, resolveThemeAlias } from "@/lib/render-theme/theme-presets";
import {
  ALL_DECK_THEMES,
  DECK_WRAPPER_CSS,
  RICH_LAYOUT_CSS,
} from "@/lib/render-theme/deck";
import { DECK_ANIM_SCRIPT } from "@/lib/render-theme/animations";
import { SHEET_CSS } from "@/lib/render-theme/sheet";
import { normalizeTypography } from "@/lib/render-theme/normalize";
import { tokenizeIcons, expandIconTokens } from "@/lib/render-theme/icons";
import {
  extractMermaidBlocks,
  MERMAID_SCRIPT,
  MERMAID_CSS,
} from "@/lib/render-theme/mermaid";
import {
  expandRichLayouts,
  postProcessRichLayouts,
  extractRichSlides,
} from "@/lib/render-theme/rich-layouts";

export type RenderOpts = {
  themeOverride?: string;
  /** Stage 3:direction picker 选定的临时 ThemeTokens(desktop 暂不支持,会被忽略) */
  customTokens?: unknown;
  animate?: boolean;
  readOnly?: boolean;
};

export function renderHtml(
  kind: DocKind,
  source: string,
  workspace: WorkspaceContext,
  opts: RenderOpts = {},
): string {
  const expanded = tokenizeIcons(
    normalizeTypography(
      kind === "sheet" ? source : expandEmbeds(expandRefs(source, workspace), workspace),
    ),
  );
  switch (kind) {
    case "deck":
      return renderDeck(expanded, opts);
    case "doc":
      return renderDoc(expanded, opts);
    case "sheet":
      return renderSheet(expanded, opts);
  }
}

function expandRefs(src: string, ws: WorkspaceContext): string {
  return replaceRefs(src, (ref) => {
    const r = resolveRef(ref, ws);
    if (!r.ok) return `⟨${ref.raw}: ${r.reason}⟩`;
    return r.inline;
  });
}

function expandEmbeds(src: string, ws: WorkspaceContext): string {
  return src
    .split("\n")
    .map((line) => {
      const embed = parseSheetEmbed(line.trim());
      if (!embed) return line;
      const target = ws.find((d) => d.id === embed.docId && d.kind === "sheet");
      if (!target) return `⟨${embed.raw}: sheet:${embed.docId} 不存在⟩`;
      try {
        const sheet = sourceToSheet(target.source);
        return sheetToHtmlTable(sheet, embed.columns, embed.limit);
      } catch (e) {
        return `⟨${embed.raw}: 解析失败 ${String(e)}⟩`;
      }
    })
    .join("\n");
}

// ─────────────────────────────────────────────────────────────
// Deck
// ─────────────────────────────────────────────────────────────
function renderDeck(src: string, opts: RenderOpts): string {
  const marp = new Marp({ html: true });
  for (const theme of ALL_DECK_THEMES) {
    try {
      marp.themeSet.add(theme.css + "\n" + RICH_LAYOUT_CSS);
    } catch {
      // 重复注册忽略
    }
  }

  const richSlides = extractRichSlides(src);
  const enriched = expandRichLayouts(src);

  const validIds = new Set(ALL_DECK_THEMES.map((t) => t.id));
  let srcWithTheme = enriched;
  // 旧 id (swiss-yellow / guizang-indigo 等) 先 resolve 到代表主题
  const effectiveOverride = opts.themeOverride
    ? resolveThemeAlias(opts.themeOverride) ?? opts.themeOverride
    : undefined;
  if (effectiveOverride && validIds.has(effectiveOverride)) {
    srcWithTheme = srcWithTheme
      .replace(/^(---[\s\S]*?)\ntheme:\s*\S+([\s\S]*?\n---)/m, "$1$2")
      .replace(/^---\s*\n/, `---\ntheme: ${effectiveOverride}\n`);
  } else {
    // 没显式 override 时,自动把 frontmatter 旧 theme id alias 到代表主题
    const frontThemeMatch = enriched.match(/^---[\s\S]*?\ntheme:\s*(\S+)[\s\S]*?\n---/m);
    if (frontThemeMatch) {
      const aliased = resolveThemeAlias(frontThemeMatch[1]);
      if (aliased && aliased !== frontThemeMatch[1]) {
        srcWithTheme = srcWithTheme.replace(
          /^(---[\s\S]*?\ntheme:\s*)\S+([\s\S]*?\n---)/m,
          `$1${aliased}$2`,
        );
      }
    } else {
      srcWithTheme = srcWithTheme.replace(/^---\s*\n/, "---\ntheme: plain-mono\n");
    }
  }

  const { html, css } = marp.render(srcWithTheme);
  const animate = opts.animate !== false;

  const htmlWithMermaid = html.replace(
    /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
    (_m, code) => `<pre class="mermaid">${decodeEntities(code)}</pre>`,
  );
  const hasMermaid = htmlWithMermaid.includes('class="mermaid"');
  const htmlWithRich = postProcessRichLayouts(htmlWithMermaid, richSlides);
  const finalHtml = expandIconTokens(htmlWithRich);

  return `<!doctype html>
<html data-plain-kind="deck"><head>
<meta charset="utf-8">
<style>${DECK_WRAPPER_CSS}</style>
<style>${css}</style>
${hasMermaid ? `<style>${MERMAID_CSS}</style>` : ""}
</head><body>${finalHtml}${animate ? DECK_ANIM_SCRIPT : ""}${THEME_TOGGLE_SCRIPT}${opts.readOnly ? "" : VISUAL_EDIT_SCRIPT}${hasMermaid ? MERMAID_SCRIPT : ""}</body></html>`;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

// ─────────────────────────────────────────────────────────────
// Doc
// ─────────────────────────────────────────────────────────────
function renderDoc(src: string, opts: RenderOpts): string {
  const { body: bodyMd, front } = parseFrontMatter(src);
  const stripped0 = bodyMd.replace(/<!--\s*id:[a-zA-Z0-9_-]+\s*-->\s*\n?/g, "");
  const { src: stripped, hasMermaid } = extractMermaidBlocks(stripped0);

  let bodyHtml = marked.parse(stripped, { gfm: true, breaks: false }) as string;
  bodyHtml = bodyHtml.replace(
    /<pre><code class="language-([^"]+)">/g,
    '<pre data-lang="$1"><code class="language-$1">',
  );
  bodyHtml = expandIconTokens(bodyHtml);

  const title = front.title ?? extractFirstH1(bodyMd) ?? "Untitled";
  const meta: string[] = [];
  if (front.author) meta.push(`<span>${escapeHtml(front.author)}</span>`);
  if (front.date) {
    if (meta.length > 0) meta.push(`<span class="dot">·</span>`);
    meta.push(`<span>${escapeHtml(front.date)}</span>`);
  }

  const hero = `
<header class="plain-hero">
  <div class="kicker">Plain Doc</div>
  <h1>${escapeHtml(title)}</h1>
  ${meta.length ? `<div class="meta">${meta.join("")}</div>` : ""}
</header>`;

  if (front.title || extractFirstH1(bodyMd)) {
    bodyHtml = bodyHtml.replace(/<h1[^>]*>[^<]*<\/h1>\s*/, "");
  }

  // 主题 resolve 顺序:opts.themeOverride > frontmatter theme > 默认 DOC_CSS。
  // 找不到对应 token → 静默 fallback 默认,不报错(老 doc 无 frontmatter 行为不变)。
  // 旧 id 先过 resolveThemeAlias 落到代表主题(swiss-yellow → swiss-ikb 等)。
  const rawThemeId = opts.themeOverride ?? front.theme;
  const themeId = rawThemeId ? resolveThemeAlias(rawThemeId) ?? rawThemeId : undefined;
  const tokens = themeId
    ? ALL_THEME_TOKENS.find((t) => t.id === themeId)
    : undefined;
  const cssBlock = tokens ? tokensToDocCss(tokens) : DOC_CSS;

  return `<!doctype html>
<html data-plain-kind="doc"><head>
<meta charset="utf-8">
<style>${cssBlock}</style>
${hasMermaid ? `<style>${MERMAID_CSS}</style>` : ""}
</head>
<body>
<article>${hero}${bodyHtml}</article>
${THEME_TOGGLE_SCRIPT}${opts.readOnly ? "" : VISUAL_EDIT_SCRIPT}${hasMermaid ? MERMAID_SCRIPT : ""}
</body></html>`;
}

function extractFirstH1(md: string): string | null {
  const m = md.match(/^\s*#\s+(.+?)\s*$/m);
  return m ? m[1].trim() : null;
}

// ─────────────────────────────────────────────────────────────
// Sheet
// ─────────────────────────────────────────────────────────────
function renderSheet(src: string, opts: RenderOpts): string {
  const doc = sourceToSheet(src);
  const thead = `<tr>${doc.columns.map((c) => `<th>${esc(c.label)}</th>`).join("")}</tr>`;
  const tbody = doc.rows
    .map(
      (r) =>
        `<tr>${doc.columns
          .map((c) => {
            const v = String(r[c.key] ?? "");
            const isNum = c.type === "number" || c.type === "date";
            return `<td${isNum ? ' class="num"' : ""}>${esc(v)}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("");

  const charts = renderChartCards(doc);
  const { src: narrativeWithMermaid, hasMermaid: narrativeHasMermaid } =
    extractMermaidBlocks(doc.narrative ?? "");
  const narrativeHtml = narrativeWithMermaid
    ? expandIconTokens(marked.parse(narrativeWithMermaid, { gfm: true, breaks: false }) as string)
    : "";

  return `<!doctype html>
<html data-plain-kind="sheet"><head>
<meta charset="utf-8">
<style>${SHEET_CSS}</style>
${narrativeHasMermaid ? `<style>${MERMAID_CSS}</style>` : ""}
</head>
<body>
<div class="container">
  <header class="sheet-hero">
    <div class="kicker">Plain Sheet</div>
    <h1>${esc(doc.title)}</h1>
    <div class="meta">
      <span class="chip">${doc.columns.length} 列</span>
      <span class="chip">${doc.rows.length} 行</span>
      ${doc.charts.length > 0 ? `<span class="chip">${doc.charts.length} 个图表</span>` : ""}
    </div>
  </header>

  <div class="table-wrap">
    <table>
      <thead>${thead}</thead>
      <tbody>${tbody}</tbody>
    </table>
  </div>

  ${
    doc.charts.length > 0
      ? `<h2 class="sheet-section-title">图表</h2>
  <div class="charts-grid">${charts}</div>`
      : ""
  }

  ${
    narrativeHtml
      ? `<h2 class="sheet-section-title">分析</h2>
  <article>${narrativeHtml}</article>`
      : ""
  }
</div>
${THEME_TOGGLE_SCRIPT}${opts.readOnly ? "" : VISUAL_EDIT_SCRIPT}${narrativeHasMermaid ? MERMAID_SCRIPT : ""}
</body></html>`;
}

function renderChartCards(doc: SheetDoc): string {
  return doc.charts
    .map(
      (c) => `
<div class="chart-card">
  <div class="kicker">${esc(c.type.toUpperCase())}</div>
  <div class="title">${esc(c.title)}</div>
  <div class="axes">x: ${esc(c.xKey)} · y: ${esc(c.yKeys.join(", "))}</div>
</div>`,
    )
    .join("");
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
