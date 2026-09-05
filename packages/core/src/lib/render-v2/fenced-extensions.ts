/**
 * V21+ · render-v2 fenced code 扩展
 *
 * 在 markdown 渲染时拦截两种 fenced lang:
 *
 *   ```chart           → 调 ECharts SSR (复用 render-theme/charts.ts)
 *   { "type": "bar", ... }
 *   ```
 *
 *   ```mermaid         → 客户端 CDN 渲染(V32)
 *   flowchart LR
 *     A --> B
 *   ```
 *
 * 设计:
 * - chart 走 SSR-SVG → 分享链接 / PDF / SSR 首屏全部直出。
 * - mermaid V32 起改回客户端 CDN 渲染(复用 render-theme/mermaid.ts):
 *   - server 只把 ```mermaid 改写成 <pre class="mermaid">…</pre>
 *   - iframe 注入 MERMAID_SCRIPT(按需 import mermaid@11 CDN + mermaid.run)
 *   - 把 beautiful-mermaid + elkjs(~2-4MB)移出 Cloudflare Worker bundle,
 *     解决 worker gzip 超 10MiB 部署失败
 *
 * 失败策略:任何解析异常 → 降级到带可读错误的 <pre>,不打断整篇 doc。
 */

import { renderChartSvg } from "@/lib/render-theme/charts";
import type { SheetChart, SheetDoc } from "@/lib/agents/types";
import { escapeHtml } from "./chrome";

/**
 * V32 · mermaid 改回客户端 CDN 渲染 · 不再 server 端 prefetch。
 *
 * 保留 export 签名避免改 caller(render-v2 / showcase render route 仍调它),
 * 函数体 no-op。实际渲染由 renderMermaidFenced 输出 <pre class="mermaid">,
 * iframe 里的 MERMAID_SCRIPT(见 render-theme/mermaid.ts)客户端渲。
 */
export async function prefetchMermaidFromSource(_source: string): Promise<void> {
  // no-op · mermaid 走客户端 CDN 渲染(见 renderMermaidFenced)
  return;
}

// ─────────────────────────────────────────────
// chart
// ─────────────────────────────────────────────

type ChartInline = {
  type: SheetChart["type"];
  title?: string;
  xKey: string;
  yKeys: string[];
  rows: Array<Record<string, unknown>>;
  /** 可选:y 轴标签别名,覆盖列 key 默认显示 */
  labels?: Record<string, string>;
};

function parseChartJson(text: string): ChartInline | null {
  try {
    const parsed = JSON.parse(text) as ChartInline;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.type || !parsed.xKey || !Array.isArray(parsed.yKeys)) return null;
    if (!Array.isArray(parsed.rows)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * ```chart fence(JSON spec)→ 裸 SVG。HTML 渲染与 DOCX 导出贴图共用;
 * 数据无效返回 null。
 */
export function chartFenceToSvg(rawJson: string): { svg: string; title?: string; rows: Array<Record<string, unknown>>; keys: string[]; labels?: Record<string, string> } | null {
  const parsed = parseChartJson(rawJson);
  if (!parsed) return null;
  // 构造一个伪 SheetDoc 喂给 renderChartSvg。columns 从 xKey + yKeys 自动推导,
  // 用 labels 覆盖显示名(可选)。
  const allKeys = [parsed.xKey, ...parsed.yKeys];
  const columns = allKeys.map((key) => {
    const sample = parsed.rows.find((r) => r[key] !== undefined)?.[key];
    const type =
      typeof sample === "number"
        ? "number"
        : typeof sample === "boolean"
          ? "boolean"
          : "string";
    return {
      key,
      label: parsed.labels?.[key] ?? key,
      type: type as "number" | "string" | "boolean",
    };
  });
  const doc: SheetDoc = {
    kind: "sheet",
    title: parsed.title ?? "",
    columns,
    rows: parsed.rows,
    narrative: "",
    charts: [],
    formats: [],
  };
  const chart: SheetChart = {
    id: "inline",
    type: parsed.type,
    title: parsed.title ?? "",
    xKey: parsed.xKey,
    yKeys: parsed.yKeys,
  };
  const svg = renderChartSvg(chart, doc);
  return { svg, title: parsed.title, rows: parsed.rows, keys: allKeys, labels: parsed.labels };
}

export function renderChartFenced(rawJson: string): string {
  const r = chartFenceToSvg(rawJson);
  if (!r) {
    return `<div class="plain-fenced-error" role="alert">
  <strong>chart 数据无效</strong>
  <pre>${escapeHtml(rawJson)}</pre>
</div>`;
  }
  return `<figure class="plain-fenced-chart">${r.svg}${
    r.title
      ? `<figcaption>${escapeHtml(r.title)}</figcaption>`
      : ""
  }</figure>`;
}

// ─────────────────────────────────────────────
// mermaid (V32 · 客户端 CDN 渲染)
// ─────────────────────────────────────────────

/**
 * 输出客户端渲染节点 · <pre class="mermaid">…</pre>。
 *
 * 真正渲染由 iframe 注入的 MERMAID_SCRIPT(见 render-theme/mermaid.ts)在浏览器里
 * 按需 import mermaid@11 CDN 完成。server 端零依赖,把 beautiful-mermaid + elkjs
 * 移出 Worker bundle。
 *
 * 包一层 <figure class="plain-fenced-mermaid"> 保持原 class(CSS / 居中样式复用)。
 */
export function renderMermaidFenced(source: string): string {
  return `<figure class="plain-fenced-mermaid"><pre class="mermaid">${escapeHtml(source.trim())}</pre></figure>`;
}
