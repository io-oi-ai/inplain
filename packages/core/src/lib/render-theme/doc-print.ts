/**
 * Doc 打印样式（⌘P → PDF）
 *
 * 设计目标:
 * - A4 + 标准页边距 (上下 24mm, 左右 22mm)
 * - 页码 (当前 / 总数) 通过 CSS `counter()` 渲染在 `@bottom-right`
 *   - Chromium 完整支持; Firefox/Safari 支持参差 — 打印推荐 Chrome
 * - 页眉通过 `string-set` 把 `.plain-doc-header-source` 内容塞进 running header
 *   - DOM 端只要在 `<article>` 顶部放一个 `<div class="plain-doc-header-source">{title}</div>` 就行
 * - Cover (`.plain-doc-cover`) 占整页且首页不显示页码
 * - 链接打印为脚注样式 `... (https://...)`; cover 内的链接不附 URL
 * - 屏幕专属 UI (toolbar / toc toggle / 任何 [data-print="hidden"]) 不打印
 *
 * 调用方在 doc.ts 里把本字符串拼到 DOC_CSS 尾部即可,
 * 现有调用方无需改动,自动获得打印能力。
 */
export const DOC_PRINT_CSS = `
@media print {
  /* ---- 页面尺寸 + 页边距 ---- */
  @page {
    size: A4;
    margin: 24mm 22mm;
  }

  /* ---- 页码: 右下角 ---- */
  @page {
    counter-increment: page;
    @bottom-right {
      content: counter(page) " / " counter(pages);
      font-family: "Inter", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
      font-size: 10pt;
      color: #666;
    }
  }

  /* ---- 页眉: 左上角 (从 .plain-doc-header-source 取内容) ---- */
  @page {
    @top-left {
      content: string(plain-doc-header);
      font-family: "Inter", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
      font-size: 10pt;
      color: #666;
    }
  }
  .plain-doc-header-source {
    string-set: plain-doc-header content();
    display: none;
  }

  /* ---- 首页 (cover) 特殊: 占整页 & 不显示页码/页眉 ---- */
  .plain-doc-cover {
    page-break-after: always;
    break-after: page;
  }
  @page :first {
    @bottom-right { content: none; }
    @top-left { content: none; }
  }

  /* ---- break 规则: 标题不孤立, 块状内容不跨页 ---- */
  h1, h2 {
    page-break-after: avoid;
    break-after: avoid;
  }
  h3, h4, h5, h6 {
    page-break-after: avoid;
    break-after: avoid;
  }
  figure, blockquote, .plain-doc-callout, pre {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  table {
    page-break-inside: auto;
    break-inside: auto;
  }
  thead { display: table-header-group; }
  tr, img {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  ul, ol {
    page-break-inside: auto;
    break-inside: auto;
  }

  /* ---- 链接显示完整 URL (脚注样式), cover 内的链接和明确标记的链接除外 ---- */
  a[href^="http"]:not(.plain-doc-no-print-url)::after {
    content: " (" attr(href) ")";
    font-size: 0.85em;
    color: #666;
    word-break: break-all;
  }
  .plain-doc-cover a[href^="http"]::after {
    content: none;
  }

  /* ---- 屏幕专属 UI 不打印 ---- */
  .plain-toolbar,
  .plain-doc-toc-toggle,
  .plain-toc,
  [data-print="hidden"] {
    display: none !important;
  }

  /* ---- 打印时把背景色去掉, 让 PDF 干净 ---- */
  html, body {
    background: #fff !important;
    color: #000;
  }
  article {
    max-width: none;
    margin: 0;
    padding: 0;
  }

  /* drop-cap 在打印里容易撑乱版心, 关掉 */
  article > p:first-of-type::first-letter {
    font-size: inherit;
    float: none;
    margin: 0;
    color: inherit;
  }
}
`;
