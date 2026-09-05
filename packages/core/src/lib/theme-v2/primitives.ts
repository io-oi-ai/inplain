/**
 * Plain 主题语言 v2 · L1 Primitives · 原子词典
 *
 * 详见 docs/THEME-LANGUAGE.md
 *
 * 12 色 / 4 字体族 / 9 字号 / 8 间距 / 5 圆角 / motion / chrome 装饰
 *
 * 这是「语言能表达什么 atom」,任何主题(L2) = 这些 atom 的具体组合。
 */

import { z } from "zod";

// ─────────────────────────────────────────────
// 2.1 · 色 · 12 个 role
// ─────────────────────────────────────────────

/** 视觉重量 + 语义维度切分的 12 个 color role */
export const ColorPrimitive = z.object({
  /** 整页背景(桌子的颜色) */
  paper:      z.string(),
  /** 卡片 / 区块底(在桌子上的卡片) */
  surface:    z.string(),
  /** 更高层卡片(悬浮 / dropdown) */
  raised:     z.string(),

  /** 主文字 */
  ink:        z.string(),
  /** 次要文字 */
  inkSoft:    z.string(),
  /** meta / caption / label */
  inkMute:    z.string(),

  /** 唯一锚点色(品牌单一主色,瑞士风原则) */
  accent:     z.string(),
  /** accent 上的文字色 */
  onAccent:   z.string(),

  /** 暗 hero 背景(cover / pull-quote-break 等节奏暗页) */
  hero:       z.string(),
  /** 暗 hero 上的文字色 */
  onHero:     z.string(),

  /** 上升 / 完成 / 通过 */
  positive:   z.string(),
  /** 下降 / 风险 / 失败 */
  negative:   z.string(),
});
export type ColorPrimitive = z.infer<typeof ColorPrimitive>;

// ─────────────────────────────────────────────
// 2.2 · 字 · 4 族
// ─────────────────────────────────────────────

/** 4 种使用场景的字体栈,不是 4 种字体 */
export const FontStack = z.object({
  /** 大字 hero(cover / pull-quote / 数字) */
  display: z.string(),
  /** 正文(article / list / paragraph) */
  text:    z.string(),
  /** 界面元素(kicker / button / meta) */
  ui:      z.string(),
  /** 代码 / 等宽数字 / SQL block */
  mono:    z.string(),
});
export type FontStack = z.infer<typeof FontStack>;

// ─────────────────────────────────────────────
// 2.3 · 字号 · 9 级
// ─────────────────────────────────────────────

/** 字号 9 级 + line-height + tracking */
export const FontStep = z.object({
  size:    z.string().describe("rem 或 px"),
  line:    z.number().describe("line-height 倍数"),
  weight:  z.number().default(400),
  /** letter-spacing em,负值收紧 */
  tracking: z.number().optional(),
});
export type FontStep = z.infer<typeof FontStep>;

export const FontScale = z.object({
  /** 巨字断言(cover) */
  heroXl: FontStep,
  /** 段落 hero(long-hero in doc) */
  heroL:  FontStep,
  /** 中等数字(KPI) */
  heroM:  FontStep,
  /** 文章主标题 */
  h1:     FontStep,
  /** 节标题 */
  h2:     FontStep,
  /** 子节 */
  h3:     FontStep,
  /** 正文 */
  body:   FontStep,
  /** meta / caption */
  small:  FontStep,
  /** ALL CAPS kicker(tracking 0.22em) */
  micro:  FontStep,
});
export type FontScale = z.infer<typeof FontScale>;

// ─────────────────────────────────────────────
// 2.4 · 间距 · 8 级
// ─────────────────────────────────────────────

/** 节奏间距 —— motion / layout / theme 共享 */
export const Space = z.object({
  /** 4px */
  half: z.string().default("4px"),
  /** 8px · 最小单元 */
  s1:   z.string().default("8px"),
  /** 16px */
  s2:   z.string().default("16px"),
  /** 24px */
  s3:   z.string().default("24px"),
  /** 32px */
  s4:   z.string().default("32px"),
  /** 48px · section padding */
  s6:   z.string().default("48px"),
  /** 64px */
  s8:   z.string().default("64px"),
  /** 96px · 大 section 之间 */
  s12:  z.string().default("96px"),
  /** 128px · hero section 上下 */
  s16:  z.string().default("128px"),
});
export type Space = z.infer<typeof Space>;

// ─────────────────────────────────────────────
// 2.5 · 圆角 · 5 级 · 语义化命名
// ─────────────────────────────────────────────

