/**
 * Plain DSL v2 · 三件套 Zod schema
 *
 * 跟 src/lib/agents/types.ts 的旧 schema 并存,旧的对应 Marp slides 心智,
 * 新的对应 Plain DSL v2 section-based 心智。
 *
 * AI generator 用这套 schema 做 structured output 约束,然后我们 serialize 成
 * 文本格式的 `.md` 源(.md 经过 parse-dsl 又能转回结构,闭环)。
 */
import { z } from "zod";

// ─────────────────────────────────────────────
// 共享 primitives
// ─────────────────────────────────────────────

const Bullet = z.string().min(1).max(200);
const ShortText = z.string().min(1).max(120);
const MidText = z.string().min(1).max(400);

// ─────────────────────────────────────────────
// Deck v2
//
// 一个 deck 就是 frontmatter + section 列表。每个 section 有 name(layout
// 类型)+ data(layout 专属字段)。9 种 layout 对照 render-v2/deck-layouts.ts。
// ─────────────────────────────────────────────

const DeckCover = z.object({
  kind: z.literal("cover"),
  kicker: z.string().optional(),
  display: ShortText,
  displayTail: z.string().optional(),
  lead: z.string().optional(),
  byline: z.array(ShortText).optional(),
});

const DeckHeroQuestion = z.object({
  kind: z.literal("hero-question"),
  bigNumber: z.string().optional(),
  question: ShortText,
  annotation: z.string().optional(),
});

const DeckStatItem = z.object({
  value: ShortText,
  label: ShortText,
  hint: z.string().optional(),
});
const DeckStats = z.object({
  kind: z.literal("stats"),
  kicker: z.string().optional(),
  title: ShortText.optional(),
  items: z.array(DeckStatItem).min(1).max(6),
});

const DeckDiagItem = z.object({
  num: ShortText,
  head: ShortText,
  body: MidText,
  metric: ShortText.optional(),
  metricLabel: z.string().optional(),
});
const DeckDiagnosis = z.object({
  kind: z.literal("diagnosis"),
  kicker: z.string().optional(),
  title: ShortText.optional(),
  items: z.array(DeckDiagItem).min(1).max(5),
});

const DeckPullQuote = z.object({
  kind: z.literal("pull-quote"),
  text: MidText,
  attribution: z.string().optional(),
});

const DeckStepItem = z.object({
  head: ShortText,
  body: MidText,
  when: z.string().optional(),
});
const DeckProposal = z.object({
  kind: z.literal("proposal"),
  kicker: z.string().optional(),
  title: ShortText.optional(),
  lead: z.string().optional(),
  steps: z.array(DeckStepItem).min(1).max(5),
});

const DeckFeatItem = z.object({
  num: z.string().optional(),
  head: ShortText,
  body: ShortText,
});
const DeckFeatures = z.object({
  kind: z.literal("features"),
  kicker: z.string().optional(),
  title: ShortText.optional(),
  items: z.array(DeckFeatItem).min(1).max(12),
});

const DeckWeekItem = z.object({
  when: ShortText,
  head: ShortText,
  bullets: z.array(Bullet).max(5).optional(),
});
const DeckTimeline = z.object({
  kind: z.literal("timeline"),
  kicker: z.string().optional(),
  title: ShortText.optional(),
  weeks: z.array(DeckWeekItem).min(1).max(6),
});

const DeckCta = z.object({
  label: ShortText,
  // V21 · 放宽 href 校验:允许 URL / 相对路径 / 锚点 / 纯标识(render 阶段自处理)。
  // 之前用 .url() 太严,AI 经常生成 "inplain.app/contact"(无 protocol)、"#cta" 这类,
  // 触发 schema validation 失败 → AGENT_FAILED。
  href: z.string().min(1),
});
const DeckClosing = z.object({
  kind: z.literal("closing"),
  kicker: z.string().optional(),
  display: ShortText,
  sub: z.string().optional(),
  cta: z
    .object({
      primary: DeckCta.optional(),
      secondary: DeckCta.optional(),
    })
    .optional(),
});

