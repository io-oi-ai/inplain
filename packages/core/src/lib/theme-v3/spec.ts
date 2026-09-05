/**
 * V29-A · 5 层 ThemeSpec · Plain 真正的"design system"
 *
 * 参考 zarazhangrui/frontend-slides 的 design.md schema · 跳出"换 hex"思维。
 *
 * 5 层 DNA:
 *   1. colors        色彩(老字段 · 不变)
 *   2. typography    字体阶梯(9-12 token · 每个有 font+size+lh+ls+weight)
 *   3. unit          base spacing 单位(8-Bit 用 4 · Biennale 用 8 · 这是节奏感)
 *   4. decoration    装饰词汇(halftone/sunGlow/ribbon/scanlines... 通过 flag opt-in)
 *   5. layoutGrammar 布局语法(cover/content/quote 各自走哪种 HTML 骨架)
 *
 * 每套主题独立的"DNA" · 不是单层 CSS tokens · 是完整的 design language。
 */

// ─────────────────────────────────────────────────────────────
// 1. Colors
// ─────────────────────────────────────────────────────────────
export type ThemeColors = {
  /** 纸底 · ramp 起始锚点 */
  surface: string;
  /** 主文字色 · 必须跟 surface 满足 WCAG AA */
  ink: string;
  /** accent 强调色 · cover gradient / em / link / chip 用 */
  accent: string;
  /** hero 深底 · cover / hero-question 等大区块用 · 可选 */
  hero?: string;
};

// ─────────────────────────────────────────────────────────────
// 2. Typography ladder · 9-12 阶
// ─────────────────────────────────────────────────────────────
export type TypoToken = {
  /** font-family · 直接给 CSS 字符串 */
  font: string;
  /** font-size · 直接给 CSS 字符串(clamp / px / rem 都行) */
  size: string;
  /** line-height · 数字或 normal */
  lh: number | "normal";
  /** letter-spacing · em 单位最稳 */
  ls?: string;
  /** font-weight · 数字 */
  weight: number;
  /** text-transform */
  transform?: "uppercase" | "lowercase" | "none";
  /** italic */
  italic?: boolean;
};

export type ThemeTypography = {
  /** 巨大主标(cover h1) · clamp(3rem, 9vw, 7rem) 这种 */
  display: TypoToken;
  /** 中等 display · slide 内部 hero 用 */
  displayMd?: TypoToken;
  /** 数字 jumbo · stats / bigNumber layout 用 */
  numeralJumbo?: TypoToken;
  /** 章节 headline · h2 · 比 display 收一档 */
  headline: TypoToken;
  /** micro label · kicker / "ACT II" 类小标 · 永远 uppercase + 大 letter-spacing */
  microLabel: TypoToken;
  /** 长文 lead · 比 body 大一档 · 段首段 */
  bodyLede?: TypoToken;
  /** body · 默认正文 */
  body: TypoToken;
  /** body 小号 · 注释 / footer */
  bodySm?: TypoToken;
  /** 引用 quote · 通常 italic */
  quote?: TypoToken;
  /** mono · 代码 / 数据 */
  mono?: TypoToken;
};

// ─────────────────────────────────────────────────────────────
// 3. Unit · spacing 节奏单位
// ─────────────────────────────────────────────────────────────
export type ThemeUnit = {
  /** base spacing 单位 px · 8-Bit Orbit 用 4 · 大多数 8 · 阔气版 10 */
  base: number;
};

// ─────────────────────────────────────────────────────────────
// 4. Decoration vocabulary · 装饰词汇(opt-in)
// ─────────────────────────────────────────────────────────────
export type ThemeDecoration = {
  /** 圆角强度 · 0 = 禁圆角(Biennale)· 4 = 默认 · 24 = pill 卡片 */
  radius: number;
  /** 阴影风格 */
  shadow: "none" | "soft-card" | "stacked-pixel" | "soft-glow" | "offset-block";
  /** 1px ink hairline 横线装饰(Biennale 杂志风) */
  hairline?: boolean;
  /** 右下角 halftone 点阵(瑞士 / 8-bit) */
  halftone?: boolean;
  /** 左上 / 右下 径向光斑(Biennale sun-glow / Botanical glow) */
  sunGlow?: boolean;
  /** 对角彩色 ribbon 带(Sakura 70s 卡带) */
  ribbon?: boolean;
  /** CRT scanlines(8-Bit Orbit) */
  scanlines?: boolean;
  /** 印章 / star burst(Sakura JIS · 美术馆 seal) */
  seal?: boolean;
  /** 纸张颗粒噪点 0-1 · 0 关 · 1 强(Vintage Editorial) */
  grain?: number;
  /** graph paper 背景网格(Cobalt Grid) */
  graphPaper?: boolean;
  /** binder hole + 右侧 tabs(Notebook Tabs) */
  binderTabs?: boolean;
  /** stencil cut 镂空标题(Stencil & Tablet) */
  stencilTitle?: boolean;
  /** 手绘 pin / 别针(Pin & Paper) */
  pin?: boolean;
};

