/**
 * PR #C4 — ECharts 扩展图表
 *
 * 在 charts.ts (bar/line/pie/scatter) 之外新增 4 种:
 *   - area    面积图(line + areaStyle,支持 smooth,可堆叠)
 *   - scatter 带 sizeKey 的气泡散点
 *   - heatmap 二维 visualMap 热力
 *   - radar   雷达,indicators + series
 *
 * 这些函数只产出标准 ECharts option object (Record<string, unknown>),
 * 调用方负责 init/setOption/dispose;不直接渲染 SVG。这样:
 *   1. 跟 charts.ts 解耦(那边正在被别的 PR 改)
 *   2. 单元测试只对 option 断言,不需要 jsdom
 *
 * 主题色用 CSS var:在 ECharts option 里只能放计算后字符串,所以
 * 渲染前由调用方注入(buildXxxOption 第三参数 colors)。
 */

type Row = Record<string, unknown>;

// ──────────────────────────────────────────────────────────────────────────
// 规格类型(本地定义,不污染全局 SheetChart;调用方做 mapping)
// ──────────────────────────────────────────────────────────────────────────

export interface AreaSpec {
  type: "area";
  title?: string;
  xKey: string;
  yKeys: string[];
  smooth?: boolean;
  stack?: boolean;
}

export interface ScatterSpec {
  type: "scatter";
  title?: string;
  xKey: string;
  yKey: string;
  sizeKey?: string;
  /** 可选:按 nameKey 分组成多 series */
  nameKey?: string;
}

export interface HeatmapSpec {
  type: "heatmap";
  title?: string;
  xKey: string;
  yKey: string;
  valueKey: string;
}

export interface RadarIndicator {
  name: string;
  max: number;
}
export interface RadarSeriesEntry {
  name: string;
  values: number[];
}
export interface RadarSpec {
  type: "radar";
  title?: string;
  indicators: RadarIndicator[];
  series: RadarSeriesEntry[];
}

export type ExtendedChartSpec = AreaSpec | ScatterSpec | HeatmapSpec | RadarSpec;

/** 主题色配置(让调用方传 CSS var 解析后的字符串) */
export interface ThemeColors {
  primary: string;
  /** 可选 palette(多 series) */
  palette?: string[];
}

const DEFAULT_PALETTE = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#9333ea",
  "#0891b2",
];

function paletteOf(theme?: ThemeColors): string[] {
  if (theme?.palette && theme.palette.length > 0) return theme.palette;
  if (theme?.primary) return [theme.primary, ...DEFAULT_PALETTE.slice(1)];
  return DEFAULT_PALETTE;
}

function toNum(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.replace(/[,，\s]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof v === "boolean") return v ? 1 : 0;
  return 0;
}

