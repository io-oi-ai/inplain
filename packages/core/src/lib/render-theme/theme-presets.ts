/**
 * 6 个 Plain 内置主题 + 1 个 Material 3 官方配色主题,以 ThemeTokens 形式定义。
 * 都走 tokensToMarpCss() 生成最终 CSS,不再手写 200 行 string。
 */

import type { ThemeTokens } from "./tokens";

const DEFAULT_FONTS = {
  serif: "\"Charter\", \"Source Han Serif SC\", Georgia, serif",
  sans: "\"Inter\", \"PingFang SC\", \"Hiragino Sans GB\", sans-serif",
  mono: "\"JetBrains Mono\", \"SF Mono\", Menlo, Consolas, monospace",
};

const DEFAULT_TYPE = {
  displayXL: { size: 88, line: 1.1, weight: 700, tracking: -0.015 },
  display:   { size: 72, line: 1.15, weight: 700 },
  headline:  { size: 44, line: 1.2, weight: 700 },
  title:     { size: 32, line: 1.3, weight: 600 },
  body:      { size: 24, line: 1.55, weight: 400 },
  caption:   { size: 16, line: 1.5, weight: 400 },
};

const DEFAULT_SHAPE = { xs: 4, sm: 8, md: 12, lg: 20, full: 9999 };

export const PLAIN_MONO: ThemeTokens = {
  id: "plain-mono",
  label: "黑白衬线",
  hint: "纯黑墨 · 米白纸 · 蓝色 accent",
  mood: "light",
  colors: {
    bg: "#fbfbfa",
    surface: "#f5f5f4",
    surfaceElevated: "#ffffff",
    onSurface: "#1a1a1a",
    onSurfaceMuted: "#6a6a6a",
    primary: "#2563eb",
    onPrimary: "#ffffff",
    coverBg: "#1a1a1a",
    onCover: "#fafafa",
    outline: "#dcdcda",
    success: "#16a34a",
    danger: "#dc2626",
  },
  fonts: DEFAULT_FONTS,
  type: DEFAULT_TYPE,
  shape: DEFAULT_SHAPE,
  headingFamily: "serif",
  accentDecoration: "none",
};

export const PLAIN_EDITORIAL: ThemeTokens = {
  id: "plain-editorial",
  label: "暖橙编辑",
  hint: "米黄纸 · 焦糖橙 · 大衬线",
  mood: "warm",
  colors: {
    bg: "#f9f5ef",
    surface: "#f4efe5",
    surfaceElevated: "#ffffff",
    onSurface: "#1a1612",
    onSurfaceMuted: "#6b5c46",
    primary: "#c8661f",
    onPrimary: "#ffffff",
    coverBg: "#f9f5ef",
    onCover: "#1a1612",
    outline: "#e8dcc8",
    success: "#16a34a",
    danger: "#dc2626",
  },
  fonts: DEFAULT_FONTS,
  type: { ...DEFAULT_TYPE, displayXL: { size: 96, line: 1.05, weight: 700, tracking: -0.02 } },
  shape: DEFAULT_SHAPE,
  headingFamily: "serif",
  accentDecoration: "underline",
};

export const PLAIN_BOLD: ThemeTokens = {
  id: "plain-bold",
  label: "蓝色粗体",
  hint: "白底 · 电光蓝 · 800 字重",
  mood: "light",
  colors: {
    bg: "#ffffff",
    surface: "#f5f5f7",
    surfaceElevated: "#ffffff",
    onSurface: "#111111",
    onSurfaceMuted: "#555555",
    primary: "#2563eb",
    onPrimary: "#ffffff",
    coverBg: "#2563eb",
    onCover: "#ffffff",
    outline: "#e5e5e7",
    success: "#16a34a",
    danger: "#dc2626",
  },
  fonts: DEFAULT_FONTS,
  type: {
    ...DEFAULT_TYPE,
    display:  { size: 80, line: 1.1, weight: 800 },
    headline: { size: 48, line: 1.2, weight: 800 },
  },
  shape: DEFAULT_SHAPE,
  headingFamily: "sans",
  accentDecoration: "none",
};

