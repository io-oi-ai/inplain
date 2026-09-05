/**
 * V31 · Content schema(语义层 · 跟模板无关)
 *
 * 设计:
 *   - AI 只输出 content JSON · 不写一行 CSS / HTML
 *   - 模板 function 接 content JSON · 自己决定怎么布局
 *   - 切模板 = 同一份 content 喂给另一个模板 function(0 调 AI)
 *   - 锁样式 = AI 改 content(不动 templateSlug)
 *   - 锁内容 = 切 templateSlug(不动 content)
 *
 * 每种节点类型(cover / hero-question / stats / ...)都是语义节点 ·
 * 模板根据自己的 design system 决定怎么排版。
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────
// Atoms · 重复使用的小结构
// ─────────────────────────────────────────────────────────────
const StringOpt = z.string().optional();
const NumberOpt = z.number().optional();

const Mark = z.object({
  /** 一个量化指标 · 数值 + 单位 + label */
  value: z.string(),
  label: z.string(),
  hint: StringOpt,
  /** "up" / "down" / "flat" · 趋势(可选) */
  delta: z.enum(["up", "down", "flat"]).optional(),
});
export type Mark = z.infer<typeof Mark>;

const TimelineItem = z.object({
  when: z.string(),
  label: z.string(),
  hint: StringOpt,
});

const CompareCol = z.object({
  label: z.string(),
  bullets: z.array(z.string()),
});

const QuoteBlock = z.object({
  text: z.string(),
  attribution: StringOpt,
});

const StepItem = z.object({
  num: StringOpt,
  head: z.string(),
  body: z.string(),
  when: StringOpt,
});

const FeatureItem = z.object({
  num: StringOpt,
  head: z.string(),
  body: z.string(),
  icon: StringOpt,
});

const DiagnosisItem = z.object({
  num: z.string(),
  head: z.string(),
  body: z.string(),
  metric: StringOpt,
  metricLabel: StringOpt,
});

const CtaButton = z.object({
  label: z.string(),
  href: StringOpt,
});

// ─────────────────────────────────────────────────────────────
// Deck slide kinds · 每种是一个语义节点
//
// 添加新类型时:
//   1. 在 SlideUnion 加进去
//   2. 每个模板的 render() 里加对应分支(可以 fallback 通用 layout)
// ─────────────────────────────────────────────────────────────

const SlideCover = z.object({
  kind: z.literal("cover"),
  kicker: StringOpt,
  display: z.string(),
  /** 副标 · 通常斜体或换色 */
  displayTail: StringOpt,
  lead: StringOpt,
  byline: z.array(z.string()).optional(),
});

const SlideHeroQuestion = z.object({
  kind: z.literal("hero-question"),
  bigNumber: StringOpt,
  question: z.string(),
  annotation: StringOpt,
});

const SlideStats = z.object({
  kind: z.literal("stats"),
  title: StringOpt,
  items: z.array(Mark).min(1).max(8),
});

const SlideDiagnosis = z.object({
  kind: z.literal("diagnosis"),
  kicker: StringOpt,
  title: z.string(),
  items: z.array(DiagnosisItem).min(1).max(6),
});

const SlideCompare = z.object({
  kind: z.literal("compare"),
  title: StringOpt,
  left: CompareCol,
  right: CompareCol,
});

const SlidePullQuote = z.object({
  kind: z.literal("pull-quote"),
  text: z.string(),
  attribution: StringOpt,
});

const SlideProposal = z.object({
  kind: z.literal("proposal"),
  kicker: StringOpt,
  title: z.string(),
  steps: z.array(StepItem).min(1).max(8),
});

const SlideTimeline = z.object({
  kind: z.literal("timeline"),
  kicker: StringOpt,
  title: StringOpt,
  items: z.array(TimelineItem).min(2).max(8),
});

const SlidePipeline = z.object({
  kind: z.literal("pipeline"),
  title: StringOpt,
  items: z.array(
    z.object({
      num: StringOpt,
      label: z.string(),
      hint: StringOpt,
    }),
  ).min(2).max(8),
});

const SlideFeatures = z.object({
  kind: z.literal("features"),
  title: StringOpt,
  items: z.array(FeatureItem).min(2).max(8),
});

const SlideQuadrant = z.object({
  kind: z.literal("quadrant"),
  xLabel: z.string(),
  yLabel: z.string(),
  quadrantLabels: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  points: z.array(
    z.object({
      label: z.string(),
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
      focal: z.boolean().optional(),
    }),
  ).min(1).max(20),
});

const SlideMediaSplit = z.object({
  kind: z.literal("media-split"),
  /** 文案侧 */
  text: z.object({
    kicker: StringOpt,
    title: z.string(),
    body: StringOpt,
  }),
  /** 媒体侧 */
  media: z.object({
    kind: z.enum(["image", "quote", "chart"]),
    src: StringOpt,
    alt: StringOpt,
    /** chart 的 inline JSON */
    chart: z.record(z.string(), z.unknown()).optional(),
    /** crop 控制 · 可视编辑 pan/scale 写入 · 渲染时转成 object-position + transform-scale */
    cropX: z.number().min(-100).max(100).optional(),  // % offset
    cropY: z.number().min(-100).max(100).optional(),
    cropScale: z.number().min(1).max(4).optional(),
    /** quote 时用 */
    quote: QuoteBlock.optional(),
  }),
  side: z.enum(["left", "right"]).default("left"),
});

const SlideClosing = z.object({
  kind: z.literal("closing"),
  kicker: StringOpt,
  display: z.string(),
  sub: StringOpt,
  cta: z
    .object({
      primary: CtaButton.optional(),
      secondary: CtaButton.optional(),
    })
    .optional(),
});

