import { z } from "zod";

export const Intent = z.object({
  action: z.enum(["generate", "edit"]),
  target: z.enum(["deck", "doc", "sheet"]),
  reason: z.string().describe("一句话说明为什么路由到这个 agent，展示给用户"),
});
export type Intent = z.infer<typeof Intent>;

// =============================================================================
// Deck
// =============================================================================

/**
 * 指标卡:一个数字 + label + 可选的变化。
 * 用于 stats layout。4-6 个横排,PPT 里最能"说服"的形态。
 */
export const StatCard = z.object({
  value: z.string().describe("主数字,可含单位 '5,000 万' / '82%'"),
  label: z.string().describe("指标名,≤ 10 字"),
  delta: z.string().optional().describe("变化量,可选 '+25%' / '-3pp'"),
  hint: z.string().optional().describe("一句话脚注 ≤ 15 字"),
});
export type StatCard = z.infer<typeof StatCard>;

/**
 * 时间轴节点:一个时间点 + 描述。
 * 用于 timeline layout(里程碑/路线图)。
 */
export const TimelineItem = z.object({
  when: z.string().describe("时间,'Q1'/'2026.04'/'Week 1'"),
  label: z.string().describe("节点名,≤ 15 字"),
  hint: z.string().optional().describe("可选补充说明 ≤ 25 字"),
});
export type TimelineItem = z.infer<typeof TimelineItem>;

/**
 * 图片资源:URL 或 AI 生成描述。
 * 用于 image-hero / image-split layout。
 */
export const SlideImage = z.object({
  url: z.string().describe("图片 URL,可以是 https:// / data: / unsplash 源"),
  alt: z.string().optional(),
  caption: z.string().optional(),
});
export type SlideImage = z.infer<typeof SlideImage>;

/** callout 信息框 */
export const Callout = z.object({
  tone: z.enum(["info", "success", "warn", "danger"]).default("info"),
  title: z.string().optional().describe("可选的加粗开头,≤ 12 字"),
  body: z.string().describe("内容文本"),
});
export type Callout = z.infer<typeof Callout>;

/** 进度条:0-100 的百分比,可阵列展示多个 OKR */
export const ProgressItem = z.object({
  label: z.string().describe("指标名,≤ 15 字"),
  value: z.number().min(0).max(100).describe("百分比 0-100"),
  hint: z.string().optional().describe("如'距目标还差 2pp'"),
});
export type ProgressItem = z.infer<typeof ProgressItem>;

/** 对比块:左右两栏(Before/After, 旧/新, A 方案/B 方案) */
export const ComparePair = z.object({
  leftLabel: z.string().describe("左栏标题,如 'Before' / '旧方案'"),
  leftBullets: z.array(z.string()).default([]).describe("左栏要点 3-6 条"),
  rightLabel: z.string().describe("右栏标题"),
  rightBullets: z.array(z.string()).default([]).describe("右栏要点"),
});
export type ComparePair = z.infer<typeof ComparePair>;

/** 大引用块(带作者 avatar 初始化字母) */
export const QuoteBlock = z.object({
  text: z.string().describe("引用正文"),
  author: z.string().describe("说话人名字"),
  role: z.string().optional().describe("头衔 / 公司"),
});
export type QuoteBlock = z.infer<typeof QuoteBlock>;

/** 团队/人物卡片阵列 */
export const Profile = z.object({
  name: z.string(),
  role: z.string().optional().describe("头衔/角色"),
  initial: z.string().optional().describe("头像显示的字母,缺省取 name 首字"),
});
export type Profile = z.infer<typeof Profile>;

/** 代码块 */
export const CodeBlock = z.object({
  language: z.string().default("").describe("ts / python / bash ..."),
  code: z.string(),
  title: z.string().optional().describe("可选文件名"),
});
export type CodeBlock = z.infer<typeof CodeBlock>;

/** Sparkline:迷你趋势线 */
export const Sparkline = z.object({
  label: z.string().describe("指标名"),
  value: z.string().describe("当前值,如 '12,345' / '82%'"),
  delta: z.string().optional(),
  points: z.array(z.number()).min(2).describe("时序数据点,4-12 个为宜"),
});
export type Sparkline = z.infer<typeof Sparkline>;

/** Act divider 章节幕:kicker + 大 act 编号 + lead */
export const ActDivider = z.object({
  kicker: z.string().describe("上方小字,如 'ACT 01' / '第一幕'"),
  lead: z.string().optional().describe("副标题,一句话"),
});
export type ActDivider = z.infer<typeof ActDivider>;