export const PLAIN_SERENE: ThemeTokens = {
  id: "plain-serene",
  label: "薄荷低饱和",
  hint: "薄荷绿纸 · 灰蓝绿字 · 极淡",
  mood: "cool",
  colors: {
    bg: "#f0f7f4",
    surface: "#e9f0ec",
    surfaceElevated: "#ffffff",
    onSurface: "#1e3a3a",
    onSurfaceMuted: "#5a8a7a",
    primary: "#5a8a7a",
    onPrimary: "#ffffff",
    coverBg: "#f0f7f4",
    onCover: "#1e3a3a",
    outline: "#d4e3db",
    success: "#16a34a",
    danger: "#dc2626",
  },
  fonts: DEFAULT_FONTS,
  type: DEFAULT_TYPE,
  shape: DEFAULT_SHAPE,
  headingFamily: "serif",
  accentDecoration: "none",
};

export const PLAIN_DUSK: ThemeTokens = {
  id: "plain-dusk",
  label: "紫色暗夜",
  hint: "深紫底 · 薰衣草字 · 科技感",
  mood: "dark",
  colors: {
    bg: "#1a1026",
    surface: "#251838",
    surfaceElevated: "#2d1e42",
    onSurface: "#ede9fe",
    onSurfaceMuted: "#c4b5fd",
    primary: "#a78bfa",
    onPrimary: "#1a1026",
    coverBg: "#1a1026",
    onCover: "#ede9fe",
    outline: "#3d2b5a",
    success: "#34d399",
    danger: "#f87171",
  },
  fonts: DEFAULT_FONTS,
  type: DEFAULT_TYPE,
  shape: DEFAULT_SHAPE,
  headingFamily: "sans",
  accentDecoration: "none",
};

export const PLAIN_KAMI: ThemeTokens = {
  id: "plain-kami",
  label: "宣纸油墨蓝",
  hint: "米麻纸 · 深海军蓝 · 中文衬线",
  mood: "warm",
  colors: {
    bg: "#f5f4ed",
    surface: "#eceae0",
    surfaceElevated: "#ffffff",
    onSurface: "#141413",
    onSurfaceMuted: "#4d4c48",
    primary: "#1B365D",
    onPrimary: "#ffffff",
    coverBg: "#f5f4ed",
    onCover: "#141413",
    outline: "#e4ecf5",
    success: "#16a34a",
    danger: "#dc2626",
  },
  fonts: {
    ...DEFAULT_FONTS,
    serif: "\"Source Han Serif SC\", \"Noto Serif SC\", \"Songti SC\", Georgia, serif",
  },
  type: {
    ...DEFAULT_TYPE,
    headline: { size: 44, line: 1.25, weight: 500 },  // kami 用较轻字重
    displayXL: { size: 96, line: 1.1, weight: 500 },
  },
  shape: { ...DEFAULT_SHAPE, sm: 6, md: 10 },
  headingFamily: "serif",
  accentDecoration: "bar",
};

/** Material 3 官方配色主题(baseline purple seed #6750A4) */
export const MATERIAL_3: ThemeTokens = {
  id: "material-3",
  label: "Material 紫",
  hint: "Google Material 3 · 浅紫底 · 深紫 accent",
  mood: "light",
  colors: {
    bg: "#FFFBFE",
    surface: "#F3EDF7",
    surfaceElevated: "#FFFFFF",
    onSurface: "#1C1B1F",
    onSurfaceMuted: "#49454F",
    primary: "#6750A4",
    onPrimary: "#FFFFFF",
    coverBg: "#6750A4",
    onCover: "#FFFFFF",
    outline: "#79747E",
    success: "#146C2E",
    danger: "#B3261E",
  },
  fonts: DEFAULT_FONTS,
  type: DEFAULT_TYPE,
  shape: { xs: 4, sm: 8, md: 12, lg: 16, full: 9999 },
  headingFamily: "sans",
  accentDecoration: "none",
};

/**
 * Guizang Pack —— 参考 op7418/guizang-ppt-skill 的 5 套 ink/paper 哲学。
 * 每套只有 ink(墨色) + paper(纸色) 两个核心变量,衍生其他 11 roles。
 * 共同特征:衬线大标题 + 无阴影 + 微圆角 + 电子杂志气质。
 */

