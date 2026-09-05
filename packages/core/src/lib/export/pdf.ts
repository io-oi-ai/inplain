/**
 * PDF 导出方案:浏览器 print → "另存为 PDF"。
 *
 * 2026-05-19 重做 · 参考 Anthropic "Founder's Playbook"(InDesign 排印):
 *   - landscape letter (11" × 8.5") 报告风,而不是 portrait A4
 *   - 章节封面 = 整页饱和色背景 + 「Chapter N」hairline chip + 大 serif 标题
 *   - 正文页 = 白底 + chip + 大 serif 标题 + 左半页单栏正文 + 右半页留白
 *   - 字号阶 4 档(大标题 / chip / body / 页码),不允许自由值
 *   - 一章一色循环(6 色调色板)
 *   - Newsreader serif + Inter sans + tabular-nums
 *   - 右下页码,极轻
 *
 * 优势:零依赖、跨平台、用户用浏览器熟悉的对话框
 * 劣势:每条 chapter 排版有限(不是真 InDesign · CSS Paged Media)
 *
 * 调用:/api/export 返回这个 HTML,前端 window.open() 触发 print。
 */

/** Founder's Playbook 同款 6 色调色板,按 chapter 索引循环 */
export const PDF_CHAPTER_PALETTE = [
  { bg: "#d97757", ink: "#1a1a1a" }, // 暖橙 (cover)
  { bg: "#5b8266", ink: "#1a1a1a" }, // 鼠尾草绿
  { bg: "#8472cf", ink: "#1a1a1a" }, // 薰衣紫
  { bg: "#d4a017", ink: "#1a1a1a" }, // 芥末黄
  { bg: "#436a87", ink: "#faf9f6" }, // 深石蓝
  { bg: "#c7848a", ink: "#1a1a1a" }, // 莓红
] as const;

