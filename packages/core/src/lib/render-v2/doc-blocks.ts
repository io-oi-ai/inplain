/**
 * Plain v2 · Doc block renderers
 *
 * Doc 跟 deck 的差异:
 *   - 主要内容是 markdown(md block kind),用 marked 渲染
 *   - 富块用 ::: flow / ::: data-block / ::: callout / ::: numbered 等
 *   - hero 是文档头(kicker + h1 + deck/lead + meta + reading time)
 *
 * 本模块负责:
 *   - block-level 富块的 HTML 渲染(flow / data-block / numbered / pull-quote / hero)
 *   - 共享 doc CSS(长文版式 + TOC + sticky nav)
 *
 * MD 渲染走 lib/marked,callout 在 parse-dsl 已经特殊处理。
 */

import { marked } from "marked";
import { escapeHtml, escapeAttr } from "./chrome";
import { renderChartFenced, renderMermaidFenced } from "./fenced-extensions";
import { renderCodeBlock } from "./code-block";

// 一次性挂上 fenced code 扩展:识别 ```chart / ```mermaid,其他 lang 走默认。
// 调用 renderMd / renderMdInline 都受影响。
let _fencedExtRegistered = false;
function ensureFencedExt(): void {
  if (_fencedExtRegistered) return;
  _fencedExtRegistered = true;
  marked.use({
    renderer: {
      code(token) {
        const info = (token.lang ?? "").trim();
        // 第一个词是语言;title=/{行号} 等修饰留给 renderCodeBlock 解析
        const lang = (info.match(/^([A-Za-z0-9_+-]+)/)?.[1] ?? "").toLowerCase();
        const text = token.text ?? "";
        if (lang === "chart") return renderChartFenced(text);
        if (lang === "mermaid") return renderMermaidFenced(text);
        // 增强代码块:行号 + 标题 + 复制 + 轻量高亮 + 高亮行/diff
        return renderCodeBlock(text, info);
      },
      link(token) {
        const href = token.href ?? "";
        const title = token.title ?? "";
        // Tooltip 语法:[文字](#tip "提示内容") 或 [文字](# "提示内容")
        if ((href === "#tip" || href === "#" || href === "") && title) {
          const inner = this.parser?.parseInline(token.tokens ?? []) ?? escapeHtml(token.text ?? "");
          return `<span class="plain-tip" data-tip="${escapeAttr(title)}" tabindex="0">${inner}</span>`;
        }
        // 默认链接(保留 marked 行为)
        const inner = this.parser?.parseInline(token.tokens ?? []) ?? escapeHtml(token.text ?? "");
        const titleAttr = title ? ` title="${escapeAttr(title)}"` : "";
        const ext = /^https?:\/\//.test(href) ? ` target="_blank" rel="noopener"` : "";
        return `<a href="${escapeAttr(href)}"${titleAttr}${ext}>${inner}</a>`;
      },
    },
  });
}

export type BlockData = Record<string, unknown>;

// ─────────────────────────────────────────────
// block renderers
// ─────────────────────────────────────────────

export function renderDocSection(
  name: string,
  variant: string | undefined,
  data: BlockData,
): string {
  switch (name) {
    case "hero":
      return renderHero(data);
    case "flow":
      return renderFlow(data);
    case "data-block":
      return renderDataBlock(data);
    case "numbered":
      return renderNumbered(data);
    case "pull-quote":
      return renderPullQuote(data);
    default:
      return renderUnknown(name, variant, data);
  }
}

function renderHero(d: BlockData): string {
  const kicker = str(d.kicker);
  const title = str(d.title);
  const tail = str(d["display-tail"]);
  const deck = str(d.deck);
  const meta = arrStr(d.meta);
  return `<header class="plain-doc-hero">
  ${kicker ? `<div class="plain-doc-kicker">${escapeHtml(kicker)}</div>` : ""}
  <h1>${escapeHtml(title)}${tail ? `<span class="tail">${escapeHtml(tail)}</span>` : ""}</h1>
  ${deck ? `<p class="plain-doc-deck">${escapeHtml(deck)}</p>` : ""}
  ${
    meta.length > 0
      ? `<div class="plain-doc-meta">${meta.map((m) => `<span>${escapeHtml(m)}</span>`).join("")}</div>`
      : ""
  }
</header>`;
}

