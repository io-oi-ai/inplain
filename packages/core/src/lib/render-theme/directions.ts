/**
 * Stage 3:Design Direction System
 *
 * 5 schools(借鉴 nexu-io/open-design 的方向选择器思路)+ 每个 school 下
 * 2-4 个手工调研的品牌 token 预设。
 *
 * 用法:
 *   import { ALL_DIRECTIONS, getBrandTokens } from "@/lib/render-theme/directions";
 *   // 在 DeckThemePicker 旁边加 direction 选择
 *   // 选了 brand 后 → 加载 ThemeTokens 临时 override
 *
 * 数据来源:手工调研 Linear/Stripe/Notion 等品牌的官方网站取色;
 * **不抄 logo / 商标**,只取颜色和字体趋势。
 */

import type { ThemeTokens } from "./tokens";

// 复用 seed.ts 里的默认 typography(我们 5 个 school 主要差颜色)
const DEFAULT_FONTS = {
  serif: '"Charter", "Source Han Serif SC", Georgia, serif',
  sans: '"Inter", "PingFang SC", "Hiragino Sans GB", sans-serif',
  mono: '"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace',
};

const DEFAULT_TYPE = {
  displayXL: { size: 88, line: 1.1, weight: 700, tracking: -0.015 },
  display: { size: 72, line: 1.15, weight: 700 },
  headline: { size: 44, line: 1.2, weight: 700 },
  title: { size: 32, line: 1.3, weight: 600 },
  body: { size: 24, line: 1.55, weight: 400 },
  caption: { size: 16, line: 1.5, weight: 400 },
};

const DEFAULT_SHAPE = { xs: 4, sm: 8, md: 12, lg: 20, full: 9999 };

export type Direction = {
  id: string;
  label: string;
  hint: string;
  /** 适合的场景 */
  fit: string[];
  brands: BrandPreset[];
};

export type BrandPreset = {
  id: string;
  brand: string;
  hint: string;
  tokens: ThemeTokens;
};

function makeTokens(over: {
  id: string;
  label: string;
  hint: string;
  bg: string;
  surface: string;
  surfaceElevated: string;
  onSurface: string;
  onSurfaceMuted: string;
  primary: string;
  onPrimary: string;
  coverBg: string;
  onCover: string;
  outline: string;
  success?: string;
  danger?: string;
  headingFamily?: "serif" | "sans";
  accentDecoration?: "bar" | "underline" | "none";
}): ThemeTokens {
  return {
    id: over.id,
    label: over.label,
    hint: over.hint,
    mood: "light",
    headingFamily: over.headingFamily ?? "sans",
    accentDecoration: over.accentDecoration ?? "none",
    fonts: DEFAULT_FONTS,
    type: DEFAULT_TYPE,
    shape: DEFAULT_SHAPE,
    colors: {
      bg: over.bg,
      surface: over.surface,
      surfaceElevated: over.surfaceElevated,
      onSurface: over.onSurface,
      onSurfaceMuted: over.onSurfaceMuted,
      primary: over.primary,
      onPrimary: over.onPrimary,
      coverBg: over.coverBg,
      onCover: over.onCover,
      outline: over.outline,
      success: over.success ?? "#16a34a",
      danger: over.danger ?? "#dc2626",
    },
  };
}