/** 在 wrapPrintable 的 head 注入的共享 css token + 字体 + page chrome */
const BASE_CSS = `
  /* —— 字体 —— Newsreader serif 标题, Inter 正文, JetBrains Mono kicker */
  @import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

  /* —— 页面 —— 11×8.5 landscape letter, 无边距(色块要出血)—— */
  @page {
    size: 11in 8.5in;
    margin: 0;
  }
  @page :left  { margin-left:  0; }  /* 装订左:某些打印机会双面 */
  @page :right { margin-right: 0; }

  /* token */
  :root {
    --pdf-paper:   #ffffff;
    --pdf-paper-warm: #faf9f6;
    --pdf-ink:     #1a1a1a;
    --pdf-mute:    #6b6b6b;
    --pdf-rule:    #d8d6d0;
    /* 4 档字号(WEB-RULES §2 同) */
    --pdf-text-xs:  10pt;   /* page number, kicker */
    --pdf-text-sm:  12pt;   /* meta */
    --pdf-text-base: 11pt;  /* body */
    --pdf-text-lg:  15pt;   /* sub-heading */
    --pdf-text-xl:  28pt;   /* chapter title (body page) */
    --pdf-text-2xl: 56pt;   /* hero / cover title */
  }

  @media print {
    body { background: white !important; }
    .no-print { display: none !important; }
  }

  html, body {
    margin: 0;
    padding: 0;
    background: var(--pdf-paper);
    color: var(--pdf-ink);
    font-family: 'Inter', -apple-system, system-ui, 'Source Han Sans', sans-serif;
    font-size: var(--pdf-text-base);
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    font-variant-numeric: tabular-nums;
  }

  /* —— page wrappers —— 每页 = 一个 .pdf-page,精确 11×8.5,内部用 flex/grid 排 */
  .pdf-page {
    width: 11in;
    height: 8.5in;
    page-break-after: always;
    position: relative;
    overflow: hidden;
    display: block;
  }
  .pdf-page:last-child { page-break-after: auto; }

  /* —— 章节胶囊 chip(「Chapter 1」)—— */
  .pdf-chip {
    display: inline-flex;
    align-items: center;
    padding: 5px 12px;
    border: 1px solid currentColor;
    border-radius: 999px;
    font-family: 'Inter', sans-serif;
    font-size: var(--pdf-text-xs);
    font-weight: 500;
    letter-spacing: 0.02em;
    line-height: 1;
    color: var(--pdf-ink);
  }

  /* —— 页码 —— 右下角,极轻 */
  .pdf-page-num {
    position: absolute;
    right: 0.55in;
    bottom: 0.45in;
    font-family: 'Inter', sans-serif;
    font-size: var(--pdf-text-xs);
    color: var(--pdf-mute);
    font-variant-numeric: tabular-nums;
  }

  /* —— 大封面页(章首):整页色块 + 左下 chip + 左下大标题 —— */
  .pdf-cover {
    padding: 0.75in;
  }
  .pdf-cover-chip {
    position: absolute;
    left: 0.75in;
    bottom: calc(0.75in + 100pt);
  }
  .pdf-cover h1 {
    position: absolute;
    left: 0.75in;
    right: 2in;
    bottom: 0.75in;
    margin: 0;
    font-family: 'Newsreader', 'Source Han Serif SC', serif;
    font-weight: 500;
    font-size: var(--pdf-text-2xl);
    line-height: 1.05;
    letter-spacing: -0.02em;
    text-wrap: balance;
  }
  /* book cover 特殊版 — chip + title 在偏上位置(像 Founder's Playbook 封面) */
  .pdf-cover.is-book-cover h1 {
    top: 0.75in;
    bottom: auto;
    right: 1in;
  }
  .pdf-cover.is-book-cover .pdf-cover-chip {
    top: auto;
    bottom: 0.75in;
  }
  .pdf-cover-brand {
    position: absolute;
    left: 0.75in;
    bottom: 0.75in;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: 'Inter', sans-serif;
    font-size: var(--pdf-text-lg);
    font-weight: 500;
  }
  .pdf-cover-brand-mark {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: currentColor;
    display: inline-block;
  }

  /* —— 内文页:chip + serif H1 + 左半正文 + 右半留白 —— */
  .pdf-body {
    padding: 0.85in 0.75in 0.85in 0.85in;
    display: flex;
    flex-direction: column;
  }
  .pdf-body .pdf-chip { margin-bottom: 18pt; }
  .pdf-body h1 {
    margin: 0 0 24pt 0;
    font-family: 'Newsreader', 'Source Han Serif SC', serif;
    font-weight: 600;
    font-size: var(--pdf-text-xl);
    line-height: 1.1;
    letter-spacing: -0.012em;
    text-wrap: balance;
    max-width: 6in;
  }
  .pdf-body article {
    max-width: 4.6in;   /* 左半页单栏(~ 60-65 字符) */
    line-height: 1.55;
    color: var(--pdf-ink);
  }
  .pdf-body article p { margin: 0 0 11pt 0; }
  .pdf-body article h2 {
    font-family: 'Newsreader', 'Source Han Serif SC', serif;
    font-size: var(--pdf-text-lg);
    font-weight: 600;
    line-height: 1.2;
    margin: 18pt 0 8pt 0;
  }
  .pdf-body article h3 {
    font-family: 'Inter', sans-serif;
    font-size: var(--pdf-text-base);
    font-weight: 600;
    margin: 14pt 0 6pt 0;
    letter-spacing: -0.005em;
  }
  .pdf-body article ul, .pdf-body article ol {
    margin: 0 0 11pt 0;
    padding-left: 18pt;
  }
  .pdf-body article li { margin: 4pt 0; }
  .pdf-body article a {
    color: var(--pdf-ink);
    text-decoration: underline;
    text-decoration-thickness: 0.5pt;
    text-underline-offset: 2pt;
  }
  .pdf-body article code {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 90%;
    background: var(--pdf-paper-warm);
    padding: 1pt 4pt;
    border-radius: 2pt;
  }
  .pdf-body article pre {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 9pt;
    line-height: 1.5;
    background: var(--pdf-paper-warm);
    padding: 10pt 12pt;
    border-radius: 4pt;
    overflow: hidden;
    margin: 10pt 0;
    max-width: 4.6in;
  }
  .pdf-body article blockquote {
    margin: 14pt 0;
    padding-left: 14pt;
    border-left: 2pt solid var(--pdf-rule);
    font-family: 'Newsreader', serif;
    font-size: var(--pdf-text-lg);
    font-style: italic;
    color: var(--pdf-mute);
    max-width: 4.6in;
  }
  .pdf-body article table {
    border-collapse: collapse;
    margin: 10pt 0;
    font-size: 10pt;
  }
  .pdf-body article th, .pdf-body article td {
    border: none;
    border-bottom: 0.5pt solid var(--pdf-rule);
    padding: 5pt 10pt 5pt 0;
    text-align: left;
  }
  .pdf-body article th {
    font-family: 'Inter', sans-serif;
    font-weight: 600;
    font-size: 9pt;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--pdf-mute);
  }

  /* —— ToC 页(landscape letter 同款) —— */
  .pdf-toc {
    padding: 1.4in 0.85in 0.85in;
  }
  .pdf-toc h1 {
    font-family: 'Newsreader', 'Source Han Serif SC', serif;
    font-weight: 600;
    font-size: 44pt;
    line-height: 1.05;
    letter-spacing: -0.012em;
    margin: 0 0 36pt 0;
  }
  .pdf-toc ul { list-style: none; padding: 0; margin: 0; max-width: 5.4in; }
  .pdf-toc li {
    display: flex;
    align-items: baseline;
    gap: 14pt;
    padding: 11pt 0;
    border-bottom: 0.5pt solid var(--pdf-rule);
    font-size: 13pt;
  }
  .pdf-toc li .pdf-toc-title { flex: 1; }
  .pdf-toc li .pdf-toc-page {
    font-variant-numeric: tabular-nums;
    color: var(--pdf-mute);
  }

  /* —— print hint (only on screen) —— */
  .print-hint {
    position: fixed; top: 16px; right: 16px;
    background: #1a1a1a; color: white; padding: 10px 14px;
    border-radius: 6px; font-family: system-ui, sans-serif;
    font-size: 13px; box-shadow: 0 4px 12px rgba(0,0,0,.2);
    z-index: 9999;
  }
  .print-hint button {
    margin-left: 8px; background: white; color: #1a1a1a;
    border: 0; padding: 4px 10px; border-radius: 4px;
    cursor: pointer; font-weight: 600;
  }
`;

