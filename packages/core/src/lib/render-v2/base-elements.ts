/**
 * Plain v3 · 跨形态共享视觉规范 (base-elements)
 *
 * 用户诉求(2026-05-23):
 *   "deck/doc/sheet 三者本质都是 HTML · 底层能力通用 · 只是上面展示不同。
 *    针对不同形式,展示不同的 Agent 甚至内容上面的变化。所以之前的 CSS 不单
 *    针对 sheet,其他的也需要 —— 本质都是 HTML 的样式规范。"
 *
 * 这层提供 **底层 HTML 原子的统一视觉规范**:
 *
 *   .plain-card / -head / -body / -title / -type / -subtitle  · 卡片
 *   .plain-table / .num / .bar                                · 表格
 *   .plain-metric / -value / -delta / -label / -trend         · 数字/KPI
 *   .plain-kicker / .plain-display / .plain-heading           · typography
 *
 * 任何 renderer (deck / doc / sheet) 都可以引用 BASE_ELEMENTS_CSS,
 * 自己只负责"布局容器" (slide stack / 长文流 / 12-col grid)。
 *
 * 已有的 .plain-sheet-* / .plain-doc-* class 通过 alias selector 一并应用,
 * 老代码不破。
 */

export const BASE_ELEMENTS_CSS = `
/* ─────────────────────────────────────────────────────────────
   Plain base · typography
   各 renderer 共享 · 不强制 · 想用就加 class
   ───────────────────────────────────────────────────────────── */

.plain-kicker,
.plain-sheet-header .kicker,
.plain-deck-cover .kicker,
.plain-doc-block.hero .kicker {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--plain-font-mono);
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: var(--plain-accent);
  margin-bottom: 14px;
}
.plain-kicker::before,
.plain-sheet-header .kicker::before,
.plain-deck-cover .kicker::before {
  content: "";
  width: 6px; height: 6px;
  background: var(--plain-accent);
  border-radius: 50%;
}

.plain-display {
  font-family: var(--plain-font-display);
  font-size: 40px;
  font-weight: 600;
  letter-spacing: -0.022em;
  line-height: 1.1;
  color: var(--plain-ink);
  margin: 0 0 14px;
}

.plain-heading {
  font-family: var(--plain-font-display);
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.012em;
  line-height: 1.25;
  color: var(--plain-ink);
  margin: 0 0 10px;
}

.plain-body {
  font-family: var(--plain-font-text);
  font-size: 14px;
  line-height: 1.6;
  color: var(--plain-ink-soft);
}
.plain-body strong { color: var(--plain-ink); font-weight: 500; }

.plain-mono {
  font-family: var(--plain-font-mono);
  font-variant-numeric: tabular-nums;
}

/* ─────────────────────────────────────────────────────────────
   Plain base · card (panel) · 卡片容器
   sheet panel 是主用户 · deck/doc 也可嵌入
   ───────────────────────────────────────────────────────────── */

.plain-card,
.plain-sheet-panel {
  background: var(--plain-raised);
  border: 1px solid var(--plain-rule);
  border-radius: 8px;
  overflow: hidden;
  box-shadow:
    0 1px 0 0 color-mix(in srgb, var(--plain-ink) 8%, transparent),
    0 8px 24px -12px color-mix(in srgb, #000 50%, transparent);
}

.plain-card-head,
.plain-sheet-panel .panel-head {
  padding: 14px 20px 12px;
  border-bottom: 1px solid var(--plain-rule);
  display: flex; align-items: center; gap: 12px;
  background: color-mix(in srgb, var(--plain-ink) 3%, var(--plain-raised));
}

.plain-card-title,
.plain-sheet-panel .panel-head .title {
  font-family: var(--plain-font-mono);
  font-size: 12px;
  font-weight: 500;
  color: var(--plain-ink);
  letter-spacing: 0.04em;
}

.plain-card-subtitle,
.plain-sheet-panel .panel-head .subtitle {
  font-family: var(--plain-font-text);
  font-size: 12px;
  color: var(--plain-ink-mute);
  margin-left: auto;
}

/* type badge · accent 色块小标 · sheet/deck/doc 都能用 */
.plain-type-badge,
.plain-sheet-panel .panel-head .type {
  font-family: var(--plain-font-mono);
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--plain-accent);
  padding: 3px 7px;
  background: color-mix(in srgb, var(--plain-accent) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--plain-accent) 28%, transparent);
  border-radius: 3px;
  line-height: 1;
}

.plain-card-body,
.plain-sheet-panel .panel-body {
  padding: 20px;
}

/* ─────────────────────────────────────────────────────────────
   Plain base · table
   sheet 主用户 · doc 也常嵌入表格
   ───────────────────────────────────────────────────────────── */

.plain-table,
.plain-sheet-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--plain-font-mono);
  font-size: 12px;
}

.plain-table thead,
.plain-sheet-table thead {
  background: color-mix(in srgb, var(--plain-ink) 4%, var(--plain-raised));
}

.plain-table th,
.plain-sheet-table th {
  text-align: left;
  padding: 10px 14px;
  font-family: var(--plain-font-mono);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--plain-ink-mute);
  border-bottom: 1px solid var(--plain-rule);
}
.plain-table th.num,
.plain-sheet-table th.num { text-align: right; }

.plain-table td,
.plain-sheet-table td {
  padding: 10px 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--plain-rule) 50%, transparent);
  color: var(--plain-ink);
  font-variant-numeric: tabular-nums;
}
.plain-table tbody tr:last-child td,
.plain-sheet-table tbody tr:last-child td { border-bottom: none; }
.plain-table tbody tr:hover,
.plain-sheet-table tbody tr:hover {
  background: color-mix(in srgb, var(--plain-ink) 4%, transparent);
}
.plain-table td.num,
.plain-sheet-table td.num { text-align: right; }

/* bar cell · 用 ::before linear-gradient 做行内进度条 */
.plain-table td.bar,
.plain-sheet-table td.bar {
  position: relative;
  text-align: right;
}
.plain-table td.bar::before,
.plain-sheet-table td.bar::before {
  content: "";
  position: absolute;
  left: 0; top: 50%;
  transform: translateY(-50%);
  height: 60%;
  width: var(--bar-pct, 0%);
  background: color-mix(in srgb, var(--plain-accent) 20%, transparent);
  border-left: 2px solid var(--plain-accent);
  z-index: 0;
}
.plain-table td.bar > *,
.plain-sheet-table td.bar > * { position: relative; z-index: 1; }

/* ─────────────────────────────────────────────────────────────
   Plain base · metric (KPI / big-number)
   sheet 主用 · deck/doc 嵌入大数字也用
   ───────────────────────────────────────────────────────────── */

.plain-metric,
.plain-big-number,
.plain-sheet-kpi {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 8px;
  padding: 16px 4px 8px;
  height: 100%;
  box-sizing: border-box;
  container-type: inline-size;
}

.plain-metric-label,
.plain-sheet-kpi .label {
  font-family: var(--plain-font-mono);
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--plain-ink-mute);
}

.plain-metric-value,
.plain-big-number .big-value,
.plain-sheet-kpi .value {
  font-family: var(--plain-font-display);
  font-size: clamp(28px, 12cqw, 44px);
  font-weight: 600;
  line-height: 1.1;
  color: var(--plain-ink);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plain-metric-delta,
.plain-big-number .big-delta,
.plain-sheet-kpi .delta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--plain-font-mono);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.plain-metric-delta.positive,
.plain-big-number .big-delta.positive,
.plain-sheet-kpi .delta.up { color: var(--plain-positive); }
.plain-metric-delta.negative,
.plain-big-number .big-delta.negative,
.plain-sheet-kpi .delta.down { color: var(--plain-accent); }
.plain-metric-delta.muted,
.plain-metric-delta.neutral,
.plain-big-number .big-delta.muted,
.plain-big-number .big-delta.neutral,
.plain-sheet-kpi .delta.neutral { color: var(--plain-ink-mute); }
.plain-metric-delta .arrow,
.plain-big-number .big-delta .arrow,
.plain-sheet-kpi .delta .arrow { font-size: 14px; }
.plain-metric-delta small,
.plain-big-number .big-delta .label,
.plain-sheet-kpi .delta small {
  color: var(--plain-ink-mute);
  font-size: 10px;
  margin-left: 4px;
}

/* ─────────────────────────────────────────────────────────────
   Plain base · code (inline + block) · 三家共享
   ───────────────────────────────────────────────────────────── */

.plain-code-inline,
code:not(pre code) {
  font-family: var(--plain-font-mono);
  font-size: 0.92em;
  background: color-mix(in srgb, var(--plain-ink) 8%, transparent);
  padding: 1px 5px;
  border-radius: 3px;
  color: var(--plain-ink);
}
`;