const GUIZANG_FONTS = {
  serif: "\"Noto Serif SC\", \"Playfair Display\", \"Source Han Serif SC\", Georgia, serif",
  sans: "\"Noto Sans SC\", \"Inter\", \"PingFang SC\", sans-serif",
  mono: "\"IBM Plex Mono\", \"JetBrains Mono\", \"SF Mono\", Menlo, monospace",
};

const GUIZANG_TYPE = {
  displayXL: { size: 120, line: 1.02, weight: 500, tracking: -0.02 },
  display:   { size: 88, line: 1.05, weight: 500, tracking: -0.015 },
  headline:  { size: 52, line: 1.15, weight: 500, tracking: -0.01 },
  title:     { size: 34, line: 1.25, weight: 500 },
  body:      { size: 22, line: 1.6, weight: 400 },
  caption:   { size: 14, line: 1.5, weight: 500 },
};

/** guizang 的核心:只给 ink + paper,生成整套 roles */
function makeGuizang(
  id: string,
  label: string,
  hint: string,
  ink: string,
  paper: string,
  paperTint: string,
): ThemeTokens {
  return {
    id,
    label,
    hint,
    mood: "light",
    colors: {
      bg: paper,
      surface: paperTint,
      surfaceElevated: paper,
      onSurface: ink,
      onSurfaceMuted: hexMix(ink, paper, 0.55),
      primary: ink,
      onPrimary: paper,
      coverBg: ink,
      onCover: paper,
      outline: hexMix(ink, paper, 0.15),
      success: "#16a34a",
      danger: "#dc2626",
    },
    fonts: GUIZANG_FONTS,
    type: GUIZANG_TYPE,
    shape: { xs: 2, sm: 4, md: 6, lg: 10, full: 9999 },
    headingFamily: "serif",
    accentDecoration: "none",
  };
}

/** 颜色混合:t=0 返回 c1,t=1 返回 c2。简化版,假设 c1/c2 都是 6 位 hex */
function hexMix(c1: string, c2: string, t: number): string {
  const r = (c: string, i: number) => parseInt(c.replace("#", "").slice(i * 2, i * 2 + 2), 16);
  const m = (a: number, b: number) => Math.round(a + (b - a) * t).toString(16).padStart(2, "0");
  return `#${m(r(c1, 0), r(c2, 0))}${m(r(c1, 1), r(c2, 1))}${m(r(c1, 2), r(c2, 2))}`;
}

// 墨纸 (单一代表) —— 之前 5 兄弟合并成 1 个。INK 作为画面代表。
// 其余 4 个(INDIGO/FOREST/KRAFT/DUNE)保留 export 让别名 map 能引用,
// 但不进 ALL_THEME_TOKENS,主题选择器看不到。
export const GUIZANG_INK       = makeGuizang("guizang-ink",    "墨纸",     "黑墨水 · 暖米纸 · 大衬线",  "#0a0a0b", "#f1efea", "#e8e5de");
export const GUIZANG_INDIGO    = makeGuizang("guizang-indigo", "靛蓝瓷",   "(已合并到「墨纸」)",        "#0a1f3d", "#f1f3f5", "#e4e8ec");
export const GUIZANG_FOREST    = makeGuizang("guizang-forest", "森林墨",   "(已合并到「墨纸」)",        "#1a2e1f", "#f5f1e8", "#ece7da");
export const GUIZANG_KRAFT     = makeGuizang("guizang-kraft",  "牛皮纸",   "(已合并到「墨纸」)",        "#2a1e13", "#eedfc7", "#e0d0b6");
export const GUIZANG_DUNE      = makeGuizang("guizang-dune",   "沙丘",     "(已合并到「墨纸」)",        "#1f1a14", "#f0e6d2", "#e3d7bf");