// V19 · 图相关 section · 让 deck 不再"全是文字"
export const DeckImage = z.object({
  kind: z.literal("image"),
  src: z.string().describe("图 URL · 优先 PROJECT_ASSETS 里的 · 或 asset:placeholder 描述"),
  alt: z.string().optional(),
  caption: z.string().optional(),
  kicker: z.string().optional(),
  mode: z.enum(["cover", "contain"]).default("cover").optional(),
});

export const DeckGalleryItem = z.object({
  src: z.string(),
  alt: z.string().optional(),
  caption: z.string().optional(),
});
export const DeckGallery = z.object({
  kind: z.literal("gallery"),
  kicker: z.string().optional(),
  title: z.string().optional(),
  items: z.array(DeckGalleryItem).min(1).max(6),
});

export const DeckMediaSplit = z.object({
  kind: z.literal("media-split"),
  src: z.string(),
  alt: z.string().optional(),
  kicker: z.string().optional(),
  title: z.string(),
  body: z.string().optional(),
  bullets: z.array(z.string()).optional(),
  side: z.enum(["left", "right"]).default("left").optional(),
});

/**
 * V19 · 每个 section 都允许带 speakerNotes(演讲模式提词 · 不在网页主体显示)
 * AI 生成时为每个 section 自动写一句 notes(主讲人讲到这页时强调什么)
 */
const speakerNotesExt = { speakerNotes: z.string().max(500).optional() };

/**
 * V21 · per-section AI 常见错位修正,在进 discriminatedUnion 之前 lift。
 * - byline / meta / bullets 等数组字段:string → [string]
 * - items / metrics / data 等数组 alias:统一搬到 items
 * - 字段名 typo:kebab → camel (display-tail → displayTail 等)
 */
function fixupSection(v: unknown): unknown {
  if (!v || typeof v !== "object") return v;
  const obj = { ...(v as Record<string, unknown>) };
  // V22-G · kind 别名映射:LLM 常见同义词 → canonical kind
  if (typeof obj.kind === "string") {
    const k = obj.kind;
    const kindAlias: Record<string, string> = {
      // sheet
      header: "dashboard-header",
      "data-header": "dashboard-header",
      kpi: "kpis",
      "key-insight": "insight",
      summary: "closing",
      conclusion: "closing",
      highlights: "insight",
      // doc
      paragraph: "md",
      text: "md",
      heading: "md",
      title: "hero",
      banner: "hero",
      note: "callout",
      warning: "callout",
      diagram: "flow",
      chart: "data-block",
      list: "numbered",
      quote: "pull-quote",
      // deck
      title_slide: "cover",
      coverpage: "cover",
      "hero-stat": "stats",
      "kpi-grid": "stats",
      "problem-question": "hero-question",
      "step-list": "proposal",
      "feature-grid": "features",
      roadmap: "timeline",
      end: "closing",
      cta: "closing",
    };
    if (kindAlias[k]) obj.kind = kindAlias[k];
  }
  // alias: 各种常见错名搬到正名
  const itemsAlias = ["metrics", "data", "kpis", "entries", "list", "cards", "stats"];
  for (const k of itemsAlias) {
    if (!obj.items && Array.isArray(obj[k])) {
      obj.items = obj[k];
      delete obj[k];
      break;
    }
  }
  // kebab → camel
  const kebabFix: Array<[string, string]> = [
    ["display-tail", "displayTail"],
    ["speaker-notes", "speakerNotes"],
    ["big-number", "bigNumber"],
    ["metric-label", "metricLabel"],
  ];
  for (const [k, target] of kebabFix) {
    if (k in obj && !(target in obj)) {
      obj[target] = obj[k];
      delete obj[k];
    }
  }
  // string → [string] 提升:byline / meta / bullets / tags
  const liftFields = ["byline", "meta", "bullets", "tags"];
  for (const k of liftFields) {
    const val = obj[k];
    if (typeof val === "string") obj[k] = [val];
  }
  // items 内的 metric-label 也修
  if (Array.isArray(obj.items)) {
    obj.items = (obj.items as Array<Record<string, unknown>>).map((it) => {
      if (!it || typeof it !== "object") return it;
      const n = { ...it };
      if ("metric-label" in n && !("metricLabel" in n)) {
        n.metricLabel = n["metric-label"];
        delete n["metric-label"];
      }
      if (typeof n.bullets === "string") n.bullets = [n.bullets];
      return n;
    });
  }
  // weeks 内类似
  if (Array.isArray(obj.weeks)) {
    obj.weeks = (obj.weeks as Array<Record<string, unknown>>).map((w) => {
      if (!w || typeof w !== "object") return w;
      const n = { ...w };
      if (typeof n.bullets === "string") n.bullets = [n.bullets];
      return n;
    });
  }
  return obj;
}

