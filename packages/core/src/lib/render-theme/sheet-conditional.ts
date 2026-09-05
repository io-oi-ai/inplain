/**
 * Sheet 条件格式 (PR #C2)
 *
 * 声明式条件格式:在 frontmatter 中给某列加 data-bar / color-scale / icon-set
 * 视觉信号。本模块负责:
 *  1. 类型/规则定义
 *  2. 给定一组行 + 规则,算出每个 cell 的 meta(class / inline-style / extra child)
 *  3. 提供 wrapCell 工具把 meta 注入到 <td> 输出
 *
 * 渲染端(render-impl.ts / api/render/route.ts) 接入方式:
 *   const rules = (front.conditional as ConditionalRule[]) ?? [];
 *   const { rowMeta } = applyConditional(doc.rows, doc.columns, rules);
 *   // 然后在生成 <td> 时合并 rowMeta[ri][ci]
 *
 * 注意:本 PR 只交付 helper + CSS;实际接入由后续 PR 完成,
 * 因为渲染路径分散在 server route 与 client-bridge 两处,需要单独同步。
 */

// ─────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────

export type DataBarRule = {
  column: string;
  type: "data-bar";
  color: string;
  /** 可选[min, max],缺省按当列 min/max */
  range?: [number, number];
};

export type ColorScaleStop = { value: number; color: string };

export type ColorScaleRule = {
  column: string;
  type: "color-scale";
  min: ColorScaleStop;
  /** 可选中间锚点,启用双段插值(min→mid→max) */
  mid?: ColorScaleStop;
  max: ColorScaleStop;
};

export type IconSetMatch =
  | string
  | number
  | boolean
  | { op: ">" | ">=" | "<" | "<=" | "==" | "!="; value: number | string };

export type IconRule = {
  match: IconSetMatch;
  icon: string;
  color?: string;
};

export type IconSetRule = {
  column: string;
  type: "icon-set";
  rules: IconRule[];
};

export type ConditionalRule = DataBarRule | ColorScaleRule | IconSetRule;

/**
 * 单个 cell 的渲染补丁。call site 把这些合并到自己的 <td>。
 *
 * 命名注意:故意叫 ConditionalCellMeta 不是 CellMeta —— PR #C1 里
 * sheet-format.ts 已经导出过 CellMeta(描述列类型/对齐之类的列级元信息),
 * 跟我们这里描述"条件格式应用结果"的语义完全不同,不要混淆。
 */
export type ConditionalCellMeta = {
  /** 额外 class 名(空格分隔)。可空。 */
  className?: string;
  /** data-* 属性,key 不含 "data-" 前缀。可空。 */
  data?: Record<string, string>;
  /** 直接 merge 到 inline style 的对象。可空。 */
  style?: Record<string, string>;
  /** 在 cell 内容前面插入的 HTML(已转义)。可空。 */
  before?: string;
  /** 替换内容外壳:cell 内容会被 wrap 进这个外壳里。可空。 */
  wrapContent?: { open: string; close: string };
};

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * 给行数据 + 规则,算出每个 cell 的 meta。
 *
 * @param rows  rows[i][columnKey] = any
 * @param columnKeys 列 key 顺序,用来把 column-rule 映射到 cell index
 * @param rules frontmatter.conditional
 */
export function applyConditional(
  rows: ReadonlyArray<Record<string, unknown>>,
  columnKeys: ReadonlyArray<string>,
  rules: ReadonlyArray<ConditionalRule>,
): { rowMeta: ConditionalCellMeta[][] } {
  // 初始化空 meta 矩阵
  const rowMeta: ConditionalCellMeta[][] = rows.map(() => columnKeys.map(() => ({})));

  if (rules.length === 0) return { rowMeta };

  // 预算每列的 min/max(给 data-bar 缺省 range 用)
  const numericStatsByCol: Record<string, { min: number; max: number } | null> = {};
  for (const key of columnKeys) {
    numericStatsByCol[key] = computeColumnStats(rows, key);
  }

  for (const rule of rules) {
    const colIndex = columnKeys.indexOf(rule.column);
    if (colIndex < 0) continue;

    for (let ri = 0; ri < rows.length; ri++) {
      const raw = rows[ri][rule.column];
      const meta = rowMeta[ri][colIndex];

      if (rule.type === "data-bar") {
        applyDataBar(meta, raw, rule, numericStatsByCol[rule.column]);
      } else if (rule.type === "color-scale") {
        applyColorScale(meta, raw, rule);
      } else if (rule.type === "icon-set") {
        applyIconSet(meta, raw, rule);
      }
    }
  }

  return { rowMeta };
}