/**
 * tail · "我想分一段连续 markdown 但用模板渲染" 的逃生舱(慎用)。
 * 模板可以选择直接 escape + 包在自家 typography class 里。
 */
const SlideProse = z.object({
  kind: z.literal("prose"),
  title: StringOpt,
  body: z.string(),
});

const SlideUnion = z.discriminatedUnion("kind", [
  SlideCover,
  SlideHeroQuestion,
  SlideStats,
  SlideDiagnosis,
  SlideCompare,
  SlidePullQuote,
  SlideProposal,
  SlideTimeline,
  SlidePipeline,
  SlideFeatures,
  SlideQuadrant,
  SlideMediaSplit,
  SlideClosing,
  SlideProse,
]);
export type Slide = z.infer<typeof SlideUnion>;

// ─────────────────────────────────────────────────────────────
// Deck content
// ─────────────────────────────────────────────────────────────

export const DeckContentSchema = z.object({
  /** 文档语义元信息 · 永远在 cover 之外另存一份 · 模板可读 */
  meta: z.object({
    title: z.string(),
    author: StringOpt,
    date: StringOpt,
    /** "low" = speaker-led 演讲态 · "high" = reading 密文 */
    density: z.enum(["low", "high"]).default("low"),
    description: StringOpt,
  }),
  slides: z.array(SlideUnion).min(1).max(40),
});
export type DeckContent = z.infer<typeof DeckContentSchema>;

// ─────────────────────────────────────────────────────────────
// Doc content · 长文形态
// ─────────────────────────────────────────────────────────────

const DocBlockProse = z.object({
  kind: z.literal("prose"),
  body: z.string(),
});

const DocBlockHeading = z.object({
  kind: z.literal("heading"),
  level: z.number().min(1).max(4),
  text: z.string(),
});

const DocBlockQuote = z.object({
  kind: z.literal("quote"),
  text: z.string(),
  attribution: StringOpt,
});

const DocBlockCallout = z.object({
  kind: z.literal("callout"),
  tone: z.enum(["info", "ok", "warn", "danger"]).default("info"),
  title: StringOpt,
  body: z.string(),
});

const DocBlockList = z.object({
  kind: z.literal("list"),
  ordered: z.boolean().default(false),
  items: z.array(z.string()).min(1),
});

const DocBlockData = z.object({
  kind: z.literal("data-block"),
  title: StringOpt,
  headline: StringOpt,
  bars: z.array(
    z.object({
      label: z.string(),
      value: z.number(),
      display: StringOpt,
      tone: z.enum(["bad", "warn", "positive"]).optional(),
    }),
  ).min(2).max(8),
  note: StringOpt,
});

const DocBlockTable = z.object({
  kind: z.literal("table"),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
});

const DocBlock = z.discriminatedUnion("kind", [
  DocBlockProse,
  DocBlockHeading,
  DocBlockQuote,
  DocBlockCallout,
  DocBlockList,
  DocBlockData,
  DocBlockTable,
]);
export type DocBlockT = z.infer<typeof DocBlock>;

export const DocContentSchema = z.object({
  meta: z.object({
    title: z.string(),
    author: StringOpt,
    date: StringOpt,
    deck: StringOpt, // 副标 / 一句话引子
    density: z.enum(["low", "high"]).default("high"),
  }),
  blocks: z.array(DocBlock).min(1),
});
export type DocContent = z.infer<typeof DocContentSchema>;

// ─────────────────────────────────────────────────────────────
// Sheet content · dashboard 形态
// ─────────────────────────────────────────────────────────────

const PanelKpi = z.object({
  kind: z.literal("kpi"),
  title: z.string(),
  value: z.string(),
  delta: StringOpt,
  hint: StringOpt,
});

const PanelChart = z.object({
  kind: z.literal("chart"),
  variant: z.enum(["line", "bar", "area", "bar-stack", "pie", "scatter"]),
  title: z.string(),
  caption: StringOpt,
  /** 数据轴 */
  x: z.array(z.union([z.string(), z.number()])),
  series: z.array(
    z.object({
      name: z.string(),
      data: z.array(z.number()),
    }),
  ),
});

const PanelTable = z.object({
  kind: z.literal("table"),
  title: z.string(),
  columns: z.array(z.string()),
  rows: z.array(z.array(z.string())),
});

const PanelInsight = z.object({
  kind: z.literal("insight"),
  title: StringOpt,
  body: z.string(),
});

const SheetPanel = z.discriminatedUnion("kind", [
  PanelKpi,
  PanelChart,
  PanelTable,
  PanelInsight,
]);
export type SheetPanelT = z.infer<typeof SheetPanel>;

export const SheetContentSchema = z.object({
  meta: z.object({
    title: z.string(),
    author: StringOpt,
    date: StringOpt,
    deck: StringOpt,
  }),
  /** dashboard 的"屏":一组 panel 同时显示 */
  rows: z.array(
    z.object({
      title: StringOpt,
      panels: z.array(SheetPanel).min(1).max(4),
    }),
  ).min(1),
});
export type SheetContent = z.infer<typeof SheetContentSchema>;

// ─────────────────────────────────────────────────────────────
// Union
// ─────────────────────────────────────────────────────────────

export type AnyContent = DeckContent | DocContent | SheetContent;

/** AI 输出后用这个校验,失败抛 zod error 让 caller 给 AI 重试 */
export function parseContent(kind: "deck" | "doc" | "sheet", json: unknown): AnyContent {
  if (kind === "deck") return DeckContentSchema.parse(json);
  if (kind === "doc") return DocContentSchema.parse(json);
  return SheetContentSchema.parse(json);
}