/** 圆角语义化:sharp = 瑞士;blob = 现代 SaaS */
export const Radius = z.object({
  /** 0 · 瑞士风 / Brutalist */
  sharp: z.string().default("0"),
  /** 4px · 杂志默认 */
  soft:  z.string().default("4px"),
  /** 8px · 卡片 */
  card:  z.string().default("8px"),
  /** 999px · button / chip */
  pill:  z.string().default("999px"),
  /** 24px · 现代 SaaS (Linear / Framer) */
  blob:  z.string().default("24px"),
});
export type Radius = z.infer<typeof Radius>;

// ─────────────────────────────────────────────
// 2.6 · motion · 4 类
// ─────────────────────────────────────────────

/** web 时代主题不光定义"长什么样",还定义"动起来什么节奏" */
export const Motion = z.object({
  /** section 入场(scroll-driven) */
  easePage: z.string().default("cubic-bezier(0.25, 0.1, 0.25, 1)"),
  /** 数字 / 进度条 / 图表动画 */
  easeData: z.string().default("cubic-bezier(0.4, 0, 0.2, 1)"),
  /** hover / button / focus */
  easeUi:   z.string().default("cubic-bezier(0.2, 0, 0, 1)"),

  durFast:  z.string().default("120ms"),
  durMid:   z.string().default("240ms"),
  durSlow:  z.string().default("480ms"),
});
export type Motion = z.infer<typeof Motion>;

// ─────────────────────────────────────────────
// 2.7 · chrome · 装饰元素
// ─────────────────────────────────────────────

/** 主题里的装饰小元素,渲染器据此决定 CSS 分支 */
export const Chrome = z.object({
  /** h2 前面有没有竖线(Plain Kami 风) */
  kickerBar: z.boolean().default(false),
  /** 段落首字下沉(Stripe Press 风) */
  dropCap:   z.boolean().default(false),
  /** 分隔线风格 */
  ruleStyle: z.enum(["solid", "dashed", "double"]).default("solid"),
  /** 卡片阴影深度 */
  cardShadow: z.enum(["none", "subtle", "pronounced"]).default("subtle"),
  /** strong 的高亮风格:none / underline / marker(黄色 highlight 笔) */
  strongStyle: z.enum(["none", "underline", "marker", "bold-only"]).default("bold-only"),
  /** 引用块装饰:left-bar / pull / dropcap */
  quoteStyle: z.enum(["left-bar", "pull-quote", "indent"]).default("left-bar"),
});
export type Chrome = z.infer<typeof Chrome>;

// ─────────────────────────────────────────────
// 默认值(theme 缺省时 fallback)
// ─────────────────────────────────────────────

export const DEFAULT_SPACE: Space = {
  half: "4px",
  s1: "8px",
  s2: "16px",
  s3: "24px",
  s4: "32px",
  s6: "48px",
  s8: "64px",
  s12: "96px",
  s16: "128px",
};

export const DEFAULT_RADIUS: Radius = {
  sharp: "0",
  soft: "4px",
  card: "8px",
  pill: "999px",
  blob: "24px",
};

export const DEFAULT_MOTION: Motion = {
  easePage: "cubic-bezier(0.25, 0.1, 0.25, 1)",
  easeData: "cubic-bezier(0.4, 0, 0.2, 1)",
  easeUi:   "cubic-bezier(0.2, 0, 0, 1)",
  durFast:  "120ms",
  durMid:   "240ms",
  durSlow:  "480ms",
};

export const DEFAULT_CHROME: Chrome = {
  kickerBar: false,
  dropCap: false,
  ruleStyle: "solid",
  cardShadow: "subtle",
  strongStyle: "bold-only",
  quoteStyle: "left-bar",
};

/**
 * 默认 font scale —— 跟主题相对独立的「节奏基线」。
 * 主题可以 partial-override,但不需要全写。
 */
export const DEFAULT_FONT_SCALE: FontScale = {
  heroXl: { size: "5.5rem",   line: 1.0,  weight: 500, tracking: -0.018 },
  heroL:  { size: "4rem",     line: 1.05, weight: 500, tracking: -0.015 },
  heroM:  { size: "3rem",     line: 1.1,  weight: 500, tracking: -0.012 },
  h1:     { size: "2.2rem",   line: 1.15, weight: 500, tracking: -0.012 },
  h2:     { size: "1.6rem",   line: 1.25, weight: 500, tracking: -0.008 },
  h3:     { size: "1.25rem",  line: 1.35, weight: 500 },
  body:   { size: "1.0625rem", line: 1.7,  weight: 400 },
  small:  { size: "0.875rem", line: 1.55, weight: 400 },
  micro:  { size: "0.625rem", line: 1.4,  weight: 500, tracking: 0.22 },
};
