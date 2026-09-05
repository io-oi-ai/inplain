/**
 * Sheet 预览：数据新闻风（杂志感）
 * - 上部 hero：报告标题 / kicker / meta（列数 · 行数）
 * - 表格：细线、斑马纹、数字列右对齐
 * - 图表区（chart stub 重新设计：彩色标签 + 大号标题）
 * - 分析区用 Medium doc 风格 article 复用
 *
 * PR #C1:列类型/单元格 metadata 的格式化逻辑被抽到 ./sheet-format.ts。
 * 这里只负责样式 (CSS) + 在 normalize 阶段把格式化结果接进来。
 *
 * 调用方 (api/render/route.ts、client-bridge/render-impl.ts) 现在可以:
 *   import { renderSheetCellHtml } from "@/lib/render-theme/sheet";
 *   <tbody> 拼接时,对每个 cell 调一次 renderSheetCellHtml(value, columnSpec, locale)。
 *
 * 我们故意 re-export sheet-format 的纯函数,让 sheet.ts 仍是 sheet 渲染的单一入口,
 * 调用方不必直接知道有 sheet-format 这个文件存在。
 */

export {
  formatValue,
  parseCellMeta,
  renderCellHtml as renderSheetCellHtml,
  styleToAttr,
} from "./sheet-format";
export type { ColumnSpec, SheetColumnType, CellMeta } from "./sheet-format";

// PR #C2:Conditional formatting (data-bar / color-scale / icon-set)
// 同样走 sheet.ts 单一入口,call site 不必直接 import sheet-conditional。
export {
  applyConditional,
  wrapCell as wrapConditionalCell,
  colorScaleBg,
  interpolateColor,
} from "./sheet-conditional";
export type {
  ConditionalRule,
  ConditionalCellMeta,
  DataBarRule,
  ColorScaleRule,
  ColorScaleStop,
  IconSetRule,
  IconRule,
  IconSetMatch,
} from "./sheet-conditional";

/**
 * normalizeSheetRow:把 source row 的每个 cell 走一遍 cell-meta 拆分 + Intl 格式化,
 * 产出 td HTML 数组。这是 PR #C1 的"normalize 阶段"入口:
 *   - 在 server render 流程里一次性把 raw value → 展示文本完成
 *   - 调用方只负责把这些 <td> 字符串拼成 <tr>
 *
 * 输入:
 *   row     —— { [columnKey]: rawValue } 的 map
 *   columns —— ColumnSpec 数组,顺序即列顺序
 *   locale  —— BCP47,默认 "en"
 */
import { renderCellHtml, type ColumnSpec } from "./sheet-format";
export function normalizeSheetRow(
  row: Record<string, unknown>,
  columns: ColumnSpec[],
  locale = "en",
): string[] {
  return columns.map((c) => renderCellHtml(row[c.key], c, locale));
}