function toCategory(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

const TITLE_STYLE = {
  left: "center" as const,
  textStyle: { fontSize: 14, fontWeight: 600 as const },
};

const GRID = { top: 50, right: 24, bottom: 56, left: 56, containLabel: true };

// ──────────────────────────────────────────────────────────────────────────
// Area
// ──────────────────────────────────────────────────────────────────────────

export function buildAreaOption(
  spec: AreaSpec,
  rows: Row[],
  theme?: ThemeColors,
): Record<string, unknown> {
  const palette = paletteOf(theme);
  const xValues = rows.map((r) => toCategory(r[spec.xKey]));
  const series = spec.yKeys.map((key, i) => ({
    name: key,
    type: "line",
    smooth: spec.smooth !== false,
    showSymbol: false,
    stack: spec.stack ? "area-stack" : undefined,
    areaStyle: {
      // 顶部 0.45 透明 → 底部 0.05,linear gradient 让面积更"画报感"
      color: {
        type: "linear",
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          { offset: 0, color: hexAlpha(palette[i % palette.length], 0.45) },
          { offset: 1, color: hexAlpha(palette[i % palette.length], 0.05) },
        ],
      },
    },
    lineStyle: { width: 2, color: palette[i % palette.length] },
    itemStyle: { color: palette[i % palette.length] },
    data: rows.map((r) => toNum(r[key])),
  }));

  return {
    title: spec.title ? { text: spec.title, ...TITLE_STYLE } : undefined,
    tooltip: { trigger: "axis" },
    legend: { bottom: 0, type: "scroll" },
    grid: GRID,
    xAxis: { type: "category", data: xValues, boundaryGap: false, axisLabel: { fontSize: 11 } },
    yAxis: { type: "value", axisLabel: { fontSize: 11 } },
    color: palette,
    series,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Scatter
// ──────────────────────────────────────────────────────────────────────────

export function buildScatterOption(
  spec: ScatterSpec,
  rows: Row[],
  theme?: ThemeColors,
): Record<string, unknown> {
  const palette = paletteOf(theme);
  const hasSize = !!spec.sizeKey;
  const hasGroups = !!spec.nameKey;

  // 收集每行 [x, y, size?, label]
  const all = rows.map((r) => ({
    x: toNum(r[spec.xKey]),
    y: toNum(r[spec.yKey]),
    s: hasSize ? toNum(r[spec.sizeKey!]) : 1,
    g: hasGroups ? toCategory(r[spec.nameKey!]) : "all",
  }));

  // 按 group 拆 series
  const groups = new Map<string, typeof all>();
  for (const item of all) {
    const arr = groups.get(item.g);
    if (arr) arr.push(item);
    else groups.set(item.g, [item]);
  }

  // size 映射:把 sizeKey 范围线性映射到 [6, 36] px
  const sizeMin = Math.min(...all.map((d) => d.s));
  const sizeMax = Math.max(...all.map((d) => d.s));
  const sizeOf = (s: number): number => {
    if (!hasSize || sizeMax === sizeMin) return 12;
    const t = (s - sizeMin) / (sizeMax - sizeMin);
    return 6 + t * 30;
  };

  const series = [...groups.entries()].map(([name, items], i) => ({
    name: hasGroups ? name : spec.yKey,
    type: "scatter",
    symbolSize: (val: number[]) => sizeOf(val[2] ?? 1),
    itemStyle: {
      color: palette[i % palette.length],
      opacity: 0.7,
    },
    data: items.map((d) => [d.x, d.y, d.s]),
  }));

  return {
    title: spec.title ? { text: spec.title, ...TITLE_STYLE } : undefined,
    tooltip: { trigger: "item" },
    legend: hasGroups ? { bottom: 0, type: "scroll" } : undefined,
    grid: GRID,
    xAxis: { type: "value", name: spec.xKey, nameLocation: "middle", nameGap: 28, axisLabel: { fontSize: 11 } },
    yAxis: { type: "value", name: spec.yKey, nameLocation: "middle", nameGap: 40, axisLabel: { fontSize: 11 } },
    color: palette,
    series,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Heatmap
// ──────────────────────────────────────────────────────────────────────────

export function buildHeatmapOption(
  spec: HeatmapSpec,
  rows: Row[],
  theme?: ThemeColors,
): Record<string, unknown> {
  const palette = paletteOf(theme);
  const primary = palette[0];

  // 收集 x/y 轴维度
  const xCats: string[] = [];
  const yCats: string[] = [];
  const xSeen = new Set<string>();
  const ySeen = new Set<string>();
  for (const r of rows) {
    const xv = toCategory(r[spec.xKey]);
    const yv = toCategory(r[spec.yKey]);
    if (!xSeen.has(xv)) { xSeen.add(xv); xCats.push(xv); }
    if (!ySeen.has(yv)) { ySeen.add(yv); yCats.push(yv); }
  }
  xCats.sort((a, b) => {
    const an = Number(a), bn = Number(b);
    if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
    return a.localeCompare(b);
  });
  yCats.sort((a, b) => {
    const an = Number(a), bn = Number(b);
    if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
    return a.localeCompare(b);
  });

  const data: Array<[number, number, number]> = [];
  let vMin = Infinity;
  let vMax = -Infinity;
  for (const r of rows) {
    const xi = xCats.indexOf(toCategory(r[spec.xKey]));
    const yi = yCats.indexOf(toCategory(r[spec.yKey]));
    const v = toNum(r[spec.valueKey]);
    data.push([xi, yi, v]);
    if (v < vMin) vMin = v;
    if (v > vMax) vMax = v;
  }
  if (vMin === Infinity) { vMin = 0; vMax = 1; }

  return {
    title: spec.title ? { text: spec.title, ...TITLE_STYLE } : undefined,
    tooltip: { position: "top" },
    grid: { top: 50, right: 24, bottom: 70, left: 70, containLabel: true },
    xAxis: { type: "category", data: xCats, splitArea: { show: true }, axisLabel: { fontSize: 11 } },
    yAxis: { type: "category", data: yCats, splitArea: { show: true }, axisLabel: { fontSize: 11 } },
    visualMap: {
      min: vMin,
      max: vMax,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      inRange: {
        color: [hexAlpha(primary, 0.1), primary],
      },
      textStyle: { fontSize: 11 },
    },
    series: [
      {
        name: spec.valueKey,
        type: "heatmap",
        data,
        label: { show: false },
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: "rgba(0,0,0,0.3)" } },
        progressive: 1000,
        animation: false,
      },
    ],
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Radar
// ──────────────────────────────────────────────────────────────────────────

export function buildRadarOption(
  spec: RadarSpec,
  // rows 此处不使用(radar 数据已经在 spec.series 里),但保留签名一致
  _rows: Row[] = [],
  theme?: ThemeColors,
): Record<string, unknown> {
  const palette = paletteOf(theme);
  return {
    title: spec.title ? { text: spec.title, ...TITLE_STYLE } : undefined,
    tooltip: {},
    legend: { bottom: 0, type: "scroll", data: spec.series.map((s) => s.name) },
    color: palette,
    radar: {
      indicator: spec.indicators.map((i) => ({ name: i.name, max: i.max })),
      shape: "polygon",
      splitNumber: 4,
      axisName: { color: "currentColor", fontSize: 12 },
      splitLine: { lineStyle: { color: "rgba(128,128,128,0.25)" } },
      splitArea: { areaStyle: { color: ["rgba(128,128,128,0.02)", "rgba(128,128,128,0.05)"] } },
    },
    series: [
      {
        type: "radar",
        data: spec.series.map((s, i) => ({
          value: s.values,
          name: s.name,
          lineStyle: { width: 2, color: palette[i % palette.length] },
          areaStyle: { color: hexAlpha(palette[i % palette.length], 0.2) },
          itemStyle: { color: palette[i % palette.length] },
        })),
      },
    ],
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Dispatch
// ──────────────────────────────────────────────────────────────────────────

export function buildExtendedChartOption(
  spec: ExtendedChartSpec,
  rows: Row[],
  theme?: ThemeColors,
): Record<string, unknown> {
  switch (spec.type) {
    case "area":
      return buildAreaOption(spec, rows, theme);
    case "scatter":
      return buildScatterOption(spec, rows, theme);
    case "heatmap":
      return buildHeatmapOption(spec, rows, theme);
    case "radar":
      return buildRadarOption(spec, rows, theme);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// helpers
// ──────────────────────────────────────────────────────────────────────────

/** 把 hex(#rrggbb / #rgb)或带 alpha 的 css color 加上 alpha 通道。Fallback: 直接返回。 */
function hexAlpha(color: string, alpha: number): string {
  if (color.startsWith("#")) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex.split("").map((c) => c + c).join("");
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }
  }
  return color;
}