export const DeckSection = z.preprocess(
  fixupSection,
  z.discriminatedUnion("kind", [
    DeckCover.extend(speakerNotesExt),
    DeckHeroQuestion.extend(speakerNotesExt),
    DeckStats.extend(speakerNotesExt),
    DeckDiagnosis.extend(speakerNotesExt),
    DeckPullQuote.extend(speakerNotesExt),
    DeckProposal.extend(speakerNotesExt),
    DeckFeatures.extend(speakerNotesExt),
    DeckTimeline.extend(speakerNotesExt),
    DeckClosing.extend(speakerNotesExt),
    DeckImage.extend(speakerNotesExt),
    DeckGallery.extend(speakerNotesExt),
    DeckMediaSplit.extend(speakerNotesExt),
  ]),
);
export type DeckSection = z.infer<typeof DeckSection>;

export const DeckDocV2 = z.object({
  plain: z.literal("deck@v2").default("deck@v2"),
  theme: z.string().describe("主题 id,见 theme-v2 注册表 · 必选"),
  title: ShortText,
  author: z.string().optional(),
  date: z.string().optional(),
  description: z.string().optional(),
  // V21 · min 放宽到 1:edit 场景可能针对短 deck 修改;generate 时由 prompt 约束 ≥5
  sections: z.array(DeckSection).min(1).max(14),
});
export type DeckDocV2 = z.infer<typeof DeckDocV2>;

// ─────────────────────────────────────────────
// Doc v2
//
// Doc 跟 deck 的差异:body 是 markdown + 内嵌富块。
// 我们把它建模成 blocks 列表(md / callout / hero / flow / data-block / numbered / pull-quote)
// 让 AI 用 structured output 一次给齐。
// ─────────────────────────────────────────────

const DocMd = z.object({
  kind: z.literal("md"),
  text: z.string().min(1).describe("markdown 段落,可含 ## h2 / 列表 / **bold** / 表格"),
});

const DocCallout = z.object({
  kind: z.literal("callout"),
  variant: z.string().transform(v => {
    const lv = v.toLowerCase();
    if (["warn","warning","yellow"].includes(lv)) return "warn";
    if (["danger","error","red","bad","critical"].includes(lv)) return "danger";
    if (["ok","success","green","good","positive","pass"].includes(lv)) return "ok";
    if (["tip","hint","idea","suggestion","purple"].includes(lv)) return "tip";
    if (["note","aside","gray","grey","quote"].includes(lv)) return "note";
    return "info";
  }).default("info"),
  body: z.string().min(1).describe("markdown 短文本"),
});

const DocHero = z.object({
  kind: z.literal("hero"),
  kicker: z.string().optional(),
  title: ShortText,
  displayTail: z.string().optional(),
  deck: z.string().optional().describe("副标 lead"),
  meta: z.array(ShortText).optional(),
});