/**
 * 把 ConditionalCellMeta 合并进 <td>。call site 用得着:
 *
 *   const inner = formatCellValue(raw);
 *   const td = wrapCell(meta, baseClass, inner);
 *
 * 这里假设 inner 已经是 HTML-safe 文本(or wrapped span)。
 */
export function wrapCell(
  meta: ConditionalCellMeta | undefined,
  baseClass: string | undefined,
  inner: string,
): string {
  if (!meta) {
    return `<td${baseClass ? ` class="${baseClass}"` : ""}>${inner}</td>`;
  }

  const classes = [baseClass, meta.className].filter(Boolean).join(" ").trim();
  const dataAttrs = meta.data
    ? Object.entries(meta.data)
        .map(([k, v]) => ` data-${k}="${escapeAttr(v)}"`)
        .join("")
    : "";
  const styleStr = meta.style ? styleObjectToString(meta.style) : "";

  let content = inner;
  if (meta.wrapContent) {
    content = `${meta.wrapContent.open}${inner}${meta.wrapContent.close}`;
  }
  if (meta.before) {
    content = meta.before + content;
  }

  return `<td${classes ? ` class="${classes}"` : ""}${
    styleStr ? ` style="${styleStr}"` : ""
  }${dataAttrs}>${content}</td>`;
}

// ─────────────────────────────────────────────────────────────
// Internals: per-type rule appliers
// ─────────────────────────────────────────────────────────────

function applyDataBar(
  meta: ConditionalCellMeta,
  raw: unknown,
  rule: DataBarRule,
  stats: { min: number; max: number } | null,
): void {
  const v = toNumber(raw);
  if (v === null) return;

  const [lo, hi] = rule.range ?? (stats ? [stats.min, stats.max] : [0, 1]);
  // 防止除 0
  const span = hi - lo;
  let pct = span === 0 ? 0 : ((v - lo) / span) * 100;
  if (!Number.isFinite(pct)) pct = 0;
  pct = clamp(pct, 0, 100);

  meta.data = { ...(meta.data ?? {}), cond: "data-bar" };
  // 把 value span 单独放一个 .plain-cond-value(z-index:1),bar 放 .plain-cond-bar(z-index:0)
  meta.before = `<div class="plain-cond-bar" style="--cond-bar-width:${pct.toFixed(
    2,
  )}%; --cond-bar-color:${escapeAttr(rule.color)};"></div>`;
  meta.wrapContent = {
    open: '<span class="plain-cond-value">',
    close: "</span>",
  };
}

function applyColorScale(meta: ConditionalCellMeta, raw: unknown, rule: ColorScaleRule): void {
  const v = toNumber(raw);
  if (v === null) return;

  const bg = colorScaleBg(v, rule);
  meta.style = { ...(meta.style ?? {}), background: bg };
  meta.data = { ...(meta.data ?? {}), cond: "color-scale" };
}

function applyIconSet(meta: ConditionalCellMeta, raw: unknown, rule: IconSetRule): void {
  const match = rule.rules.find((r) => matchesIconRule(raw, r.match));
  if (!match) return;

  const colorStyle = match.color
    ? ` style="color:${escapeAttr(match.color)}"`
    : "";
  meta.data = { ...(meta.data ?? {}), cond: "icon-set" };
  meta.before = `<span class="plain-cond-icon"${colorStyle}>${escapeHtml(
    match.icon,
  )}</span>`;
}

