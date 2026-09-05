/**
 * V24-C · Sheet client-side SQL runtime
 *
 * 把 `panel(sql, id=qX)` 从"装饰文本"升级为可执行 query · 后续 chart panel 用
 * `data: qX` 引用其结果。
 *
 * 架构(纯客户端 hydration,Worker bundle 不动一行):
 *
 * 1. SSR 渲染时
 *    - `panel(sql, id=q1)` 渲染成 `<pre data-plain-sql-id="q1">{SQL}</pre>`
 *    - `panel(chart, data=q1)` 渲染成 placeholder `<div data-plain-needs-query="q1" data-plain-variant="..." data-plain-opts="<base64 opts>"></div>`
 *    - 全部 SQL queries + chart specs 序列化进单个 `<script type="application/json" id="plain-sheet-state">` 块
 *    - 同时 emit 一个 `<script>` 块,内容是 hydrateSheetSql 函数(本文件下面)
 *
 * 2. 客户端 hydrate(只在 DOM ready 后跑一次)
 *    - 检测页面有没有 plain-sheet-state · 没有就跳过
 *    - lazy 从 jsDelivr 拉 DuckDB-WASM(~1.8MB JS + 30MB WASM,首次访问 ~5s)
 *    - 注册 frontmatter dataSource 提供的 CSV(若 R2 / 外部 URL,fetch 后注册成 view)
 *    - 按声明顺序跑每个 SQL · 结果存 query-id → CSV map
 *    - 把每个 placeholder 替换成真 chart(ECharts via jsDelivr,跟 SSR 阶段的 charts-v2 同 option-builder)
 *
 * 3. 失败 fallback
 *    - DuckDB / ECharts 加载失败 → placeholder 显示错误 hint(不影响其他 panel)
 *    - 单个 query 失败 → 该 query 依赖的 chart 显示 "query failed: ..."
 *    - 用户没勾选可执行 SQL(没声明 id)→ runtime 不启动
 *
 * 为什么走 CDN 而非 npm bundle:
 *   - DuckDB-WASM ~30MB WASM,bundle 进 Worker 必爆 10MB 上限
 *   - 客户端 lazy import 时直接走 jsDelivr CDN,Plain 自己产物维持 7.6MB gzipped
 *   - 首次 SQL 渲染 ~5s 加载成本,后续 cache hit · 用户能接受
 *
 * 为什么不只在 server 跑 DuckDB(Node-only,不进 Worker):
 *   - Plain 已迁 Cloudflare Workers,server 渲染就是 Worker 渲染,不能用 Node DuckDB
 *   - 客户端方案也支持 R2 + external CSV(httpfs extension)
 *   - 跟 Plain 本地优先哲学一致(数据在用户浏览器跑,不上服务器)
 */

/**
 * 把 hydrate runtime 作为字符串 emit 进 HTML <script>。
 * 类似 SHEET_TABLE_SCRIPT pattern。
 *
 * 注意:这段代码在 **browser** 跑,不是 server。所以可以用 import()、document、fetch。
 * TS 不参与类型检查这段字符串里的代码 —— 文本即代码,改时小心。
 */
