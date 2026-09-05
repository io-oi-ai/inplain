/**
 * Doc 预览：Medium 杂志风
 * - 衬线标题（中英混排），无衬线正文（行高 1.8）
 * - Hero 区：大标题 + meta（作者、日期）
 * - 首段 drop-cap（首字下沉）
 * - 引用块左侧细线、斜体
 * - 代码块 copy 按钮
 * - 列表精细 marker
 * - 明暗 tokens via :root / [data-theme="dark"]
 */

import { DOC_PRINT_CSS } from "./doc-print";
import type { ThemeTokens } from "./tokens";

const DOC_BASE_CSS = `
:root {
  /* light theme（默认） */
  --plain-bg: #fbfbfa;
  --plain-bg-raised: #ffffff;
  --plain-text-primary: #1a1a1a;
  --plain-text-secondary: #4a4a4a;
  --plain-text-tertiary: #8a8a8a;
  --plain-border: #e5e5e5;
  --plain-border-strong: #cccccc;
  --plain-accent: #1a1a1a;
  --plain-link: #2563eb;
  --plain-code-bg: #f4f4f3;
  --plain-quote-border: #1a1a1a;
  --plain-selection: rgba(37, 99, 235, 0.18);
}
[data-theme="dark"] {
  --plain-bg: #0f0f10;
  --plain-bg-raised: #18181a;
  --plain-text-primary: #ededed;
  --plain-text-secondary: #b4b4b4;
  --plain-text-tertiary: #777777;
  --plain-border: #2a2a2d;
  --plain-border-strong: #3a3a3d;
  --plain-accent: #ededed;
  --plain-link: #60a5fa;
  --plain-code-bg: #1f1f22;
  --plain-quote-border: #60a5fa;
  --plain-selection: rgba(96, 165, 250, 0.28);
}

* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background: var(--plain-bg);
  color: var(--plain-text-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-family: "Inter", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  font-size: 17px;
  line-height: 1.75;
  letter-spacing: 0.003em;
}
::selection { background: var(--plain-selection); }

article {
  max-width: 700px;
  margin: 0 auto;
  padding: 56px 24px 96px;
}

/* Hero */
.plain-hero {
  margin-bottom: 48px;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--plain-border);
}
.plain-hero .kicker {
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--plain-text-tertiary);
  margin-bottom: 12px;
  font-weight: 500;
}
.plain-hero h1 {
  font-family: "Charter", "Source Han Serif SC", "Noto Serif SC", Georgia, serif;
  font-size: 42px;
  line-height: 1.2;
  letter-spacing: -0.015em;
  margin: 0 0 16px;
  color: var(--plain-text-primary);
  font-weight: 700;
}
.plain-hero .meta {
  color: var(--plain-text-tertiary);
  font-size: 14px;
  display: flex;
  gap: 12px;
  align-items: center;
}
.plain-hero .meta .dot { opacity: 0.5; }

/* Body typography */
article h1, article h2, article h3, article h4, article h5, article h6 {
  font-family: "Charter", "Source Han Serif SC", "Noto Serif SC", Georgia, serif;
  color: var(--plain-text-primary);
  line-height: 1.3;
  letter-spacing: -0.01em;
  font-weight: 700;
}
article h1 { font-size: 32px; margin: 64px 0 16px; }
article h2 { font-size: 26px; margin: 48px 0 14px; }
article h3 { font-size: 21px; margin: 40px 0 12px; }
article h4 { font-size: 18px; margin: 32px 0 10px; }

article p {
  margin: 0 0 24px;
  color: var(--plain-text-primary);
}

/* 首段 drop-cap —— 仅当首个元素是 p 时 */
article > p:first-of-type::first-letter {
  font-family: "Charter", "Source Han Serif SC", "Noto Serif SC", Georgia, serif;
  font-size: 64px;
  line-height: 0.9;
  float: left;
  margin: 6px 10px 0 -4px;
  font-weight: 700;
  color: var(--plain-accent);
}

article a {
  color: var(--plain-link);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  text-decoration-color: color-mix(in srgb, var(--plain-link) 50%, transparent);
  transition: text-decoration-color 0.15s;
}
article a:hover { text-decoration-color: var(--plain-link); }

article strong { font-weight: 600; color: var(--plain-text-primary); }
article em { font-style: italic; }

/* 列表 */
article ul, article ol {
  padding-left: 28px;
  margin: 0 0 24px;
}
article li {
  margin: 8px 0;
  padding-left: 4px;
}
article ul li::marker { color: var(--plain-text-tertiary); }
article ol li::marker { color: var(--plain-text-tertiary); font-weight: 500; }

/* 引用 */
article blockquote {
  margin: 32px 0;
  padding: 4px 0 4px 24px;
  border-left: 3px solid var(--plain-quote-border);
  color: var(--plain-text-secondary);
  font-style: italic;
  font-size: 19px;
  line-height: 1.6;
}
article blockquote p { margin: 0 0 12px; }
article blockquote p:last-child { margin: 0; }

/* 代码 */
article code {
  font-family: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.88em;
  background: var(--plain-code-bg);
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: -0.01em;
}
article pre {
  background: var(--plain-code-bg);
  border: 1px solid var(--plain-border);
  padding: 18px 20px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 24px 0;
  font-size: 14px;
  line-height: 1.6;
  position: relative;
}
article pre code {
  background: transparent;
  padding: 0;
  font-size: inherit;
}
article pre::before {
  content: attr(data-lang);
  position: absolute;
  top: 8px;
  right: 12px;
  font-size: 11px;
  color: var(--plain-text-tertiary);
  font-family: "JetBrains Mono", monospace;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* 分割线 */
article hr {
  border: 0;
  border-top: 1px solid var(--plain-border);
  margin: 48px 0;
}

/* 表格 */
article table {
  border-collapse: collapse;
  margin: 24px 0;
  width: 100%;
  font-size: 14px;
  font-family: "Inter", "PingFang SC", sans-serif;
}
article th, article td {
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px solid var(--plain-border);
}
article th {
  font-weight: 600;
  color: var(--plain-text-primary);
  border-bottom: 2px solid var(--plain-border-strong);
  background: var(--plain-bg-raised);
}
article tr:last-child td { border-bottom: 0; }

/* 图片 */
article img {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 24px 0;
}

/* 响应式 */
@media (max-width: 720px) {
  article { padding: 32px 20px 72px; }
  .plain-hero h1 { font-size: 32px; }
  article h1 { font-size: 26px; }
  article h2 { font-size: 22px; }
}

/* Stage 1:rehype-toc 自动生成的目录 —— 浮在右侧,正文滚动时不动。
   ≥3 个 h2/h3 才生成(processor 里的 customizeTOC 控制),否则不显示。 */
.plain-toc {
  position: fixed;
  right: 32px;
  top: 88px;
  width: 220px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  font-size: 12px;
  line-height: 1.5;
  padding: 12px 14px;
  border-left: 2px solid var(--plain-rule, rgba(0,0,0,0.08));
  color: var(--plain-text-secondary, #6a6a6a);
}
@media (max-width: 1100px) { .plain-toc { display: none; } }
.plain-toc-list { list-style: none; padding: 0; margin: 0; }
.plain-toc-list li { margin: 4px 0; }
.plain-toc-list ol { list-style: none; padding-left: 12px; margin: 4px 0; }
.plain-toc-link {
  text-decoration: none;
  color: inherit;
  display: block;
  padding: 2px 0;
  border-radius: 3px;
  transition: color 0.15s;
}
.plain-toc-link:hover { color: var(--plain-text-primary, #1a1a1a); }

/* Stage 1 + V16 kami-table:GFM table 渲染。所有 <table> 默认获得 .kami-table。 */
article table.kami-table {
  width: 100%;
  border-collapse: collapse;
  margin: 24px 0;
  font-size: 15px;
}
article table.kami-table th,
article table.kami-table td {
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px solid var(--plain-rule, rgba(0,0,0,0.08));
  vertical-align: top;
}
article table.kami-table th {
  font-weight: 500;
  color: var(--plain-text-primary, #1a1a1a);
  background: rgba(0,0,0,0.02);
}
article table.kami-table tr:hover td { background: rgba(0,0,0,0.015); }

/* V16 kami-table 变体(与 sheet 一致) */
article table.kami-table.compact { font-size: 13px; }
article table.kami-table.compact th,
article table.kami-table.compact td { padding: 6px 10px; }

article table.kami-table.financial th:not(:first-child),
article table.kami-table.financial td:not(:first-child) {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}

article table.kami-table.striped tbody tr:nth-child(odd) td {
  background: rgba(0,0,0,0.018);
}

article table.kami-table tr.total td {
  font-weight: 600;
  border-top: 2px solid var(--plain-primary, #1B365D);
  border-bottom: none;
}

/* Stage 1:GFM 任务列表 —— [- [ ] foo] 渲染成 checkbox */
article input[type="checkbox"] {
  margin-right: 8px;
  vertical-align: middle;
  accent-color: var(--plain-primary, #2563eb);
}

/* Stage 1:脚注(GFM 标准[^1]) */
article .footnotes {
  margin-top: 56px;
  padding-top: 20px;
  border-top: 1px solid var(--plain-rule, rgba(0,0,0,0.08));
  font-size: 14px;
  color: var(--plain-text-secondary, #6a6a6a);
}
article .footnotes ol { padding-left: 24px; }
article .footnote-ref a,
article .footnote-backref {
  color: var(--plain-primary, #2563eb);
  text-decoration: none;
}

/* ───────────────────────────────────────────────────────────
   PR #B2:Doc 学术能力 —— 脚注 / 引文 / 目录页
   所有 class 走 .plain-doc-* 前缀,跟 GFM 默认的 .footnotes 并列存在,
   两套不冲突(我们的样式由 normalize 阶段注入 raw HTML 命中)。
   ─────────────────────────────────────────────────────────── */

/* 1) 脚注 —— hairline rule + 小一号字体 + tabular-nums */
article .plain-doc-footnotes {
  margin-top: 56px;
  padding-top: 20px;
  border-top: 1px solid var(--plain-border);
  font-size: 14px;
  line-height: 1.65;
  color: var(--plain-text-secondary);
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}
article .plain-doc-footnotes ol {
  padding-left: 28px;
  margin: 0;
}
article .plain-doc-footnotes li {
  margin: 6px 0;
  padding-left: 4px;
}
article .plain-doc-footnotes li::marker { color: var(--plain-text-tertiary); }
article sup.plain-doc-fnref {
  font-size: 0.75em;
  line-height: 0;
  vertical-align: super;
  font-variant-numeric: tabular-nums;
  margin: 0 1px;
}
article sup.plain-doc-fnref a {
  color: var(--plain-link);
  text-decoration: none;
  padding: 0 2px;
}
article sup.plain-doc-fnref a:hover { text-decoration: underline; }
article .plain-doc-fn-back {
  color: var(--plain-text-tertiary);
  text-decoration: none;
  margin-left: 4px;
  font-size: 13px;
}
article .plain-doc-fn-back:hover { color: var(--plain-link); }
/* 高亮 hash 命中的脚注/引文 —— 跳转后给个视觉锚点 */
article .plain-doc-footnotes li:target,
article .plain-doc-references li:target {
  background: var(--plain-selection);
  border-radius: 4px;
  transition: background 0.3s;
}

/* 2) 引文 —— normal style + 继承 primary 色 */
article cite.plain-doc-cite {
  font-style: normal;
  color: inherit;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
article cite.plain-doc-cite a {
  color: var(--plain-link);
  text-decoration: none;
  border-bottom: 1px dotted color-mix(in srgb, var(--plain-link) 50%, transparent);
}
article cite.plain-doc-cite a:hover {
  border-bottom-color: var(--plain-link);
}
article .plain-doc-cite-missing {
  color: var(--plain-text-tertiary);
  font-style: italic;
  background: var(--plain-code-bg);
  padding: 0 4px;
  border-radius: 3px;
  font-size: 0.92em;
}

article .plain-doc-references {
  margin-top: 56px;
  padding-top: 20px;
  border-top: 1px solid var(--plain-border);
  font-size: 14px;
  line-height: 1.65;
  color: var(--plain-text-secondary);
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}
article .plain-doc-references h2 {
  font-size: 18px;
  margin: 0 0 16px;
  letter-spacing: 0.01em;
  font-family: "Charter", "Source Han Serif SC", "Noto Serif SC", Georgia, serif;
  color: var(--plain-text-primary);
}
article .plain-doc-references ol {
  padding-left: 28px;
  margin: 0;
}
article .plain-doc-references li {
  margin: 8px 0;
  padding-left: 4px;
}
article .plain-doc-references li::marker { color: var(--plain-text-tertiary); }
article .plain-doc-references em { font-style: italic; color: var(--plain-text-primary); }
article .plain-doc-references a {
  color: var(--plain-link);
  text-decoration: underline;
  text-underline-offset: 2px;
  word-break: break-all;
}

/* 3) 目录页 (layout: cover) —— 占满首屏,正文从下一屏开始 */
article .plain-doc-cover {
  min-height: calc(100vh - 112px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 64px 0 80px;
  margin: -56px 0 64px;
  border-bottom: 1px solid var(--plain-border);
  page-break-after: always;
  break-after: page;
}
article .plain-doc-cover .plain-doc-cover-meta {
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--plain-text-tertiary);
  margin-bottom: 24px;
  font-weight: 500;
}
article .plain-doc-cover h1 {
  font-family: "Charter", "Source Han Serif SC", "Noto Serif SC", Georgia, serif;
  font-size: 56px;
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin: 0 0 24px;
  color: var(--plain-text-primary);
  font-weight: 700;
}
article .plain-doc-cover .plain-doc-cover-byline {
  font-size: 16px;
  color: var(--plain-text-secondary);
  margin-bottom: 40px;
  letter-spacing: 0.01em;
}
article .plain-doc-cover .plain-doc-cover-abstract {
  font-family: "Charter", "Source Han Serif SC", "Noto Serif SC", Georgia, serif;
  font-size: 18px;
  line-height: 1.7;
  color: var(--plain-text-secondary);
  max-width: 56ch;
  margin: 0 0 16px;
  font-style: italic;
}

/* 有 cover 时把 plain-hero 藏掉 —— 避免和封面打架。
   :has() 在 Safari 15.4+ / Chrome 105+ / Firefox 121+ 支持,Plain 桌面/PWA 用 webview/electron-equiv 都覆盖。 */
article:has(.plain-doc-cover) > .plain-hero { display: none; }

@media (max-width: 720px) {
  article .plain-doc-cover h1 { font-size: 38px; }
  article .plain-doc-cover .plain-doc-cover-abstract { font-size: 16px; }
  article .plain-doc-cover { min-height: calc(100vh - 88px); padding: 40px 0 56px; }
}

@media print {
  article .plain-doc-cover {
    min-height: 100vh;
    padding: 0;
    margin: 0 0 0 0;
    page-break-after: always;
  }
  article .plain-doc-footnotes,
  article .plain-doc-references {
    page-break-before: auto;
  }
}

/* ───────────────────────────────────────────────────────────
   PR #B1:PowerPoint-级布局能力 ── 页眉页脚 / 多列 / 图文混排
   屏幕渲染部分(@media print 部分由 doc-print.ts 接管)。
   ─────────────────────────────────────────────────────────── */

/* 1) 页眉 / 页脚 ── 屏幕模式吸顶 / 吸底,薄线分隔,小字号低对比。
   打印模式 doc-print.ts 已经走 @page running header/footer,这里只管屏幕。 */
.plain-doc-header,
.plain-doc-footer {
  position: sticky;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 24px;
  font-size: 12px;
  letter-spacing: 0.02em;
  color: var(--plain-text-tertiary);
  background: color-mix(in srgb, var(--plain-bg) 92%, transparent);
  backdrop-filter: saturate(140%) blur(8px);
  -webkit-backdrop-filter: saturate(140%) blur(8px);
  font-family: "Inter", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif;
}
.plain-doc-header {
  top: 0;
  border-bottom: 1px solid var(--plain-border);
}
.plain-doc-footer {
  bottom: 0;
  border-top: 1px solid var(--plain-border);
}
.plain-doc-header .plain-doc-hf-left,
.plain-doc-header .plain-doc-hf-center,
.plain-doc-header .plain-doc-hf-right,
.plain-doc-footer .plain-doc-hf-left,
.plain-doc-footer .plain-doc-hf-center,
.plain-doc-footer .plain-doc-hf-right {
  flex: 1 1 0;
  min-width: 0;
}
.plain-doc-header .plain-doc-hf-center,
.plain-doc-footer .plain-doc-hf-center {
  text-align: center;
}
.plain-doc-header .plain-doc-hf-right,
.plain-doc-footer .plain-doc-hf-right {
  text-align: right;
}
.plain-doc-header .plain-doc-hf-left,
.plain-doc-footer .plain-doc-hf-left {
  text-align: left;
}

/* 屏幕模式下页码占位显示 "—",真正的 counter 在 @media print 里生效 */
.plain-doc-page::before,
.plain-doc-total::before {
  content: "—";
}
@media print {
  /* 打印时,page/total 走 CSS counter(page) / counter(pages) */
  .plain-doc-page::before { content: counter(page); }
  .plain-doc-total::before { content: counter(pages); }
  /* 屏幕用 position: sticky 不打印;打印走 @page running 元素 */
  .plain-doc-header,
  .plain-doc-footer {
    display: none;
  }
}

/* 2) 多列布局 ── column-count 给 article。标题默认跨列,
      figure / blockquote / pre / table 默认 break-inside: avoid。 */
article[data-cols] {
  /* style attr 已经写 column-count / column-gap,本规则只配 break 行为 */
  column-fill: balance;
}
article[data-cols] > h1,
article[data-cols] > h2,
article[data-cols] > .plain-hero,
article[data-cols] > .plain-doc-cover,
article[data-cols] > .plain-doc-references,
article[data-cols] > .plain-doc-footnotes {
  column-span: all;
}
article[data-cols] figure,
article[data-cols] blockquote,
article[data-cols] pre,
article[data-cols] table,
article[data-cols] .plain-doc-callout,
article[data-cols] .plain-doc-layout-image-left,
article[data-cols] .plain-doc-layout-image-right,
article[data-cols] .plain-doc-layout-image-full,
article[data-cols] .plain-doc-layout-image-card {
  break-inside: avoid;
}
/* break: "column" / "avoid" / "auto" 由 frontmatter 控制,落到 article data-break 上 */
article[data-cols][data-break="column"] > h2 { break-before: column; }
article[data-cols][data-break="avoid"] p,
article[data-cols][data-break="avoid"] li {
  break-inside: avoid;
}

/* 3) 图文混排 ── flex 两栏(image-left / image-right)+ 占满(image-full)+ 卡片(image-card) */
.plain-doc-layout-image-left,
.plain-doc-layout-image-right {
  display: flex;
  gap: 32px;
  align-items: flex-start;
  margin: 32px 0;
}
.plain-doc-layout-image-right { flex-direction: row-reverse; }

.plain-doc-layout-image-left .plain-doc-image-side,
.plain-doc-layout-image-right .plain-doc-image-side {
  flex: 0 0 40%;
  max-width: 40%;
  min-width: 0;
}
.plain-doc-layout-image-left .plain-doc-text-side,
.plain-doc-layout-image-right .plain-doc-text-side {
  flex: 1 1 auto;
  min-width: 0;
}
.plain-doc-layout-image-left .plain-doc-image-side img,
.plain-doc-layout-image-right .plain-doc-image-side img {
  width: 100%;
  height: auto;
  margin: 0;
  display: block;
  border-radius: 6px;
}
.plain-doc-layout-image-left .plain-doc-text-side > :first-child,
.plain-doc-layout-image-right .plain-doc-text-side > :first-child {
  margin-top: 0;
}
.plain-doc-layout-image-left .plain-doc-text-side > :last-child,
.plain-doc-layout-image-right .plain-doc-text-side > :last-child {
  margin-bottom: 0;
}

.plain-doc-layout-image-full {
  margin: 40px 0;
}
.plain-doc-layout-image-full img {
  width: 100%;
  height: auto;
  margin: 0 0 12px;
  border-radius: 6px;
  display: block;
}
.plain-doc-layout-image-full p:has(> img:only-child) {
  margin: 0 0 12px;
}
.plain-doc-layout-image-full > p:not(:has(> img)) {
  font-size: 14px;
  color: var(--plain-text-tertiary);
  text-align: center;
  font-style: italic;
  margin: 8px 0;
}

.plain-doc-layout-image-card {
  display: block;
  background: var(--plain-bg-raised);
  border: 1px solid var(--plain-border);
  border-radius: 10px;
  padding: 24px;
  margin: 32px 0;
}
.plain-doc-layout-image-card img {
  width: 100%;
  height: auto;
  margin: 0 0 16px;
  border-radius: 6px;
  display: block;
}
.plain-doc-layout-image-card > :first-child { margin-top: 0; }
.plain-doc-layout-image-card > :last-child { margin-bottom: 0; }
.plain-doc-layout-image-card h2,
.plain-doc-layout-image-card h3,
.plain-doc-layout-image-card h4 {
  margin-top: 0;
}

/* 响应式:< 720px 时图文混排塌成单列 */
@media (max-width: 720px) {
  .plain-doc-layout-image-left,
  .plain-doc-layout-image-right {
    flex-direction: column;
    gap: 16px;
  }
  .plain-doc-layout-image-left .plain-doc-image-side,
  .plain-doc-layout-image-right .plain-doc-image-side {
    flex: 0 0 auto;
    max-width: 100%;
  }
  article[data-cols] {
    column-count: 1 !important;
  }
}
`;