/**
 * Swiss Pack —— 瑞士国际主义 (Massimo Vignelli / Müller-Brockmann 一脉).
 *
 * Visual rules baked in (op7418 / guizang-ppt-skill 验证过的 7 条纪律):
 *   1. 单一锚点色 —— 整套 deck 只允许一种高亮色 (primary)
 *   2. 字号对比 8:1 —— displayXL 跟 body 的比拉到 ~7-8x
 *   3. 大字越大越细 —— displayXL/display 用 200 (ExtraLight),不允许 700+
 *   4. 直角纯色 —— shape 全部 0 圆角,无渐变/阴影
 *   5. 网格至上 —— 由 layout CSS 处理 (16 列,gap 16px)
 *   6. 无 WebGL/动态背景 —— 纯白底
 *   7. Helvetica/Inter 系无衬线
 *
 * 4 套锚点色对应 4 个使用场景。色相不能自定义 (整套调性是封死的)。
 */

const SWISS_FONTS = {
  serif: "\"Inter\", \"Helvetica Neue\", \"PingFang SC\", sans-serif",  // Swiss 主题 serif 也走 sans-serif (反直觉但正确)
  sans:  "\"Inter\", \"Helvetica Neue\", \"PingFang SC\", \"Hiragino Sans GB\", sans-serif",
  mono:  "\"JetBrains Mono\", \"SF Mono\", Menlo, Consolas, monospace",
};

// 关键:大字 ExtraLight (200),小字 Medium (500)。对比靠字号,不是字重。
const SWISS_TYPE = {
  displayXL: { size: 168, line: 0.92, weight: 200, tracking: -0.025 }, // hero 巨字
  display:   { size: 112, line: 0.95, weight: 200, tracking: -0.02 },  // 章节
  headline:  { size: 56,  line: 1.05, weight: 300, tracking: -0.01 },
  title:     { size: 28,  line: 1.25, weight: 500 },
  body:      { size: 20,  line: 1.55, weight: 400 },
  caption:   { size: 13,  line: 1.4,  weight: 500, tracking: 0.04 },   // kicker / 网格标签
};

const SWISS_SHAPE = { xs: 0, sm: 0, md: 0, lg: 0, full: 9999 };  // 直角 = 零圆角

function makeSwiss(
  id: string,
  label: string,
  hint: string,
  anchor: string,       // 唯一锚点色 (IKB / Yellow / Green / Orange)
  onAnchor: string,     // 锚点色上的文字色 (白或黑,跟着对比度选)
): ThemeTokens {
  return {
    id,
    label,
    hint,
    mood: "light",
    colors: {
      // 上游 guizang 极浅暖白 #fafaf8 ——「高级灰」质感,不用纯白避免刺眼
      bg: "#fafaf8",
      surface: "#f0f0ee",           // grey-1
      surfaceElevated: "#fafaf8",
      onSurface: "#0a0a0a",         // ink
      onSurfaceMuted: "#737373",    // grey-3
      primary: anchor,
      onPrimary: onAnchor,
      coverBg: anchor,
      onCover: onAnchor,
      outline: "#d4d4d2",           // grey-2 发丝线
      success: anchor,              // 单色调性:成功也走锚点
      danger: "#0a0a0a",            // 不引入第二种颜色
    },
    fonts: SWISS_FONTS,
    type: SWISS_TYPE,
    shape: SWISS_SHAPE,
    headingFamily: "sans",          // Swiss 永远 sans-serif
    accentDecoration: "bar",        // kicker 前面的红色短杠 (anchor 色)
  };
}

// 瑞士网格 (单一代表) —— 之前 4 兄弟合并成 1 个。IKB 克莱因蓝作画面代表。
// 其余 3 个保留 export 给别名 map 用,不进 ALL_THEME_TOKENS。
// (用户想换锚点色时通过 chat 改 frontmatter primary,不用占主题 slot)
export const SWISS_IKB    = makeSwiss("swiss-ikb",    "瑞士网格",     "白底 · 克莱因蓝 · 网格至上 · 极细字", "#002FA7", "#ffffff");
export const SWISS_YELLOW = makeSwiss("swiss-yellow", "瑞士·柠檬黄",   "(已合并到「瑞士网格」)",              "#FFD500", "#0a0a0a");
export const SWISS_GREEN  = makeSwiss("swiss-green",  "瑞士·柠檬绿",   "(已合并到「瑞士网格」)",              "#C5E803", "#0a0a0a");
export const SWISS_ORANGE = makeSwiss("swiss-orange", "瑞士·安全橙",   "(已合并到「瑞士网格」)",              "#FF6B35", "#ffffff");