export const SHEET_SQL_RUNTIME = `
(function () {
  if (typeof window === "undefined") return;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  async function boot() {
    var stateEl = document.getElementById("plain-sheet-state");
    if (!stateEl) return;
    var state;
    try {
      state = JSON.parse(stateEl.textContent || "{}");
    } catch (e) {
      console.warn("[plain-sql] bad state:", e);
      return;
    }
    var queries = (state.queries || []);
    var deps = (state.deps || []);
    if (queries.length === 0) return;

    // CDN URLs
    var DUCKDB_VERSION = "1.29.0";
    var ECHARTS_URL = "https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.esm.min.js";
    var DUCKDB_BASE = "https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@" + DUCKDB_VERSION + "/dist";

    var placeholders = document.querySelectorAll("[data-plain-needs-query]");
    if (placeholders.length === 0) return; // 无依赖 chart,SQL 仅装饰

    markLoading(placeholders, "Loading DuckDB…");

    var duckdb, echarts;
    try {
      // 浏览器 ESM 入口用 jsDelivr 的 /+esm(把 CJS 依赖打成纯 ESM);
      // duckdb-browser-blocking.mjs 带 CJS require 痕迹,浏览器直接 import 会挂。
      duckdb = await import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@" + DUCKDB_VERSION + "/+esm");
    } catch (e) {
      markError(placeholders, "DuckDB 加载失败:" + (e && e.message ? e.message : e));
      return;
    }
    try {
      echarts = await import(/* @vite-ignore */ ECHARTS_URL);
    } catch (e) {
      markError(placeholders, "ECharts 加载失败");
      return;
    }

    // Pick bundle · 手动钉死版本化的 jsDelivr URL(eh = exception-handling,主流浏览器都支持)。
    var MANUAL_BUNDLES = {
      eh: { mainModule: DUCKDB_BASE + "/duckdb-eh.wasm", mainWorker: DUCKDB_BASE + "/duckdb-browser-eh.worker.js" },
      mvp: { mainModule: DUCKDB_BASE + "/duckdb-mvp.wasm", mainWorker: DUCKDB_BASE + "/duckdb-browser-mvp.worker.js" },
    };
    var bundle;
    try {
      bundle = duckdb.selectBundle ? await duckdb.selectBundle(MANUAL_BUNDLES) : MANUAL_BUNDLES.eh;
    } catch (e) { bundle = MANUAL_BUNDLES.eh; }

    // worker 脚本跨域(jsDelivr)→ Blob importScripts 包一层。
    // ⚠ worker 内部用 import.meta.url 找同目录 WASM;blob: worker 的 import.meta.url 是 blob: →
    //   找不到 WASM。所以显式把 mainModule 设成绝对 jsDelivr URL(instantiate 第一参),
    //   worker 不再相对解析。
    var worker;
    try {
      var workerBlob = new Blob(['importScripts("' + bundle.mainWorker + '");'], { type: "text/javascript" });
      worker = new Worker(URL.createObjectURL(workerBlob));
    } catch (e) {
      worker = duckdb.createWorker ? await duckdb.createWorker(bundle.mainWorker) : new Worker(bundle.mainWorker);
    }
    var logger = new duckdb.ConsoleLogger();
    var db = new duckdb.AsyncDuckDB(logger, worker);
    // mainModule = 绝对 WASM URL(已是版本化 jsDelivr 全路径),pthreadWorker 不需要(eh/mvp 非 coi)
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    var conn = await db.connect();

    // Register dataSource(if any)
    if (state.dataSource && state.dataSourceCsv) {
      try {
        await db.registerFileText("data.csv", state.dataSourceCsv);
        await conn.query("CREATE OR REPLACE TABLE data AS SELECT * FROM read_csv_auto('data.csv', header=true);");
      } catch (e) {
        console.warn("[plain-sql] dataSource register failed:", e);
      }
    } else if (state.dataSource && /^https?:\\/\\//i.test(state.dataSource)) {
      try {
        var resp = await fetch(state.dataSource);
        var csv = await resp.text();
        await db.registerFileText("data.csv", csv);
        await conn.query("CREATE OR REPLACE TABLE data AS SELECT * FROM read_csv_auto('data.csv', header=true);");
      } catch (e) {
        console.warn("[plain-sql] dataSource fetch failed:", e);
      }
    }

    // 参数当前值(DuckDB 版参数切换器):初始取每个 param-group 的 active 选项
    var paramValues = {};
    document.querySelectorAll(".plain-param-bar .param-group").forEach(function (g) {
      var pid = g.getAttribute("data-param");
      var act = g.querySelector(".param-opt.active") || g.querySelector(".param-opt");
      if (pid && act) paramValues[pid] = act.getAttribute("data-param-val");
    });

    // SQL 占位符替换:{{paramId}} → 当前参数值(简单转义单引号防注入)
    function applyParams(sql) {
      return sql.replace(/\\{\\{\\s*([a-zA-Z0-9_]+)\\s*\\}\\}/g, function (m, pid) {
        var v = paramValues[pid];
        if (v == null) return m;
        return String(v).replace(/'/g, "''");
      });
    }
    // 这个 sheet 是否有 query 用了 {{param}}(决定参数切换走 DuckDB 重算还是预烤显隐)
    var hasParamQuery = queries.some(function (q) { return /\\{\\{\\s*[a-zA-Z0-9_]+\\s*\\}\\}/.test(q.sql); });

    var chartInsts = {}; // dep.id → ECharts 实例(复用,避免重复 init)

    async function runAndRender() {
      // Run queries in order(应用当前参数)
      var results = {};
      for (var i = 0; i < queries.length; i++) {
        var q = queries[i];
        try {
          var rs = await conn.query(applyParams(q.sql));
          var rows = rs.toArray().map(function (r) { return r.toJSON(); });
          if (rows.length === 0) { results[q.id] = { csv: "", error: null }; continue; }
          var headers = Object.keys(rows[0]);
          var csv = headers.join(",") + "\\n" +
            rows.map(function (r) {
              return headers.map(function (h) {
                var v = r[h];
                if (v === null || v === undefined) return "";
                return String(v);
              }).join(",");
            }).join("\\n");
          results[q.id] = { csv: csv, error: null };
        } catch (e) {
          results[q.id] = { csv: "", error: e instanceof Error ? e.message : String(e) };
        }
      }
      // Render charts
      for (var j = 0; j < deps.length; j++) {
        var dep = deps[j];
        var el = document.querySelector('[data-plain-needs-query="' + dep.id + '"]');
        if (!el) continue;
        var r = results[dep.query];
        if (!r) { el.innerHTML = '<div class="chart-error">query "' + dep.query + '" not found</div>'; continue; }
        if (r.error) { el.innerHTML = '<div class="chart-error">query failed: ' + escapeHtml(r.error) + '</div>'; continue; }
        try {
          var inst = chartInsts[dep.id];
          if (!inst) {
            el.innerHTML = "";
            el.style.minHeight = "320px";
            inst = echarts.init(el, null, { renderer: "svg" });
            chartInsts[dep.id] = inst;
            window.addEventListener("resize", function () { inst.resize(); });
          }
          inst.setOption(buildEchartsOption(dep.opts, r.csv), true);
        } catch (e) {
          el.innerHTML = '<div class="chart-error">chart render failed: ' + escapeHtml(String(e)) + '</div>';
        }
      }
    }

    await runAndRender();

    // DuckDB 版参数切换器:有 {{param}} query 时,切换参数 → 重跑 SQL → 更新 chart
    // (无 param query 时,参数切换走预烤显隐脚本 PARAM_SWITCHER,这里不接管)
    if (hasParamQuery) {
      document.querySelectorAll(".plain-param-bar .param-group").forEach(function (g) {
        var pid = g.getAttribute("data-param");
        g.addEventListener("click", function (ev) {
          var b = ev.target.closest && ev.target.closest(".param-opt");
          if (!b || !pid) return;
          paramValues[pid] = b.getAttribute("data-param-val");
          runAndRender();
        });
      });
    }
    // 注意:不关 conn(参数切换要复用);页面卸载时浏览器自动回收 worker。
  }

  function markLoading(els, msg) {
    for (var i = 0; i < els.length; i++) {
      els[i].innerHTML = '<div class="plain-chart-loading">' + escapeHtml(msg) + '</div>';
    }
  }
  function markError(els, msg) {
    for (var i = 0; i < els.length; i++) {
      els[i].innerHTML = '<div class="chart-error">' + escapeHtml(msg) + '</div>';
    }
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Mini ECharts option builder · 简化版(server charts-v2 的 logic 子集)
  // 这里只负责把 CSV + variant + opts 变成 ECharts option
  function buildEchartsOption(opts, csv) {
    var lines = csv.split(/\\r?\\n/).filter(function (l) { return l.trim().length; });
    if (lines.length < 2) return {};
    var headers = lines[0].split(",");
    var rows = lines.slice(1).map(function (l) { return l.split(","); });
    var v = opts.variant || "line";
    if (v === "pie") {
      return {
        title: opts.title ? { text: opts.title, left: "center" } : undefined,
        tooltip: { trigger: "item" },
        series: [{
          type: "pie",
          radius: [opts.hole ? (opts.hole * 100) + "%" : "0%", "70%"],
          data: rows.map(function (r) { return { name: r[0], value: parseFloat(r[1]) || 0 }; }),
        }],
      };
    }
    if (v === "funnel") {
      return {
        title: opts.title ? { text: opts.title, left: "center" } : undefined,
        series: [{
          type: "funnel",
          sort: "descending",
          data: rows.map(function (r) { return { name: r[0], value: parseFloat(r[1]) || 0 }; }),
        }],
      };
    }
    // 默认 cartesian (line / area / bar)
    var xValues = rows.map(function (r) { return r[0]; });
    var series = headers.slice(1).map(function (h, idx) {
      return {
        name: h,
        type: v === "bar" ? "bar" : "line",
        areaStyle: v === "area" ? {} : undefined,
        data: rows.map(function (r) { return parseFloat(r[idx + 1]) || 0; }),
      };
    });
    return {
      title: opts.title ? { text: opts.title, left: "center" } : undefined,
      grid: { top: opts.title ? 50 : 24, bottom: 56, left: 56, right: 24, containLabel: true },
      tooltip: { trigger: "axis" },
      legend: { bottom: 0, type: "scroll" },
      xAxis: { type: "category", data: xValues, name: opts.xLabel || headers[0] },
      yAxis: { type: "value", name: opts.yLabel || "" },
      series: series,
    };
  }
})();
`;

