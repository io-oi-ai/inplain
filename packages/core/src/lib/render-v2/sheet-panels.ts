/**
 * Plain v2 · Sheet panels(Dune dashboard 风)
 *
 * 支持的 panel 类型(variant):
 *   ranking       — 排行榜列表(rank/name/metric)
 *   table         — 列定义 + CSV / inline data 渲染表格
 *   area-chart    — SVG area chart(2 条 line)
 *   bar-stack     — 横向 stacked bars
 *   sql           — SQL 查询块,带语法高亮
 *
 * 其他 section 类型(非 panel):
 *   dashboard-header — kicker + title + description + author + tags
 *   kpis             — 4 个 KPI 卡片(value / label / delta)
 *   insight          — 关键洞察 callout
 *   closing          — Next / 收尾 + 列表
 */

import { escapeHtml, escapeAttr } from "./chrome";
import { renderChartV2, extractHoverData, splitCsvLine, type ChartOpts } from "./charts-v2";
import { fmt, fmtDelta, normalizeFmt } from "./fmt";

/**
 * 把 SSR 出的 chart SVG 包成带 hover 数据的容器。
 * 产物脚本(SHEET_CHART_INTERACTIVE)读 data-chart 在鼠标位置浮 tooltip(零依赖)。
 * 时序图(line/area/bar)有 hoverData → 可 tooltip;其余(pie/scatter)hoverData=null → 仅静态。
 */