const DocFlowNode = z.object({
  label: z.string().optional(),
  head: ShortText,
  body: z.string().optional(),
  // V22-G · DocFlow tone — 接受任意字符串并规范到 5 canonical 值。
  // ⚠ 改用 z.string() + transform 代替严格 enum,防止 moonshot 等 LLM 输出
  //   枚举外的词(如 "info"/"default"/"gray")导致整单 schema 拒绝。
  tone: z
    .string()
    .transform((v) => {
      const lv = v.toLowerCase();
      if (["good", "green", "success", "up", "positive", "win", "winner", "best", "pass", "ready", "done", "ok"].includes(lv))
        return "positive" as const;
      if (["red", "danger", "fail", "critical", "down", "bad", "risk"].includes(lv))
        return "risk" as const;
      if (["yellow", "warning", "neutral", "warn", "info", "default", "gray", "grey"].includes(lv))
        return "warn" as const;
      return "ok" as const; // 未知值 fallback
    })
    .optional(),
});
const DocFlow = z.object({
  kind: z.literal("flow"),
  caption: z.string().optional(),
  nodes: z.array(DocFlowNode).min(1).max(6),
});

// V22-G · tone 别名容错 — 接受任意字符串规范到 3 canonical 值。
// 改用 z.string() 代替 enum,防止 LLM 输出枚举外词导致整单 schema 拒绝。
const ToneNormalizer = z
  .string()
  .transform((v) => {
    const lv = v.toLowerCase();
    if (["good", "green", "success", "ok", "win", "up", "positive", "pass", "done", "winner", "best", "ready"].includes(lv))
      return "positive" as const;
    if (["red", "danger", "down", "fail", "critical", "bad", "risk"].includes(lv))
      return "bad" as const;
    return "warn" as const; // warn / neutral / info / unknown → warn
  });

const DocBar = z.object({
  label: ShortText,
  value: z.number().min(0).max(100),
  display: z.string().optional(),
  tone: ToneNormalizer.optional(),
});
const DocDataBlock = z.object({
  kind: z.literal("data-block"),
  title: z.string().optional(),
  headline: ShortText,
  bars: z.array(DocBar).min(1).max(8),
  note: z.string().optional(),
});

const DocNumberedItem = z.object({
  head: ShortText,
  body: MidText,
});
const DocNumbered = z.object({
  kind: z.literal("numbered"),
  items: z.array(DocNumberedItem).min(1).max(7),
});

const DocPullQuote = z.object({
  kind: z.literal("pull-quote"),
  text: MidText,
  attribution: z.string().optional(),
});

// V22-F · 复用 fixupSection 给 DocBlock(byline/meta/bullets string→array,
// kebab→camel,items alias)。AI 在 hero block 经常写 meta: "..." 而不是 meta: ["..."],
// 这会让整篇 doc 因为 schema 拒一项而失败。
export const DocBlock = z.preprocess(
  fixupSection,
  z.discriminatedUnion("kind", [
    DocMd,
    DocCallout,
    DocHero,
    DocFlow,
    DocDataBlock,
    DocNumbered,
    DocPullQuote,
  ]),
);
export type DocBlock = z.infer<typeof DocBlock>;

export const DocDocV2 = z.object({
  plain: z.literal("doc@v2").default("doc@v2"),
  theme: z.string().describe("主题 id · 推荐 monocle / press / kami"),
  title: ShortText,
  author: z.string().optional(),
  date: z.string().optional(),
  description: z.string().optional(),
  // V21 · min 放宽到 1:edit 场景兼容;generate 由 prompt 约束 ≥5
  blocks: z.array(DocBlock).min(1).max(40),
});
export type DocDocV2 = z.infer<typeof DocDocV2>;

// ─────────────────────────────────────────────
// Sheet v2 · Dune dashboard
// ─────────────────────────────────────────────

const SheetDashboardHeader = z.object({
  kind: z.literal("dashboard-header"),
  kicker: z.string().optional(),
  title: ShortText,
  description: z.string().optional(),
  author: z.string().optional(),
  updated: z.string().optional(),
  tags: z.array(ShortText).optional(),
});