export const SHEET_CSS = `
:root {
  --plain-bg: #fbfbfa;
  --plain-bg-raised: #ffffff;
  --plain-text-primary: #1a1a1a;
  --plain-text-secondary: #4a4a4a;
  --plain-text-tertiary: #8a8a8a;
  --plain-border: #e5e5e5;
  --plain-border-strong: #cccccc;
  --plain-accent: #2563eb;
  --plain-link: #2563eb;
  --plain-code-bg: #f4f4f3;
  --plain-quote-border: #1a1a1a;
  --plain-chip-bg: #eceded;
  --plain-stripe: #f7f7f6;
}
[data-theme="dark"] {
  --plain-bg: #0f0f10;
  --plain-bg-raised: #18181a;
  --plain-text-primary: #ededed;
  --plain-text-secondary: #b4b4b4;
  --plain-text-tertiary: #777;
  --plain-border: #2a2a2d;
  --plain-border-strong: #3a3a3d;
  --plain-accent: #60a5fa;
  --plain-link: #60a5fa;
  --plain-code-bg: #1f1f22;
  --plain-quote-border: #60a5fa;
  --plain-chip-bg: #26262a;
  --plain-stripe: #141416;
}

* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background: var(--plain-bg);
  color: var(--plain-text-primary);
  -webkit-font-smoothing: antialiased;
  font-family: "Inter", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  line-height: 1.55;
}

.container {
  max-width: 1040px;
  margin: 0 auto;
  padding: 56px 32px 96px;
}

/* Hero */
.sheet-hero {
  padding-bottom: 28px;
  border-bottom: 1px solid var(--plain-border);
  margin-bottom: 36px;
}
.sheet-hero .kicker {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--plain-text-tertiary);
  margin: 0 0 10px;
  font-weight: 600;
}
.sheet-hero h1 {
  font-family: "Charter", "Source Han Serif SC", "Noto Serif SC", Georgia, serif;
  font-size: 36px;
  line-height: 1.2;
  margin: 0 0 14px;
  color: var(--plain-text-primary);
  letter-spacing: -0.01em;
  font-weight: 700;
}
.sheet-hero .meta {
  color: var(--plain-text-tertiary);
  font-size: 13px;
  display: flex;
  gap: 10px;
}
.sheet-hero .meta .chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--plain-chip-bg);
  color: var(--plain-text-secondary);
  font-weight: 500;
}

/* 分节标题 */
.sheet-section-title {
  font-family: "Charter", "Source Han Serif SC", Georgia, serif;
  font-size: 22px;
  font-weight: 700;
  margin: 48px 0 14px;
  color: var(--plain-text-primary);
}

/* 表格 */
.table-wrap {
  border: 1px solid var(--plain-border);
  border-radius: 8px;
  overflow: auto;
  background: var(--plain-bg-raised);
}
table {
  border-collapse: collapse;
  width: 100%;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
thead tr { background: var(--plain-bg-raised); }
th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: var(--plain-text-primary);
  border-bottom: 2px solid var(--plain-border-strong);
  white-space: nowrap;
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
td {
  padding: 10px 16px;
  border-bottom: 1px solid var(--plain-border);
  color: var(--plain-text-secondary);
}
td.num { text-align: right; color: var(--plain-text-primary); font-weight: 500; }
tr:nth-child(even) td { background: var(--plain-stripe); }
tr:last-child td { border-bottom: 0; }

/* 图表占位 */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin: 16px 0;
}
.chart-card {
  border: 1px solid var(--plain-border);
  border-radius: 8px;
  padding: 20px 22px;
  background: var(--plain-bg-raised);
}
.chart-card .kicker {
  display: inline-block;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--plain-accent);
  font-weight: 700;
  margin-bottom: 8px;
}
.chart-card .title {
  font-family: "Charter", Georgia, serif;
  font-size: 18px;
  line-height: 1.3;
  color: var(--plain-text-primary);
  margin: 0 0 10px;
  font-weight: 600;
}
.chart-card .axes {
  font-size: 12px;
  color: var(--plain-text-tertiary);
  font-family: "JetBrains Mono", monospace;
}

/* 分析 article（复用 doc.ts 的段落感） */
article {
  font-size: 16px;
  line-height: 1.8;
  color: var(--plain-text-primary);
  max-width: 700px;
}
article p { margin: 0 0 18px; }
article h1, article h2, article h3 {
  font-family: "Charter", Georgia, serif;
  margin: 32px 0 12px;
  letter-spacing: -0.01em;
}
article h2 { font-size: 22px; }
article h3 { font-size: 18px; }
article ul, article ol { padding-left: 28px; margin: 0 0 18px; }
article li { margin: 6px 0; }
article code {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.9em;
  background: var(--plain-code-bg);
  padding: 2px 6px;
  border-radius: 4px;
}
article blockquote {
  margin: 20px 0;
  padding-left: 20px;
  border-left: 3px solid var(--plain-quote-border);
  font-style: italic;
  color: var(--plain-text-secondary);
}

@media (max-width: 720px) {
  .container { padding: 32px 20px 72px; }
  .sheet-hero h1 { font-size: 26px; }
  th, td { padding: 8px 10px; font-size: 12px; }
}

/* Stage 2:列头排序指示 */
.sheet-table-wrap thead th {
  position: relative;
  padding-right: 22px;
}
.sheet-table-wrap thead th[data-sort-dir="asc"]::after,
.sheet-table-wrap thead th[data-sort-dir="desc"]::after {
  content: "";
  position: absolute;
  right: 8px;
  top: 50%;
  width: 0; height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
}
.sheet-table-wrap thead th[data-sort-dir="asc"]::after {
  border-bottom: 5px solid currentColor;
  margin-top: -3px;
}
.sheet-table-wrap thead th[data-sort-dir="desc"]::after {
  border-top: 5px solid currentColor;
  margin-top: -2px;
}

/* Stage 2:筛选输入框 + 匹配数 */
.sheet-filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 10px;
}
.sheet-filter-input {
  flex: 1;
  max-width: 360px;
  padding: 6px 10px;
  font-size: 13px;
  border: 1px solid var(--plain-rule, rgba(0,0,0,0.12));
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font-family: inherit;
}
.sheet-filter-input:focus {
  outline: none;
  border-color: var(--plain-primary, #2563eb);
}
.sheet-filter-badge {
  font-size: 11px;
  color: var(--plain-text-secondary, #6a6a6a);
  font-variant-numeric: tabular-nums;
}

/* V16 kami-table 变体(借鉴 tw93/kami) */
table.kami-table.compact { font-size: 12px; }
table.kami-table.compact th,
table.kami-table.compact td { padding: 6px 8px; }

/* financial:第一列外右对齐 + tabular-nums */
table.kami-table.financial th:not(:first-child),
table.kami-table.financial td:not(:first-child) {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}

/* striped:奇数行底色交替 */
table.kami-table.striped tbody tr:nth-child(odd) td {
  background: var(--plain-bg-raised, #faf9f5);
}

/* total row:加粗 + brand 顶 border */
table.kami-table tr.total td {
  font-weight: 600;
  border-top: 2px solid var(--plain-primary, #1B365D);
  border-bottom: none;
}

/* Stage 4:条件格式单元格 */
.cell-success { background: rgba(22, 163, 74, 0.10); color: #15803d; }
.cell-danger  { background: rgba(220, 38, 38, 0.10); color: #b91c1c; }
.cell-warn    { background: rgba(234, 179, 8, 0.12); color: #a16207; }
.cell-info    { background: rgba(37, 99, 235, 0.10); color: #1d4ed8; }
.cell-muted   { color: #6a6a6a; opacity: 0.7; }
.cell-bold    { font-weight: 700; }

/* Stage 2:ECharts SVG 容器 */
.chart-svg-card {
  background: var(--plain-bg-raised, #fff);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.chart-svg-card svg { max-width: 100%; height: auto; }
.chart-error {
  padding: 16px;
  background: rgba(220, 38, 38, 0.08);
  color: #dc2626;
  border-radius: 8px;
  font-size: 13px;
}

/* ─── PR #C1:typed columns + cell metadata ───
 * .plain-sheet-cell 是按列类型格式化后的 td。
 * 数字 / 货币 / 百分比 / 日期统一上 tabular-nums,让千分位对齐。
 * data-align 是 cell-meta 或 column.align 解出来的覆盖,优先于列默认。
 */
.plain-sheet-cell {
  padding: 10px 16px;
  border-bottom: 1px solid var(--plain-border);
  color: var(--plain-text-secondary);
}
.plain-sheet-cell[data-type="string"] { text-align: left; }
.plain-sheet-cell[data-type="number"],
.plain-sheet-cell[data-type="currency"],
.plain-sheet-cell[data-type="percent"] {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
  color: var(--plain-text-primary);
  font-weight: 500;
}
.plain-sheet-cell[data-type="date"] {
  font-variant-numeric: tabular-nums;
  text-align: left;
  color: var(--plain-text-primary);
}
.plain-sheet-cell[data-type="bool"] {
  text-align: center;
  font-weight: 600;
}
.plain-sheet-cell--bool-true { color: #16a34a; }
.plain-sheet-cell--bool-false { color: #9ca3af; }

/* 显式 data-align 覆盖一切 (cell-meta or column.align) */
.plain-sheet-cell[data-align="left"] { text-align: left; }
.plain-sheet-cell[data-align="center"] { text-align: center; }
.plain-sheet-cell[data-align="right"] { text-align: right; }

/* === Conditional formatting (PR #C2) ===
 * 三种 type 的视觉信号:
 *   data-bar    : 背景画横向 bar (width = value%);数字浮于上层
 *   color-scale : 直接在 inline style.background 上色,无 class 钩子
 *   icon-set    : prepend 一个染色 icon span
 * 兼容点:
 *   - 同时支持裸 <td data-cond=...> 和 PR #C1 的 .plain-sheet-cell[data-cond=...]
 *   - data-bar 强制 position:relative + overflow:hidden,避免 bar 溢出列宽
 *   - color-scale 不写 class,call site 直接走 style.background
 */
td[data-cond="data-bar"],
.plain-sheet-cell[data-cond="data-bar"] {
  position: relative;
  text-align: right;
  overflow: hidden;
}
.plain-cond-bar {
  position: absolute;
  inset: 4px 4px 4px auto;
  width: var(--cond-bar-width, 0%);
  background: var(--cond-bar-color, #002FA7);
  opacity: 0.2;
  border-radius: 2px;
  z-index: 0;
  pointer-events: none;
}
.plain-cond-value {
  position: relative;
  z-index: 1;
}
td[data-cond="icon-set"] .plain-cond-icon,
.plain-sheet-cell[data-cond="icon-set"] .plain-cond-icon {
  display: inline-block;
  width: 1.1em;
  margin-right: 4px;
  font-weight: 600;
  text-align: center;
}
/* color-scale 走 inline style.background;暗色模式下 inline 不会自动反转,
 * 渲染端如果想给 dark 单独换 palette,可以根据 [data-theme="dark"] 在 frontmatter 写第二组 stops。 */

/* ─── PR #C3: Pivot Table ─────────────────────────────────────────── */
.plain-sheet-pivot {
  border-collapse: collapse;
  width: 100%;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  background: var(--plain-bg-raised);
}
.plain-sheet-pivot thead th {
  text-align: right;
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--plain-text-secondary);
  padding: 10px 14px;
  border-bottom: 2px solid var(--plain-border-strong);
  background: var(--plain-bg);
}
.plain-sheet-pivot thead th:first-child { text-align: left; }
.plain-sheet-pivot tbody th[scope="row"] {
  text-align: left;
  font-weight: 600;
  color: var(--plain-text-primary);
  padding: 9px 14px;
  border-bottom: 1px solid var(--plain-border);
  white-space: nowrap;
}
.plain-sheet-pivot tbody td {
  text-align: right;
  padding: 9px 14px;
  color: var(--plain-text-primary);
  border-bottom: 1px solid var(--plain-border);
}
.plain-sheet-pivot tr.plain-pivot-total th,
.plain-sheet-pivot tr.plain-pivot-total td {
  border-top: 2px solid var(--plain-border-strong);
  font-weight: 700;
  color: var(--plain-text-primary);
  background: var(--plain-stripe);
}
.plain-sheet-pivot tbody td:last-child {
  font-weight: 600;
  border-left: 1px solid var(--plain-border);
}

/* ─── PR #C4: 扩展图表(area/scatter/heatmap/radar)容器调整 ───── */
.chart-svg-card.area svg .echarts-area-fill { opacity: 0.5; }
.chart-svg-card.heatmap { padding: 12px; }
.chart-svg-card.radar svg text { fill: var(--plain-text-secondary); }

/* ─── PR #C5: 冻结行/列 ───────────────────────────────────────── */
.plain-sheet-frozen { position: relative; }
.plain-sheet-frozen th[scope="col"] {
  position: sticky;
  top: 0;
  background: var(--plain-bg);
  z-index: 2;
}
.plain-sheet-frozen th[scope="row"],
.plain-sheet-frozen td:first-child[data-freeze="col"],
.plain-sheet-frozen th[data-freeze="col"] {
  position: sticky;
  left: 0;
  background: var(--plain-bg);
  z-index: 1;
}
/* 交叉点(冻结行 ∩ 冻结列)z-index 升一级 */
.plain-sheet-frozen thead th[data-freeze="col"] { z-index: 3; }

/* ─── PR #C5: interactive 排序 + 筛选 ─────────────────────────── */
.plain-sheet-interactive th[data-sortable] {
  cursor: pointer;
  user-select: none;
  position: relative;
}
.plain-sheet-interactive th[data-sortable]::after {
  content: " ⇅";
  color: var(--plain-text-tertiary);
  font-size: 0.75em;
  margin-left: 4px;
}
.plain-sheet-interactive th[data-sort-dir="asc"]::after {
  content: " ↑";
  color: var(--plain-accent);
}
.plain-sheet-interactive th[data-sort-dir="desc"]::after {
  content: " ↓";
  color: var(--plain-accent);
}
.plain-sheet-filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 10px;
}
.plain-sheet-filter-input {
  flex: 1;
  max-width: 360px;
  padding: 6px 10px;
  font-size: 13px;
  border: 1px solid var(--plain-border);
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font-family: inherit;
}
.plain-sheet-filter-input:focus {
  outline: none;
  border-color: var(--plain-accent);
}
.plain-sheet-filter-badge {
  font-size: 11px;
  color: var(--plain-text-secondary);
  font-variant-numeric: tabular-nums;
}
`;