function chartWithHover(svg: string, opts: ChartOpts): string {
  const hover = extractHoverData(opts);
  if (!hover) return `<div class="plain-chart-echarts">${svg}</div>`;
  const json = JSON.stringify(hover).replace(/'/g, "&#39;");
  return `<div class="plain-chart-echarts plain-chart-hover" data-chart='${json}'>${svg}</div>`;
}

export type SectionData = Record<string, unknown>;

export function renderSheetSection(
  name: string,
  variant: string | undefined,
  data: SectionData,
  csvData?: ParsedCsv | null,
): string {
  switch (name) {
    case "dashboard-header":
      return renderDashboardHeader(data);
    case "kpis":
      return renderKpis(data);
    case "panel":
      return renderPanel(variant, data, csvData ?? null);
    case "insight":
      return renderInsight(data);
    case "closing":
      return renderClosing(data);
    default:
      return renderUnknown(name, variant, data);
  }
}

function renderDashboardHeader(d: SectionData): string {
  const kicker = str(d.kicker);
  const title = str(d.title);
  const description = str(d.description);
  const author = str(d.author);
  const updated = str(d.updated);
  const tags = arrStr(d.tags);

  return `<header class="plain-sheet-header">
    ${kicker ? `<div class="kicker">${escapeHtml(kicker)}</div>` : ""}
    <h1>${escapeHtml(title)}</h1>
    ${description ? `<p class="description">${escapeMdInline(description)}</p>` : ""}
    <div class="author">
      ${author ? `<span>OWNER — <strong>${escapeHtml(author)}</strong></span>` : ""}
      ${updated ? `<span>UPDATED — <strong>${escapeHtml(updated)}</strong></span>` : ""}
      ${tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
    </div>
  </header>`;
}

function renderKpis(d: SectionData): string {
  // kpis 在 DSL 里可能写成 list of {value, label, delta, trend}
  // 由 parser 解析后,top-level data 本身就是 array(`- ` 起始)→ 需要看 data 里有没有特殊 key
  // 我们这里两种都支持:data.items 或 data 直接是 list-style
  let items: Array<Record<string, unknown>>;
  if (Array.isArray((d as { items?: unknown }).items)) {
    items = arrObj((d as { items?: unknown }).items);
  } else {
    // top-level "- value: xxx" 会被 parser 解析成 anonymous keys,这里也支持
    items = arrObj(Object.values(d));
  }

  return `<div class="plain-sheet-kpis">
    ${items
      .map((it) => {
        const trend = str(it.trend);
        const cls = trend === "down" ? "down" : trend === "up" ? "up" : "neutral";
        const arrow = trend === "down" ? "↓" : trend === "up" ? "↑" : "→";
        // V24-A · KPI value 可走 fmt token 自动格式化(若 schema 提供 format 字段)
        const formatTok = str(it.format);
        const rawValue = it.value;
        const value = formatTok ? fmt(rawValue, formatTok) : str(rawValue);
        const cmpLabel = str(it.comparisonLabel ?? it["comparison-label"]);
        // V24-A · sparkline · 行内 mini SVG
        const sparkArr = Array.isArray(it.sparkline) ? (it.sparkline as number[]) : null;
        const sparkHtml = sparkArr ? renderInlineSparkline(sparkArr) : "";
        return `<div class="plain-sheet-kpi">
          <span class="label">${escapeHtml(str(it.label))}</span>
          <span class="value">${escapeHtml(value)}</span>
          ${
            it.delta
              ? `<span class="delta ${cls}"><span class="arrow">${arrow}</span> ${escapeHtml(str(it.delta))}${cmpLabel ? ` <small>${escapeHtml(cmpLabel)}</small>` : ""}</span>`
              : ""
          }
          ${sparkHtml ? `<span class="sparkline-wrap ${cls}">${sparkHtml}</span>` : ""}
        </div>`;
      })
      .join("")}
  </div>`;
}

function renderPanel(
  variant: string | undefined,
  d: SectionData,
  csvData: ParsedCsv | null,
): string {
  const title = str(d.title);
  const subtitle = str(d.subtitle);
  const type = (variant ?? "table").toUpperCase();

  const body = (() => {
    switch (variant) {
      case "ranking":
        return renderPanelRanking(d);
      case "table":
        return renderPanelTable(d, csvData);
      case "area-chart":
        return renderPanelAreaChart(d);
      case "bar-stack":
        return renderPanelBarStack(d);
      // V24-A 新增 chart variant (ECharts SSR)
      case "line-chart":
        return renderEchartsPanel("line", d);
      case "scatter":
        return renderEchartsPanel("scatter", d);
      case "heatmap":
        return renderEchartsPanel("heatmap", d);
      case "cohort":
      case "retention":
        return renderCohortPanel(d);
      case "pie":
        return renderEchartsPanel("pie", d);
      case "funnel":
        return renderEchartsPanel("funnel", d);
      case "sankey":
        return renderEchartsPanel("sankey", d);
      case "lifecycle":
        return renderLifecyclePanel(d);
      case "mixed-chart":
        return renderMixedChartPanel(d);
      case "big-number":
        return renderBigNumberPanel(d);
      case "sql":
        return renderPanelSql(d);
      default:
        return `<pre>${escapeHtml(JSON.stringify(d, null, 2))}</pre>`;
    }
  })();

  return `<div class="plain-sheet-panel">
    <div class="panel-head">
      <span class="title">${escapeHtml(title)}</span>
      <span class="type">${escapeHtml(type)}</span>
      ${subtitle ? `<span class="subtitle">${escapeHtml(subtitle)}</span>` : ""}
    </div>
    <div class="panel-body">${body}</div>
  </div>`;
}

function renderPanelRanking(d: SectionData): string {
  const items = arrObj(d.items);
  return `<ul class="plain-sheet-ranking">
    ${items
      .map((it) => {
        const tone = str(it.tone);
        const cls = tone === "warn" ? " warn" : tone === "bad" ? " bad" : "";
        return `<li class="${cls.trim()}">
          <span class="rank">${escapeHtml(str(it.rank))}</span>
          <span class="name">${escapeHtml(str(it.label))}${
            it.sub ? `<small>${escapeHtml(str(it.sub))}</small>` : ""
          }</span>
          <span class="metric">${escapeHtml(str(it.metric))}${
            it["metric-sub"]
              ? `<small>${escapeHtml(str(it["metric-sub"]))}</small>`
              : ""
          }</span>
        </li>`;
      })
      .join("")}
  </ul>`;
}

// V24-A · 升级 table 列定义类型
type TableColV2 = {
  key: string;
  label: string;
  /** fmt token(usd0 / pct1 / 0.0a / num / num2 / text 等)· 兼容老 "number" "percent" "text" 三值 */
  format: string;
  /** 单元格内进度条(数值列以最大值为 100%) */
  bar: boolean;
  /** 单元格底色 · 红→黄→绿渐变,从最低→最高 */
  colorScale: boolean;
  /** 链接列 · 值替换成 <a> · 链接地址 = 同行的 <key>_url 或 link_url 列 */
  link: boolean;
  /** 单元格内嵌 sparkline · 列值是 "1,2,3,4" 形式的数字串 */
  sparkline: boolean;
  /** 文字对齐;默认数值右、文本左 */
  align: "left" | "center" | "right" | undefined;
};

function parseTableCols(raw: unknown): TableColV2[] {
  const arr = (raw ?? []) as Array<unknown>;
  return arr.map((c): TableColV2 => {
    if (typeof c === "string") {
      return { key: c, label: c.toUpperCase(), format: "text", bar: false, colorScale: false, link: false, sparkline: false, align: undefined };
    }
    if (typeof c === "object" && c !== null) {
      const o = c as Record<string, unknown>;
      return {
        key: String(o.key ?? ""),
        label: String(o.label ?? o.key ?? ""),
        format: String(o.format ?? "text"),
        bar: Boolean(o.bar),
        colorScale: Boolean(o.colorScale ?? o["color-scale"]),
        link: Boolean(o.link),
        sparkline: Boolean(o.sparkline),
        align: (o.align as TableColV2["align"]) ?? undefined,
      };
    }
    return { key: "", label: "", format: "text", bar: false, colorScale: false, link: false, sparkline: false, align: undefined };
  });
}

/** 数值列是 numeric 还是数字风 fmt token,决定是否右对齐 + tabular-nums。 */
function isNumericCol(c: TableColV2): boolean {
  if (c.bar || c.colorScale) return true;
  // 老兼容
  if (c.format === "percent" || c.format === "number") return true;
  // V24-A fmt token
  const t = c.format.toLowerCase();
  if (
    t.startsWith("num") || t.startsWith("usd") || t.startsWith("pct") ||
    t === "0a" || t === "0.0a" || t === "0.00a"
  ) {
    return true;
  }
  return false;
}

/** 红→黄→绿渐变,t ∈ [0,1] · 数值越高越绿(对应"好");caller 可 invert。 */
function colorScaleRgb(t: number): string {
  const clamp = Math.max(0, Math.min(1, t));
  // 红 #f87171 → 琥珀 #d6aa3d → 绿 #4ade80(用 dune-dark / Plain semantic 三色)
  if (clamp < 0.5) {
    const k = clamp * 2;
    const r = Math.round(0xf8 + (0xd6 - 0xf8) * k);
    const g = Math.round(0x71 + (0xaa - 0x71) * k);
    const b = Math.round(0x71 + (0x3d - 0x71) * k);
    return `rgba(${r},${g},${b},0.18)`;
  }
  const k = (clamp - 0.5) * 2;
  const r = Math.round(0xd6 + (0x4a - 0xd6) * k);
  const g = Math.round(0xaa + (0xde - 0xaa) * k);
  const b = Math.round(0x3d + (0x80 - 0x3d) * k);
  return `rgba(${r},${g},${b},0.18)`;
}

function renderPanelTable(d: SectionData, csvData: ParsedCsv | null): string {
  const cols = parseTableCols(d.columns);

  // V25 · 优先用 inline data: "csv-string"(v3 viz.config.data 走这里)
  // 否则 fallback 到外部 csvData(老 v2 frontmatter data-source 路径)
  let rows: Record<string, string>[];
  if (typeof d.data === "string" && d.data.trim().length > 0) {
    const inline = parseCsv(d.data);
    rows = inline.rows;
  } else {
    rows = csvData ? csvData.rows : [];
  }

  // 排序 / limit 支持
  const sort = str(d.sort);
  if (sort && rows.length > 0) {
    const m = sort.match(/^(\S+)\s+(ASC|DESC)$/i);
    if (m) {
      const sortKey = m[1];
      const dir = m[2].toUpperCase() === "DESC" ? -1 : 1;
      rows = [...rows].sort((a, b) => {
        const av = parseFloat(a[sortKey] ?? "");
        const bv = parseFloat(b[sortKey] ?? "");
        if (isNaN(av) || isNaN(bv)) {
          return ((a[sortKey] ?? "") > (b[sortKey] ?? "") ? 1 : -1) * dir;
        }
        return (av - bv) * dir;
      });
    }
  }
  const limit = typeof d.limit === "number" ? d.limit : 0;
  if (limit > 0) rows = rows.slice(0, limit);

  // 找 bar 列的 max,用于宽度
  const barCol = cols.find((c) => c.bar);
  const barMax = barCol
    ? Math.max(
        ...rows.map((r) => {
          const v = parseFloat(r[barCol.key] ?? "");
          return isNaN(v) ? 0 : v;
        }),
        1,
      )
    : 1;

  // V24-A · colorScale 每列独立算 min/max
  const colorRange: Record<string, { min: number; max: number }> = {};
  cols.filter((c) => c.colorScale).forEach((c) => {
    const vals = rows
      .map((r) => parseFloat(r[c.key] ?? ""))
      .filter((v) => Number.isFinite(v));
    if (vals.length === 0) return;
    colorRange[c.key] = { min: Math.min(...vals), max: Math.max(...vals) };
  });

  const thAlign = (c: TableColV2): string => {
    if (c.align) return c.align;
    return isNumericCol(c) ? "right" : "left";
  };

  // V25-table · 运行时交互:搜索 / 点列头排序 / 分页(零依赖脚本接管)
  const searchable = d.searchable === true || d.search === true;
  const pageSizeRaw = d.pageSize ?? d["page-size"] ?? d.perPage;
  const pageSize =
    typeof pageSizeRaw === "number"
      ? pageSizeRaw
      : typeof pageSizeRaw === "string"
        ? parseInt(pageSizeRaw, 10)
        : 0;
  const interactive = searchable || (pageSize > 0 && rows.length > pageSize);
  const tableAttrs =
    `${searchable ? ' data-searchable="1"' : ""}` +
    `${pageSize > 0 ? ` data-page-size="${pageSize}"` : ""}`;

  const tableHtml = `<table class="plain-sheet-table"${tableAttrs}>
    <thead><tr>${cols
      .map(
        (c, ci) =>
          `<th class="${isNumericCol(c) ? "num" : ""}${interactive ? " sortable" : ""}"${interactive ? ` data-col="${ci}" data-numeric="${isNumericCol(c) ? 1 : 0}"` : ""} style="text-align:${thAlign(c)}">${escapeHtml(c.label)}${interactive ? '<span class="sort-ind"></span>' : ""}</th>`,
      )
      .join("")}</tr></thead>
    <tbody>
      ${rows
        .map(
          (row) =>
            `<tr>${cols
              .map((c) => {
                const v = row[c.key] ?? "";
                const align = thAlign(c);
                const numCls = isNumericCol(c) ? "num" : "";
                // V24-A · sparkline 列:值是 "1,2,3,4"
                if (c.sparkline) {
                  const arr = v.split(/[,\s]+/).map((s) => parseFloat(s.trim())).filter((n) => Number.isFinite(n));
                  return `<td class="num spark" style="text-align:${align}">${renderInlineSparkline(arr)}</td>`;
                }
                // V24-A · 链接列(<key>_url 同行字段)
                if (c.link) {
                  const url = row[`${c.key}_url`] ?? row["link_url"] ?? "";
                  const displayV = c.format && c.format !== "text" ? fmt(v, c.format) : v;
                  if (url) {
                    return `<td class="${numCls}" style="text-align:${align}"><a href="${escapeAttr(url)}" target="_blank" rel="noopener">${escapeHtml(displayV)}</a></td>`;
                  }
                  return `<td class="${numCls}" style="text-align:${align}">${escapeHtml(displayV)}</td>`;
                }
                // V24-A · colorScale
                if (c.colorScale) {
                  const f = parseFloat(v);
                  const rng = colorRange[c.key];
                  let bg = "";
                  if (rng && Number.isFinite(f)) {
                    const t = rng.max > rng.min ? (f - rng.min) / (rng.max - rng.min) : 0.5;
                    bg = `background:${colorScaleRgb(t)};`;
                  }
                  const displayV = c.format && c.format !== "text" ? fmt(v, c.format) : v;
                  return `<td class="num" style="${bg}text-align:${align}">${escapeHtml(displayV)}</td>`;
                }
                // bar 列(已有逻辑,加 fmt 支持)
                if (c.bar) {
                  const f = parseFloat(v);
                  const w = isNaN(f) ? 0 : Math.round((f / barMax) * 80);
                  const displayV = c.format && c.format !== "text" ? fmt(v, c.format) : v;
                  return `<td class="num" style="text-align:${align}"><span class="bar" style="width: ${w}px"></span>${escapeHtml(displayV)}</td>`;
                }
                // V24-A · 普通列也走 fmt token
                const displayV = c.format && c.format !== "text" ? fmt(v, c.format) : v;
                return `<td class="${numCls}" style="text-align:${align}">${escapeHtml(displayV)}</td>`;
              })
              .join("")}</tr>`,
        )
        .join("")}
    </tbody>
  </table>`;

  if (!interactive) return tableHtml;
  // 包 wrap:搜索框 + 表格 + 分页条(脚本在 hydrate 时填充)
  return `<div class="plain-table-wrap">
    ${searchable ? `<div class="table-search"><input type="text" placeholder="搜索…" data-table-search></div>` : ""}
    ${tableHtml}
    ${pageSize > 0 ? `<div class="table-pager" data-table-pager hidden></div>` : ""}
  </div>`;
}

/**
 * renderPanelAreaChart · Dune-style area / line chart
 *
 * 设计原则:
 * - 完整 Y 轴 ticks (0 / 25 / 50 / 75 / 100% of max),每 tick 带 value label
 * - 每个数据点旁边浮 value 标签 (跟 Dune 一样,不用 hover 也能看清数字)
 * - 顶部 legend bar (color swatch + 系列名 + 当前总值)
 * - 颜色全走 theme CSS 变量(--plain-series-1/2/3/4),不再硬编码 hex
 * - viewBox 保形:`preserveAspectRatio="xMidYMid meet"`,小屏不变形
 * - 平滑曲线:monotone cubic 而不是折线
 * - 点 hover (CSS-only) 放大 + 提示色
 */
function renderPanelAreaChart(d: SectionData): string {
  const yLabel = str(d["y-label"]);
  const rawData = str(d.data);

  const lines = rawData.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return `<div class="empty">no data</div>`;

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((l) => l.split(",").map((c) => c.trim()));

  // viewBox + padding · 16:6.4 比例,Dune 风
  const W = 800;
  const H = 320;
  const padL = 52; // 给 y-axis tick label
  const padR = 24;
  const padT = 28; // 给点上方的 value label
  const padB = 44; // 给 x-axis tick label
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  // 数据范围
  const allVals: number[] = [];
  rows.forEach((r) => {
    for (let i = 1; i < r.length; i++) {
      const v = parseFloat(r[i]);
      if (!isNaN(v)) allVals.push(v);
    }
  });
  const rawMax = Math.max(...allVals, 1);
  // niceTicks 返回 [0, ..., maxV] 等距整数(或小数)tick 数组
  const tickValues = niceTicks(rawMax);
  const maxV = tickValues[tickValues.length - 1];

  const xAt = (i: number) =>
    padL + (i / Math.max(1, rows.length - 1)) * plotW;
  const yAt = (v: number) => padT + plotH - (v / maxV) * plotH;

  // Y ticks · 数量由 niceTicks 决定(通常 4-6 个)
  const ticks = tickValues.map((v) => ({
    v,
    y: padT + plotH - (v / maxV) * plotH,
  }));

  const yAxisLines = ticks
    .map(
      (t) =>
        `<line x1="${padL}" y1="${t.y.toFixed(1)}" x2="${W - padR}" y2="${t.y.toFixed(1)}" class="plain-chart-grid" />`,
    )
    .join("");

  const yAxisLabels = ticks
    .map(
      (t) =>
        `<text x="${padL - 10}" y="${(t.y + 4).toFixed(1)}" class="plain-chart-axis" text-anchor="end">${t.v}</text>`,
    )
    .join("");

  // 各系列
  const series: string[] = [];
  const legendItems: { label: string; latest: string; idx: number }[] = [];

  for (let s = 1; s < headers.length; s++) {
    const seriesIdx = s; // 1-indexed,对应 --plain-series-N
    const pts: { x: number; y: number; v: number }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const v = parseFloat(rows[i][s]);
      if (isNaN(v)) continue;
      pts.push({ x: xAt(i), y: yAt(v), v });
    }
    if (pts.length === 0) continue;

    // monotone cubic path · 比折线更顺
    const linePath = monotonePath(pts);
    const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(padT + plotH).toFixed(1)} L${pts[0].x.toFixed(1)},${(padT + plotH).toFixed(1)} Z`;

    const dots = pts
      .map(
        (p) =>
          `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" class="plain-chart-dot" />` +
          // value 标签浮在点上方 16px
          `<text x="${p.x.toFixed(1)}" y="${(p.y - 12).toFixed(1)}" class="plain-chart-value" text-anchor="middle">${p.v}</text>`,
      )
      .join("");

    series.push(
      `<g class="plain-chart-series" data-series="${seriesIdx}">
        <path d="${areaPath}" class="plain-chart-area-fill" />
        <path d="${linePath}" class="plain-chart-line" />
        ${dots}
      </g>`,
    );

    legendItems.push({
      label: headers[s],
      latest: String(pts[pts.length - 1].v),
      idx: seriesIdx,
    });
  }

  // X 轴 labels · 间隔自适应 (rows ≤ 8 全显示,否则每隔一个)
  const xStride = rows.length > 8 ? Math.ceil(rows.length / 6) : 1;
  const xAxisLabels = rows
    .map((r, i) => {
      if (i % xStride !== 0 && i !== rows.length - 1) return "";
      const x = xAt(i);
      return `<text x="${x.toFixed(1)}" y="${(padT + plotH + 22).toFixed(1)}" class="plain-chart-axis" text-anchor="middle">${escapeHtml(r[0])}</text>`;
    })
    .filter(Boolean)
    .join("");

  // X 轴底线
  const xBaseLine = `<line x1="${padL}" y1="${(padT + plotH).toFixed(1)}" x2="${W - padR}" y2="${(padT + plotH).toFixed(1)}" class="plain-chart-baseline" />`;

  // Legend · chart 上方
  const legend = legendItems
    .map(
      (it) =>
        `<span class="item" data-series="${it.idx}"><span class="swatch"></span>${escapeHtml(it.label)}<span class="latest">${escapeHtml(it.latest)}</span></span>`,
    )
    .join("");

  // hover 数据 · plot 边距用本图精确比例(padL/W ~ padR/W),覆盖脚本经验值
  const hoverData = {
    x: rows.map((r) => r[0] ?? ""),
    series: headers.slice(1).map((name, ci) => ({
      name,
      values: rows.map((r) => {
        const v = parseFloat(r[ci + 1]);
        return isNaN(v) ? null : v;
      }),
    })),
    yFormat: str(d.yFormat ?? d["y-format"]) || undefined,
    plotL: padL / W,
    plotR: 1 - padR / W,
  };
  const hoverJson = JSON.stringify(hoverData).replace(/'/g, "&#39;");

  return `<div class="plain-chart-area plain-chart-hover" data-chart='${hoverJson}'>
    ${legend ? `<div class="plain-chart-legend">${legend}</div>` : ""}
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeAttr(yLabel || "chart")}">
      ${yAxisLines}
      ${yAxisLabels}
      ${xBaseLine}
      ${series.join("")}
      ${xAxisLabels}
    </svg>
    ${yLabel ? `<div class="plain-chart-ylabel">${escapeHtml(yLabel)}</div>` : ""}
  </div>`;
}