// V24-A · KPI item 加 sparkline + comparison(参考 Evidence BigValue)
const SheetKpiItem = z.object({
  label: ShortText,
  value: ShortText,
  delta: z.string().optional().describe("如 +12.3% / -4.5%(已格式化字符串)"),
  trend: z.string().transform(v => {
    const lv = v.toLowerCase();
    if (["up","rise","increase","positive","growth","↑"].includes(lv)) return "up";
    if (["down","fall","decrease","decline","drop","↓"].includes(lv)) return "down";
    return "neutral";
  }).optional(),
  /** V24-A · 数值数组,SVG mini sparkline 走 N 个点。 */
  sparkline: z.array(z.number()).optional(),
  /** V24-A · 对比期 label · "MoM" / "YoY" / "vs Q1" */
  comparisonLabel: z.string().optional(),
  /** V24-A · format token(num/usd0/pct1/0.0a 等),caller 可让 value 走自动格式化 */
  format: z.string().optional(),
});
const SheetKpis = z.object({
  kind: z.literal("kpis"),
  items: z.array(SheetKpiItem).min(1).max(8).describe("2-8 个 KPI(经典 4 个)"),
});

const SheetPanelRanking = z.object({
  kind: z.literal("panel"),
  span: z.number().int().min(1).max(12).optional().describe("dashboard 网格列宽 1-12(12=全宽);相邻 panel 显式 span 才并排,如两个各 6"),
  when: z.string().optional().describe("参数切换条件,如 region=US;配合 param-switcher section 显隐"),
  variant: z.literal("ranking"),
  title: ShortText,
  subtitle: z.string().optional(),
  items: z
    .array(
      z.object({
        rank: ShortText,
        label: ShortText,
        sub: z.string().optional(),
        metric: ShortText,
        metricSub: z.string().optional(),
        tone: ToneNormalizer.optional(),
      }),
    )
    .min(1)
    .max(8),
});

// V24-A · 升级 table:colorScale + link + sparkline + fmt token + delta column
const SheetTableColumn = z.object({
  key: z.string(),
  label: z.string(),
  /** V24-A · 接通 fmt 系统(token 字符串,如 usd0 / pct1 / 0.0a / num) */
  format: z.string().optional(),
  /** 单元格内进度条(已有) · 数值列以最大值为 100% */
  bar: z.boolean().optional(),
  /** V24-A · 数值热力 · 红→黄→绿渐变,从最低→最高 */
  colorScale: z.boolean().optional(),
  /** V24-A · 链接列 · 值替换成 <a href=value>label</a> */
  link: z.boolean().optional(),
  /** V24-A · 单元格内嵌 sparkline · 列值是 `1,2,3,4` 形式的数字串 */
  sparkline: z.boolean().optional(),
  /** V24-A · 文字对齐(默认数值右、文本左) */
  align: z.enum(["left", "center", "right"]).optional(),
});
const SheetPanelTable = z.object({
  kind: z.literal("panel"),
  span: z.number().int().min(1).max(12).optional().describe("dashboard 网格列宽 1-12(12=全宽);相邻 panel 显式 span 才并排,如两个各 6"),
  when: z.string().optional().describe("参数切换条件,如 region=US;配合 param-switcher section 显隐"),
  variant: z.literal("table"),
  title: ShortText,
  subtitle: z.string().optional(),
  source: z.string().describe("CSV 文件名,如 data.csv;或 inline 数据;或 query id (V24-C)"),
  sort: z.string().optional().describe("如 `coverage_pct DESC`"),
  limit: z.number().optional(),
  /** V24-A · 显示行数 上限(超出可滚) */
  pageSize: z.number().optional(),
  /** V24-A · 显示行 search · 表头加 search input,client-side filter */
  searchable: z.boolean().optional(),
  columns: z.array(z.union([z.string(), SheetTableColumn])),
});

// V24-A · 通用 chart prop · 多 series / log / 双 Y 轴 / format
const CommonChartProps = {
  data: z.string().describe("CSV-like 第一行 header,或 query id 引用(V24-C)"),
  yLabel: z.string().optional(),
  yLabelRight: z.string().optional().describe("启用 secondary y 轴"),
  yFormat: z.string().optional().describe("y 轴数字 fmt token,如 usd0 / pct1"),
  xLabel: z.string().optional(),
  logScale: z.boolean().optional().describe("y 轴 log 刻度"),
  /** 'normal'(默认绝对) | 'percent'(stack normalize 到 100%) */
  stack: z.enum(["normal", "percent"]).optional(),
  /** 显示图例,默认 true */
  legend: z.boolean().optional(),
};