function renderFlow(d: BlockData): string {
  const caption = str(d.caption);
  const nodes = arrObj(d.nodes);
  const items = nodes
    .map((n, i) => {
      const tone = str(n.tone);
      const cls = ["risk", "warn", "win", "ok", "positive"].includes(tone)
        ? ` ${tone}`
        : "";
      return `<div class="plain-flow-node${cls}">
        ${n.label ? `<div class="lbl">${escapeHtml(str(n.label))}</div>` : ""}
        ${n.head ? `<div class="head">${escapeHtml(str(n.head))}</div>` : ""}
        ${n.body ? `<div class="body">${escapeHtml(str(n.body))}</div>` : ""}
      </div>${i < nodes.length - 1 ? `<div class="plain-flow-arrow">→</div>` : ""}`;
    })
    .join("");
  return `<div class="plain-flow-block">
    ${caption ? `<div class="plain-flow-caption">${escapeHtml(caption)}</div>` : ""}
    <div class="plain-flow">${items}</div>
  </div>`;
}

function renderDataBlock(d: BlockData): string {
  const title = str(d.title);
  const headline = str(d.headline);
  const note = str(d.note);
  const bars = arrObj(d.bars);
  const barsHtml = bars
    .map((b) => {
      const tone = str(b.tone);
      const cls = ["bad", "warn", "positive"].includes(tone) ? ` ${tone}` : "";
      const value = num(b.value);
      const display = str(b.display) || (typeof b.value === "number" ? `${b.value}` : "");
      return `<div class="plain-bar-row${cls}">
        <span class="lbl">${escapeHtml(str(b.label))}</span>
        <div class="track"><div class="fill" style="width: 100%; transform: scaleX(${Math.max(0, Math.min(100, value)) / 100})"></div></div>
        <span class="val">${escapeHtml(display)}</span>
      </div>`;
    })
    .join("");
  return `<div class="plain-data-block">
    ${title ? `<div class="data-title">${escapeHtml(title)}</div>` : ""}
    ${headline ? `<div class="data-headline">${renderMdInline(headline)}</div>` : ""}
    ${barsHtml}
    ${note ? `<p class="data-note">${escapeHtml(note)}</p>` : ""}
  </div>`;
}

function renderNumbered(d: BlockData): string {
  const items = arrObj(d.items);
  const li = items
    .map(
      (it) => `<li>
        ${it.head ? `<h4>${escapeHtml(str(it.head))}</h4>` : ""}
        ${it.body ? `<p>${renderMdInline(str(it.body))}</p>` : ""}
      </li>`,
    )
    .join("");
  return `<ol class="plain-numbered">${li}</ol>`;
}

function renderPullQuote(d: BlockData): string {
  const text = str(d.text);
  const attr = str(d.attribution);
  return `<blockquote class="plain-pull">
    <p>${renderMdInline(text)}</p>
    ${attr ? `<cite>${escapeHtml(attr)}</cite>` : ""}
  </blockquote>`;
}

function renderUnknown(name: string, variant: string | undefined, d: BlockData): string {
  return `<div class="plain-doc-unknown">
    <div class="lbl">UNKNOWN ${escapeHtml(name)}${variant ? ` · ${escapeHtml(variant)}` : ""}</div>
    <pre>${escapeHtml(JSON.stringify(d, null, 2))}</pre>
  </div>`;
}

// ─────────────────────────────────────────────
// callout
// ─────────────────────────────────────────────

// callout 变体 → inline SVG 图标(零依赖,跟随 currentColor)
const CALLOUT_ICONS: Record<string, string> = {
  info: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>`,
  warn: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>`,
  danger: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></svg>`,
  ok: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>`,
  tip: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.7 1 1.2 1 2.5h6c0-1.3.2-1.8 1-2.5A6 6 0 0 0 12 3z"/></svg>`,
  note: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v12l-4 4H4z"/><path d="M16 20v-4h4"/></svg>`,
};
const CALLOUT_DEFAULT_TITLE: Record<string, string> = {
  info: "提示", warn: "注意", danger: "警告", ok: "完成", tip: "建议", note: "备注",
};

