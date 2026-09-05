/**
 * Plain ThemeTokens —— 结构化主题定义。
 *
 * 设计依据:
 * - 命名结构参考 Material Design 3 的 sys tokens(primary / on-primary / surface...)
 * - JSON 格式兼容 W3C DTCG(Design Tokens Community Group)2025.10 首个 stable
 * - 裁剪到 PPT 实用的 12 color roles + 6 type scales(M3 的 30+15 过于密集)
 *
 * 不抄:M3 的具体颜色(Roboto/Google 紫)、elevation/ripple/motion、移动端组件 tokens。
 */

import { z } from "zod";

/** 12 个 color role,覆盖 PPT 所需语义 */
export const ColorRoles = z.object({
  // 背景层
  bg: z.string().describe("整体背景色"),
  surface: z.string().describe("卡片/面板底色(和 bg 稍有区隔)"),
  surfaceElevated: z.string().describe("更高层级的卡片,如 stat-card"),
  // 文字
  onSurface: z.string().describe("正文文字"),
  onSurfaceMuted: z.string().describe("次要文字/辅助说明"),
  // 品牌
  primary: z.string().describe("品牌主色(强调/链接/accent)"),
  onPrimary: z.string().describe("品牌色上的文字"),
  // 封面特殊(cover 可能用深色背景 + 浅色文字)
  coverBg: z.string().describe("封面专用背景"),
  onCover: z.string().describe("封面文字色"),
  // 辅助
  outline: z.string().describe("边框/分隔线"),
  // 语义
  success: z.string().describe("成功/正向变化"),
  danger: z.string().describe("警告/负向变化"),
});
export type ColorRoles = z.infer<typeof ColorRoles>;

/** 6 级字号(PPT 友好,比 M3 的 15 级紧凑) */
export const TypeScale = z.object({
  // { size_px, line_height, weight, tracking_em? }
  displayXL: TypeStepSchema(),
  display: TypeStepSchema(),
  headline: TypeStepSchema(),
  title: TypeStepSchema(),
  body: TypeStepSchema(),
  caption: TypeStepSchema(),
});
export type TypeScale = z.infer<typeof TypeScale>;

function TypeStepSchema() {
  return z.object({
    size: z.number().describe("px"),
    line: z.number().describe("line-height"),
    weight: z.number().default(400),
    tracking: z.number().optional().describe("letter-spacing em"),
  });
}

export const FontFamilies = z.object({
  serif: z.string().default("\"Charter\", \"Source Han Serif SC\", Georgia, serif"),
  sans: z.string().default("\"Inter\", \"PingFang SC\", \"Hiragino Sans GB\", sans-serif"),
  mono: z.string().default("\"JetBrains Mono\", \"SF Mono\", Menlo, Consolas, monospace"),
});
export type FontFamilies = z.infer<typeof FontFamilies>;

/** 形状:圆角 */
export const Shape = z.object({
  xs: z.number().default(4),
  sm: z.number().default(8),
  md: z.number().default(12),
  lg: z.number().default(20),
  full: z.number().default(9999),
});
export type Shape = z.infer<typeof Shape>;

/** 主题整体 */
export const ThemeTokens = z.object({
  id: z.string().describe("唯一 id,如 plain-kami / plain-m3"),
  label: z.string().describe("UI 展示名(2-6 字直接命名,例如「黑白衬线」「紫色暗夜」)"),
  hint: z.string().default("").describe("一句话描述,直接讲色/字/调性,卡片副标"),
  /**
   * 长描述 —— 用户在主题详情页/picker hover 时看到的"为什么选这个"。
   * 由 founder / designer 亲自写,而非自动生成。3-4 句话,可包含适用场景、
   * 视觉灵感来源、跟其他主题的区别。
   *
   * 可选(.optional()) —— 还没写描述的主题不会破坏类型;UI 拿到 undefined
   * 时 fallback 到 hint。
   */
  description: z.string().optional().describe("长描述,用户在 picker 看 hover 时显示"),
  mood: z.enum(["light", "dark", "warm", "cool"]).default("light"),
  colors: ColorRoles,
  fonts: FontFamilies,
  type: TypeScale,
  shape: Shape,
  /** 标题字体族:serif / sans —— 决定 h1/h2/display 用哪套字体 */
  headingFamily: z.enum(["serif", "sans"]).default("serif"),
  /** 标题特色装饰:竖线(kami)、下划线(editorial)、纯色(mono)、无 */
  accentDecoration: z.enum(["bar", "underline", "none"]).default("none"),
});
export type ThemeTokens = z.infer<typeof ThemeTokens>;