const SheetPanelAreaChart = z.object({
  kind: z.literal("panel"),
  span: z.number().int().min(1).max(12).optional().describe("dashboard 网格列宽 1-12(12=全宽);相邻 panel 显式 span 才并排,如两个各 6"),
  when: z.string().optional().describe("参数切换条件,如 region=US;配合 param-switcher section 显隐"),
  variant: z.literal("area-chart"),
  title: ShortText,
  subtitle: z.string().optional(),
  ...CommonChartProps,
});

const SheetPanelBarStack = z.object({
  kind: z.literal("panel"),
  span: z.number().int().min(1).max(12).optional().describe("dashboard 网格列宽 1-12(12=全宽);相邻 panel 显式 span 才并排,如两个各 6"),
  when: z.string().optional().describe("参数切换条件,如 region=US;配合 param-switcher section 显隐"),
  variant: z.literal("bar-stack"),
  title: ShortText,
  subtitle: z.string().optional(),
  ...CommonChartProps,
});

// V24-A 新增 chart 类型 ───────────────────────────────────────

const SheetPanelLineChart = z.object({
  kind: z.literal("panel"),
  span: z.number().int().min(1).max(12).optional().describe("dashboard 网格列宽 1-12(12=全宽);相邻 panel 显式 span 才并排,如两个各 6"),
  when: z.string().optional().describe("参数切换条件,如 region=US;配合 param-switcher section 显隐"),
  variant: z.literal("line-chart"),
  title: ShortText,
  subtitle: z.string().optional(),
  ...CommonChartProps,
});

const SheetPanelScatter = z.object({
  kind: z.literal("panel"),
  span: z.number().int().min(1).max(12).optional().describe("dashboard 网格列宽 1-12(12=全宽);相邻 panel 显式 span 才并排,如两个各 6"),
  when: z.string().optional().describe("参数切换条件,如 region=US;配合 param-switcher section 显隐"),
  variant: z.literal("scatter"),
  title: ShortText,
  subtitle: z.string().optional(),
  data: z.string().describe("CSV: x,y[,size][,category]"),
  xLabel: z.string().optional(),
  yLabel: z.string().optional(),
  xFormat: z.string().optional(),
  yFormat: z.string().optional(),
});

const SheetPanelHeatmap = z.object({
  kind: z.literal("panel"),
  span: z.number().int().min(1).max(12).optional().describe("dashboard 网格列宽 1-12(12=全宽);相邻 panel 显式 span 才并排,如两个各 6"),
  when: z.string().optional().describe("参数切换条件,如 region=US;配合 param-switcher section 显隐"),
  variant: z.literal("heatmap"),
  title: ShortText,
  subtitle: z.string().optional(),
  data: z.string().describe("CSV: 第一行 col header,第一列 row header,其它格子是数值"),
  valueFormat: z.string().optional(),
});

const SheetPanelSankey = z.object({
  kind: z.literal("panel"),
  span: z.number().int().min(1).max(12).optional(),
  when: z.string().optional().describe("参数切换条件,如 region=US;配合 param-switcher section 显隐"),
  variant: z.literal("sankey"),
  title: ShortText,
  subtitle: z.string().optional(),
  data: z.string().describe("CSV 流向图: source,target,value(每行一条流;节点自动去重)"),
  valueFormat: z.string().optional(),
});

const SheetPanelLifecycle = z.object({
  kind: z.literal("panel"),
  span: z.number().int().min(1).max(12).optional(),
  when: z.string().optional().describe("参数切换条件,如 region=US;配合 param-switcher section 显隐"),
  variant: z.literal("lifecycle"),
  title: ShortText,
  subtitle: z.string().optional(),
  data: z
    .string()
    .describe(
      "CSV 用户生命周期堆叠柱: period,new,returning,resurrected,dormant(列名自动配语义色;churned/dormant 用负值表流失)",
    ),
  yFormat: z.string().optional(),
});