export const ALL_DIRECTIONS: Direction[] = [
  {
    id: "monocle",
    label: "Monocle",
    hint: "杂志感 · 衬线 · 暖色 · 留白多",
    fit: ["编辑特刊", "深度报告", "品牌故事"],
    brands: [
      {
        id: "monocle-paper",
        brand: "Monocle 风",
        hint: "暖米底 + 油墨蓝",
        tokens: makeTokens({
          id: "dir-monocle-paper",
          label: "Monocle Paper",
          hint: "暖米底 + 油墨蓝",
          bg: "#f5f4ed",
          surface: "#fafaf6",
          surfaceElevated: "#ffffff",
          onSurface: "#141413",
          onSurfaceMuted: "#3d3d3a",
          primary: "#1B365D",
          onPrimary: "#ffffff",
          coverBg: "#1B365D",
          onCover: "#f5f4ed",
          outline: "#dcd9d0",
          headingFamily: "serif",
          accentDecoration: "bar",
        }),
      },
      {
        id: "monocle-classic",
        brand: "Editorial Classic",
        hint: "牛皮纸 + 朱红",
        tokens: makeTokens({
          id: "dir-monocle-classic",
          label: "Editorial Classic",
          hint: "牛皮纸 + 朱红",
          bg: "#f9f5ef",
          surface: "#fefcf7",
          surfaceElevated: "#ffffff",
          onSurface: "#2c2720",
          onSurfaceMuted: "#6b5c46",
          primary: "#c8661f",
          onPrimary: "#ffffff",
          coverBg: "#2c2720",
          onCover: "#f9f5ef",
          outline: "#d4c9b5",
          headingFamily: "serif",
          accentDecoration: "underline",
        }),
      },
    ],
  },
  {
    id: "modern-minimal",
    label: "Modern Minimal",
    hint: "技术品 · 单色 · 高对比 · 极简",
    fit: ["SaaS 产品发布", "技术文档", "投资人 deck"],
    brands: [
      {
        id: "modern-linear",
        brand: "Linear 风",
        hint: "深紫 + 极淡灰",
        tokens: makeTokens({
          id: "dir-modern-linear",
          label: "Linear",
          hint: "深紫 + 极淡灰",
          bg: "#fafafa",
          surface: "#ffffff",
          surfaceElevated: "#ffffff",
          onSurface: "#101012",
          onSurfaceMuted: "#52525b",
          primary: "#5e6ad2",
          onPrimary: "#ffffff",
          coverBg: "#101012",
          onCover: "#fafafa",
          outline: "#e4e4e7",
        }),
      },
      {
        id: "modern-stripe",
        brand: "Stripe 风",
        hint: "蓝紫渐变",
        tokens: makeTokens({
          id: "dir-modern-stripe",
          label: "Stripe",
          hint: "蓝紫渐变",
          bg: "#ffffff",
          surface: "#f6f9fc",
          surfaceElevated: "#ffffff",
          onSurface: "#0a2540",
          onSurfaceMuted: "#425466",
          primary: "#635bff",
          onPrimary: "#ffffff",
          coverBg: "#0a2540",
          onCover: "#ffffff",
          outline: "#e3e8ee",
        }),
      },
      {
        id: "modern-vercel",
        brand: "Vercel 风",
        hint: "纯黑白",
        tokens: makeTokens({
          id: "dir-modern-vercel",
          label: "Vercel",
          hint: "纯黑白",
          bg: "#ffffff",
          surface: "#fafafa",
          surfaceElevated: "#ffffff",
          onSurface: "#000000",
          onSurfaceMuted: "#666666",
          primary: "#000000",
          onPrimary: "#ffffff",
          coverBg: "#000000",
          onCover: "#ffffff",
          outline: "#eaeaea",
        }),
      },
    ],
  },
  {
    id: "tech-utility",
    label: "Tech Utility",
    hint: "数据感 · 等宽字 · 高密度",
    fit: ["仪表盘", "技术指南", "性能报告"],
    brands: [
      {
        id: "tech-claude",
        brand: "Claude 风",
        hint: "暖米 + 橘",
        tokens: makeTokens({
          id: "dir-tech-claude",
          label: "Claude",
          hint: "暖米 + 橘",
          bg: "#faf9f5",
          surface: "#fefdf9",
          surfaceElevated: "#ffffff",
          onSurface: "#1a1a1a",
          onSurfaceMuted: "#6e6e6e",
          primary: "#cd7f32",
          onPrimary: "#ffffff",
          coverBg: "#181818",
          onCover: "#faf9f5",
          outline: "#e5e3dc",
        }),
      },
      {
        id: "tech-cursor",
        brand: "Cursor 风",
        hint: "深底 + 青绿",
        tokens: makeTokens({
          id: "dir-tech-cursor",
          label: "Cursor",
          hint: "深底 + 青绿",
          bg: "#0d0d0d",
          surface: "#181818",
          surfaceElevated: "#242424",
          onSurface: "#f0f0f0",
          onSurfaceMuted: "#a0a0a0",
          primary: "#00ffd1",
          onPrimary: "#000000",
          coverBg: "#000000",
          onCover: "#00ffd1",
          outline: "#2a2a2a",
        }),
      },
    ],
  },
  {
    id: "brutalist",
    label: "Brutalist",
    hint: "粗犷 · 大字 · 强对比 · 工业感",
    fit: ["发布会 hero", "宣言", "反主流"],
    brands: [
      {
        id: "brut-craft",
        brand: "Craft 风",
        hint: "纯白 + 工业黑",
        tokens: makeTokens({
          id: "dir-brut-craft",
          label: "Craft",
          hint: "纯白 + 工业黑",
          bg: "#ffffff",
          surface: "#ffffff",
          surfaceElevated: "#ffffff",
          onSurface: "#000000",
          onSurfaceMuted: "#1a1a1a",
          primary: "#ff3300",
          onPrimary: "#ffffff",
          coverBg: "#000000",
          onCover: "#ffffff",
          outline: "#000000",
        }),
      },
      {
        id: "brut-arena",
        brand: "Arena 风",
        hint: "暖米 + 阴影",
        tokens: makeTokens({
          id: "dir-brut-arena",
          label: "Arena",
          hint: "暖米 + 阴影",
          bg: "#f4f1ec",
          surface: "#ffffff",
          surfaceElevated: "#ffffff",
          onSurface: "#000000",
          onSurfaceMuted: "#3a3a3a",
          primary: "#000000",
          onPrimary: "#f4f1ec",
          coverBg: "#000000",
          onCover: "#f4f1ec",
          outline: "#000000",
        }),
      },
    ],
  },
  {
    id: "soft-warm",
    label: "Soft Warm",
    hint: "温暖 · 圆润 · 人文 · 柔光",
    fit: ["人物专题", "公益项目", "用户故事"],
    brands: [
      {
        id: "soft-substack",
        brand: "Substack 风",
        hint: "纸卡橙",
        tokens: makeTokens({
          id: "dir-soft-substack",
          label: "Substack",
          hint: "纸卡橙",
          bg: "#fffdf7",
          surface: "#ffffff",
          surfaceElevated: "#ffffff",
          onSurface: "#1a1a1a",
          onSurfaceMuted: "#5d5d5d",
          primary: "#ff6719",
          onPrimary: "#ffffff",
          coverBg: "#1a1a1a",
          onCover: "#ff6719",
          outline: "#f0e8d4",
          headingFamily: "serif",
        }),
      },
      {
        id: "soft-airbnb",
        brand: "Airbnb 风",
        hint: "珊瑚红 + 暖灰",
        tokens: makeTokens({
          id: "dir-soft-airbnb",
          label: "Airbnb",
          hint: "珊瑚红 + 暖灰",
          bg: "#ffffff",
          surface: "#f7f7f7",
          surfaceElevated: "#ffffff",
          onSurface: "#222222",
          onSurfaceMuted: "#717171",
          primary: "#ff5a5f",
          onPrimary: "#ffffff",
          coverBg: "#484848",
          onCover: "#ffffff",
          outline: "#dddddd",
        }),
      },
    ],
  },
];

/** 从 brand id 找 ThemeTokens(给 DeckThemePicker 加载用) */
export function getBrandTokens(brandId: string): ThemeTokens | null {
  for (const dir of ALL_DIRECTIONS) {
    const brand = dir.brands.find((b) => b.id === brandId);
    if (brand) return brand.tokens;
  }
  return null;
}

/** 列出所有 brand,展平给 picker */
export function flattenBrands(): Array<BrandPreset & { directionId: string }> {
  return ALL_DIRECTIONS.flatMap((d) =>
    d.brands.map((b) => ({ ...b, directionId: d.id })),
  );
}