/** Monocle Magazine 风:暖白纸 + 油墨黑 + 千禧粉/淡黄强调 */
export const MONOCLE: ThemeTokens = {
  id: "monocle",
  label: "千禧粉杂志",
  hint: "暖白纸 · 油墨黑 · 千禧粉 kicker",
  mood: "warm",
  colors: {
    bg: "#faf7f1",
    surface: "#f1ecdf",
    surfaceElevated: "#ffffff",
    onSurface: "#1b1b1b",
    onSurfaceMuted: "#5a564f",
    primary: "#e8a4a4", // 千禧粉(只用于 kicker / rule / 强调)
    onPrimary: "#1b1b1b",
    coverBg: "#1b1b1b",
    onCover: "#faf7f1",
    outline: "#dcd5c4",
    success: "#16a34a",
    danger: "#c44545",
  },
  fonts: {
    serif: "\"Plantin\", \"Charter\", \"Noto Serif SC\", Georgia, serif",
    sans: "\"Helvetica Neue\", \"Inter\", \"PingFang SC\", sans-serif",
    mono: "\"IBM Plex Mono\", \"JetBrains Mono\", monospace",
  },
  type: {
    displayXL: { size: 96, line: 1.05, weight: 600, tracking: -0.02 },
    display:   { size: 72, line: 1.1, weight: 600, tracking: -0.015 },
    headline:  { size: 48, line: 1.15, weight: 600, tracking: -0.01 },
    title:     { size: 30, line: 1.25, weight: 600 },
    body:      { size: 20, line: 1.55, weight: 400 },
    caption:   { size: 13, line: 1.5, weight: 500 },
  },
  shape: { xs: 2, sm: 3, md: 4, lg: 6, full: 9999 },
  headingFamily: "serif",
  accentDecoration: "none",
};

/**
 * AI-native Pack — 对标 Gamma / Tome / Pitch 2025-2026 模板风格。
 * 这是 Plain 缺的"AI 时代"那 4 套美学,跟既有的杂志/极简/Swiss 错开。
 */

/** 霓虹夜 —— 深黑底 + cyan + magenta 双 accent。Tome / 夜场 keynote 风。 */
export const PLAIN_NEON: ThemeTokens = {
  id: "plain-neon",
  label: "黑底霓虹",
  hint: "深黑底 · 青色 + 品红双 accent · 夜场 keynote",
  mood: "dark",
  colors: {
    bg: "#0a0a14",
    surface: "#13131f",
    surfaceElevated: "#1b1b2a",
    onSurface: "#f0f0ff",
    onSurfaceMuted: "#9090b0",
    primary: "#00e5ff",          // cyan 主 accent
    onPrimary: "#0a0a14",
    coverBg: "#000010",          // 比 bg 更深的 cover
    onCover: "#f0f0ff",
    outline: "#2a2a40",
    success: "#00e5ff",
    danger: "#ff00e5",           // magenta 作 danger / 副 accent
  },
  fonts: {
    serif: "\"Inter\", \"Geist\", sans-serif",
    sans: "\"Inter\", \"Geist\", \"PingFang SC\", sans-serif",
    mono: "\"Geist Mono\", \"JetBrains Mono\", \"SF Mono\", monospace",
  },
  type: {
    displayXL: { size: 144, line: 0.95, weight: 700, tracking: -0.03 },
    display:   { size: 96,  line: 1.0,  weight: 700, tracking: -0.025 },
    headline:  { size: 52,  line: 1.1,  weight: 600, tracking: -0.015 },
    title:     { size: 30,  line: 1.25, weight: 600 },
    body:      { size: 22,  line: 1.55, weight: 400 },
    caption:   { size: 12,  line: 1.4,  weight: 500, tracking: 0.08 },
  },
  shape: { xs: 0, sm: 2, md: 4, lg: 6, full: 9999 },
  headingFamily: "sans",
  accentDecoration: "none",
};

