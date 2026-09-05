/**
 * V32 · 统一块 schema(语义层 · 跟模板无关)
 *
 * 设计(见 memory project_plain_v32_unified_blocks):
 *   - 一份文档 = Document { meta, blocks: Block[] } · 不再分 deck/doc/sheet
 *   - "deck 分屏演示"只是渲染 mode(present),靠 block.pageBreak 切屏;默认 report(可滚动)
 *   - 16 种通用 Block 收敛旧三套 25 语义节点(stats/kpi/data-block→metrics 等)
 *   - AI 只输出 content JSON · 不写 HTML;模板渲染;换模板 0 调 AI
 *   - 每个 block 带稳定 id(patch 按 id 定位,防插删下标漂移)
 *
 * S0 · 纯类型 + zod · 无 runtime。
 */
import { z } from "zod";

// ─────────────────────────────────────────────────────────────
// Atoms(复用 v31 语义,合并重复)
// ─────────────────────────────────────────────────────────────
const StringOpt = z.string().optional();

/** 量化指标:数值+label+趋势(deck.stats / sheet.kpi / doc.data-block 共用) */
const Mark = z.object({
  value: z.string(),
  label: z.string(),
  hint: StringOpt,
  delta: z.enum(["up", "down", "flat"]).optional(),
});
export type Mark = z.infer<typeof Mark>;

/** 卡片项:合并 v31 的 StepItem/FeatureItem/DiagnosisItem(字段高度重叠) */
const CardItem = z.object({
  num: StringOpt,
  head: z.string(),
  body: z.string(),
  icon: StringOpt,
  when: StringOpt,
  metric: StringOpt,
  metricLabel: StringOpt,
});
export type CardItem = z.infer<typeof CardItem>;

/** 序列项:timeline/pipeline 共用 */
const SeqItem = z.object({
  when: StringOpt,
  label: z.string(),
  hint: StringOpt,
});

const Col = z.object({
  label: z.string(),
  bullets: z.array(z.string()),
});

const CtaButton = z.object({
  label: z.string(),
  href: StringOpt,
});

const QuadrantPoint = z.object({
  label: z.string(),
  x: z.number(),
  y: z.number(),
  focal: z.boolean().optional(),
});

const ChartSeries = z.object({
  name: z.string(),
  data: z.array(z.number()),
});

// ─────────────────────────────────────────────────────────────
// Block 信封 · 所有块共有的字段
// ─────────────────────────────────────────────────────────────
const BlockBase = {
  /** 稳定 id · patch 按此定位(不用数组下标,防插删漂移) */
  id: z.string(),
  /** present mode:此块起新一屏(report mode 忽略) */
  pageBreak: z.boolean().optional(),
  /** 容器宽度 / group 内列宽 */
  span: z.enum(["full", "half", "third"]).optional(),
  /** 强度提示给模板(cover 用 hero) */
  emphasis: z.enum(["hero", "normal", "quiet"]).optional(),
};

// ─────────────────────────────────────────────────────────────
// 16 种通用 Block
// ─────────────────────────────────────────────────────────────
const Cover = z.object({
  ...BlockBase,
  type: z.literal("cover"),
  kicker: StringOpt,
  display: z.string(),
  displayTail: StringOpt,
  lead: StringOpt,
  byline: z.array(z.string()).optional(),
});

const Statement = z.object({
  ...BlockBase,
  type: z.literal("statement"),
  bigNumber: StringOpt,
  text: z.string(),
  annotation: StringOpt,
});

const Prose = z.object({
  ...BlockBase,
  type: z.literal("prose"),
  /** markdown 主体(收编 prose/list/insight) */
  body: z.string(),
  tone: z.enum(["info", "ok", "warn", "danger"]).optional(),
});

const Heading = z.object({
  ...BlockBase,
  type: z.literal("heading"),
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  text: z.string(),
});

const Quote = z.object({
  ...BlockBase,
  type: z.literal("quote"),
  text: z.string(),
  attribution: StringOpt,
});

const Callout = z.object({
  ...BlockBase,
  type: z.literal("callout"),
  tone: z.enum(["info", "ok", "warn", "danger", "tip", "note"]),
  title: StringOpt,
  body: z.string(),
});