export function renderCallout(variant: string, body: string): string {
  const v = variant in CALLOUT_ICONS ? variant : "info";
  const icon = CALLOUT_ICONS[v];
  // body 首行若是 `**标题**`(独占一行) → 提为 callout 标题
  let title = "";
  let rest = body;
  const tm = body.match(/^\s*\*\*(.+?)\*\*\s*(?:\n([\s\S]*))?$/);
  if (tm) {
    title = tm[1];
    rest = tm[2] ?? "";
  }
  const html = rest.trim() ? renderMd(rest) : "";
  return `<div class="plain-callout plain-callout-${escapeAttr(v)}">
    <div class="callout-icon" aria-hidden="true">${icon}</div>
    <div class="callout-content">
      <div class="callout-title">${escapeHtml(title || CALLOUT_DEFAULT_TITLE[v])}</div>
      ${html}
    </div>
  </div>`;
}

// ─────────────────────────────────────────────
// markdown
// ─────────────────────────────────────────────

/** 用于段落级 markdown,跑完整 marked */
export function renderMd(text: string): string {
  ensureFencedExt();
  return marked.parse(text, { gfm: true, breaks: false }) as string;
}

/** 用于行内 markdown(标题 / 引文 / data-block headline),不包 <p> */
export function renderMdInline(text: string): string {
  ensureFencedExt();
  const html = marked.parseInline(text, { gfm: true }) as string;
  return html;
}

// ─────────────────────────────────────────────
// TOC builder
// ─────────────────────────────────────────────

export type TocItem = { id: string; text: string };

/** 从渲染后的 doc body HTML 提 h2 作 TOC(自动 id 化,要在 renderMd 之前 / 之后跑) */
export function extractToc(bodyHtml: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const replaced = bodyHtml.replace(
    /<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/g,
    (_m, attrs: string, inner: string) => {
      const text = stripTags(inner).trim();
      const id = slugify(text);
      toc.push({ id, text });
      return `<h2 id="${escapeAttr(id)}"${attrs ?? ""}>${inner}</h2>`;
    },
  );
  return { html: replaced, toc };
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9一-龥]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "section";
}

// ─────────────────────────────────────────────
// CSS · long-form layout
// ─────────────────────────────────────────────