/**
 * Sheet state · server 端序列化进 `<script type="application/json" id="plain-sheet-state">`。
 * Client runtime 读取后驱动 query + chart 替换。
 */
export type PlainSheetState = {
  /** frontmatter dataSource(CSV 文件名 / URL · 客户端 fetch + register) */
  dataSource?: string;
  /** 如果 SSR 阶段已知 inline CSV 内容(``` csv fenced block),server 端打包成字符串塞进来 */
  dataSourceCsv?: string;
  /** SQL queries 按声明顺序 */
  queries: Array<{ id: string; sql: string }>;
  /** chart panel 依赖的 query · placeholder data-attr 用 */
  deps: Array<{
    /** placeholder DOM id(`q1-chart` 等,唯一) */
    id: string;
    /** 引用的 query id */
    query: string;
    /** chart variant + opts(给 client option builder) */
    opts: {
      variant: string;
      title?: string;
      xLabel?: string;
      yLabel?: string;
      hole?: number;
    };
  }>;
};

/** 把 state 转成 `<script>` JSON block,server 渲染时 emit。 */
export function serializePlainSheetState(state: PlainSheetState): string {
  return `<script type="application/json" id="plain-sheet-state">${escapeJsonForScript(
    JSON.stringify(state),
  )}</script>`;
}

/** `</script>` 在 JSON 里要 escape,否则 HTML parser 提前断 script。 */
function escapeJsonForScript(s: string): string {
  return s.replace(/<\/script/gi, "<\\/script");
}

/** chart panel 引用 query id 时,server 渲染成 placeholder。 */
export function renderChartPlaceholder(opts: {
  placeholderId: string;
  queryId: string;
  variant: string;
  title?: string;
  xLabel?: string;
  yLabel?: string;
  hole?: number;
}): string {
  const stateJson = JSON.stringify({
    variant: opts.variant,
    title: opts.title,
    xLabel: opts.xLabel,
    yLabel: opts.yLabel,
    hole: opts.hole,
  });
  return `<div class="plain-chart-placeholder"
    data-plain-needs-query="${opts.placeholderId}"
    data-plain-query="${opts.queryId}"
    data-plain-opts='${stateJson.replace(/'/g, "&apos;")}'>
    <div class="plain-chart-loading">⏳ 等待 query "${opts.queryId}" 执行…</div>
  </div>`;
}
