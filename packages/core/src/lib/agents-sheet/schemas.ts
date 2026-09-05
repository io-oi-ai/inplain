/**
 * Plain Sheet v3 schema · datasets/queries/vizzes/dashboard 四区
 *
 * 设计原则(对齐 docs/plans/2026-05-23-plain-sheet-redesign.md):
 *
 *   datasets[]   · 数据源(inline CSV / json / URL)
 *   queries[]    · SQL 转换 · 引用 dataset.id · 用户看不到 textarea,LLM 生成
 *   vizzes[]    · 可视化 · 引用 query.id + 列映射 + chart kind
 *   dashboard[]  · 12-col grid · cell 引用 viz.id 或 inline markdown
 *
 * NL 编辑三路径都在这层 schema 上做 RFC 6902 patch:
 *
 *   路径 A · panel-level   `/vizzes/2/kind` = "bar-chart"
 *   路径 B · field-level   `/vizzes/1/config/y-axis-scale` = "log"
 *   路径 C · regenerate    整体重写 queries / vizzes / dashboard
 *                          (datasets 保留 · 不丢用户数据)
 */
import { z } from "zod";

// ─────────────────────────────────────────────
// L1 · Dataset
// ─────────────────────────────────────────────

const DatasetId = z.string().regex(/^[a-z][a-z0-9_]*$/, "dataset id 必须 lowercase snake");

export const DatasetSchema = z.object({
  id: DatasetId,
  source: z.enum(["csv", "json", "url"]).default("csv"),
  /** inline CSV/JSON 字符串 · source=csv/json 必填 */
  data: z.string().optional(),
  /** url 引用 · source=url 必填(V25 暂不实现 fetch,留 schema 位) */
  url: z.string().url().optional(),
}).refine(
  (d) => (d.source === "url" ? !!d.url : !!d.data),
  { message: "inline source 必须有 data,url source 必须有 url" },
);

// ─────────────────────────────────────────────
// L2 · Query
// ─────────────────────────────────────────────

const QueryId = z.string().regex(/^q_[a-z0-9_]+$/, "query id 必须 q_ 前缀");

export const QuerySchema = z.object({
  id: QueryId,
  /** dataset.id 引用 · DuckDB-WASM 加载该 dataset 后跑 SQL */
  source: DatasetId,
  /** SQL 文本 · LLM 生成,用户 NL 修改触发再生成 */
  sql: z.string().min(1),
  /** 可选的中文描述 · 供 inspector 显示 */
  description: z.string().optional(),
});

// ─────────────────────────────────────────────
// L3 · Viz
// ─────────────────────────────────────────────

const VizId = z.string().regex(/^v_[a-z0-9_]+$/, "viz id 必须 v_ 前缀");

/**
 * Viz kind 枚举 · 跟 V24-A 的 12 panel.variant 一一对应。
 * 不重新定义,直接复用 V24 已实装的 render-v2/sheet-panels 渲染层。
 */
export const VizKindEnum = z.enum([
  "big-number",
  "line-chart",
  "bar-chart",
  "area-chart",
  "bar-stack",
  "pie",
  "scatter",
  "heatmap",
  "funnel",
  "mixed-chart",
  "table",
  "ranking",
  "callout",
]);

/**
 * Viz config · open schema(允许任意 key 给 LLM 自由发挥)。
 * 推荐字段(LLM prompt 会引导):
 *   x / y / series          列名(查 query result 的列)
 *   format / y-axis-format  fmt token (usd0 / pct1 / num / 0.0a)
 *   y-axis-scale            "linear" | "log"
 *   value / label / where   big-number / ranking 用
 *   series-colors           { 列名 → hex } override
 *   comparison              { value, where, label } 比较态
 */
export const VizConfig = z.record(z.string(), z.unknown());

export const VizSchema = z.object({
  id: VizId,
  /** query.id 引用 · 改 query 一处所有挂载 viz 跟更新 */
  query: QueryId,
  kind: VizKindEnum,
  /** 标题 · panel head 显示 */
  title: z.string().optional(),
  /** 副标题 · panel head 右上角 */
  subtitle: z.string().optional(),
  config: VizConfig.default({}),
});

// ─────────────────────────────────────────────
// L4 · Dashboard cell · 12-col grid 坐标
// ─────────────────────────────────────────────

const DashboardCellViz = z.object({
  /** 引用 viz.id · panel 把它从 vizzes 数组解出来 render */
  cell: VizId,
  x: z.number().int().min(0).max(11),
  y: z.number().int().min(0).max(999),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(1).max(20),
});

const DashboardCellMarkdown = z.object({
  /** inline markdown · 用 callout / 段落注释 / 章节分隔 */
  cell: z.object({ md: z.string().min(1) }),
  x: z.number().int().min(0).max(11),
  y: z.number().int().min(0).max(999),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(1).max(20),
});

export const DashboardCell = z.union([DashboardCellViz, DashboardCellMarkdown]);
export type DashboardCellT = z.infer<typeof DashboardCell>;

// ─────────────────────────────────────────────
// Sheet v3 root
// ─────────────────────────────────────────────

export const SheetDocV3 = z
  .object({
    plain: z.literal("sheet@v3").default("sheet@v3"),
    theme: z.string().default("dune-dark"),
    title: z.string().min(1),
    author: z.string().optional(),
    date: z.string().optional(),
    description: z.string().optional(),

    /** 至少一个 dataset · LLM regenerate 时也要保留 · 不丢用户数据 */
    datasets: z.array(DatasetSchema).min(1).max(20),
    /** queries 可空数组 · 例:仅 callout dashboard 无需 query */
    queries: z.array(QuerySchema).max(50),
    /** vizzes 至少一个 · 否则 dashboard 没东西渲染 */
    vizzes: z.array(VizSchema).min(1).max(40),
    /** dashboard 至少一个 cell */
    dashboard: z.array(DashboardCell).min(1).max(60),
  })
  .superRefine((doc, ctx) => {
    // 引用完整性检查 · query.source 必须在 datasets 里
    const dsIds = new Set(doc.datasets.map((d) => d.id));
    const qIds = new Set(doc.queries.map((q) => q.id));
    const vIds = new Set(doc.vizzes.map((v) => v.id));

    doc.queries.forEach((q, i) => {
      if (!dsIds.has(q.source)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["queries", i, "source"],
          message: `query.source "${q.source}" 不在 datasets 中`,
        });
      }
    });

    doc.vizzes.forEach((v, i) => {
      if (!qIds.has(v.query)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["vizzes", i, "query"],
          message: `viz.query "${v.query}" 不在 queries 中`,
        });
      }
    });

    doc.dashboard.forEach((cell, i) => {
      const cellTarget = cell.cell;
      if (typeof cellTarget === "string" && !vIds.has(cellTarget)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dashboard", i, "cell"],
          message: `dashboard cell "${cellTarget}" 不在 vizzes 中`,
        });
      }
      // grid 越界
      if (cell.x + cell.w > 12) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dashboard", i, "w"],
          message: `cell 越界:x(${cell.x})+w(${cell.w}) > 12`,
        });
      }
    });
  });

export type SheetDocV3T = z.infer<typeof SheetDocV3>;
export type DatasetT = z.infer<typeof DatasetSchema>;
export type QueryT = z.infer<typeof QuerySchema>;
export type VizT = z.infer<typeof VizSchema>;
export type VizKind = z.infer<typeof VizKindEnum>;