export const DOC_CSS = `
/* container · 左 sticky TOC + 右文章
 * V27-U · padding 上 64→96 / 下 120→160 · TOC-article gap 64→80 */
.plain-doc-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 96px 32px 160px;
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 80px;
}
@media (max-width: 900px) { .plain-doc-container { grid-template-columns: 1fr; } }

aside.plain-toc {
  position: sticky; top: 80px;
  align-self: start;
  height: max-content;
  font-family: var(--plain-font-ui);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
}
@media (max-width: 900px) { aside.plain-toc { display: none; } }
aside.plain-toc h4 {
  color: var(--plain-ink-mute);
  font-weight: 500;
  margin-bottom: 12px;
  font-size: 10px;
  letter-spacing: 0.22em;
}
aside.plain-toc ul { list-style: none; padding: 0; }
aside.plain-toc li { padding: 4px 0; }
aside.plain-toc a {
  color: var(--plain-ink-mute);
  text-decoration: none;
  display: block;
  padding: 2px 0 2px 12px;
  border-left: 2px solid transparent;
  transition: color var(--plain-dur-fast) var(--plain-ease-ui), border-left-color var(--plain-dur-fast) var(--plain-ease-ui);
}
aside.plain-toc a:hover, aside.plain-toc a.active {
  color: var(--plain-ink);
  border-left-color: var(--plain-accent);
}

article.plain-article { max-width: 720px; }

/* hero
 * V27-U · margin 64→96 · padding 48→64 · 让 hero 跟正文有明显呼吸断点 */
.plain-doc-hero {
  margin-bottom: 96px;
  padding-bottom: 64px;
  border-bottom: 1px solid var(--plain-rule);
}
.plain-doc-kicker {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--plain-font-ui);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: var(--plain-accent);
  margin-bottom: 20px;
  font-weight: 500;
}
.plain-doc-hero h1 {
  font-family: var(--plain-font-display);
  font-size: clamp(2.4rem, 6vw, 3.6rem);
  line-height: 1.1;
  letter-spacing: -0.018em;
  font-weight: 500;
  margin-bottom: 12px;
  color: var(--plain-ink);
}
.plain-doc-hero h1 .tail {
  display: block;
  color: var(--plain-accent);
  font-style: italic;
  margin-top: 8px;
}
.plain-doc-deck {
  font-style: italic;
  color: var(--plain-ink-soft);
  font-size: 20px;
  line-height: 1.5;
  margin-top: 24px;
  margin-bottom: 28px;
}
.plain-doc-meta {
  display: flex; flex-wrap: wrap; gap: 24px;
  font-family: var(--plain-font-ui);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--plain-ink-mute);
}

/* V27-U · doc 纵向间距升级 · 用户反馈"内容挤压"
   - h2 margin-top 64→88 · 让 section 之间真有断点
   - h3 margin-top 32→48
   - p margin-bottom 20→28 · 段落呼吸感
   - p line-height 默认→1.78(长读体验对齐 Stripe Press / Medium) */
article.plain-article h2 {
  font-family: var(--plain-font-display);
  font-weight: 500;
  font-size: 28px;
  line-height: 1.3;
  margin-top: 88px;
  margin-bottom: 24px;
  color: var(--plain-ink);
  letter-spacing: -0.015em;
  scroll-margin-top: 96px;
}
article.plain-article h3 {
  font-family: var(--plain-font-display);
  font-size: 21px;
  font-weight: 500;
  margin-top: 48px;
  margin-bottom: 16px;
  color: var(--plain-ink);
}
article.plain-article p {
  margin-bottom: 28px;
  line-height: 1.78;
  color: var(--plain-ink-soft);
}
article.plain-article h2 + p::first-letter {
  font-family: var(--plain-font-display);
  font-size: 4em;
  line-height: 0.85;
  float: left;
  margin: 0.1em 0.1em 0 0;
  color: var(--plain-accent);
  font-weight: 500;
}
article.plain-article strong {
  font-weight: 600;
  color: var(--plain-ink);
  text-decoration: underline;
  text-decoration-color: var(--plain-accent);
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
}
article.plain-article em {
  font-style: italic;
  color: var(--plain-accent);
}
article.plain-article a {
  color: var(--plain-accent);
  text-decoration: none;
  border-bottom: 1px solid var(--plain-accent-soft);
}
article.plain-article a:hover { border-bottom-color: var(--plain-accent); }
article.plain-article ul, article.plain-article ol {
  margin: 24px 0 36px 8px;
  padding-left: 20px;
}
article.plain-article li {
  margin-bottom: 12px;
  line-height: 1.7;
  color: var(--plain-ink-soft);
}
article.plain-article li::marker { color: var(--plain-accent); }

/* table */
article.plain-article table {
  width: 100%;
  border-collapse: collapse;
  margin: 24px 0;
  font-family: var(--plain-font-ui);
  font-size: 14px;
}
article.plain-article table th {
  text-align: left;
  padding: 12px;
  border-bottom: 2px solid var(--plain-ink);
  color: var(--plain-ink-mute);
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.14em;
}
article.plain-article table td {
  padding: 12px;
  border-bottom: 1px solid var(--plain-rule);
  color: var(--plain-ink-soft);
  vertical-align: top;
}
article.plain-article table tr:hover td { background: var(--plain-surface); }
article.plain-article table td strong { text-decoration: none; color: var(--plain-ink); }

/* code */
article.plain-article code {
  font-family: var(--plain-font-mono);
  font-size: 0.88em;
  background: var(--plain-surface);
  padding: 1px 6px;
  border-radius: 3px;
}

/* ─────────── flow block ─────────── */
.plain-flow-block {
  margin: 32px -8px;
  padding: 28px 24px;
  background: var(--plain-surface);
  border-radius: 8px;
  border: 1px solid var(--plain-rule);
}
.plain-flow-caption {
  font-family: var(--plain-font-ui);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--plain-ink-mute);
  margin-bottom: 18px;
  display: flex; align-items: center; gap: 8px;
  font-weight: 500;
}
.plain-flow-caption::before { content: "◆"; color: var(--plain-accent); font-size: 10px; }
.plain-flow {
  display: flex; gap: 12px; align-items: stretch; overflow-x: auto;
}
.plain-flow-node {
  flex: 1; min-width: 160px;
  padding: 16px 14px;
  background: var(--plain-raised);
  border: 1px solid var(--plain-rule);
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.4;
  color: var(--plain-ink);
}
.plain-flow-node .lbl {
  font-family: var(--plain-font-ui);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--plain-ink-mute);
  margin-bottom: 8px;
  font-weight: 500;
}
.plain-flow-node .head {
  font-family: var(--plain-font-display);
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--plain-ink);
}
.plain-flow-node .body {
  font-size: 13px;
  color: var(--plain-ink-soft);
  line-height: 1.55;
}
.plain-flow-node.risk { border-color: var(--plain-negative); background: color-mix(in srgb, var(--plain-negative) 6%, transparent); }
.plain-flow-node.risk .lbl { color: var(--plain-negative); }
.plain-flow-node.warn { border-color: #d97048; background: #fef9f3; }
.plain-flow-node.warn .lbl { color: #d97048; }
.plain-flow-node.win, .plain-flow-node.ok, .plain-flow-node.positive {
  border-color: var(--plain-positive);
  background: color-mix(in srgb, var(--plain-positive) 8%, transparent);
}
.plain-flow-node.win .lbl, .plain-flow-node.ok .lbl, .plain-flow-node.positive .lbl {
  color: var(--plain-positive);
}
.plain-flow-arrow {
  display: flex; align-items: center;
  color: var(--plain-ink-mute);
  font-size: 20px;
  font-family: var(--plain-font-mono);
}
@media (max-width: 720px) {
  .plain-flow { flex-direction: column; }
  .plain-flow-arrow { transform: rotate(90deg); justify-content: center; padding: 4px 0; }
}

/* ─────────── data block ─────────── */
.plain-data-block {
  margin: 32px 0;
  padding: 28px 24px;
  background: var(--plain-surface);
  border-radius: 8px;
  border: 1px solid var(--plain-rule);
}
.plain-data-block .data-title {
  font-family: var(--plain-font-ui);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: var(--plain-ink-mute);
  margin-bottom: 4px;
  font-weight: 500;
}
.plain-data-block .data-headline {
  font-family: var(--plain-font-display);
  font-size: 22px;
  color: var(--plain-ink);
  margin-bottom: 24px;
  font-weight: 500;
  line-height: 1.3;
}
.plain-data-block .data-headline strong {
  color: var(--plain-accent);
  text-decoration: none;
}
.plain-bar-row {
  display: grid; grid-template-columns: 160px 1fr 100px; gap: 16px;
  align-items: center;
  margin-bottom: 12px;
  font-family: var(--plain-font-mono);
  font-size: 13px;
}
.plain-bar-row .lbl { color: var(--plain-ink-soft); }
.plain-bar-row .track {
  height: 10px;
  background: var(--plain-raised);
  border-radius: 4px;
  border: 1px solid var(--plain-rule);
  overflow: hidden;
}
.plain-bar-row .fill {
  height: 100%;
  background: var(--plain-accent);
  border-radius: 3px;
  transform-origin: left;
  transition: transform 0.6s var(--plain-ease-data);
}
.plain-bar-row.bad .fill { background: var(--plain-negative); }
.plain-bar-row.warn .fill { background: #d97048; }
.plain-bar-row.positive .fill { background: var(--plain-positive); }
.plain-bar-row .val {
  text-align: right;
  color: var(--plain-ink);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.plain-data-block .data-note {
  margin-top: 16px;
  font-family: var(--plain-font-ui);
  font-size: 11px;
  color: var(--plain-ink-mute);
  font-style: italic;
}

/* callout · 图标徽章 + 全填充(不用 side-stripe) */
.plain-callout {
  margin: 24px 0;
  padding: 16px 18px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  border: 1px solid color-mix(in srgb, var(--plain-accent) 24%, transparent);
  background: var(--plain-accent-soft, color-mix(in srgb, var(--plain-accent) 7%, transparent));
  border-radius: 10px;
}
.plain-callout .callout-icon {
  width: 30px; height: 30px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--plain-accent) 16%, transparent);
  color: var(--plain-accent);
  flex-shrink: 0;
}
.plain-callout .callout-content { min-width: 0; }
.plain-callout .callout-title {
  font-weight: 600; font-size: 14px; margin-bottom: 4px;
  color: var(--plain-accent);
}
.plain-callout .callout-content > :first-child:not(.callout-title) { margin-top: 0; }
.plain-callout p {
  margin: 0;
  color: var(--plain-ink-soft);
  font-size: 15px;
  line-height: 1.6;
}
.plain-callout p + p { margin-top: 8px; }
.plain-callout p strong { color: var(--plain-ink); text-decoration: none; }
.plain-callout-warn   { --plain-accent: #d97048; border-color: color-mix(in srgb, #d97048 28%, transparent); background: color-mix(in srgb, #d97048 8%, transparent); }
.plain-callout-danger { --plain-accent: var(--plain-negative,#e5484d); border-color: color-mix(in srgb, var(--plain-negative,#e5484d) 28%, transparent); background: color-mix(in srgb, var(--plain-negative,#e5484d) 8%, transparent); }
.plain-callout-ok     { --plain-accent: var(--plain-positive,#30a46c); border-color: color-mix(in srgb, var(--plain-positive,#30a46c) 28%, transparent); background: color-mix(in srgb, var(--plain-positive,#30a46c) 8%, transparent); }
.plain-callout-tip    { --plain-accent: #8b5cf6; border-color: color-mix(in srgb, #8b5cf6 28%, transparent); background: color-mix(in srgb, #8b5cf6 8%, transparent); }
.plain-callout-note   { --plain-accent: #6b7280; border-color: color-mix(in srgb, #6b7280 28%, transparent); background: color-mix(in srgb, #6b7280 8%, transparent); }

/* Tooltip 悬浮注释 · [文字](#tip "提示内容") 或 <abbr> */
.plain-tip {
  border-bottom: 1px dashed currentColor;
  cursor: help; position: relative;
}
.plain-tip:focus { outline: none; }
.plain-tip:focus-visible { outline: 2px solid var(--plain-accent); outline-offset: 2px; }
.plain-tip::after {
  content: attr(data-tip);
  position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%) translateY(-6px);
  background: var(--plain-ink, #1f1f22); color: var(--plain-bg, #fff);
  padding: 6px 10px; border-radius: 6px; font-size: 12px; line-height: 1.4;
  white-space: normal; width: max-content; max-width: 240px;
  opacity: 0; pointer-events: none; transition: opacity .15s, transform .15s;
  z-index: 50; box-shadow: 0 4px 16px rgba(0,0,0,.18);
}
.plain-tip:hover::after, .plain-tip:focus::after { opacity: 1; transform: translateX(-50%) translateY(-10px); }

/* numbered list (3 件事) */
ol.plain-numbered {
  list-style: none;
  counter-reset: section;
  margin: 32px 0;
  padding: 0;
}
ol.plain-numbered > li {
  counter-increment: section;
  padding: 24px 0 24px 64px;
  position: relative;
  border-bottom: 1px solid var(--plain-rule);
}
ol.plain-numbered > li:last-child { border-bottom: none; }
ol.plain-numbered > li::before {
  content: counter(section, decimal-leading-zero);
  position: absolute;
  left: 0; top: 28px;
  font-family: var(--plain-font-display);
  font-size: 32px;
  color: var(--plain-accent);
  font-weight: 500;
  line-height: 1;
}
ol.plain-numbered > li h4 {
  font-family: var(--plain-font-display);
  font-size: 21px;
  font-weight: 500;
  margin-bottom: 8px;
  line-height: 1.3;
  color: var(--plain-ink);
}
ol.plain-numbered > li p { font-size: 17px; margin: 0; color: var(--plain-ink-soft); }

/* pull quote */
blockquote.plain-pull {
  margin: 40px -16px;
  padding: 32px;
  border-left: 4px solid var(--plain-accent);
  background: var(--plain-accent-soft);
  border-radius: 0 6px 6px 0;
}
blockquote.plain-pull p {
  font-family: var(--plain-font-display);
  font-style: italic;
  font-size: 22px;
  line-height: 1.5;
  color: var(--plain-ink);
  margin-bottom: 12px;
}
blockquote.plain-pull cite {
  font-family: var(--plain-font-ui);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--plain-ink-mute);
  font-style: normal;
}

/* unknown fallback */
.plain-doc-unknown {
  margin: 24px 0;
  padding: 16px;
  border: 1px dashed var(--plain-ink-mute);
  border-radius: 6px;
  background: var(--plain-surface);
}
.plain-doc-unknown .lbl {
  font-family: var(--plain-font-ui);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--plain-ink-mute);
  margin-bottom: 8px;
}
.plain-doc-unknown pre {
  font-family: var(--plain-font-mono);
  font-size: 12px;
  color: var(--plain-ink-soft);
  overflow-x: auto;
}
`;

// ─────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────

function str(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

function arrStr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? ""));
}

function arrObj(v: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null);
}

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}
