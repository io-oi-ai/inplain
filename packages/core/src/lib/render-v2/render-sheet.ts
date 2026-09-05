/**
 * Plain v2 · Sheet renderer
 *
 * 输入:Plain DSL v2 sheet source(.md with frontmatter `plain: sheet@v2`)
 *       可选附带 CSV 数据(通过 data-source frontmatter 引用 + csvText 入参)
 * 输出:Dune 风 dashboard HTML
 */

// V19 · 切到 theme-v3 规则化系统
import { compileAnyTheme } from "@/lib/theme-v3";
import { parseDsl } from "./parse-dsl";
import {
  renderSheetSection,
  parseCsv,
  SHEET_CSS,
  type ParsedCsv,
} from "./sheet-panels";
import { BASE_ELEMENTS_CSS } from "./base-elements";
import {
  renderTopNav,
  renderFooterAndWatermark,
  wrapHtml,
  navActionScript,
} from "./chrome";
import { VISUAL_EDIT_SCRIPT } from "@/lib/export/visual-edit-script";
import { SHEET_CHART_INTERACTIVE } from "./sheet-chart-interactive";
import { SHEET_TABLE_INTERACTIVE, SHEET_TABLE_CSS, PARAM_SWITCHER_INTERACTIVE, PARAM_SWITCHER_CSS } from "./sheet-table-interactive";
import { DOC_ASK_CSS, DOC_ASK_SCRIPT, renderAskFab, qaShareIdScript } from "./doc-ask";
import {
  SHEET_SQL_RUNTIME,
  serializePlainSheetState,
  type PlainSheetState,
} from "./sheet-sql-runtime";

export type SheetRenderOptions = {
  source: string;
  /** CSV 数据源文本(从 data-source 字段 resolve 后注入) */
  csvText?: string;
  themeOverride?: string;
  /** Framer 模式水印:默认 true(免费/匿名显示水印) */
  branded?: boolean;
  breadcrumb?: string[];
  actions?: Array<{ label: string; intent?: string; href?: string; primary?: boolean }>;
  /** V25 · share view 调用 · 不渲染 nav / footer (宿主页已有 chrome) */
  embed?: boolean;
  /** 问答「问这个表格」开关 · 默认 true · 显式 false 隐藏 */
  enableQa?: boolean;
  /** 分享页访客问答:传 shareId → 访客模式(扣作者账),即使 embed */
  qaShareId?: string;
};