/** 流光 —— 白底 + 多色 mesh gradient。Gamma 新版 hero 风。 */
export const PLAIN_MESH: ThemeTokens = {
  id: "plain-mesh",
  label: "白底紫 mesh",
  hint: "白底 · 紫色 primary · 多色 mesh hero",
  mood: "light",
  colors: {
    bg: "#fafafa",
    surface: "#f4f4f7",
    surfaceElevated: "#ffffff",
    onSurface: "#0e0e15",
    onSurfaceMuted: "#666680",
    primary: "#7c3aed",          // violet
    onPrimary: "#ffffff",
    coverBg: "#0e0e15",          // dark cover 配 mesh gradient 最佳
    onCover: "#ffffff",
    outline: "#e3e3eb",
    success: "#10b981",          // emerald — 给 mesh 用的副色
    danger: "#f97316",           // orange — 给 mesh 用的另一副色
  },
  fonts: {
    serif: "\"DM Serif Display\", Georgia, serif",
    sans: "\"DM Sans\", \"Manrope\", \"Inter\", \"PingFang SC\", sans-serif",
    mono: "\"JetBrains Mono\", \"SF Mono\", monospace",
  },
  type: {
    displayXL: { size: 128, line: 1.0,  weight: 600, tracking: -0.025 },
    display:   { size: 88,  line: 1.05, weight: 600, tracking: -0.02 },
    headline:  { size: 48,  line: 1.15, weight: 600 },
    title:     { size: 28,  line: 1.3,  weight: 500 },
    body:      { size: 22,  line: 1.6,  weight: 400 },
    caption:   { size: 13,  line: 1.5,  weight: 500 },
  },
  shape: { xs: 4, sm: 8, md: 16, lg: 24, full: 9999 },
  headingFamily: "sans",
  accentDecoration: "none",
};

/** 渲染 —— 暖白 + 3D 抽象色块。Pitch agency editorial 风。 */
export const PLAIN_RENDER: ThemeTokens = {
  id: "plain-render",
  label: "暖白 3D 橙",
  hint: "暖白纸 · 橙红 3D accent · 衬线大字",
  mood: "warm",
  colors: {
    bg: "#f6f4ef",
    surface: "#ede9df",
    surfaceElevated: "#ffffff",
    onSurface: "#15110c",
    onSurfaceMuted: "#5a534a",
    primary: "#e85d3d",          // 抽象 3D 渲染常用的橙红
    onPrimary: "#ffffff",
    coverBg: "#15110c",
    onCover: "#f6f4ef",
    outline: "#e0d9cb",
    success: "#3da680",          // teal 副色,呼应 3D 渲染调色板
    danger: "#c43a3a",
  },
  fonts: {
    serif: "\"Tiempos\", \"Plantin\", \"Charter\", \"Noto Serif SC\", Georgia, serif",
    sans: "\"Inter\", \"Söhne\", \"PingFang SC\", sans-serif",
    mono: "\"IBM Plex Mono\", \"JetBrains Mono\", monospace",
  },
  type: {
    displayXL: { size: 108, line: 1.0,  weight: 500, tracking: -0.02 },
    display:   { size: 80,  line: 1.05, weight: 500, tracking: -0.015 },
    headline:  { size: 44,  line: 1.15, weight: 500 },
    title:     { size: 28,  line: 1.3,  weight: 500 },
    body:      { size: 22,  line: 1.6,  weight: 400 },
    caption:   { size: 13,  line: 1.5,  weight: 500 },
  },
  shape: { xs: 2, sm: 4, md: 6, lg: 10, full: 9999 },
  headingFamily: "serif",
  accentDecoration: "bar",
};

