/**
 * render-sheet-v3 · sheet@v3 渲染器
 *
 * 跟 render-sheet (v2) 完全独立 · 只接收 SheetDocV3 对象 ·
 * 跟 v2 长不一样的关键:
 *   1. 12-col CSS grid 布局 (cell.x / y / w / h)
 *   2. viz 渲染走 renderSheetSection (复用 v2 panel 渲染层)
 *   3. SQL 不可见 · 用户看不到 queries 区
 *   4. NL inspector ready · 每个 cell 加 data-cell-id 让 chat 选中
 *
 * V25 PR-3 范围:渲染层 · 不接 DuckDB · 简单 inline data fallback
 *               (queries 区暂未真 execute · viz config.data 直接用)
 */
import { compileAnyTheme } from "@/lib/theme-v3";
import { renderTopNav, renderFooterAndWatermark, wrapHtml, CHROME_CSS } from "./chrome";
import { renderSheetSection, SHEET_CSS } from "./sheet-panels";
import { BASE_ELEMENTS_CSS } from "./base-elements";
import { DOC_ASK_CSS, DOC_ASK_SCRIPT, renderAskFab, qaShareIdScript } from "./doc-ask";
import type { SheetDocV3T, DashboardCellT } from "@/lib/agents-sheet/schemas";

export type SheetV3RenderOptions = {
  doc: SheetDocV3T;
  themeOverride?: string;
  branded?: boolean;
  breadcrumb?: string[];
  actions?: Array<{ label: string; intent?: string; href?: string; primary?: boolean }>;
  /**
   * V25 · share view 调用时传 true · 不渲染 nav + 不渲染水印
   * (宿主 /s/[id] 页已经有自己的顶部 chrome + 水印)
   */
  embed?: boolean;
  /** 问答「问这个表格」开关 · 默认 true · 显式 false 隐藏 */
  enableQa?: boolean;
  /** 分享页访客问答:传 shareId → 访客模式(扣作者账),即使 embed */
  qaShareId?: string;
};

export function renderSheetV3(opts: SheetV3RenderOptions): string {
  const { doc } = opts;
  const themeId = opts.themeOverride ?? doc.theme ?? "dune-dark";
  const compiled = compileAnyTheme(themeId);

  const branded = opts.branded !== false;
  const embed = opts.embed === true;

  // 1. 顶部 nav · embed 模式不渲染 (宿主页已有 chrome)
  let nav = "";
  if (!embed) {
    const breadcrumb = opts.breadcrumb ?? [
      "DASHBOARD",
      doc.title.length > 40 ? doc.title.slice(0, 40) + "…" : doc.title,
      ...(doc.date ? [doc.date] : []),
    ];
    nav = renderTopNav({
      kind: "sheet",
      breadcrumb,
      actions: opts.actions ?? [
        { label: "Share link", intent: "share" },
        { label: "Export .xlsx", intent: "export-xlsx", primary: true },
      ],
      branded,
    });
  }

  // 2. dashboard cell 渲染 · 12-col grid · cell 坐标写到 CSS var
  const vizMap = new Map(doc.vizzes.map((v) => [v.id, v]));
  const cellsHtml = doc.dashboard
    .map((cell) => renderCell(cell, vizMap))
    .join("\n");

  // 3. footer 水印 · embed 模式不渲染
  const footer = embed ? "" : renderFooterAndWatermark({ kind: "sheet", branded });

  const qaOn = opts.enableQa !== false;
  const guestQa = !!opts.qaShareId && qaOn;
  const authorQa = !opts.qaShareId && !opts.embed && qaOn;
  const showQa = guestQa || authorQa;
  const askFab = showQa ? renderAskFab("sheet") : "";

  return wrapHtml({
    title: doc.title,
    themeId: compiled.id,
    themeCss: compiled.css,
    bodyHtml: `${nav}<main class="plain-sheet-v3">${cellsHtml}</main>${footer}${askFab}`,
    extraHead: `<style>${BASE_ELEMENTS_CSS}${SHEET_CSS}${CHROME_CSS}${V3_GRID_CSS}${DOC_ASK_CSS}</style>`,
    extraScripts: showQa ? (guestQa ? qaShareIdScript(opts.qaShareId!) : "") + `<script>${DOC_ASK_SCRIPT}</script>` : "",
  });
}