/** Pipeline 流水线:有编号的步骤列表 */
export const PipelineStep = z.object({
  num: z.string().describe("编号,如 '01' / '1' / 'A'"),
  label: z.string().describe("步骤名"),
  hint: z.string().optional().describe("说明"),
});
export type PipelineStep = z.infer<typeof PipelineStep>;

// ─── Editorial Pack(Monocle 杂志风)字段 ───

/** Article spread:三栏长文 + drop cap */
export const ArticleSpread = z.object({
  kicker: z.string().describe("章节标签,如 'AFFAIRS · SEOUL'"),
  hed: z.string().describe("标题(衬线大字)"),
  deck: z.string().optional().describe("副标题/导读,1-2 句"),
  byline: z.string().optional().describe("作者署名,如 'WORDS — 张三'"),
  body: z.string().describe("正文,260-380 字,Markdown 段落支持\\n分段"),
});
export type ArticleSpread = z.infer<typeof ArticleSpread>;

/** Editor letter:左署名 + 右长段落 */
export const EditorLetter = z.object({
  kicker: z.string().default("LETTER FROM THE EDITOR"),
  signature: z.string().describe("署名,如 '吴先生'"),
  role: z.string().optional().describe("角色,如 'Plain 创始人'"),
  body: z.string().describe("正文,300-450 字"),
});
export type EditorLetter = z.infer<typeof EditorLetter>;

/** Photo essay:满版图 + 角落锁定块 */
export const PhotoEssay = z.object({
  url: z.string().describe("图片 url"),
  hed: z.string().describe("标题"),
  deck: z.string().optional().describe("2 句话副标"),
  caption: z.string().optional().describe("图片注释"),
  alignment: z.enum(["bottom-left", "bottom-right", "top-left", "top-right"]).default("bottom-left"),
});
export type PhotoEssay = z.infer<typeof PhotoEssay>;

/** Data feature:图表 + 旁注 sidebar */
export const DataFeature = z.object({
  kicker: z.string().default("BY THE NUMBERS"),
  hed: z.string().describe("标题"),
  source: z.string().optional().describe("数据来源说明,页脚显示"),
  /** 主图表数据(用 sparkline 或 bar 展示,points 为时序值) */
  points: z.array(z.number()).min(2),
  pointLabels: z.array(z.string()).optional().describe("x 轴标签,与 points 对齐"),
  /** 旁注:3-5 条 */
  annotations: z.array(z.object({
    label: z.string().describe("小标题"),
    text: z.string().describe("说明"),
  })),
});
export type DataFeature = z.infer<typeof DataFeature>;

/** Sidebar story:主文 + 灰底专栏 */
export const SidebarStory = z.object({
  mainKicker: z.string().describe("主文 kicker"),
  mainHed: z.string().describe("主文标题"),
  mainBody: z.string().describe("主文正文 200-300 字"),
  sideLabel: z.string().describe("专栏标签,如 '5 things to know'"),
  sideHed: z.string().describe("专栏小标题"),
  sideBullets: z.array(z.string()).describe("专栏要点"),
});
export type SidebarStory = z.infer<typeof SidebarStory>;

/** Pull quote break:超大引述拉断页 */
export const PullQuoteBreak = z.object({
  text: z.string().describe("引述,可较长"),
  attribution: z.string().describe("署名"),
});
export type PullQuoteBreak = z.infer<typeof PullQuoteBreak>;

// ─── V16 kami SVG diagram layouts ───

/**
 * Quadrant 二维定位图(Impact × Effort / Reach × Confidence 等)。
 * 4 象限 + 6-10 个点 + 可选 1-2 个 focal(高亮)。
 */
export const QuadrantData = z.object({
  xLabel: z.string().describe("x 轴标签"),
  yLabel: z.string().describe("y 轴标签"),
  /** 4 象限标签,顺序 [TR, TL, BL, BR] */
  quadrantLabels: z.array(z.string()).length(4).optional(),
  /** 数据点 */
  points: z.array(z.object({
    label: z.string(),
    x: z.number().min(0).max(100).describe("0-100"),
    y: z.number().min(0).max(100).describe("0-100"),
    focal: z.boolean().optional().describe("true = 加大并 brand 色"),
  })).min(2),
});
export type QuadrantData = z.infer<typeof QuadrantData>;

/**
 * Waterfall 瀑布图:从基准开始 + 一系列正/负贡献 → 终点。
 * 适合财务桥接 / 增量分析。
 */