/** 苔原 —— 暖墨绿 + 米纸。ESG / 可持续 / 户外 / 餐饮品牌。 */
export const PLAIN_MOSS: ThemeTokens = {
  id: "plain-moss",
  label: "墨绿米麻",
  hint: "米麻纸 · 暖墨绿 · ESG / 可持续 / 户外",
  mood: "warm",
  colors: {
    bg: "#ebe7da",               // 米麻纸
    surface: "#e0dac8",
    surfaceElevated: "#f3efe2",
    onSurface: "#1f2418",
    onSurfaceMuted: "#5d6354",
    primary: "#2f3a2a",          // 暖深墨绿
    onPrimary: "#ebe7da",
    coverBg: "#2f3a2a",
    onCover: "#ebe7da",
    outline: "#c8c0a8",
    success: "#658a4a",
    danger: "#a44232",
  },
  fonts: {
    serif: "\"Charter\", \"Noto Serif SC\", \"Source Han Serif SC\", Georgia, serif",
    sans: "\"Inter\", \"PingFang SC\", sans-serif",
    mono: "\"IBM Plex Mono\", \"JetBrains Mono\", monospace",
  },
  type: {
    displayXL: { size: 104, line: 1.05, weight: 500, tracking: -0.015 },
    display:   { size: 76,  line: 1.1,  weight: 500 },
    headline:  { size: 44,  line: 1.2,  weight: 500 },
    title:     { size: 28,  line: 1.3,  weight: 500 },
    body:      { size: 22,  line: 1.6,  weight: 400 },
    caption:   { size: 13,  line: 1.5,  weight: 500 },
  },
  shape: { xs: 2, sm: 4, md: 8, lg: 12, full: 9999 },
  headingFamily: "serif",
  accentDecoration: "bar",
};

/**
 * 公开的主题选择器列表 —— 13 个有显著区分的主题。
 *
 * 此前 21 个里有 9 个是"换色"重复(Swiss 4 兄弟、Guizang 5 兄弟),
 * 用户挑模板时无法判断该选哪个。本次重构合并为各 1 个代表 + 7 个别名:
 *   swiss-yellow / swiss-green / swiss-orange     → swiss-ikb (瑞士网格)
 *   guizang-indigo / forest / kraft / dune        → guizang-ink (墨纸)
 *
 * 别名映射在 THEME_ALIASES 中,render 层会先过别名再 lookup。
 * 旧 doc 引用了被合并的 id 时不会断,只是渲染时落到代表主题上。
 *
 * 想换锚点色 (例如 swiss-orange 的 hi-vis 橙) 改成在 frontmatter
 * 里写 `primary: "#FF6B35"`,不再用占主题 slot 的方式。
 */
export const ALL_THEME_TOKENS: ThemeTokens[] = [
  // 编辑 / 杂志
  PLAIN_MONO,
  PLAIN_EDITORIAL,
  PLAIN_KAMI,
  MONOCLE,
  GUIZANG_INK,
  // 极简 / 自然
  PLAIN_SERENE,
  PLAIN_MOSS,
  // 科技 / AI 时代
  PLAIN_DUSK,
  PLAIN_NEON,
  PLAIN_MESH,
  PLAIN_RENDER,
  // 企业 / 商务
  PLAIN_BOLD,
  MATERIAL_3,
  SWISS_IKB,
];

/**
 * 旧 themeId → 新 themeId 别名映射。
 *
 * 渲染流程在 lookup ALL_THEME_TOKENS 之前先过 resolveThemeAlias()。
 * 用户数据库里存的旧 id (swiss-yellow 等) 不需要迁移,自动 fallback。
 */
export const THEME_ALIASES: Readonly<Record<string, string>> = {
  // Swiss 4 兄弟 → 瑞士网格 (IKB)
  "swiss-yellow": "swiss-ikb",
  "swiss-green":  "swiss-ikb",
  "swiss-orange": "swiss-ikb",
  // Guizang 5 兄弟 → 墨纸 (INK)
  "guizang-indigo": "guizang-ink",
  "guizang-forest": "guizang-ink",
  "guizang-kraft":  "guizang-ink",
  "guizang-dune":   "guizang-ink",
};

/**
 * 把任意 themeId 解析到当前 ALL_THEME_TOKENS 里实际存在的 id。
 * 未知 id 返回 undefined (让调用方决定 fallback)。
 */
export function resolveThemeAlias(id: string | undefined | null): string | undefined {
  if (!id) return undefined;
  const aliased = THEME_ALIASES[id] ?? id;
  return ALL_THEME_TOKENS.some((t) => t.id === aliased) ? aliased : undefined;
}