function renderCell(
  cell: DashboardCellT,
  vizMap: Map<string, SheetDocV3T["vizzes"][number]>,
): string {
  const cellTarget = cell.cell;
  const cellId =
    typeof cellTarget === "string" ? cellTarget : `md-cell-${cell.x}-${cell.y}`;

  // CSS grid style · x/w/h 算 grid-column / grid-row
  // grid-column: <x+1> / span <w>  (CSS grid 1-indexed)
  // grid-row:    <y+1> / span <h>
  // V26-K · md-cell 用 grid-row: auto · 让内容驱动高度 · 避免文字溢出裁切
  // viz cell 仍用 span h · 保 grid 整齐布局
  const isMdCell = typeof cellTarget === "object" && "md" in cellTarget;
  const style = isMdCell
    ? [
        `grid-column: ${cell.x + 1} / span ${cell.w}`,
        // md-cell 不强制 row · 内容多少占多少
      ].join("; ")
    : [
        `grid-column: ${cell.x + 1} / span ${cell.w}`,
        `grid-row: ${cell.y + 1} / span ${cell.h}`,
      ].join("; ");

  if (isMdCell) {
    // markdown cell
    return `<section class="plain-sheet-v3-cell md-cell" data-cell="${cellId}" style="${style}">
      ${renderInlineMd((cellTarget as { md: string }).md)}
    </section>`;
  }

  const viz = vizMap.get(cellTarget);
  if (!viz) {
    return `<section class="plain-sheet-v3-cell error" data-cell="${cellId}" style="${style}">
      <div class="error-body">cell "${cellTarget}" 不在 vizzes 中</div>
    </section>`;
  }

  // 把 viz config 当 v2 section data 喂给 renderSheetSection
  // viz.kind 直接映射 panel.variant · 兼容 V24 12 variant
  const sectionData = {
    ...viz.config,
    title: viz.title ?? viz.config.title ?? "",
    subtitle: viz.subtitle ?? viz.config.subtitle,
  };
  const panelHtml = renderSheetSection("panel", viz.kind, sectionData, null);

  return `<section class="plain-sheet-v3-cell" data-cell="${cellId}" data-viz="${viz.id}" style="${style}">
    ${panelHtml}
  </section>`;
}