export const WaterfallData = z.object({
  startLabel: z.string().describe("起点标签"),
  startValue: z.number(),
  /** 中间贡献项,正数加 / 负数减 */
  steps: z.array(z.object({
    label: z.string(),
    delta: z.number().describe("正负数,代表加/减"),
  })).min(1),
  endLabel: z.string().describe("终点标签"),
  /** 单位,如 "$M" / "%" */
  unit: z.string().optional(),
});
export type WaterfallData = z.infer<typeof WaterfallData>;

/**
 * Venn 图:2-3 个圆的相交关系 + 标签。
 */
export const VennData = z.object({
  sets: z.array(z.object({
    label: z.string(),
    /** 集合内的 1-3 个特征点 */
    items: z.array(z.string()).optional(),
  })).min(2).max(3),
  /** 交集区描述 */
  intersection: z.string().optional(),
});
export type VennData = z.infer<typeof VennData>;

/**
 * Swimlane:多条横向泳道 + 步骤,常见于跨团队工作流。
 */
export const SwimlaneData = z.object({
  lanes: z.array(z.object({
    label: z.string(),
    steps: z.array(z.object({
      label: z.string(),
      /** 步骤在时间轴上的位置 0-100 */
      at: z.number().min(0).max(100),
    })).min(1),
  })).min(2),
});
export type SwimlaneData = z.infer<typeof SwimlaneData>;

/**
 * Layer stack:垂直分层架构图(infra / platform / app 等)。
 */
export const LayerStackData = z.object({
  layers: z.array(z.object({
    label: z.string(),
    hint: z.string().optional(),
  })).min(2).describe("从下到上的层"),
});
export type LayerStackData = z.infer<typeof LayerStackData>;

/**
 * 主题节奏 tone —— 控制每页的明暗 / 是否 hero。
 * 参考 guizang-ppt-skill 的 light / dark / hero light / hero dark 思路,
 * 用来约束整个 deck 的视觉节奏(连续 3 页同 tone 视觉疲劳)。
 * 缺省时 deck-linter 会按 layout 推断:cover/act-divider/hero-question → hero-dark,其余 → light。
 */
export const SlideTone = z.enum(["hero-dark", "hero-light", "light", "dark"]);
export type SlideTone = z.infer<typeof SlideTone>;

/**
 * 封面美学 (cover variant) —— 跟 tone 正交,仅给 cover / hero 类 slide 用。
 * 决定封面这一张长什么样,跟主题正交:任何主题都可以套任意 cover。
 *   gradient — 主题主色 → cover bg 斜向渐变 (135°),科技/SaaS 默认
 *   mesh     — 多色径向 mesh + 噪点,AI 时代标志,创意发布
 *   spotlight— 暗底中央光晕,产品聚焦
 *   grid     — 网格线 + 大字,工程/技术
 *   tape     — 上下色条 + 中间留白,报道封面
 *   photo    — 全屏 hero photo + 文字压前景,案例/故事
 */
export const CoverVariant = z.enum(["gradient", "mesh", "spotlight", "grid", "tape", "photo"]);
export type CoverVariant = z.infer<typeof CoverVariant>;