/**
 * 给定一个最大值,返回一组"漂亮"的 tick (从 0 起,等距,5 个数量级附近)。
 *
 * 例:
 *   4    → [0, 1, 2, 3, 4]
 *   7    → [0, 2, 4, 6, 8]
 *   23   → [0, 5, 10, 15, 20, 25]
 *   145  → [0, 50, 100, 150]
 *   0.8  → [0, 0.2, 0.4, 0.6, 0.8]
 */
function niceTicks(rawMax: number): number[] {
  if (rawMax <= 0) return [0, 1];
  // 目标 4-6 个 tick
  const targetCount = 5;
  const rawStep = rawMax / targetCount;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  let niceStep: number;
  if (norm <= 1) niceStep = 1;
  else if (norm <= 2) niceStep = 2;
  else if (norm <= 2.5) niceStep = 2.5;
  else if (norm <= 5) niceStep = 5;
  else niceStep = 10;
  const step = niceStep * mag;
  const niceMax = Math.ceil(rawMax / step) * step;
  const ticks: number[] = [];
  // 数值精度处理(避免 0.1 + 0.2 = 0.30000000004)
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  for (let v = 0; v <= niceMax + step * 0.001; v += step) {
    ticks.push(Number(v.toFixed(decimals)));
  }
  return ticks;
}