export type PdfPageOptions = {
  /** 取调色板第几色(章首页背景)。从 0 开始,越界自动 mod */
  paletteIndex?: number;
};

/** 渲染一张「书封」页(整本书的第一页,品牌色背景 + 标题 + 品牌徽标) */
export function pdfBookCover(opts: {
  title: string;
  brand?: string;
  paletteIndex?: number;
}): string {
  const c = PDF_CHAPTER_PALETTE[(opts.paletteIndex ?? 0) % PDF_CHAPTER_PALETTE.length];
  return `<section class="pdf-page pdf-cover is-book-cover" style="background:${c.bg}; color:${c.ink};">
    <h1>${escapeHtml(opts.title)}</h1>
    ${opts.brand ? `<div class="pdf-cover-brand"><span class="pdf-cover-brand-mark"></span>${escapeHtml(opts.brand)}</div>` : ""}
  </section>`;
}

/** 渲染一张章节封面页 */
export function pdfChapterCover(opts: {
  chapterNum: number;
  chapterTitle: string;
  paletteIndex?: number;
}): string {
  const c =
    PDF_CHAPTER_PALETTE[(opts.paletteIndex ?? opts.chapterNum) % PDF_CHAPTER_PALETTE.length];
  return `<section class="pdf-page pdf-cover" style="background:${c.bg}; color:${c.ink};">
    <span class="pdf-cover-chip pdf-chip">Chapter ${opts.chapterNum}</span>
    <h1>${escapeHtml(opts.chapterTitle)}</h1>
  </section>`;
}