export const Slide = z.object({
  id: z.string().describe("稳定 id，例如 s1, s2"),
  title: z.string(),
  bullets: z.array(z.string()).default([]),
  notes: z.string().optional().describe("演讲备注"),
  /**
   * 主题节奏:hero-dark / hero-light / light / dark。可选,缺省按 layout 推断。
   * - hero-dark:封面 / 章节幕封 / 悬念问题(深底浅字,占位强)
   * - hero-light:浅底大字幕封(交替时用)
   * - light:正文亮底
   * - dark:正文深底(打破节奏用)
   */
  tone: SlideTone.optional(),
  /**
   * 封面美学 — 跟 tone 正交,只在 layout=cover / hero-question / act-divider 上生效。
   * 不写则不加 cover variant(沿用主题 default cover 样式)。
   * AI 应在每份 deck 的 cover 上选一个非空 variant,首选 mesh / gradient。
   */
  coverVariant: CoverVariant.optional(),
  /**
   * 杂志页眉 chrome,跨多页可相同(如 "Act II · Workflow"、"lukew.com · 2026.04")。
   * 与 kicker 的区别:chrome 描述"栏目",kicker 描述"本页钩子"。
   * 仅 Editorial 系 layout 默认渲染;其它 layout 暂留作元数据。
   */
  chrome: z.string().optional(),
  layout: z.enum([
    "cover",        // 封面:大标题居中,可选副标
    "content",      // 常规:标题 + bullets
    "two-col",      // 左右两栏 bullets
    "quote",        // 大引用,强调
    "stats",        // 指标卡阵列 4-6 个
    "timeline",     // 横向时间轴
    "image-hero",   // 满版图片 + 标题覆盖
    "image-split",  // 左图右文 / 右图左文
    "callout",      // 信息框(info/success/warn/danger)
    "progress",     // 进度条阵列(OKR / 完成度)
    "compare",      // 左右对比(Before/After)
    "quote-block",  // 大引用 + 作者 avatar
    "profile",      // 团队卡片阵列
    "code",         // 代码块
    "sparkline",    // KPI + 迷你趋势图阵列
    "act-divider",  // 章节幕(控制节奏用)
    "pipeline",     // 编号流水线
    "hero-question",// 悬念/收束大问题页
    // Editorial Pack(Monocle 杂志风,长文 mode)
    "article-spread",   // 三栏长文 + drop cap
    "editor-letter",    // 编辑寄语
    "photo-essay",      // 满版图 + 角落锁定
    "data-feature",     // 图表 + 旁注 sidebar
    "sidebar-story",    // 主文 + 灰底专栏
    "pull-quote-break", // 超大引述
    // V16 kami SVG diagrams
    "quadrant",         // 二维定位图
    "waterfall",        // 瀑布图(财务桥接 / 增量分析)
    "venn",             // 文氏图 2-3 圆相交
    "swimlane",         // 多泳道流程
    "layer-stack",      // 垂直分层架构
  ]).default("content"),
  // —— 富 layout 专用字段(按 layout 用到对应的,全部可选) ——
  stats: z.array(StatCard).optional().describe("stats layout 用"),
  timeline: z.array(TimelineItem).optional().describe("timeline layout 用"),
  image: SlideImage.optional().describe("image-hero / image-split layout 用"),
  callout: Callout.optional().describe("callout layout 用"),
  progress: z.array(ProgressItem).optional().describe("progress layout 用"),
  compare: ComparePair.optional().describe("compare layout 用"),
  quoteBlock: QuoteBlock.optional().describe("quote-block layout 用"),
  profiles: z.array(Profile).optional().describe("profile layout 用"),
  code: CodeBlock.optional().describe("code layout 用"),
  sparklines: z.array(Sparkline).optional().describe("sparkline layout 用"),
  actDivider: ActDivider.optional().describe("act-divider layout 用"),
  pipeline: z.array(PipelineStep).optional().describe("pipeline layout 用"),
  // Editorial Pack
  articleSpread: ArticleSpread.optional().describe("article-spread layout 用"),
  editorLetter: EditorLetter.optional().describe("editor-letter layout 用"),
  photoEssay: PhotoEssay.optional().describe("photo-essay layout 用"),
  dataFeature: DataFeature.optional().describe("data-feature layout 用"),
  sidebarStory: SidebarStory.optional().describe("sidebar-story layout 用"),
  pullQuoteBreak: PullQuoteBreak.optional().describe("pull-quote-break layout 用"),
  // V16 kami diagrams
  quadrant: QuadrantData.optional().describe("quadrant layout 用"),
  waterfall: WaterfallData.optional().describe("waterfall layout 用"),
  venn: VennData.optional().describe("venn layout 用"),
  swimlane: SwimlaneData.optional().describe("swimlane layout 用"),
  layerStack: LayerStackData.optional().describe("layer-stack layout 用"),
});
export type Slide = z.infer<typeof Slide>;

export const DeckDoc = z.object({
  kind: z.literal("deck"),
  theme: z.string().default("default"),
  slides: z.array(Slide).min(1),
});
export type DeckDoc = z.infer<typeof DeckDoc>;

// =============================================================================
// Doc (Markdown 文档)
// =============================================================================

/**
 * 文档块 —— 一种 discriminated union，覆盖常见 markdown 元素。
 * M2 支持：heading / paragraph / list / code / quote。
 * 复杂的表格、图片、数学公式 V2 再加。
 */
export const DocBlock = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("heading"),
    id: z.string(),
    level: z.number().int().min(1).max(6),
    text: z.string(),
  }),
  z.object({
    type: z.literal("paragraph"),
    id: z.string(),
    text: z.string(),
  }),
  z.object({
    type: z.literal("list"),
    id: z.string(),
    ordered: z.boolean().default(false),
    items: z.array(z.string()).min(1),
  }),
  z.object({
    type: z.literal("code"),
    id: z.string(),
    language: z.string().default(""),
    code: z.string(),
  }),
  z.object({
    type: z.literal("quote"),
    id: z.string(),
    text: z.string(),
  }),
]);
export type DocBlock = z.infer<typeof DocBlock>;

export const DocDoc = z.object({
  kind: z.literal("doc"),
  title: z.string(),
  author: z.string().optional(),
  date: z.string().optional(),
  blocks: z.array(DocBlock).min(1),
});
export type DocDoc = z.infer<typeof DocDoc>;