/**
 * Monotone cubic spline interpolation · 生成 path 'd' 属性
 * 比折线更顺,无 overshoot
 */
function monotonePath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  if (pts.length === 2) {
    return `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} L${pts[1].x.toFixed(1)},${pts[1].y.toFixed(1)}`;
  }

  // 计算每段斜率
  const n = pts.length;
  const dx: number[] = [];
  const dy: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1].x - pts[i].x);
    dy.push(pts[i + 1].y - pts[i].y);
    m.push(dy[i] / (dx[i] || 1));
  }

  // 各点的切线斜率(monotone-preserving Fritsch-Carlson)
  const t: number[] = new Array(n).fill(0);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) {
      t[i] = 0;
    } else {
      t[i] = (m[i - 1] + m[i]) / 2;
    }
  }

  // 用切线 + 1/3 dx 作为 cubic control point
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const cp1x = pts[i].x + dx[i] / 3;
    const cp1y = pts[i].y + (t[i] * dx[i]) / 3;
    const cp2x = pts[i + 1].x - dx[i] / 3;
    const cp2y = pts[i + 1].y - (t[i + 1] * dx[i]) / 3;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${pts[i + 1].x.toFixed(1)},${pts[i + 1].y.toFixed(1)}`;
  }
  return d;
}

function renderPanelBarStack(d: SectionData): string {
  const rawData = str(d.data);
  const lines = rawData.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return `<div class="empty">no data</div>`;

  const headers = lines[0].split(",").map((h) => h.trim());
  const labelIdx = headers.indexOf("extractor") >= 0 ? headers.indexOf("extractor") : 0;
  const valueIdx = headers.indexOf("hours_pct") >= 0 ? headers.indexOf("hours_pct") : 1;
  const toneIdx = headers.indexOf("tone");

  const rows = lines.slice(1).map((l) => l.split(","));
  const maxV = Math.max(...rows.map((r) => parseFloat(r[valueIdx]) || 0), 1);

  return `<div class="plain-stacked-bars">
    ${rows
      .map((r, i) => {
        const tone = toneIdx >= 0 ? r[toneIdx]?.trim() : "";
        const cls = ["bad", "warn", "positive", "muted"].includes(tone) ? tone : "";
        const v = parseFloat(r[valueIdx]) || 0;
        const w = Math.round((v / maxV) * 100);
        return `<div class="row ${cls}" style="--pl-i: ${i}">
          <div class="row-head">
            <span class="lbl">${escapeHtml(r[labelIdx])}</span>
            <span class="val">${escapeHtml(r[valueIdx])}%</span>
          </div>
          <div class="track"><div class="fill" style="width: 100%; transform: scaleX(${w / 100})"></div></div>
        </div>`;
      })
      .join("")}
  </div>`;
}

/**
 * cohort / retention 语义 panel(对标 PostHog retention 表)。
 *
 * 输入 CSV:第一列 = cohort 标签(如月份);可选 `size` 列 = cohort 初始人数;
 * 其余列 = 各周期(M0/M1/...)的留存(绝对人数 或 已是 0-1 比率)。
 *
 * 自动语义:
 *  - 检测值是绝对人数还是比率 → 绝对人数自动除以 cohort base(size 或首列) 算留存率
 *  - 首列归一 100%(retention 惯例)
 *  - 色阶按留存率深浅(绿系:越留存越亮)
 *  - 行尾显示 cohort size · 末行/列不完整(缺数据)留空
 */
function renderCohortPanel(d: SectionData): string {
  const rawData = str(d.data);
  const lines = rawData.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return `<div class="empty">no data</div>`;

  const headers = lines[0].split(",").map((h) => h.trim());
  const sizeIdx = headers.findIndex((h) => /^(size|users|cohort.?size|count|n)$/i.test(h));
  // 周期列 = 除 label(0) 和 size 外的列
  const periodIdx = headers
    .map((_, i) => i)
    .filter((i) => i !== 0 && i !== sizeIdx);
  const periodLabels = periodIdx.map((i) => headers[i]);

  const rows = lines.slice(1).map((l) => l.split(",").map((c) => c.trim()));

  // 判定:所有周期值是否都在 [0,1.0001] → 视为已是比率
  let looksRatio = true;
  for (const r of rows) {
    for (const pi of periodIdx) {
      const v = parseFloat(r[pi]);
      if (!isNaN(v) && v > 1.0001) {
        looksRatio = false;
        break;
      }
    }
    if (!looksRatio) break;
  }

  // 色阶:留存率 0→1 映射到暗→亮绿
  const cellColor = (ret: number): string => {
    const t = Math.max(0, Math.min(1, ret));
    // 暗底 #161a16 → 亮绿 #2ea043,用 alpha 叠加更稳
    const a = (0.08 + t * 0.92).toFixed(3);
    return `background:rgba(46,160,67,${a})`;
  };

  const headHtml = `<div class="cohort-row cohort-head">
    <span class="cohort-cell cohort-label">Cohort</span>
    ${periodLabels.map((p) => `<span class="cohort-cell">${escapeHtml(p)}</span>`).join("")}
    <span class="cohort-cell cohort-size-col">Size</span>
  </div>`;

  const bodyHtml = rows
    .map((r) => {
      const label = r[0] ?? "";
      // cohort base:size 列 > 首个周期绝对值
      const base =
        sizeIdx >= 0 ? parseFloat(r[sizeIdx]) : parseFloat(r[periodIdx[0]]);
      const sizeDisplay =
        sizeIdx >= 0 && !isNaN(parseFloat(r[sizeIdx]))
          ? fmt(parseFloat(r[sizeIdx]), "0.0a")
          : !looksRatio && !isNaN(base)
            ? fmt(base, "0.0a")
            : "—";

      const cells = periodIdx
        .map((pi, ci) => {
          const raw = parseFloat(r[pi]);
          if (isNaN(raw)) return `<span class="cohort-cell cohort-empty"></span>`;
          // 首列归一 100%(若是比率,首列本就 1.0;若绝对人数,raw/base)
          let ret: number;
          if (looksRatio) {
            ret = ci === 0 ? 1 : raw;
          } else {
            ret = base > 0 ? raw / base : 0;
          }
          // 整数百分比去尾零(82.0%→82%),非整数保留 1 位
          const pctNum = ret * 100;
          const pct =
            (Math.abs(pctNum - Math.round(pctNum)) < 0.05
              ? Math.round(pctNum).toString()
              : pctNum.toFixed(1)) + "%";
          return `<span class="cohort-cell" style="${cellColor(ret)}" title="${escapeHtml(label)} · ${escapeHtml(periodLabels[ci])}: ${pct}">${pct}</span>`;
        })
        .join("");

      return `<div class="cohort-row">
        <span class="cohort-cell cohort-label">${escapeHtml(label)}</span>
        ${cells}
        <span class="cohort-cell cohort-size-col">${escapeHtml(sizeDisplay)}</span>
      </div>`;
    })
    .join("");

  return `<div class="plain-cohort" style="--cohort-cols:${periodLabels.length}">
    ${headHtml}
    ${bodyHtml}
  </div>`;
}

function renderPanelSql(d: SectionData): string {
  const language = str(d.language) || "sql";
  const body = str(d.body);
  const stats = str(d.stats);

  return `<div class="plain-sql-block">
    <pre class="plain-sql-body" data-lang="${escapeAttr(language)}"><code>${highlightSql(body)}</code></pre>
    ${stats ? `<div class="plain-sql-stats">${escapeHtml(stats)}</div>` : ""}
  </div>`;
}

function renderInsight(d: SectionData): string {
  const label = str(d.label) || "★ KEY INSIGHT";
  const headline = str(d.headline);
  const body = str(d.body);
  return `<div class="plain-sheet-insight">
    <div class="label">${escapeHtml(label)}</div>
    <h3>${escapeHtml(headline)}</h3>
    ${body.split(/\n\n+/).map((p) => `<p>${escapeMdInline(p.trim())}</p>`).join("")}
  </div>`;
}

function renderClosing(d: SectionData): string {
  const kicker = str(d.kicker) || "NEXT";
  const title = str(d.title);
  const body = str(d.body);
  const items = body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2));
  return `<div class="plain-sheet-closing">
    <div class="kicker">${escapeHtml(kicker)}</div>
    <h3>${escapeHtml(title)}</h3>
    ${items.length > 0 ? `<ul>${items.map((i) => `<li>${escapeMdInline(i)}</li>`).join("")}</ul>` : ""}
  </div>`;
}

function renderUnknown(name: string, variant: string | undefined, d: SectionData): string {
  return `<div class="plain-sheet-unknown">
    <div class="lbl">UNKNOWN ${escapeHtml(name)}${variant ? ` · ${escapeHtml(variant)}` : ""}</div>
    <pre>${escapeHtml(JSON.stringify(d, null, 2))}</pre>
  </div>`;
}

// ─────────────────────────────────────────────
// CSV parser
// ─────────────────────────────────────────────

export type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
};

export function parseCsv(text: string): ParsedCsv {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = splitCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      row[h] = cells[j] ?? "";
    });
    rows.push(row);
  }
  return { headers, rows };
}

// splitCsvLine 下沉到 charts-v2 共享(与 XLSX 导出同一份,防语法漂移)

// ─────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────

function str(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

function arrStr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? ""));
}

function arrObj(v: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null);
}

/** 最简 inline markdown:**bold** + *italic* + `code` */
function escapeMdInline(s: string): string {
  let out = escapeHtml(s);
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(?<![*])\*([^*\n]+?)\*(?![*])/g, "<em>$1</em>");
  out = out.replace(/`([^`]+?)`/g, "<code>$1</code>");
  return out;
}