const Metrics = z.object({
  ...BlockBase,
  type: z.literal("metrics"),
  title: StringOpt,
  items: z.array(Mark),
});

const Cards = z.object({
  ...BlockBase,
  type: z.literal("cards"),
  layout: z.enum(["grid", "steps", "numbered"]),
  title: StringOpt,
  kicker: StringOpt,
  items: z.array(CardItem),
});

const Sequence = z.object({
  ...BlockBase,
  type: z.literal("sequence"),
  flow: z.enum(["time", "arrow"]),
  title: StringOpt,
  kicker: StringOpt,
  items: z.array(SeqItem),
});

const Compare = z.object({
  ...BlockBase,
  type: z.literal("compare"),
  title: StringOpt,
  left: Col,
  right: Col,
});

const Quadrant = z.object({
  ...BlockBase,
  type: z.literal("quadrant"),
  xLabel: z.string(),
  yLabel: z.string(),
  quadrantLabels: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  points: z.array(QuadrantPoint),
});

const Table = z.object({
  ...BlockBase,
  type: z.literal("table"),
  title: StringOpt,
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
});

const Chart = z.object({
  ...BlockBase,
  type: z.literal("chart"),
  variant: z.enum(["line", "bar", "area", "bar-stack", "pie", "scatter"]),
  title: StringOpt,
  caption: StringOpt,
  x: z.array(z.union([z.string(), z.number()])),
  series: z.array(ChartSeries),
});

const Media = z.object({
  ...BlockBase,
  type: z.literal("media"),
  text: z.object({ kicker: StringOpt, title: z.string(), body: StringOpt }),
  media: z.object({
    kind: z.enum(["image", "quote", "chart"]),
    src: StringOpt,
    quote: Quote.pick({ text: true, attribution: true }).optional(),
  }),
  side: z.enum(["left", "right"]),
});

const Closing = z.object({
  ...BlockBase,
  type: z.literal("closing"),
  kicker: StringOpt,
  display: z.string(),
  sub: StringOpt,
  cta: z.object({ primary: CtaButton.optional(), secondary: CtaButton.optional() }).optional(),
});

// 叶子块(非递归)· 用 discriminatedUnion
const LeafBlock = z.discriminatedUnion("type", [
  Cover, Statement, Prose, Heading, Quote, Callout, Metrics,
  Cards, Sequence, Compare, Quadrant, Table, Chart, Media, Closing,
]);
type LeafBlock = z.infer<typeof LeafBlock>;

/** group 递归容器(zod v4 递归:显式 interface + z.ZodType<T> 单泛型 + get lazy) */
export interface GroupBlock {
  id: string;
  pageBreak?: boolean;
  span?: "full" | "half" | "third";
  emphasis?: "hero" | "normal" | "quiet";
  type: "group";
  title?: string;
  layout: "row" | "stack";
  children: Block[];
}

export type Block = LeafBlock | GroupBlock;
export type BlockType = Block["type"];

const Group: z.ZodType<GroupBlock> = z.object({
  ...BlockBase,
  type: z.literal("group"),
  title: StringOpt,
  layout: z.enum(["row", "stack"]),
  get children() {
    return z.array(Block);
  },
});

export const Block: z.ZodType<Block> = z.union([LeafBlock, Group]);

// ─────────────────────────────────────────────────────────────
// Document(顶层 · 取代 Deck/Doc/SheetContent)
// ─────────────────────────────────────────────────────────────
export const DocMeta = z.object({
  title: z.string(),
  author: StringOpt,
  date: StringOpt,
  description: StringOpt,
  /** 副标 / 一句话引子 */
  deck: StringOpt,
  density: z.enum(["low", "high"]).default("high"),
  /** 默认渲染模式(取代旧顶层 kind);任何文档都能切另一模式 */
  defaultMode: z.enum(["report", "present"]).default("report"),
});
export type DocMeta = z.infer<typeof DocMeta>;

export const DocumentSchema = z.object({
  meta: DocMeta,
  blocks: z.array(Block),
});
export type Document = z.infer<typeof DocumentSchema>;

/** 统一解析入口(对齐 v31 parseContent) */
export function parseDocument(json: unknown): Document {
  return DocumentSchema.parse(json);
}