const SheetPanelCohort = z.object({
  kind: z.literal("panel"),
  span: z.number().int().min(1).max(12).optional().describe("dashboard 网格列宽 1-12(12=全宽);相邻 panel 显式 span 才并排,如两个各 6"),
  when: z.string().optional().describe("参数切换条件,如 region=US;配合 param-switcher section 显隐"),
  variant: z.literal("cohort"),
  title: ShortText,
  subtitle: z.string().optional(),
  data: z
    .string()
    .describe(
      "CSV cohort 留存表 · 第一列=cohort 标签(如月份),可选 size 列=初始人数,其余列=各周期留存(绝对人数会自动转留存率,首列归 100%)。例:cohort,size,M0,M1,M2",
    ),
});

const SheetPanelPie = z.object({
  kind: z.literal("panel"),
  span: z.number().int().min(1).max(12).optional().describe("dashboard 网格列宽 1-12(12=全宽);相邻 panel 显式 span 才并排,如两个各 6"),
  when: z.string().optional().describe("参数切换条件,如 region=US;配合 param-switcher section 显隐"),
  variant: z.literal("pie"),
  title: ShortText,
  subtitle: z.string().optional(),
  data: z.string().describe("CSV: label,value (前 N 项;余下并入 'Others')"),
  valueFormat: z.string().optional(),
  /** donut 中心洞,百分比 0-1。0 = 实心 pie,0.5 = donut */
  hole: z.number().min(0).max(0.9).optional(),
});

const SheetPanelFunnel = z.object({
  kind: z.literal("panel"),
  span: z.number().int().min(1).max(12).optional().describe("dashboard 网格列宽 1-12(12=全宽);相邻 panel 显式 span 才并排,如两个各 6"),
  when: z.string().optional().describe("参数切换条件,如 region=US;配合 param-switcher section 显隐"),
  variant: z.literal("funnel"),
  title: ShortText,
  subtitle: z.string().optional(),
  data: z.string().describe("CSV: stage,count(自上而下递减)"),
  valueFormat: z.string().optional(),
  /** 显示阶段间转化率(基于上一阶段) */
  showConversion: z.boolean().optional(),
});

const SheetPanelBigNumber = z.object({
  kind: z.literal("panel"),
  span: z.number().int().min(1).max(12).optional().describe("dashboard 网格列宽 1-12(12=全宽);相邻 panel 显式 span 才并排,如两个各 6"),
  when: z.string().optional().describe("参数切换条件,如 region=US;配合 param-switcher section 显隐"),
  variant: z.literal("big-number"),
  title: ShortText,
  subtitle: z.string().optional(),
  value: z.union([z.number(), z.string()]),
  format: z.string().optional().describe("fmt token · 默认 num"),
  comparison: z.union([z.number(), z.string()]).optional().describe("对比期值 · 自动算 delta"),
  comparisonLabel: z.string().optional().describe("如 'vs Q1' / 'MoM'"),
  comparisonFormat: z.string().optional().describe("delta 的 fmt · 默认 pct1"),
  sparkline: z.array(z.number()).optional(),
});

const SheetPanelMixedChart = z.object({
  kind: z.literal("panel"),
  span: z.number().int().min(1).max(12).optional().describe("dashboard 网格列宽 1-12(12=全宽);相邻 panel 显式 span 才并排,如两个各 6"),
  when: z.string().optional().describe("参数切换条件,如 region=US;配合 param-switcher section 显隐"),
  variant: z.literal("mixed-chart"),
  title: ShortText,
  subtitle: z.string().optional(),
  data: z.string().describe("CSV-like 第一行 header"),
  /** 列名 → 该 series 在 chart 里画成什么 */
  series: z.record(z.string(), z.enum(["bar", "line", "area"])).describe(
    "如 { revenue: 'bar', margin_pct: 'line' };左 Y 走第一组,右 Y 走 line(若存在)",
  ),
  yLabel: z.string().optional(),
  yLabelRight: z.string().optional(),
  yFormat: z.string().optional(),
  yFormatRight: z.string().optional(),
  legend: z.boolean().optional(),
});