/**
 * 完整 doc CSS = 屏幕样式 + 打印样式。
 * 现有调用方继续 import { DOC_CSS } 即可,自动获得 ⌘P 打印能力。
 */
export const DOC_FULL_CSS = DOC_BASE_CSS + DOC_PRINT_CSS;
export { DOC_PRINT_CSS };
export const DOC_CSS = DOC_FULL_CSS;

/**
 * 根据 ThemeTokens 派生一份 doc CSS,覆盖 DOC_BASE_CSS 顶部的 :root token 块 +
 * body font-family + heading font-family。其他 layout/列表/code-block 等
 * 大部分 CSS 通过 CSS 变量自动跟。打印样式(@media print)保持默认 ——
 * doc 打印 90% 是 PDF 投递,标准 A4 灰度更通用。
 *
 * 共享 DOC_BASE_CSS 的其余规则(article / hero / list / code 等)避免重复维护。
 * 只把 `:root { ... }` 块和 body 的字体行替换掉。
 */
export function tokensToDocCss(t: ThemeTokens): string {
  const { colors: c, fonts } = t;
  const headingFont = t.headingFamily === "serif" ? fonts.serif : fonts.sans;

  // 中性灰 = onSurface 和 bg 之间插值,避免硬编码 gray
  const muted = c.onSurfaceMuted;
  const code = c.surface;          // code-bg 用 surface,比纯白底更柔
  const accent = c.primary;

  // Selection 用 primary 半透明 —— hex 转 rgba
  const selectionRgba = (() => {
    const m = accent.match(/^#?([0-9a-f]{6})$/i);
    if (!m) return `rgba(37, 99, 235, 0.18)`;
    const r = parseInt(m[1].slice(0, 2), 16);
    const g = parseInt(m[1].slice(2, 4), 16);
    const b = parseInt(m[1].slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 0.18)`;
  })();

  // 覆盖原 :root 块(原 DOC_BASE_CSS 头部) + body 字体行,其余继承
  const themedRoot = `
:root {
  --plain-bg: ${c.bg};
  --plain-bg-raised: ${c.surfaceElevated};
  --plain-text-primary: ${c.onSurface};
  --plain-text-secondary: ${muted};
  --plain-text-tertiary: ${muted};
  --plain-border: ${c.outline};
  --plain-border-strong: ${c.outline};
  --plain-accent: ${accent};
  --plain-link: ${accent};
  --plain-code-bg: ${code};
  --plain-quote-border: ${accent};
  --plain-selection: ${selectionRgba};
}
[data-theme="dark"] {
  /* dark 模式不再独立 —— 主题已决定整套调性,不强求暗色版 */
  --plain-bg: ${c.bg};
  --plain-bg-raised: ${c.surfaceElevated};
  --plain-text-primary: ${c.onSurface};
  --plain-text-secondary: ${muted};
  --plain-text-tertiary: ${muted};
  --plain-border: ${c.outline};
  --plain-accent: ${accent};
  --plain-link: ${accent};
  --plain-code-bg: ${code};
  --plain-quote-border: ${accent};
  --plain-selection: ${selectionRgba};
}
`;

  // 替换 DOC_BASE_CSS 头部的 :root + dark token 块。
  // 用 indexOf 找 "* { box-sizing" 边界,该行之前的全部替换成 themedRoot。
  const marker = "* { box-sizing: border-box; }";
  const cutAt = DOC_BASE_CSS.indexOf(marker);
  const baseWithoutRoot =
    cutAt > 0 ? DOC_BASE_CSS.slice(cutAt) : DOC_BASE_CSS;

  // 再换 body 字体 —— heading 字体走 article h1..h4 的 override,
  // body 的 font-family 行是固定字符串,替换之
  const bodyFontRegex =
    /font-family:\s*"Inter",\s*"PingFang SC",\s*"Hiragino Sans GB",[^;]*;/;
  const bodyFontReplaced = baseWithoutRoot.replace(
    bodyFontRegex,
    `font-family: ${fonts.sans};`,
  );

  // Heading override(放尾部,优先级足够 — h1/h2/h3 选择器更具体)
  const headingOverride = `
article h1, article h2, article h3, article h4,
.plain-hero h1 {
  font-family: ${headingFont};
}
`;

  return themedRoot + bodyFontReplaced + headingOverride + DOC_PRINT_CSS;
}

/**
 * 从 Markdown source 抽 frontmatter 的 title / author / date / theme（简单版）
 *
 * theme: 主题 id(可选)。和 deck 的 frontmatter `theme:` 用法对齐 —— doc 也能
 * 在 frontmatter 顶上写 `theme: monocle` 切换视觉。无该字段 → 走 DOC_CSS 默认 Medium 风。
 */
export type DocFront = {
  title?: string;
  author?: string;
  date?: string;
  theme?: string;
};

export function parseFrontMatter(src: string): { body: string; front: DocFront } {
  const m = src.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!m) return { body: src, front: {} };
  const front: DocFront = {};
  for (const line of m[1].split("\n")) {
    const pair = line.match(/^\s*([a-zA-Z_]+):\s*(.*?)\s*$/);
    if (!pair) continue;
    const [, key, rawVal] = pair;
    const val = rawVal.startsWith('"') ? unquote(rawVal) : rawVal;
    if (key === "title" || key === "author" || key === "date" || key === "theme") {
      front[key] = val;
    }
  }
  return { body: src.slice(m[0].length), front };
}

function unquote(s: string): string {
  try {
    return JSON.parse(s);
  } catch {
    return s.replace(/^["']|["']$/g, "");
  }
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