// =============================================================================
// Sheet (CSV + 叙述 + 图表)
// =============================================================================

export const SheetColumn = z.object({
  key: z.string().describe("列的 id / header 名"),
  label: z.string(),
  type: z.enum(["string", "number", "date", "boolean"]).default("string"),
});
export type SheetColumn = z.infer<typeof SheetColumn>;

export const SheetChart = z.object({
  id: z.string(),
  type: z.enum(["bar", "line", "pie", "scatter"]),
  title: z.string(),
  xKey: z.string().describe("用作 x 轴的列 key"),
  yKeys: z.array(z.string()).min(1).describe("用作 y 轴的列 key（支持多系列）"),
});
export type SheetChart = z.infer<typeof SheetChart>;

/**
 * Stage 4 条件格式:声明式规则,渲染时给命中单元格加 class。
 * 可叠加多条规则,按声明顺序应用(后者覆盖前者的 color)。
 *
 * 例:
 *   { col: "revenue", op: "gt", value: 100000, color: "success" }   // 收入 > 10w 标绿
 *   { col: "delta",   op: "lt", value: 0,      color: "danger" }    // 跌的标红
 *   { col: "status",  op: "eq", value: "P0",   color: "warn" }
 */
export const SheetFormat = z.object({
  col: z.string().describe("命中列的 key"),
  op: z.enum(["eq", "ne", "gt", "gte", "lt", "lte", "contains"]).describe("比较操作"),
  value: z.union([z.string(), z.number(), z.boolean()]).describe("比较值"),
  color: z.enum(["success", "danger", "warn", "info", "muted"]).default("info"),
  /** 可选:加粗 */
  bold: z.boolean().optional(),
});
export type SheetFormat = z.infer<typeof SheetFormat>;

export const SheetDoc = z.object({
  kind: z.literal("sheet"),
  title: z.string(),
  columns: z.array(SheetColumn).min(1),
  /**
   * 数据行：每行是一个 { columnKey -> string|number|boolean|null } map。
   * 用 unknown 容纳异构值，渲染/导出时再按 column.type 解释。
   */
  rows: z.array(z.record(z.string(), z.unknown())).default([]),
  narrative: z.string().describe("markdown 叙述，写分析结论"),
  charts: z.array(SheetChart).default([]),
  /** Stage 4 条件格式:声明式规则,可选 */
  formats: z.array(SheetFormat).default([]),
  /**
   * V16(kami):table 视觉变体,空格分隔多个 class:
   *   "compact"   8pt 字 + 紧凑 padding(数据密集)
   *   "financial" 第一列外右对齐 + tabular-nums
   *   "striped"   行底色交替 ivory
   * 例:`tableStyle: "financial striped"`。可选,缺省 = 基础 kami-table。
   */
  tableStyle: z.string().optional(),
});
export type SheetDoc = z.infer<typeof SheetDoc>;

// =============================================================================
// JSON Patch + Edit instruction (3 类文档共用)
// =============================================================================

export const JsonPatchOp = z.object({
  op: z.enum(["add", "remove", "replace", "move", "copy"]),
  path: z.string().describe("JSON Pointer，例如 /slides/2/title"),
  value: z.unknown().optional(),
  from: z.string().optional(),
});
export type JsonPatchOp = z.infer<typeof JsonPatchOp>;

export const EditInstruction = z.object({
  patch: z.array(JsonPatchOp).min(1).max(20),
  rationale: z.string().describe("一句话说明改了什么"),
});
export type EditInstruction = z.infer<typeof EditInstruction>;

// =============================================================================
// 统一 Doc（三种文档联合类型）
// =============================================================================

export type AnyDoc = DeckDoc | DocDoc | SheetDoc;
export type DocKind = "deck" | "doc" | "sheet";

export type AgentRole = "router" | "generator" | "editor";

export type AgentEvent =
  | { type: "phase"; phase: "routing" | "generating" | "editing" | "done"; detail?: string }
  | { type: "intent"; intent: Intent }
  | { type: "delta"; partial: unknown }
  // 思考过程：AI 在工作时吐出的可读文字（规划提纲、每页思路、改动理由等）
  // source: "plan" | "slide" | "rationale" | "progress" —— 前端可按 source 展示不同样式
  | { type: "reasoning"; source: "plan" | "slide" | "rationale" | "progress"; text: string }
  | { type: "patch"; ops: JsonPatchOp[]; rationale: string }
  | { type: "doc"; kind: DocKind; source: string; doc?: AnyDoc }
  | { type: "error"; code: string; message: string };