const SheetPanelSql = z.object({
  kind: z.literal("panel"),
  span: z.number().int().min(1).max(12).optional().describe("dashboard 网格列宽 1-12(12=全宽);相邻 panel 显式 span 才并排,如两个各 6"),
  when: z.string().optional().describe("参数切换条件,如 region=US;配合 param-switcher section 显隐"),
  variant: z.literal("sql"),
  title: ShortText,
  language: z.string().default("sql"),
  body: z.string().min(1),
  stats: z.string().optional(),
  /** V24-C · query id · 后续 panel 用 `data: <id>` 引用此 query 结果 */
  id: z.string().optional(),
});

const SheetPanel = z.union([
  SheetPanelRanking,
  SheetPanelTable,
  SheetPanelAreaChart,
  SheetPanelBarStack,
  SheetPanelLineChart,
  SheetPanelScatter,
  SheetPanelHeatmap,
  SheetPanelCohort,
  SheetPanelSankey,
  SheetPanelLifecycle,
  SheetPanelPie,
  SheetPanelFunnel,
  SheetPanelBigNumber,
  SheetPanelMixedChart,
  SheetPanelSql,
]);

const SheetParamSwitcher = z.object({
  kind: z.literal("param-switcher"),
  id: z.string().describe("参数标识,如 region;panel 用 when:region=US 关联"),
  label: z.string().optional().describe("显示标签,如 地区"),
  options: z.array(z.string()).min(2).max(6).describe("离散选项,如 [US,EU,Asia]"),
});

const SheetInsight = z.object({
  kind: z.literal("insight"),
  label: z.string().default("★ KEY INSIGHT"),
  headline: ShortText,
  body: z.string(),
});

const SheetClosing = z.object({
  kind: z.literal("closing"),
  kicker: z.string().default("NEXT"),
  title: ShortText,
  body: z.string().describe("markdown,每行 '- xxx' 会渲染成清单"),
});

// V22-F + V22-G · 用 discriminatedUnion("kind") 让 zod 错误能精确到字段;
// panel 在子分支里再用 union(variant) 二级分类。
// fixupSection 在 preprocess 阶段把 kind alias 规范化 (header→dashboard-header 等)。
export const SheetSection = z.preprocess(
  fixupSection,
  z.discriminatedUnion("kind", [
    SheetDashboardHeader,
    SheetKpis,
    // V22-G · panel 内部仍是 union by variant,但 discriminator 是 "kind=panel" 进入这里。
    // zod 这里允许:外层 kind discriminate,内层 variant 用 union/discriminatedUnion。
    z.discriminatedUnion("variant", [
      SheetPanelRanking,
      SheetPanelTable,
      SheetPanelAreaChart,
      SheetPanelBarStack,
      SheetPanelLineChart,
      SheetPanelScatter,
      SheetPanelHeatmap,
      SheetPanelCohort,
      SheetPanelSankey,
      SheetPanelLifecycle,
      SheetPanelPie,
      SheetPanelFunnel,
      SheetPanelBigNumber,
      SheetPanelMixedChart,
      SheetPanelSql,
    ]),
    SheetParamSwitcher,
    SheetInsight,
    SheetClosing,
  ]),
);
export type SheetSection = z.infer<typeof SheetSection>;

export const SheetDocV2 = z.object({
  plain: z.literal("sheet@v2").default("sheet@v2"),
  theme: z.string().default("dune-dark").describe("通常 dune-dark"),
  title: ShortText,
  author: z.string().optional(),
  date: z.string().optional(),
  description: z.string().optional(),
  /** csv 数据源文件名(渲染时由 caller resolve) */
  dataSource: z.string().optional(),
  // V21 · min 放宽到 1:edit 场景兼容;generate 由 prompt 约束 ≥3
  sections: z.array(SheetSection).min(1).max(20),
});
export type SheetDocV2 = z.infer<typeof SheetDocV2>;