/** 最简 SQL 语法高亮 */
function highlightSql(s: string): string {
  let out = escapeHtml(s);
  // 注释
  out = out.replace(/(--[^\n]*)/g, '<span class="sql-comment">$1</span>');
  // 字符串
  out = out.replace(/('[^']*')/g, '<span class="sql-str">$1</span>');
  // 数字
  out = out.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="sql-num">$1</span>');
  // 关键字
  const kw =
    "SELECT|FROM|WHERE|AND|OR|JOIN|LEFT|RIGHT|INNER|OUTER|GROUP BY|ORDER BY|LIMIT|HAVING|AS|ON|UNION|INSERT|UPDATE|DELETE|SET|VALUES|CASE|WHEN|THEN|ELSE|END|DESC|ASC|NULL|NOT|IS|IN|BETWEEN|LIKE";
  out = out.replace(
    new RegExp(`\\b(${kw})\\b`, "g"),
    '<span class="sql-kw">$1</span>',
  );
  // 函数(大写括号前)
  out = out.replace(
    /\b([A-Z]+)(?=\()/g,
    (m, p1) => (p1.includes("span") ? m : `<span class="sql-fn">${p1}</span>`),
  );
  return out;
}

// ─────────────────────────────────────────────
// V24-A · 新 panel renderer:全部走 ECharts SSR(charts-v2.ts)
// ─────────────────────────────────────────────

/** 通用 ECharts panel:line / scatter / heatmap / pie / funnel */
function renderEchartsPanel(
  variant: "line" | "scatter" | "heatmap" | "pie" | "funnel" | "sankey",
  d: SectionData,
): string {
  const csv = str(d.data);
  if (!csv) return `<div class="chart-error">缺少 data 字段</div>`;
  const opts: ChartOpts = {
    variant,
    csv,
    title: str(d.title),
    xLabel: str(d.xLabel ?? d["x-label"]),
    yLabel: str(d.yLabel ?? d["y-label"]),
    yLabelRight: str(d.yLabelRight ?? d["y-label-right"]),
    yFormat: str(d.yFormat ?? d["y-format"]),
    xFormat: str(d.xFormat ?? d["x-format"]),
    valueFormat: str(d.valueFormat ?? d["value-format"]),
    logScale: !!d.logScale,
    legend: d.legend !== false,
    hole: typeof d.hole === "number" ? d.hole : undefined,
    showConversion: !!d.showConversion,
  };
  const svg = renderChartV2(opts);
  return chartWithHover(svg, opts);
}

/** mixed-chart:bar + line 自由组合(双 Y 轴) */
function renderMixedChartPanel(d: SectionData): string {
  const csv = str(d.data);
  if (!csv) return `<div class="chart-error">缺少 data 字段</div>`;
  const series = (d.series ?? {}) as Record<string, "bar" | "line" | "area">;
  const opts: ChartOpts = {
    variant: "line", // 不重要;seriesTypes 接管每 series
    csv,
    title: str(d.title),
    yLabel: str(d.yLabel ?? d["y-label"]),
    yLabelRight: str(d.yLabelRight ?? d["y-label-right"]),
    yFormat: str(d.yFormat ?? d["y-format"]),
    yFormatRight: str(d.yFormatRight ?? d["y-format-right"]),
    seriesTypes: series,
    legend: d.legend !== false,
  };
  const svg = renderChartV2(opts);
  // mixed-chart 是横轴-多列时序结构,extractHoverData(variant=line)能解析 → 挂 hover
  return chartWithHover(svg, opts);
}

/**
 * lifecycle panel:用户生命周期堆叠柱(对标 PostHog Lifecycle)。
 * bar-stack 的语义预设 · 自动给 new/returning/resurrected/dormant/churned 配色。
 * CSV: period, new, returning, resurrected, dormant(churned 用负值表示流失)。
 */
function renderLifecyclePanel(d: SectionData): string {
  const csv = str(d.data);
  if (!csv) return `<div class="chart-error">缺少 data 字段</div>`;
  // 语义色:增长态正向(绿/蓝/紫),流失态负向(灰/红)
  const LIFECYCLE_COLORS: Record<string, string> = {
    new: "#2ea043",
    returning: "#388bfd",
    resurrected: "#a371f7",
    dormant: "#8b949e",
    churned: "#f85149",
    churn: "#f85149",
  };
  const parsed = parseCsv(csv);
  const seriesNames = parsed.headers.slice(1);
  const colors = seriesNames.map(
    (n) => LIFECYCLE_COLORS[n.trim().toLowerCase()] ?? "#6e7681",
  );
  const opts: ChartOpts = {
    variant: "bar-stack",
    csv,
    title: str(d.title),
    yLabel: str(d.yLabel ?? d["y-label"]),
    yFormat: str(d.yFormat ?? d["y-format"]),
    legend: d.legend !== false,
    seriesColors: colors,
  };
  const svg = renderChartV2(opts);
  return chartWithHover(svg, opts);
}

/**
 * big-number panel:独立的大数字 + delta + comparisonLabel + sparkline。
 *
 * 跟 KPI 的区别:
 * - KPI 是一组 4-8 个,放栅格内;big-number 是单独占一行/列的大号金额
 * - 用于"这一指标本身就是大标题"的场景(如季度 revenue / TVL)
 */
function renderBigNumberPanel(d: SectionData): string {
  const valueRaw = d.value;
  const formatTok = str(d.format) || "num";
  // value 是数字才 fmt · 字符串(如 "57.1% / 25.0%")保持原文
  const value =
    typeof valueRaw === "number"
      ? fmt(valueRaw, formatTok)
      : str(valueRaw);

  let deltaHtml = "";

  // 路径 1 · 数字比较 (老 V24 路径) · comparison 是数字 → 算 pct delta
  if (d.comparison !== undefined && d.comparison !== null && d.comparison !== "") {
    const curNum =
      typeof valueRaw === "number" ? valueRaw : parseFloat(String(valueRaw));
    const prevNum =
      typeof d.comparison === "number"
        ? d.comparison
        : parseFloat(String(d.comparison));
    if (Number.isFinite(curNum) && Number.isFinite(prevNum) && prevNum !== 0) {
      const deltaPct = (curNum - prevNum) / prevNum;
      const dlt = fmtDelta(deltaPct, normalizeFmt(str(d.comparisonFormat) || "pct1"));
      const cmpLabel = str(d.comparisonLabel) || "vs prev";
      deltaHtml = `<div class="big-delta ${dlt.tone}">
        <span class="arrow">${dlt.tone === "positive" ? "▲" : dlt.tone === "negative" ? "▼" : "—"}</span>
        <span class="text">${escapeHtml(dlt.text)}</span>
        <span class="label">${escapeHtml(cmpLabel)}</span>
      </div>`;
    }
  }

  // 路径 2 · V25 · delta 字符串 + trend 枚举 · 跟 kpis section 同构
  // 给 NL/AI 写出来的 big-number 一个简单出口 · 不要求计算 pct
  if (!deltaHtml && d.delta !== undefined && d.delta !== null && d.delta !== "") {
    const trend = str(d.trend);
    const tone =
      trend === "up" || trend === "positive"
        ? "positive"
        : trend === "down" || trend === "negative"
          ? "negative"
          : "muted";
    const arrow = tone === "positive" ? "▲" : tone === "negative" ? "▼" : "—";
    deltaHtml = `<div class="big-delta ${tone}">
      <span class="arrow">${arrow}</span>
      <span class="text">${escapeHtml(str(d.delta))}</span>
    </div>`;
  }

  const sparkline = Array.isArray(d.sparkline)
    ? renderInlineSparkline(d.sparkline as number[])
    : "";

  return `<div class="plain-big-number">
    <div class="big-value">${escapeHtml(value)}</div>
    ${deltaHtml}
    ${sparkline}
  </div>`;
}

/**
 * 行内迷你 sparkline · 80×20 SVG · 给 KPI / big-number / table cell 用。
 */
function renderInlineSparkline(values: number[]): string {
  if (values.length < 2) return "";
  const w = 80;
  const h = 20;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  // last point dot
  const lastX = (values.length - 1) * step;
  const lastY = h - ((values[values.length - 1] - min) / range) * h;
  return `<svg class="sparkline" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="none">
    <polyline points="${points}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
    <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="2" fill="currentColor" />
  </svg>`;
}

// ─────────────────────────────────────────────
// CSS · Dune dashboard 风
// ─────────────────────────────────────────────

export const SHEET_CSS = `
body { font-size: 14px; }

/* dashboard 网格布局(12 栅格 · schema 驱动 span · 小屏单列) */
.plain-sheet-grid { display:grid; grid-template-columns:repeat(12,1fr); gap:20px; padding:0 32px; margin:20px 0; align-items:start; }
.plain-sheet-grid > .plain-grid-cell { min-width:0; }
.plain-sheet-grid > .plain-grid-cell > * { margin:0 !important; height:100%; }
@media (max-width: 860px) { .plain-sheet-grid { grid-template-columns:1fr; gap:16px; padding:0 18px; } .plain-sheet-grid > .plain-grid-cell { grid-column:1 / -1 !important; } }

/* cohort / retention 表(PostHog 风) */
.plain-cohort { display:flex; flex-direction:column; gap:3px; overflow-x:auto; padding:4px 0; }
.plain-cohort .cohort-row { display:grid; grid-template-columns:minmax(72px,auto) repeat(var(--cohort-cols),minmax(46px,1fr)) minmax(54px,auto); gap:3px; align-items:stretch; }
.plain-cohort .cohort-cell { display:flex; align-items:center; justify-content:center; padding:7px 4px; font-size:11px; font-variant-numeric:tabular-nums; border-radius:4px; white-space:nowrap; }
.plain-cohort .cohort-head .cohort-cell { font-weight:600; opacity:.6; font-size:10px; letter-spacing:.04em; text-transform:uppercase; padding:5px 4px; }
.plain-cohort .cohort-label { justify-content:flex-start; font-weight:500; opacity:.85; padding-left:8px; }
.plain-cohort .cohort-size-col { opacity:.6; justify-content:flex-end; padding-right:8px; }
.plain-cohort .cohort-empty { background:rgba(128,128,128,.05); }
.plain-cohort .cohort-row:not(.cohort-head) .cohort-cell[style] { color:#eafaf0; }

.plain-sheet-header {
  padding: 40px 32px 32px;
  border-bottom: 1px solid var(--plain-rule);
}
.plain-sheet-header .kicker {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--plain-font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: var(--plain-accent);
  margin-bottom: 16px;
}
.plain-sheet-header .kicker::before {
  content: "";
  width: 6px;
  height: 6px;
  background: var(--plain-accent);
  border-radius: 50%;
}
.plain-sheet-header h1 {
  font-family: var(--plain-font-display);
  font-size: 40px;
  font-weight: 600;
  letter-spacing: -0.022em;
  line-height: 1.1;
  margin-bottom: 14px;
  color: var(--plain-ink);
}
.plain-sheet-header .description {
  color: var(--plain-ink-soft);
  font-size: 15px;
  max-width: 720px;
  line-height: 1.6;
}
.plain-sheet-header .description strong {
  color: var(--plain-ink);
  font-weight: 500;
}
.plain-sheet-header .author {
  margin-top: 20px;
  display: flex; gap: 24px; flex-wrap: wrap;
  font-family: var(--plain-font-mono);
  font-size: 11px;
  color: var(--plain-ink-mute);
}
.plain-sheet-header .author strong {
  color: var(--plain-ink);
  font-weight: 500;
}
.plain-sheet-header .tag {
  display: inline-block;
  background: var(--plain-accent-soft);
  color: var(--plain-accent);
  padding: 2px 8px;
  border-radius: 3px;
  font-family: var(--plain-font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
}

/* KPIs */
.plain-sheet-kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--plain-rule);
  margin: 24px;
  border: 1px solid var(--plain-rule);
  border-radius: 6px;
  overflow: hidden;
}
@media (max-width: 720px) { .plain-sheet-kpis { grid-template-columns: repeat(2, 1fr); } }
.plain-sheet-kpi {
  background: var(--plain-raised);
  padding: 24px 20px;
  display: flex; flex-direction: column; gap: 8px;
}
.plain-sheet-kpi .label {
  font-family: var(--plain-font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--plain-ink-mute);
}
.plain-sheet-kpi .value {
  font-family: var(--plain-font-mono);
  /* V25 · Dune 风 · 数字优先,字号显著放大 */
  font-size: 42px;
  font-weight: 600;
  line-height: 1.05;
  color: var(--plain-ink);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  margin-top: 4px;
}
.plain-sheet-kpi .delta {
  font-family: var(--plain-font-mono);
  font-size: 12px;
  display: flex; gap: 6px; align-items: center;
}
.plain-sheet-kpi .delta.up { color: var(--plain-positive); }
.plain-sheet-kpi .delta.down { color: var(--plain-accent); }
.plain-sheet-kpi .delta.neutral { color: var(--plain-ink-mute); }
.plain-sheet-kpi .delta .arrow { font-size: 14px; }
.plain-sheet-kpi .delta small { color: var(--plain-ink-mute); font-size: 10px; margin-left: 4px; }

/* V24-A · KPI sparkline 行内 */
.plain-sheet-kpi .sparkline-wrap {
  display: block;
  margin-top: 6px;
  color: var(--plain-ink-mute);
}
.plain-sheet-kpi .sparkline-wrap.up { color: var(--plain-positive); }
.plain-sheet-kpi .sparkline-wrap.down { color: var(--plain-accent); }
.plain-sheet-kpi .sparkline-wrap svg { display: block; }

/* V24-A · big-number panel(独立大金额) */
.plain-big-number {
  padding: 16px 4px 8px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 8px;
  height: 100%;
  box-sizing: border-box;
  /* container 在 panel 本身上 · cqw 计算 panel 实际宽度 */
  container-type: inline-size;
}
.plain-big-number .big-value {
  font-family: var(--plain-font-display);
  /* V26-K · 字号自适应升级 · cqw 主导 · min 调小让长字符串能缩进 cell · max 不要太大
     短数字 (例 "4") 取 max 44px · 长字符串 ("57.1% / 25.0%") 缩到 ~ 22-26px */
  font-size: clamp(18px, 10cqw, 44px);
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
.plain-big-number .big-delta {
  font-family: var(--plain-font-mono);
  font-size: 13px;
  display: flex;
  gap: 6px;
  align-items: center;
  font-variant-numeric: tabular-nums;
}
.plain-big-number .big-delta .arrow { font-size: 14px; }
.plain-big-number .big-delta .label { color: var(--plain-ink-mute); font-size: 11px; }
.plain-big-number .big-delta.positive { color: var(--plain-positive); }
.plain-big-number .big-delta.negative { color: var(--plain-accent); }
.plain-big-number .big-delta.neutral { color: var(--plain-ink-mute); }
.plain-big-number .sparkline {
  color: var(--plain-ink-soft);
  margin-top: 4px;
}

/* V24-A · ECharts panel container(line/scatter/heatmap/pie/funnel/mixed) */
.plain-chart-echarts {
  padding: 8px 16px 16px;
  overflow-x: auto;
}
.plain-chart-echarts svg { display: block; max-width: 100%; height: auto; }

/* V24-A · chart-error fallback */
.chart-error {
  padding: 20px;
  font-family: var(--plain-font-mono);
  font-size: 12px;
  color: var(--plain-negative);
  background: rgba(248, 113, 113, 0.08);
  border: 1px dashed var(--plain-negative);
  border-radius: 4px;
  margin: 12px;
}
.chart-error small { color: var(--plain-ink-mute); }

/* V24-A · table 单元格内嵌 sparkline */
.plain-sheet-table td.spark { padding: 4px 12px; }
.plain-sheet-table td.spark svg { color: var(--plain-ink-mute); }
.plain-sheet-table td a {
  color: var(--plain-accent);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color var(--plain-dur-fast, 150ms) var(--plain-ease-ui, ease);
}
.plain-sheet-table td a:hover { border-bottom-color: var(--plain-accent); }

/* ── V25 · sheet body 全局 · Dune dashboard 暗底 ──────────────────── */
body { background: var(--plain-paper); color: var(--plain-ink); }

/* panel container · 卡片化,12-col grid ready */
.plain-sheet-panel {
  background: var(--plain-raised);
  border: 1px solid var(--plain-rule);
  border-radius: 8px;
  overflow: hidden;
  margin: 16px 24px;
  /* dark theme 下加微妙阴影 + ring,让卡片浮起来 */
  box-shadow:
    0 1px 0 0 color-mix(in srgb, var(--plain-ink) 8%, transparent),
    0 8px 24px -12px color-mix(in srgb, #000 50%, transparent);
}

/* panel head · 三件套强化 */
.plain-sheet-panel .panel-head {
  padding: 14px 20px 12px;
  border-bottom: 1px solid var(--plain-rule);
  display: flex; align-items: center; gap: 12px;
  background: color-mix(in srgb, var(--plain-ink) 3%, var(--plain-raised));
}
.plain-sheet-panel .panel-head .title {
  font-family: var(--plain-font-mono);
  font-size: 12px;
  font-weight: 500;
  color: var(--plain-ink);
  letter-spacing: 0.04em;
}
.plain-sheet-panel .panel-head .subtitle {
  font-family: var(--plain-font-text);
  font-size: 12px;
  color: var(--plain-ink-mute);
  margin-left: auto;
}

/* type badge · Dune 风 · accent 色块小标 */
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

.plain-sheet-panel .panel-body { padding: 20px; }

/* table */
.plain-sheet-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--plain-font-mono);
  font-size: 12px;
}
.plain-sheet-table th {
  text-align: left;
  padding: 10px 12px;
  font-weight: 500;
  color: var(--plain-ink-mute);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 10px;
  border-bottom: 1px solid var(--plain-rule);
  background: var(--plain-paper);
}
.plain-sheet-table th.num { text-align: right; }
.plain-sheet-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--plain-rule);
  color: var(--plain-ink-soft);
}
.plain-sheet-table tr:hover td { background: var(--plain-surface); color: var(--plain-ink); }
.plain-sheet-table td.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--plain-ink);
}
.plain-sheet-table td .bar {
  display: inline-block;
  height: 4px;
  background: var(--plain-accent);
  border-radius: 2px;
  vertical-align: middle;
  margin-right: 8px;
}

/* ranking */
.plain-sheet-ranking {
  list-style: none;
  padding: 0;
}
.plain-sheet-ranking li {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--plain-rule);
}
.plain-sheet-ranking li:last-child { border-bottom: none; }
.plain-sheet-ranking .rank {
  font-family: var(--plain-font-mono);
  font-size: 11px;
  color: var(--plain-ink-mute);
  text-align: center;
}
.plain-sheet-ranking .name { color: var(--plain-ink); font-size: 13px; }
.plain-sheet-ranking .name small {
  display: block;
  color: var(--plain-ink-mute);
  font-size: 11px;
  font-family: var(--plain-font-mono);
  margin-top: 2px;
}
.plain-sheet-ranking .metric {
  font-family: var(--plain-font-mono);
  font-variant-numeric: tabular-nums;
  color: var(--plain-ink);
  font-size: 13px;
  text-align: right;
}
.plain-sheet-ranking .metric small {
  display: block;
  font-size: 10px;
  color: var(--plain-ink-mute);
  margin-top: 2px;
}
.plain-sheet-ranking li.warn .name,
.plain-sheet-ranking li.warn .name small,
.plain-sheet-ranking li.warn .metric { color: var(--plain-accent); }

/* ── area / line chart (V24 · Dune-style) ───────────────────────── */
/*
 * series color tokens · 走 theme,可被各主题覆盖。
 * dune-dark / monocle / press 各自的 :root 可重定义 --plain-series-N。
 * 这里给默认值(回退),保证未定义时也能跑。
 */
.plain-chart-area {
  --plain-series-1: var(--plain-accent);
  --plain-series-2: color-mix(in srgb, var(--plain-ink) 55%, var(--plain-paper));
  --plain-series-3: color-mix(in srgb, var(--plain-accent) 45%, var(--plain-ink));
  --plain-series-4: color-mix(in srgb, var(--plain-ink-soft) 70%, var(--plain-paper));
  position: relative;
  /* V25 · column flex 让 legend 占第一行,svg 占剩余空间,不重叠 */
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  min-height: 240px;
}
.plain-chart-area svg {
  width: 100%;
  height: auto;
  max-height: 100%;
  flex: 1;
  display: block;
  font-family: var(--plain-font-mono);
}

/* Y/X 轴元素 */
.plain-chart-grid {
  stroke: color-mix(in srgb, var(--plain-rule) 70%, transparent);
  stroke-width: 1;
  stroke-dasharray: 2 5;
}
.plain-chart-baseline {
  stroke: var(--plain-rule);
  stroke-width: 1;
}
.plain-chart-axis {
  fill: var(--plain-ink-mute);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

/* 数据系列 · 用 nth-of-type 自动分色 */
.plain-chart-series[data-series="1"] .plain-chart-line { stroke: var(--plain-series-1); }
.plain-chart-series[data-series="1"] .plain-chart-area-fill { fill: var(--plain-series-1); fill-opacity: 0.18; }
.plain-chart-series[data-series="1"] .plain-chart-dot { fill: var(--plain-series-1); }
.plain-chart-series[data-series="1"] .plain-chart-value { fill: var(--plain-series-1); }

.plain-chart-series[data-series="2"] .plain-chart-line { stroke: var(--plain-series-2); }
.plain-chart-series[data-series="2"] .plain-chart-area-fill { fill: var(--plain-series-2); fill-opacity: 0.12; }
.plain-chart-series[data-series="2"] .plain-chart-dot { fill: var(--plain-series-2); }
.plain-chart-series[data-series="2"] .plain-chart-value { fill: var(--plain-series-2); }

.plain-chart-series[data-series="3"] .plain-chart-line { stroke: var(--plain-series-3); }
.plain-chart-series[data-series="3"] .plain-chart-area-fill { fill: var(--plain-series-3); fill-opacity: 0.14; }
.plain-chart-series[data-series="3"] .plain-chart-dot { fill: var(--plain-series-3); }
.plain-chart-series[data-series="3"] .plain-chart-value { fill: var(--plain-series-3); }

.plain-chart-series[data-series="4"] .plain-chart-line { stroke: var(--plain-series-4); }
.plain-chart-series[data-series="4"] .plain-chart-area-fill { fill: var(--plain-series-4); fill-opacity: 0.12; }
.plain-chart-series[data-series="4"] .plain-chart-dot { fill: var(--plain-series-4); }
.plain-chart-series[data-series="4"] .plain-chart-value { fill: var(--plain-series-4); }

.plain-chart-line { stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round; }
.plain-chart-dot {
  r: 4;
  stroke: var(--plain-paper);
  stroke-width: 2;
  transition: r var(--plain-dur-fast, 150ms) var(--plain-ease-ui, ease);
}
.plain-chart-series:hover .plain-chart-dot { r: 5.5; }

.plain-chart-value {
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* y-label · 浮在 chart 顶部 */
.plain-chart-ylabel {
  position: absolute;
  top: 4px; left: 16px;
  font-family: var(--plain-font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--plain-ink-mute);
  pointer-events: none;
}

/* legend · chart 上方 · 浮在 svg 顶部右侧 · 避免跟 Y 轴 tick 重叠 */
.plain-chart-legend {
  display: flex; gap: 20px; flex-wrap: wrap;
  justify-content: flex-end;
  margin: 0 12px 4px 0;
  padding: 4px 0 0;
  font-family: var(--plain-font-mono);
  font-size: 11px;
  flex-shrink: 0;
}
.plain-chart-legend .item {
  display: inline-flex; align-items: baseline; gap: 8px;
  color: var(--plain-ink-soft);
}
.plain-chart-legend .item .swatch {
  width: 10px; height: 10px; border-radius: 2px;
  align-self: center;
}
.plain-chart-legend .item[data-series="1"] .swatch { background: var(--plain-series-1); }
.plain-chart-legend .item[data-series="2"] .swatch { background: var(--plain-series-2); }
.plain-chart-legend .item[data-series="3"] .swatch { background: var(--plain-series-3); }
.plain-chart-legend .item[data-series="4"] .swatch { background: var(--plain-series-4); }
.plain-chart-legend .item .latest {
  color: var(--plain-ink);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  margin-left: 2px;
}

/* stacked bars */
.plain-stacked-bars {
  display: flex; flex-direction: column; gap: 16px;
}
.plain-stacked-bars .row {
  display: flex; flex-direction: column; gap: 6px;
}
@media (prefers-reduced-motion: no-preference) {
  .plain-stacked-bars .row {
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 0.4s cubic-bezier(0.16,1,0.3,1), transform 0.4s cubic-bezier(0.16,1,0.3,1);
    transition-delay: calc(var(--pl-i, 0) * 0.05s);
  }
  .is-in .plain-stacked-bars .row,
  .plain-stacked-bars.is-in .row { opacity: 1; transform: none; }
}
.plain-stacked-bars .row .row-head {
  display: flex; justify-content: space-between;
  font-family: var(--plain-font-mono);
  font-size: 12px;
}
.plain-stacked-bars .row .row-head .lbl { color: var(--plain-ink); }
.plain-stacked-bars .row .row-head .val {
  color: var(--plain-ink-soft);
  font-variant-numeric: tabular-nums;
}
.plain-stacked-bars .row .track {
  height: 8px;
  background: var(--plain-paper);
  border-radius: 4px;
  overflow: hidden;
}
.plain-stacked-bars .row .fill {
  height: 100%;
  background: var(--plain-ink-mute);
  transform-origin: left;
  transition: transform 0.6s var(--plain-ease-data);
}
.plain-stacked-bars .row.bad .fill { background: var(--plain-negative); }
.plain-stacked-bars .row.warn .fill { background: var(--plain-accent); }
.plain-stacked-bars .row.positive .fill { background: var(--plain-positive); }
.plain-stacked-bars .row.muted .fill { background: var(--plain-ink-mute); }

/* SQL */
.plain-sql-block {
  font-family: var(--plain-font-mono);
}
.plain-sql-body {
  font-family: var(--plain-font-mono);
  font-size: 12px;
  line-height: 1.7;
  color: var(--plain-ink);
  background: var(--plain-raised);
  overflow-x: auto;
  white-space: pre;
}
.plain-sql-body .sql-kw { color: #c084fc; font-weight: 500; }
.plain-sql-body .sql-fn { color: #60a5fa; }
.plain-sql-body .sql-str { color: var(--plain-positive); }
.plain-sql-body .sql-num { color: #fbbf24; }
.plain-sql-body .sql-comment { color: var(--plain-ink-mute); font-style: italic; }
.plain-sql-stats {
  margin-top: 8px;
  font-family: var(--plain-font-mono);
  font-size: 11px;
  color: var(--plain-ink-mute);
}

/* insight */
.plain-sheet-insight {
  margin: 16px 24px 24px;
  padding: 24px;
  background: var(--plain-raised);
  border: 1px solid var(--plain-rule);
  border-left: 3px solid var(--plain-accent);
  border-radius: 6px;
}
.plain-sheet-insight .label {
  font-family: var(--plain-font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: var(--plain-accent);
  margin-bottom: 8px;
}
.plain-sheet-insight h3 {
  font-family: var(--plain-font-display);
  font-size: 20px;
  font-weight: 500;
  color: var(--plain-ink);
  margin-bottom: 12px;
  line-height: 1.3;
}
.plain-sheet-insight p {
  color: var(--plain-ink-soft);
  line-height: 1.6;
  margin-bottom: 10px;
}
.plain-sheet-insight p:last-child { margin-bottom: 0; }
.plain-sheet-insight strong {
  color: var(--plain-ink);
  font-weight: 600;
}

/* closing */
.plain-sheet-closing {
  margin: 0 24px 24px;
  padding: 32px;
  background: var(--plain-raised);
  border: 1px solid var(--plain-rule);
  border-radius: 6px;
}
.plain-sheet-closing .kicker {
  font-family: var(--plain-font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: var(--plain-accent);
  margin-bottom: 12px;
}
.plain-sheet-closing h3 {
  font-family: var(--plain-font-display);
  font-size: 22px;
  color: var(--plain-ink);
  margin-bottom: 16px;
  line-height: 1.3;
  font-weight: 500;
}
.plain-sheet-closing ul {
  list-style: none;
  padding: 0;
}
.plain-sheet-closing ul li {
  padding: 8px 0;
  color: var(--plain-ink-soft);
  font-size: 14px;
  border-bottom: 1px solid var(--plain-rule);
}
.plain-sheet-closing ul li:last-child { border-bottom: none; }
.plain-sheet-closing ul li::before {
  content: "→ ";
  color: var(--plain-accent);
  font-family: var(--plain-font-mono);
  margin-right: 6px;
}

/* unknown */
.plain-sheet-unknown {
  margin: 16px 24px;
  padding: 16px;
  border: 1px dashed var(--plain-ink-mute);
  border-radius: 6px;
}
.plain-sheet-unknown .lbl {
  font-family: var(--plain-font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--plain-ink-mute);
  margin-bottom: 8px;
}
.plain-sheet-unknown pre {
  font-family: var(--plain-font-mono);
  font-size: 12px;
  color: var(--plain-ink-soft);
  overflow-x: auto;
}
`;