export function renderSheet(opts: SheetRenderOptions): string {
  const parsed = parseDsl(opts.source);

  // V25 PR-3 · v3 分支 · plain: sheet@v3 → renderSheetV3
  // v2 老文件继续走下面的老路径 · 完全向后兼容
  const frontPlain = parsed.front.plain;
  if (typeof frontPlain === "string" && frontPlain.trim().startsWith("sheet@v3")) {
    return renderViaV3(opts);
  }

  // 主题:override > frontmatter > dune-dark(sheet 的默认主题不是 monocle 是 dune-dark)
  const themeId =
    opts.themeOverride ??
    (typeof parsed.front.theme === "string" ? parsed.front.theme : "dune-dark");
  const compiled = compileAnyTheme(themeId);

  // CSV 数据
  const csv: ParsedCsv | null = opts.csvText ? parseCsv(opts.csvText) : null;

  // V24-C · 扫所有 panel(sql, id=xxx) · 收集成 queries · client runtime 跑
  const sqlQueries: Array<{ id: string; sql: string }> = [];
  const chartDeps: PlainSheetState["deps"] = [];
  for (const b of parsed.blocks) {
    if (b.kind !== "section") continue;
    if (b.name === "panel" && b.variant === "sql") {
      const id = typeof b.data.id === "string" ? b.data.id : "";
      const sql = typeof b.data.body === "string" ? b.data.body : "";
      if (id && sql) sqlQueries.push({ id, sql });
    }
  }
  // 标记 chart panel 依赖的 query · 在 renderSheetSection 之外另存上下文
  // (renderSheetSection 看到 data=<query-id> 时走 placeholder · 见下方逻辑)
  const queryIds = new Set(sqlQueries.map((q) => q.id));

  // 渲染各 section
  // V25-grid · 每个 part 带 isPanel + span,最后把连续 panel 包进 12 栅格 grid
  const parts: Array<{ html: string; isPanel: boolean; span: number; when?: string }> = [];
  let placeholderCounter = 0;
  const readSpan = (d: Record<string, unknown>): number => {
    const raw = d.span ?? d.cols ?? d.width;
    const n = typeof raw === "number" ? raw : typeof raw === "string" ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) ? Math.max(1, Math.min(12, n)) : 0; // 0 = 未指定,自动分配
  };
  // V25-param · 参数切换器:收集 ::: param-switcher 定义 + panel 的 when 条件
  const switchers: Array<{ id: string; label: string; options: string[] }> = [];
  const readWhen = (d: Record<string, unknown>): string | undefined => {
    const w = d.when;
    return typeof w === "string" && w.includes("=") ? w.trim() : undefined;
  };
  for (const b of parsed.blocks) {
    if (b.kind !== "section") continue;

    // 参数切换器定义(不渲染成 panel,收集后统一渲染在顶部)
    if (b.name === "param-switcher" || b.name === "param") {
      const id = typeof b.data.id === "string" ? b.data.id : "";
      const label = typeof b.data.label === "string" ? b.data.label : id;
      let options: string[] = [];
      if (Array.isArray(b.data.options)) options = b.data.options.map((o) => String(o));
      else if (typeof b.data.options === "string") options = b.data.options.split(",").map((o) => o.trim());
      if (id && options.length > 0) switchers.push({ id, label, options });
      continue;
    }

    // V24-C · chart panel 引用 query id 时渲染 placeholder · client hydrate 时填
    if (b.name === "panel" && b.variant && isChartVariant(b.variant)) {
      const dataField = typeof b.data.data === "string" ? b.data.data.trim() : "";
      if (queryIds.has(dataField)) {
        const placeholderId = `qph-${placeholderCounter++}`;
        chartDeps.push({
          id: placeholderId,
          query: dataField,
          opts: {
            variant: b.variant,
            title: typeof b.data.title === "string" ? b.data.title : undefined,
            xLabel: typeof b.data.xLabel === "string" ? b.data.xLabel : undefined,
            yLabel: typeof b.data.yLabel === "string" ? b.data.yLabel : undefined,
            hole: typeof b.data.hole === "number" ? b.data.hole : undefined,
          },
        });
        parts.push({
          isPanel: true,
          span: readSpan(b.data),
          when: readWhen(b.data),
          html: `<div class="plain-sheet-panel">
          <div class="panel-head">
            <span class="title">${escape(String(b.data.title ?? ""))}</span>
            <span class="type">${b.variant.toUpperCase()}</span>
          </div>
          <div class="panel-body">
            <div class="plain-chart-placeholder" data-plain-needs-query="${placeholderId}" data-plain-query="${dataField}">
              <div class="plain-chart-loading">⏳ 等待 query "${dataField}" 执行…</div>
            </div>
          </div>
        </div>`,
        });
        continue;
      }
    }

    parts.push({
      isPanel: b.name === "panel",
      span: b.name === "panel" ? readSpan(b.data) : 0,
      when: b.name === "panel" ? readWhen(b.data) : undefined,
      html: renderSheetSection(b.name, b.variant, b.data, csv),
    });
  }

  // 把连续的 panel 包进 12 栅格 grid · 未显式 span 的按组内数量自动均分
  const grouped: string[] = [];
  let run: Array<{ html: string; span: number; when?: string }> = [];
  const flushRun = () => {
    if (run.length === 0) return;
    // 未显式 span 的 panel 默认全宽(span 12,竖排)· AI 显式 span 时才并排
    // (保守默认避免破坏既有竖排观感;并排是 AI 主动的布局决策)
    const cells = run
      .map((p) => {
        const span = p.span > 0 ? p.span : 12;
        // when="id=value" → data-when-id="value",切换器控制显隐
        let whenAttr = "";
        if (p.when) {
          const eq = p.when.indexOf("=");
          const wid = p.when.slice(0, eq).trim();
          const wval = p.when.slice(eq + 1).trim();
          whenAttr = ` data-when-${escape(wid)}="${escape(wval)}"`;
        }
        return `<div class="plain-grid-cell"${whenAttr} style="grid-column:span ${span}">${p.html}</div>`;
      })
      .join("");
    grouped.push(`<div class="plain-sheet-grid">${cells}</div>`);
    run = [];
  };
  for (const p of parts) {
    if (p.isPanel) {
      run.push({ html: p.html, span: p.span, when: p.when });
    } else {
      flushRun();
      grouped.push(p.html);
    }
  }
  flushRun();

  // V25-param · 切换器 UI(放在 nav 之后、panels 之前)+ 控制脚本
  let switcherBar = "";
  if (switchers.length > 0) {
    switcherBar = `<div class="plain-param-bar">${switchers
      .map(
        (sw) =>
          `<div class="param-group" data-param="${escape(sw.id)}"><span class="param-label">${escape(sw.label)}</span>${sw.options
            .map(
              (opt, i) =>
                `<button class="param-opt${i === 0 ? " active" : ""}" data-param-val="${escape(opt)}">${escape(opt)}</button>`,
            )
            .join("")}</div>`,
      )
      .join("")}</div>`;
  }

  const title = String(parsed.front.title ?? "Plain dashboard");

  const breadcrumb =
    opts.breadcrumb ?? buildDefaultBreadcrumb(title, parsed.front.date);

  const branded = opts.branded !== false;
  const nav = renderTopNav({
    kind: "sheet",
    breadcrumb,
    actions:
      opts.actions ??
      [
        { label: "Share link", intent: "share" },
        { label: "Export .xlsx", intent: "export-xlsx", primary: true },
      ],
    branded,
  });

  const footer = renderFooterAndWatermark({
    kind: "sheet",
    branded,
  });

  // V24-C · 有 SQL query 时 emit state + runtime
  let sqlStateScript = "";
  let sqlRuntime = "";
  if (sqlQueries.length > 0 && chartDeps.length > 0) {
    const ds = typeof parsed.front.dataSource === "string" ? parsed.front.dataSource : undefined;
    const state: PlainSheetState = {
      dataSource: ds,
      // inline CSV(若 caller 传入 csvText 且 dataSource 是相对文件名)就嵌进 state
      dataSourceCsv: ds && opts.csvText ? opts.csvText : undefined,
      queries: sqlQueries,
      deps: chartDeps,
    };
    sqlStateScript = serializePlainSheetState(state);
    sqlRuntime = `<script>${SHEET_SQL_RUNTIME}</script>`;
  }

  const qaOn = opts.enableQa !== false;
  const guestQa = !!opts.qaShareId && qaOn;
  const authorQa = !opts.qaShareId && !opts.embed && qaOn;
  const showQa = guestQa || authorQa;
  const askFab = showQa ? renderAskFab("sheet") : "";

  return wrapHtml({
    title,
    kind: "sheet",
    themeId: compiled.id,
    themeCss: compiled.css,
    bodyHtml: `${nav}${switcherBar}${grouped.join("\n")}${sqlStateScript}${sqlRuntime}${footer}${askFab}`,
    extraHead: `<style>${BASE_ELEMENTS_CSS}${SHEET_CSS}${V24C_CSS}${SHEET_TABLE_CSS}${PARAM_SWITCHER_CSS}${DOC_ASK_CSS}</style>`,
    extraScripts: navActionScript() + VISUAL_EDIT_SCRIPT + `<script>${SHEET_CHART_INTERACTIVE}</script>` + `<script>${SHEET_TABLE_INTERACTIVE}</script>` + (switchers.length > 0 ? `<script>${PARAM_SWITCHER_INTERACTIVE}</script>` : "") + (showQa ? (guestQa ? qaShareIdScript(opts.qaShareId!) : "") + `<script>${DOC_ASK_SCRIPT}</script>` : ""),
  });
}

