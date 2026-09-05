/**
 * V24-A · ECharts SSR for Plain Sheet v2 panel
 *
 * 旧的 charts.ts(V15)绑死老 v1 SheetChart schema。v2 panel 全用 CSV-like 字符串
 * 作输入,需要单独入口。
 *
 * 复用 echarts/core(已在 charts.ts 里 register 过模块) + SVGRenderer。
 *
 * 实现的 chart variant:
 *   - line / area / bar(stack normal/percent)/ scatter / pie / funnel / heatmap /
 *     mixed(bar + line + area 任意组合)
 *
 * 输入:
 *   - csvText: CSV-like 字符串,第一行 header,后面数据行
 *   - opts: 主题 + format + log + 双 Y 等
 *
 * 输出:
 *   - SVG 字符串(纯 server,无 DOM 依赖,适合 SSR + cf:build)
 *
 * 失败:
 *   - 解析失败 / 空数据 → 返回 .chart-error <div>(不抛,保护其它 panel)
 */

import * as echarts from "echarts/core";
import {
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  HeatmapChart,
  FunnelChart,
  SankeyChart,
} from "echarts/charts";
import {
  GridComponent,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  DatasetComponent,
  VisualMapComponent,
} from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import { fmt, normalizeFmt, type FmtToken } from "./fmt";

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  HeatmapChart,
  FunnelChart,
  SankeyChart,
  GridComponent,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  DatasetComponent,
  VisualMapComponent,
  SVGRenderer,
]);

const W = 640;
const H = 320;

export type ChartVariant =
  | "line"
  | "area"
  | "bar"
  | "bar-stack"
  | "scatter"
  | "pie"
  | "funnel"
  | "heatmap"
  | "sankey";

export type ChartOpts = {
  variant: ChartVariant;
  title?: string;
  /** CSV-like 字符串,第一行 header(第一列通常是 x 维) */
  csv: string;
  xLabel?: string;
  yLabel?: string;
  yLabelRight?: string;
  yFormat?: string;
  yFormatRight?: string;
  xFormat?: string;
  logScale?: boolean;
  /** 仅 bar-stack: normal(默认绝对) | percent(100% normalize) */
  stack?: "normal" | "percent";
  legend?: boolean;
  /** pie hole(0-0.9) */
  hole?: number;
  /** funnel 是否显示阶段间转化率 */
  showConversion?: boolean;
  /** mixed-chart 时 series 类型映射 */
  seriesTypes?: Record<string, "bar" | "line" | "area">;
  /** lifecycle 等场景:按 series 顺序指定颜色,覆盖主题默认色板 */
  seriesColors?: string[];
  /** pie / funnel / heatmap 通用数值 fmt token */
  valueFormat?: string;
};

export function renderChartV2(opts: ChartOpts): string {
  try {
    const parsed = parseCsv(opts.csv);
    if (parsed.rows.length === 0) {
      return chartError(opts.title, "no data");
    }
    const ec = echarts.init(null, null, {
      renderer: "svg",
      ssr: true,
      width: W,
      height: H,
    });
    const option = buildOption(opts, parsed);
    ec.setOption(option);
    const svg = ec.renderToSVGString();
    ec.dispose();
    return svg;
  } catch (e) {
    return chartError(opts.title, e instanceof Error ? e.message : String(e));
  }
}

/**
 * 提取时序/分类图(line/area/bar)的 hover 数据 —— 给产物内零依赖 tooltip 用。
 * 返回 { x: string[], series: [{name, values: (number|null)[]}], yFormat }。
 * 渲染层把它序列化进容器 data-chart 属性,产物脚本读它在鼠标位置浮 tooltip。
 * pie/scatter/funnel/heatmap 结构不同,暂不导出(返回 null,这些图无 tooltip)。
 */
export function extractHoverData(opts: ChartOpts): {
  x: string[];
  series: { name: string; values: (number | null)[] }[];
  yFormat?: string;
} | null {
  if (opts.variant !== "line" && opts.variant !== "area" && opts.variant !== "bar" && opts.variant !== "bar-stack") {
    return null;
  }
  try {
    const parsed = parseCsv(opts.csv);
    if (parsed.rows.length === 0 || parsed.headers.length < 2) return null;
    const x = parsed.rows.map((r) => r[0] ?? "");
    const series = parsed.headers.slice(1).map((name, ci) => ({
      name,
      values: parsed.rows.map((r) => toNum(r[ci + 1])),
    }));
    return { x, series, yFormat: opts.yFormat };
  } catch {
    return null;
  }
}