// ─────────────────────────────────────────────────────────────
// 5. Layout grammar · 每个 layout type 的 DNA
// ─────────────────────────────────────────────────────────────
export type CoverGrammar =
  | "center-stack"            // 居中堆栈 · 默认
  | "vertical-split"          // 上半色块 + 下半 paper · Electric Studio
  | "masthead-double-rule"    // 杂志报头双横线 · Emerald Editorial
  | "left-bias-yellow-pop"    // 左偏 + 右大 accent 块 · Biennale
  | "frame-stamp"             // 居中 + 外框 + 印章 · Sakura
  | "ledger-rows"             // 账本横线 · Monochrome
  | "vertical-pills"          // 竖向 pill 卡片 · Pastel Geometry
  | "crt-boot";               // CRT 启动屏 · 8-Bit

export type ContentGrammar =
  | "two-col"                 // 经典两栏
  | "single-narrow"           // 窄单栏 long-form
  | "ledger-rows"             // 账本横线
  | "tabbed-panels"           // 右侧 tabs · Notebook
  | "vertical-pills"          // 竖向 pill list
  | "graph-card";             // graph paper card

export type QuoteGrammar =
  | "huge-italic"             // 巨大斜体引用 · 默认
  | "stamp-box"               // 印章框 · Sakura
  | "ribbon-band"             // ribbon 带 · 70s
  | "hand-writing"            // 手写体 · Pin & Paper
  | "ledger-line";            // 单线 ledger

export type ThemeLayoutGrammar = {
  cover: CoverGrammar;
  content: ContentGrammar;
  quote: QuoteGrammar;
};

// ─────────────────────────────────────────────────────────────
// 主结构 · ThemeSpec V29
// ─────────────────────────────────────────────────────────────
export type ThemeSpecV29 = {
  /** id 跟数据库 / source frontmatter 对齐 · 不能改 */
  id: string;
  /** 显示名 */
  label: string;
  /** 一句话灵魂(showcase 显示) */
  vibe: string;

  // 5 层
  colors: ThemeColors;
  typography: ThemeTypography;
  unit: ThemeUnit;
  decoration: ThemeDecoration;
  layoutGrammar: ThemeLayoutGrammar;

  // ─────────────── 老兼容字段(可选 · 让 legacy compileTheme 还能 fallback) ────────
  /** @deprecated 用 colors 代替 */
  seeds?: { surface: string; ink: string; accent: string; hero?: string };
  /** @deprecated 用 typography 代替 */
  type?: { fontText?: string; fontDisplay?: string; fontMono?: string; fontUi?: string };
  /** @deprecated 用 unit 代替 */
  space?: { unit?: number };
  /** @deprecated · 老 status 色 */
  status?: { positive?: string; warn?: string; negative?: string };
};

/**
 * 老 ThemeSpec 自动升级到 V29 · 给 fallback 用
 * 如果一个 theme 还没补 5 层 · 这个函数补默认值让它能跑
 */
export function legacyToV29(legacy: {
  id: string;
  label?: string;
  seeds: { surface: string; ink: string; accent: string; hero?: string };
  type?: { fontText?: string; fontDisplay?: string; fontMono?: string; fontUi?: string };
  space?: { unit?: number };
}): ThemeSpecV29 {
  const font = legacy.type?.fontText ?? "Inter, system-ui, sans-serif";
  const fontD = legacy.type?.fontDisplay ?? font;
  const fontM = legacy.type?.fontMono ?? "JetBrains Mono, Menlo, monospace";

  return {
    id: legacy.id,
    label: legacy.label ?? legacy.id,
    vibe: "",
    colors: legacy.seeds,
    typography: {
      display: { font: fontD, size: "clamp(3.5rem, 9vw, 7rem)", lh: 1.08, ls: "-0.015em", weight: 500 },
      headline: { font: fontD, size: "clamp(2.2rem, 5vw, 3.6rem)", lh: 1.15, ls: "-0.01em", weight: 500 },
      microLabel: { font: fontM, size: "10px", lh: 1.4, ls: "0.22em", weight: 500, transform: "uppercase" },
      body: { font, size: "16px", lh: 1.7, weight: 400 },
      mono: { font: fontM, size: "13px", lh: 1.6, weight: 400 },
    },
    unit: { base: legacy.space?.unit ?? 8 },
    decoration: {
      radius: 4,
      shadow: "soft-card",
      grain: 0.55,
      halftone: true,
      sunGlow: true,
    },
    layoutGrammar: {
      cover: "center-stack",
      content: "two-col",
      quote: "huge-italic",
    },
    // 兼容老字段保留
    seeds: legacy.seeds,
    type: legacy.type,
    space: legacy.space,
  };
}