function isChartVariant(v: string): boolean {
  return v === "line-chart" || v === "area-chart" || v === "bar-stack" ||
    v === "scatter" || v === "heatmap" || v === "pie" || v === "funnel" ||
    v === "mixed-chart";
}

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const V24C_CSS = `
.plain-chart-placeholder {
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--plain-rule);
  border-radius: 4px;
  margin: 12px;
}
.plain-chart-loading {
  font-family: var(--plain-font-mono);
  font-size: 12px;
  color: var(--plain-ink-mute);
  letter-spacing: 0.04em;
}
`;

function buildDefaultBreadcrumb(title: string, date: unknown): string[] {
  const segs: string[] = ["DASHBOARD"];
  if (title) segs.push(title.length > 40 ? title.slice(0, 40) + "…" : title);
  if (typeof date === "string") segs.push(date);
  return segs;
}

// ─────────────────────────────────────────────
// V25 PR-3 · v3 dispatch
// ─────────────────────────────────────────────

import { parseSheetV3 } from "@/lib/agents-sheet/serialize";
import { renderSheetV3 } from "./render-sheet-v3";

function renderViaV3(opts: SheetRenderOptions): string {
  const doc = parseSheetV3(opts.source);
  if (!doc) {
    // 解析失败 · fallback 输出错误页 · 不静默退化到 v2(已经声明 v3 应该真用 v3)
    return `<!doctype html><html><body style="background:#0e0e10;color:#f5f5f0;font-family:JetBrains Mono,monospace;padding:48px"><h1>sheet@v3 parse failed</h1><p>请检查 datasets / queries / vizzes / dashboard 四区是否完整</p></body></html>`;
  }
  return renderSheetV3({
    doc,
    themeOverride: opts.themeOverride,
    branded: opts.branded,
    breadcrumb: opts.breadcrumb,
    actions: opts.actions,
    embed: opts.embed,
    enableQa: opts.enableQa,
    qaShareId: opts.qaShareId,
  });
}