function chartError(title: string | undefined, msg: string): string {
  return `<div class="chart-error">图表渲染失败${title ? `: ${escape(title)}` : ""}<br><small>${escape(msg)}</small></div>`;
}

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── CSV parse ───────────────────────────────────────────────

export type ParsedCsv = {
  headers: string[];
  rows: string[][];
};

/**
 * CSV 单行切分:双引号包裹的单元格(内含逗号 / "" 转义)。
 * sheet-panels 与 XLSX 导出共用同一份,防两套 CSV 语法漂移。
 */
export function splitCsvLine(line: string): string[] {
  if (!line.includes('"')) return line.split(",").map((c) => c.trim());
  const cells: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === ",") {
      cells.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

/**
 * CSV-like 解析(XLSX 导出的数据 sheet 也复用,渲染与导出行为一致)。
 */
export function parseCsv(text: string): ParsedCsv {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map(splitCsvLine);
  return { headers, rows };
}

function toNum(v: string | undefined): number | null {
  if (v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ─── ECharts option builders ─────────────────────────────────

function buildOption(opts: ChartOpts, csv: ParsedCsv): Record<string, unknown> {
  switch (opts.variant) {
    case "pie":
      return buildPieOption(opts, csv);
    case "funnel":
      return buildFunnelOption(opts, csv);
    case "heatmap":
      return buildHeatmapOption(opts, csv);
    case "scatter":
      return buildScatterOption(opts, csv);
    case "sankey":
      return buildSankeyOption(opts, csv);
    default:
      return buildCartesianOption(opts, csv);
  }
}

/** sankey · CSV: source,target,value(流向图,ECharts 原生) */
function buildSankeyOption(opts: ChartOpts, csv: ParsedCsv): Record<string, unknown> {
  const links: Array<{ source: string; target: string; value: number }> = [];
  const nodeSet = new Set<string>();
  for (const r of csv.rows) {
    const source = (r[0] ?? "").trim();
    const target = (r[1] ?? "").trim();
    const value = toNum(r[2]) ?? 0;
    if (!source || !target) continue;
    nodeSet.add(source);
    nodeSet.add(target);
    links.push({ source, target, value });
  }
  const nodes = Array.from(nodeSet).map((name) => ({ name }));
  const vFmt = normalizeFmt(opts.valueFormat);
  return {
    title: opts.title
      ? { text: opts.title, left: "center", textStyle: { fontSize: 14, fontWeight: 600 } }
      : undefined,
    tooltip: {
      trigger: "item",
      triggerOn: "mousemove",
      formatter: (p: { data?: { value?: number }; name?: string }) =>
        p.data?.value != null ? `${p.name}: ${fmt(p.data.value, vFmt)}` : p.name ?? "",
    },
    series: [
      {
        type: "sankey",
        data: nodes,
        links,
        emphasis: { focus: "adjacency" },
        lineStyle: { color: "gradient", curveness: 0.5, opacity: 0.45 },
        label: { fontSize: 11, color: "inherit" },
        nodeGap: 14,
        nodeWidth: 14,
        left: 12,
        right: 90,
        top: opts.title ? 44 : 16,
        bottom: 16,
      },
    ],
  };
}

/** line / area / bar / bar-stack / mixed → 共用 cartesian builder。 */
function buildCartesianOption(opts: ChartOpts, csv: ParsedCsv): Record<string, unknown> {
  const xHeader = csv.headers[0];
  const xValues = csv.rows.map((r) => r[0] ?? "");
  const seriesHeaders = csv.headers.slice(1);

  const isLineOrArea = opts.variant === "line" || opts.variant === "area";
  const isBar = opts.variant === "bar" || opts.variant === "bar-stack";
  const isStack = opts.variant === "bar-stack";
  const stackPercent = opts.stack === "percent";

  // V24-A mixed-chart:每 series 类型来自 seriesTypes;否则全部走 variant
  const resolveType = (header: string): "bar" | "line" | "area" => {
    if (opts.seriesTypes && opts.seriesTypes[header]) return opts.seriesTypes[header];
    if (isLineOrArea) return opts.variant === "area" ? "area" : "line";
    return "bar";
  };

  const series = seriesHeaders.map((h, idx) => {
    const t = resolveType(h);
    const data = csv.rows.map((r) => toNum(r[idx + 1]) ?? 0);
    // mixed-chart 右 Y 轴:line 系列默认走右轴(若 yLabelRight 配了)
    const isRightAxis = !!opts.yLabelRight && t === "line" && opts.variant === "mixed-chart" as unknown;
    const color = opts.seriesColors?.[idx];
    return {
      name: h,
      type: t === "area" ? "line" : t,
      ...(t === "area" ? { areaStyle: {} } : {}),
      ...(isStack ? { stack: stackPercent ? "pct" : "total" } : {}),
      ...(color ? { itemStyle: { color }, lineStyle: { color } } : {}),
      data,
      smooth: t === "line" || t === "area",
      barMaxWidth: 32,
      yAxisIndex: isRightAxis ? 1 : 0,
    };
  });

  const yFmtToken: FmtToken = normalizeFmt(opts.yFormat);
  const yFmtRightToken: FmtToken = normalizeFmt(opts.yFormatRight ?? opts.yFormat);

  const yAxis: unknown[] = [
    {
      type: "value",
      name: opts.yLabel ?? "",
      nameGap: 28,
      nameLocation: "middle",
      ...(opts.logScale ? { type: "log" } : {}),
      ...(stackPercent ? { max: 100 } : {}),
      axisLabel: {
        fontSize: 11,
        formatter: (v: number) => fmt(stackPercent ? v / 100 : v, stackPercent ? "pct0" : yFmtToken),
      },
    },
  ];
  if (opts.yLabelRight) {
    yAxis.push({
      type: "value",
      name: opts.yLabelRight,
      nameGap: 28,
      nameLocation: "middle",
      axisLabel: {
        fontSize: 11,
        formatter: (v: number) => fmt(v, yFmtRightToken),
      },
    });
  }

  return {
    title: opts.title
      ? { text: opts.title, left: "center", textStyle: { fontSize: 14, fontWeight: 600 } }
      : undefined,
    grid: { top: opts.title ? 50 : 24, right: opts.yLabelRight ? 60 : 24, bottom: 56, left: 56, containLabel: true },
    tooltip: { trigger: "axis" },
    legend: opts.legend === false ? undefined : { bottom: 0, type: "scroll" },
    xAxis: {
      type: "category",
      data: xValues,
      name: opts.xLabel ?? xHeader,
      nameLocation: "middle",
      nameGap: 28,
      axisLabel: { fontSize: 11 },
    },
    yAxis,
    series,
  };
}

function buildPieOption(opts: ChartOpts, csv: ParsedCsv): Record<string, unknown> {
  // CSV: label,value
  const data = csv.rows.map((r) => ({
    name: r[0] ?? "",
    value: toNum(r[1]) ?? 0,
  }));
  const inner = Math.round(((opts.hole ?? 0.45) * 100));
  return {
    title: opts.title
      ? { text: opts.title, left: "center", textStyle: { fontSize: 14, fontWeight: 600 } }
      : undefined,
    tooltip: { trigger: "item" },
    legend: opts.legend === false ? undefined : { bottom: 0, type: "scroll" },
    series: [
      {
        type: "pie",
        radius: [`${inner}%`, "70%"],
        data,
        label: {
          formatter: (params: { name: string; percent: number }) =>
            `${params.name}\n${params.percent.toFixed(1)}%`,
          fontSize: 11,
        },
      },
    ],
  };
}

function buildFunnelOption(opts: ChartOpts, csv: ParsedCsv): Record<string, unknown> {
  // CSV: stage,count
  const stages = csv.rows.map((r, i) => {
    const cur = toNum(r[1]) ?? 0;
    const prev = i === 0 ? cur : (toNum(csv.rows[i - 1][1]) ?? cur);
    const conv = prev > 0 ? cur / prev : 0;
    return {
      name: r[0] ?? "",
      value: cur,
      _conv: conv,
    };
  });
  const fmtToken = normalizeFmt(opts.valueFormat);
  return {
    title: opts.title
      ? { text: opts.title, left: "center", textStyle: { fontSize: 14, fontWeight: 600 } }
      : undefined,
    tooltip: { trigger: "item" },
    series: [
      {
        type: "funnel",
        top: opts.title ? 56 : 24,
        bottom: 24,
        left: "10%",
        width: "80%",
        sort: "descending",
        data: stages,
        label: {
          formatter: (params: { name: string; value: number; dataIndex: number }) => {
            const stage = stages[params.dataIndex];
            const main = `${params.name}: ${fmt(params.value, fmtToken)}`;
            if (opts.showConversion && params.dataIndex > 0) {
              return `${main} (${fmt(stage._conv, "pct0")})`;
            }
            return main;
          },
          fontSize: 11,
        },
      },
    ],
  };
}

function buildHeatmapOption(opts: ChartOpts, csv: ParsedCsv): Record<string, unknown> {
  // CSV: 第一行第一列空,后面列是 col header;后续每行第一列是 row header,其它是数值
  const colHeaders = csv.headers.slice(1);
  const rowHeaders = csv.rows.map((r) => r[0] ?? "");
  const data: Array<[number, number, number]> = [];
  csv.rows.forEach((r, ri) => {
    for (let ci = 0; ci < colHeaders.length; ci++) {
      const v = toNum(r[ci + 1]);
      if (v !== null) data.push([ci, ri, v]);
    }
  });
  const allVals = data.map((d) => d[2]);
  const minV = Math.min(...allVals, 0);
  const maxV = Math.max(...allVals, 1);
  const fmtToken = normalizeFmt(opts.valueFormat);
  return {
    title: opts.title
      ? { text: opts.title, left: "center", textStyle: { fontSize: 14, fontWeight: 600 } }
      : undefined,
    tooltip: {
      position: "top",
      formatter: (p: { value: [number, number, number] }) =>
        `${rowHeaders[p.value[1]]} / ${colHeaders[p.value[0]]}: ${fmt(p.value[2], fmtToken)}`,
    },
    grid: { top: opts.title ? 50 : 24, right: 24, bottom: 60, left: 80, containLabel: true },
    xAxis: { type: "category", data: colHeaders, splitArea: { show: true }, axisLabel: { fontSize: 11 } },
    yAxis: { type: "category", data: rowHeaders, splitArea: { show: true }, axisLabel: { fontSize: 11 } },
    visualMap: {
      min: minV,
      max: maxV,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      // Dune 风:橙系单色阶
      inRange: { color: ["#1a1d24", "#5a3018", "#a04820", "#ff6b35"] },
      textStyle: { fontSize: 10 },
    },
    series: [
      {
        type: "heatmap",
        data,
        label: {
          show: data.length <= 80,
          fontSize: 10,
          formatter: (p: { value: [number, number, number] }) => fmt(p.value[2], fmtToken),
        },
      },
    ],
  };
}

function buildScatterOption(opts: ChartOpts, csv: ParsedCsv): Record<string, unknown> {
  // CSV: x,y[,size][,category]
  const hasSize = csv.headers.length >= 3;
  const hasCat = csv.headers.length >= 4;
  const byCat: Record<string, Array<[number, number, number]>> = {};
  csv.rows.forEach((r) => {
    const x = toNum(r[0]);
    const y = toNum(r[1]);
    const sz = hasSize ? toNum(r[2]) ?? 1 : 1;
    if (x === null || y === null) return;
    const cat = hasCat ? r[3] ?? "default" : "default";
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push([x, y, sz]);
  });
  const xFmt = normalizeFmt(opts.xFormat);
  const yFmt = normalizeFmt(opts.yFormat);
  return {
    title: opts.title
      ? { text: opts.title, left: "center", textStyle: { fontSize: 14, fontWeight: 600 } }
      : undefined,
    grid: { top: opts.title ? 50 : 24, right: 24, bottom: 56, left: 56, containLabel: true },
    tooltip: { trigger: "item" },
    legend: hasCat && opts.legend !== false ? { bottom: 0, type: "scroll" } : undefined,
    xAxis: {
      type: "value",
      name: opts.xLabel ?? csv.headers[0],
      nameLocation: "middle",
      nameGap: 28,
      axisLabel: { fontSize: 11, formatter: (v: number) => fmt(v, xFmt) },
    },
    yAxis: {
      type: "value",
      name: opts.yLabel ?? csv.headers[1],
      nameLocation: "middle",
      nameGap: 36,
      axisLabel: { fontSize: 11, formatter: (v: number) => fmt(v, yFmt) },
    },
    series: Object.entries(byCat).map(([cat, points]) => ({
      name: cat,
      type: "scatter",
      data: points.map((p) => [p[0], p[1]]),
      symbolSize: hasSize
        ? (val: [number, number, number?]) => {
            const ps = points.find((pp) => pp[0] === val[0] && pp[1] === val[1]);
            const sz = ps?.[2] ?? 1;
            return Math.max(6, Math.min(40, Math.sqrt(sz) * 6));
          }
        : 10,
    })),
  };
}