/** 渲染一张内文页(chip + 标题 + 正文 HTML) */
export function pdfBodyPage(opts: {
  chapterNum?: number;
  chapterTitle?: string;
  bodyHtml: string;
  pageNum?: number;
}): string {
  const chip = opts.chapterNum
    ? `<span class="pdf-chip">Chapter ${opts.chapterNum}</span>`
    : "";
  const heading = opts.chapterTitle ? `<h1>${escapeHtml(opts.chapterTitle)}</h1>` : "";
  const num = opts.pageNum
    ? `<span class="pdf-page-num">${opts.pageNum}</span>`
    : "";
  return `<section class="pdf-page pdf-body">
    ${chip}${heading}
    <article>${opts.bodyHtml}</article>
    ${num}
  </section>`;
}

/** 渲染目录页 */
export function pdfTocPage(opts: {
  title?: string;
  entries: Array<{ label: string; page: number }>;
  pageNum?: number;
}): string {
  const items = opts.entries
    .map(
      (e) =>
        `<li><span class="pdf-toc-title">${escapeHtml(e.label)}</span><span class="pdf-toc-page">${e.page}</span></li>`,
    )
    .join("");
  const num = opts.pageNum ? `<span class="pdf-page-num">${opts.pageNum}</span>` : "";
  return `<section class="pdf-page pdf-toc">
    <h1>${escapeHtml(opts.title ?? "Contents")}</h1>
    <ul>${items}</ul>
    ${num}
  </section>`;
}

/**
 * Legacy wrapper for backward compat — 仍接收预渲染好的 HTML 片段,只是套上更好的样式 shell。
 *
 * 调用方:
 *   - deck:把 marp 渲染好的 html 全部丢进去,style 仍走 marp 自己的 css
 *   - doc:把 marked 渲染好的正文丢进去
 *   - sheet:把 table HTML 丢进去
 *
 * 新调用方(2026-05-19+)应该直接用 pdfBookCover / pdfChapterCover / pdfBodyPage 拼。
 */
export function wrapPrintable(innerHtml: string, title: string): string {
  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>${BASE_CSS}</style>
</head>
<body>
  <div class="print-hint no-print">
    Save as PDF — 在打印对话框选 "另存为 PDF"
    <button onclick="window.print()">Print</button>
  </div>
  ${innerHtml}
  <script>
    window.addEventListener('load', () => { setTimeout(() => window.print(), 600); });
  </script>
</body></html>`;
}

/**
 * 新 API · 拼装一份完整 Founder's Playbook 风 PDF。
 *
 * @param opts.title  书封大标题
 * @param opts.brand  书封品牌名(可空)
 * @param opts.toc    目录条目(可空 → 不渲染目录页)
 * @param opts.chapters 章节列表;每章 { title, bodyHtml }(bodyHtml 可包含 <h2> 等)
 *
 * 输出结构:
 *   page 1   book cover(品牌色)
 *   page 2   目录(可选)
 *   page 3   chapter 1 cover(色块)
 *   page 4..  chapter 1 body(可一页或多页;HTML 长就靠 CSS break)
 *   ...
 */
export function pdfPlaybookHtml(opts: {
  title: string;
  brand?: string;
  toc?: Array<{ label: string; page: number }>;
  chapters: Array<{ title: string; bodyHtml: string }>;
}): string {
  let html = pdfBookCover({ title: opts.title, brand: opts.brand, paletteIndex: 0 });
  let pageNum = 2;
  if (opts.toc && opts.toc.length > 0) {
    html += pdfTocPage({ entries: opts.toc, pageNum });
    pageNum++;
  }
  opts.chapters.forEach((ch, i) => {
    const chapterNum = i + 1;
    html += pdfChapterCover({ chapterNum, chapterTitle: ch.title, paletteIndex: chapterNum });
    pageNum++;
    html += pdfBodyPage({
      chapterNum,
      chapterTitle: ch.title,
      bodyHtml: ch.bodyHtml,
      pageNum,
    });
    pageNum++;
  });
  return wrapPrintable(html, opts.title);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