function matchesIconRule(raw: unknown, match: IconSetMatch): boolean {
  if (typeof match === "object" && match !== null && "op" in match) {
    const lhs = typeof match.value === "number" ? toNumber(raw) : String(raw ?? "");
    const rhs = match.value;
    if (lhs === null) return false;
    switch (match.op) {
      case ">":
        return (lhs as number) > (rhs as number);
      case ">=":
        return (lhs as number) >= (rhs as number);
      case "<":
        return (lhs as number) < (rhs as number);
      case "<=":
        return (lhs as number) <= (rhs as number);
      case "==":
        return lhs === rhs;
      case "!=":
        return lhs !== rhs;
    }
  }
  // primitive match:字符串相等(用 String() 同化,容忍 number/boolean)
  return String(raw ?? "") === String(match);
}

// ─────────────────────────────────────────────────────────────
// Color interpolation (RGB linear)
// ─────────────────────────────────────────────────────────────

/**
 * 给 value 找 [min, mid?, max] 里的颜色。
 * 算法:两段线性 RGB 插值(min→mid,mid→max);无 mid 时一段(min→max)。
 * RGB 空间足够,HSL 会在橙绿之间出现奇怪的灰色,新闻图表更倾向 RGB。
 */
export function colorScaleBg(value: number, rule: ColorScaleRule): string {
  if (value <= rule.min.value) return rule.min.color;
  if (value >= rule.max.value) return rule.max.color;

  if (rule.mid) {
    if (value < rule.mid.value) {
      const span = rule.mid.value - rule.min.value;
      const t = span === 0 ? 0 : (value - rule.min.value) / span;
      return interpolateColor(t, rule.min.color, rule.mid.color);
    }
    const span = rule.max.value - rule.mid.value;
    const t = span === 0 ? 0 : (value - rule.mid.value) / span;
    return interpolateColor(t, rule.mid.color, rule.max.color);
  }

  const span = rule.max.value - rule.min.value;
  const t = span === 0 ? 0 : (value - rule.min.value) / span;
  return interpolateColor(t, rule.min.color, rule.max.color);
}

/**
 * 把 t∈[0,1] 在 c1/c2 之间线性插值。
 * 输入两个 hex 串 (#rrggbb 或 #rgb)。
 */
export function interpolateColor(t: number, c1: string, c2: string): string {
  const a = hexToRgb(c1);
  const b = hexToRgb(c2);
  if (!a || !b) return c1; // 解析失败兜底
  const tt = clamp(t, 0, 1);
  const r = Math.round(a.r + (b.r - a.r) * tt);
  const g = Math.round(a.g + (b.g - a.g) * tt);
  const bb = Math.round(a.b + (b.b - a.b) * tt);
  return rgbToHex(r, g, bb);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const s = hex.trim().replace(/^#/, "");
  if (s.length === 3) {
    const r = parseInt(s[0] + s[0], 16);
    const g = parseInt(s[1] + s[1], 16);
    const b = parseInt(s[2] + s[2], 16);
    if ([r, g, b].some((x) => Number.isNaN(x))) return null;
    return { r, g, b };
  }
  if (s.length === 6) {
    const r = parseInt(s.slice(0, 2), 16);
    const g = parseInt(s.slice(2, 4), 16);
    const b = parseInt(s.slice(4, 6), 16);
    if ([r, g, b].some((x) => Number.isNaN(x))) return null;
    return { r, g, b };
  }
  return null;
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function computeColumnStats(
  rows: ReadonlyArray<Record<string, unknown>>,
  key: string,
): { min: number; max: number } | null {
  let min = Infinity;
  let max = -Infinity;
  let seen = false;
  for (const r of rows) {
    const n = toNumber(r[key]);
    if (n === null) continue;
    seen = true;
    if (n < min) min = n;
    if (n > max) max = n;
  }
  return seen ? { min, max } : null;
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    // 容忍 $1,250,000 / 12% / 0.18 之类
    const cleaned = v.replace(/[$,\s]/g, "").replace(/%$/, "");
    const n = parseFloat(cleaned);
    if (!Number.isFinite(n)) return null;
    // 注意:这里不做 % 自动 /100,因为单位语义由 frontmatter 决定
    return n;
  }
  return null;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function styleObjectToString(style: Record<string, string>): string {
  return Object.entries(style)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

function escapeAttr(s: string): string {
  return String(s).replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