/** 简单 inline markdown for cell.md · h1/h2/em/strong/code */
function renderInlineMd(md: string): string {
  // V26-K · 行级 mini-markdown 解析器 · 比 inline replace 更鲁棒
  // 处理:#/##/### heading · `- ` list · 段落 · inline (**bold** / *em* / `code`)
  //
  // YAML `md: |` block scalar 经常吞掉空行,不能依赖 \n\n 切段。改用行扫描:
  // - 每行类别独立 (heading / list-item / blank / text)
  // - list-item 连续行合并成 <ul>
  // - text 行连续合并成 <p>
  // - heading 自成一段

  const inlineFmt = (s: string): string => {
    let out = escapeHtml(s);
    out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/(?<![*])\*([^*\n]+?)\*(?![*])/g, "<em>$1</em>");
    out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
    return out;
  };

  type Block =
    | { kind: "heading"; level: 1 | 2 | 3; text: string }
    | { kind: "list"; items: string[] }
    | { kind: "para"; lines: string[] };
  const blocks: Block[] = [];
  let cur: Block | null = null;

  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      // blank · flush current
      if (cur) { blocks.push(cur); cur = null; }
      continue;
    }
    // heading
    const h3 = line.match(/^### (.+)$/);
    const h2 = line.match(/^## (.+)$/);
    const h1 = line.match(/^# (.+)$/);
    if (h1 || h2 || h3) {
      if (cur) { blocks.push(cur); cur = null; }
      const level: 1 | 2 | 3 = h1 ? 1 : h2 ? 2 : 3;
      const text = (h1 ?? h2 ?? h3)![1];
      blocks.push({ kind: "heading", level, text });
      continue;
    }
    // list item
    const li = line.match(/^-\s+(.+)$/);
    if (li) {
      if (cur && cur.kind === "list") {
        cur.items.push(li[1]);
      } else {
        if (cur) blocks.push(cur);
        cur = { kind: "list", items: [li[1]] };
      }
      continue;
    }
    // text
    if (cur && cur.kind === "para") {
      cur.lines.push(line);
    } else {
      if (cur) blocks.push(cur);
      cur = { kind: "para", lines: [line] };
    }
  }
  if (cur) blocks.push(cur);

  return blocks
    .map((b) => {
      if (b.kind === "heading") {
        return `<h${b.level}>${inlineFmt(b.text)}</h${b.level}>`;
      }
      if (b.kind === "list") {
        return `<ul>${b.items.map((it) => `<li>${inlineFmt(it)}</li>`).join("")}</ul>`;
      }
      return `<p>${b.lines.map(inlineFmt).join("<br>")}</p>`;
    })
    .join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─────────────────────────────────────────────
// CSS · V3 12-col grid · 移动端 fallback 单列
// ─────────────────────────────────────────────

const V3_GRID_CSS = `
.plain-sheet-v3 {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  /* V26-J · grid-auto-rows: minmax(80px, auto) — 让 cell 至少 h*80px·
     但内容多时自动撑高 · 不再被裁/滚动 · 解决"文本重叠"老问题
     注:用 auto-rows 行高仍按 80px 算 · 但内容超过时 cell 跨多个 auto row · 整体行流自适应 */
  grid-auto-rows: minmax(80px, auto);
  /* V26-J · 内容驱动行布局 · 让大内容 cell 撑开本行所有 cell 高度对齐
     dense 让矮 cell 自动填进空位 · 减少行间空洞 */
  grid-auto-flow: row dense;
  gap: 16px;
  padding: 24px;
  max-width: 1440px;
  margin: 0 auto;
}
.plain-sheet-v3-cell {
  min-width: 0;       /* grid item 防止溢出 */
  min-height: 0;
  position: relative;
  display: flex;
  flex-direction: column;
}
.plain-sheet-v3-cell > .plain-sheet-panel {
  margin: 0 !important;  /* override v2 panel 自带 margin · grid 自己管 gap */
  flex: 1;
  display: flex;
  flex-direction: column;
  /* V26-J · panel 卡片视觉补强 · 不再扁平 */
  background: var(--plain-raised);
  border: 1px solid var(--plain-rule);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 0 color-mix(in srgb, var(--plain-ink) 4%, transparent),
              0 8px 24px -16px color-mix(in srgb, var(--plain-ink) 30%, transparent);
}
.plain-sheet-v3-cell > .plain-sheet-panel > .panel-body {
  flex: 1;
  /* V26-J · 不再 overflow:auto · 内容驱动 grid 撑高 · 避免文本被裁 */
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 4px 16px 16px;
}
/* V26-J · panel head 视觉收紧 · 跟 body 留一个空气 */
.plain-sheet-v3-cell > .plain-sheet-panel > .panel-head {
  padding: 14px 16px 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--plain-rule) 60%, transparent);
}

/* V26-J · markdown cell · 改成微卡片(原来无背景 · 跟 panel 卡片反差大显得很乱)
   底色比 panel 浅一档 · 区分但不脱节 */
.plain-sheet-v3-cell.md-cell {
  padding: 18px 22px;
  color: var(--plain-ink);
  background: color-mix(in srgb, var(--plain-raised) 50%, var(--plain-surface));
  border: 1px solid var(--plain-rule);
  border-radius: 8px;
  /* 长 md 内容自动撑高 · 不再裁切 */
  overflow: visible;
}
.plain-sheet-v3-cell.md-cell h1 {
  font-family: var(--plain-font-display);
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.25;
  margin: 0 0 10px;
  color: var(--plain-ink);
}
.plain-sheet-v3-cell.md-cell h2 {
  font-family: var(--plain-font-display);
  font-size: 17px;
  font-weight: 600;
  line-height: 1.3;
  margin: 0 0 8px;
  color: var(--plain-ink);
}
.plain-sheet-v3-cell.md-cell h3 {
  font-family: var(--plain-font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--plain-accent);
  margin: 0 0 8px;
}
.plain-sheet-v3-cell.md-cell p {
  font-family: var(--plain-font-text);
  font-size: 13.5px;
  line-height: 1.65;
  color: var(--plain-ink-soft);
  margin: 0 0 10px;
}
.plain-sheet-v3-cell.md-cell p:last-child { margin-bottom: 0; }
.plain-sheet-v3-cell.md-cell strong { color: var(--plain-ink); font-weight: 600; }
.plain-sheet-v3-cell.md-cell ul {
  list-style: none;
  padding: 0;
  margin: 0 0 8px;
  font-family: var(--plain-font-text);
  font-size: 13.5px;
  line-height: 1.65;
  color: var(--plain-ink-soft);
}
.plain-sheet-v3-cell.md-cell ul li {
  position: relative;
  padding: 4px 0 4px 18px;
  border-bottom: 1px dashed color-mix(in srgb, var(--plain-rule) 50%, transparent);
}
.plain-sheet-v3-cell.md-cell ul li:last-child { border-bottom: none; }
.plain-sheet-v3-cell.md-cell ul li::before {
  content: "—";
  position: absolute;
  left: 0;
  top: 4px;
  color: var(--plain-accent);
  font-family: var(--plain-font-mono);
  font-weight: 500;
}
.plain-sheet-v3-cell.md-cell code {
  font-family: var(--plain-font-mono);
  font-size: 0.88em;
  background: color-mix(in srgb, var(--plain-ink) 10%, transparent);
  color: var(--plain-ink);
  padding: 1px 6px;
  border-radius: 3px;
  white-space: nowrap;
}

/* error · cell 引用不存在 */
.plain-sheet-v3-cell.error {
  background: color-mix(in srgb, var(--plain-negative) 14%, var(--plain-raised));
  border: 1px dashed var(--plain-negative);
  border-radius: 6px;
  padding: 16px;
  font-family: var(--plain-font-mono);
  font-size: 11px;
  color: var(--plain-negative);
}

/* 响应式 · < 900px 单列流式 · 所有 cell 强制 full width */
@media (max-width: 900px) {
  .plain-sheet-v3 {
    grid-template-columns: 1fr;
    grid-auto-rows: auto;
    padding: 16px;
  }
  .plain-sheet-v3-cell {
    grid-column: 1 / -1 !important;
    grid-row: auto !important;
    min-height: 200px;
  }
}
`;
