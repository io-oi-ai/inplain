/**
 * Stage 2:Apache ECharts SSR(SVG)
 *
 * 服务端把 SheetChart + rows 渲染成静态 SVG 字符串嵌进 HTML。
 * 优点:
 *  - 离线可看(无需 JS 跑客户端)
 *  - PDF 导出友好
 *  - 比客户端 hydration 快得多
 *
 * 限制:
 *  - 没有 hover tooltip / 动态切换(交互留给后续 V14.6 客户端 progressive enhancement)
 *
 * License:Apache-2.0,无传染。
 */

import * as echarts from "echarts/core";
import { BarChart, LineChart, PieChart, ScatterChart } from "echarts/charts";
import {
  GridComponent,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  DatasetComponent,
} from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import type { SheetChart, SheetDoc } from "@/lib/agents/types";

// 注册 ECharts 模块(必须显式 use,tree-shake 友好)
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  GridComponent,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  DatasetComponent,
  SVGRenderer,
]);

const CHART_WIDTH = 560;
const CHART_HEIGHT = 320;

/**
 * 把 chart 渲染成 SVG 字符串。失败时回退到原 chart card(老逻辑)。
 */
export function renderChartSvg(chart: SheetChart, doc: SheetDoc): string {
  try {
    const ec = echarts.init(null, null, {
      renderer: "svg",
      ssr: true,
      width: CHART_WIDTH,
      height: CHART_HEIGHT,
    });

    const opt = buildOption(chart, doc);
    ec.setOption(opt);
    const svg = ec.renderToSVGString();
    ec.dispose();
    return svg;
  } catch (e) {
    return `<div class="chart-error">图表渲染失败: ${chart.title}<br><small>${
      e instanceof Error ? e.message : String(e)
    }</small></div>`;
  }
}

function buildOption(
  chart: SheetChart,
  doc: SheetDoc,
): Record<string, unknown> {
  const xCol = doc.columns.find((c) => c.key === chart.xKey);
  const xLabel = xCol?.label ?? chart.xKey;
  const xValues = doc.rows.map((r) => {
    const v = r[chart.xKey];
    return v === null || v === undefined ? "" : String(v);
  });

  const series = chart.yKeys.map((key) => {
    const yCol = doc.columns.find((c) => c.key === key);
    const data = doc.rows.map((r) => {
      const v = r[key];
      if (typeof v === "number") return v;
      if (typeof v === "string") {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      }
      return 0;
    });
    return {
      name: yCol?.label ?? key,
      type: chart.type,
      data,
      smooth: chart.type === "line",
      barMaxWidth: 32,
    };
  });

  if (chart.type === "pie") {
    // pie 用 xKey 作 name,第一个 yKey 作 value
    const yKey = chart.yKeys[0];
    const data = doc.rows.map((r) => ({
      name: String(r[chart.xKey] ?? ""),
      value: Number(r[yKey]) || 0,
    }));
    return {
      title: { text: chart.title, left: "center", textStyle: { fontSize: 14, fontWeight: 600 } },
      tooltip: { trigger: "item" },
      legend: { bottom: 0, type: "scroll" },
      series: [{ name: chart.title, type: "pie", radius: ["40%", "65%"], data }],
    };
  }

  return {
    title: {
      text: chart.title,
      left: "center",
      textStyle: { fontSize: 14, fontWeight: 600 },
    },
    grid: { top: 50, right: 24, bottom: 56, left: 56, containLabel: true },
    tooltip: { trigger: chart.type === "scatter" ? "item" : "axis" },
    legend: { bottom: 0, type: "scroll" },
    xAxis: {
      type: chart.type === "scatter" ? "value" : "category",
      data: chart.type === "scatter" ? undefined : xValues,
      name: xLabel,
      nameLocation: "middle",
      nameGap: 28,
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: "value",
      axisLabel: { fontSize: 11 },
    },
    series,
  };
}
