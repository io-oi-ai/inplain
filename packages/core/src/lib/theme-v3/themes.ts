/**
 * Plain v3 主题 · 6 个,规则化定义
 *
 * 不再硬编码 hex 表 · 只指定 3 个种子色(surface / ink / accent),
 * accent / text / muted / border / hero 等全部自动派生 · 永远满足 WCAG AA 4.5:1。
 *
 * 跟 v2 关系:
 *   - id 完全对齐(monocle / kami / swiss-ikb / dusk / dune-dark / press)
 *   - DSL 不变(::: section ::: 块)
 *   - 渲染层换:render-deck/doc/sheet 改用 compileTheme(THEME).css 注入
 *
 * 改色变全套体验:用户/AI 只改一个 seed.accent,所有派生 token 自动重算。
 */
import type { ThemeSpec } from "./engine/compile";

export const MONOCLE: ThemeSpec = {
  id: "monocle",
  label: "Monocle · 杂志暖纸",
  seeds: {
    surface: "#faf7f1", // 暖纸底
    ink: "#1b1b1b",
    accent: "#e8a4a4", // 千禧粉
    hero: "#1b1b1b",
  },
  type: {
    fontText: '"Source Serif 4", "Noto Serif SC", Georgia, serif',
    fontDisplay: '"Source Serif 4", "Noto Serif SC", Georgia, serif',
  },
};

export const KAMI: ThemeSpec = {
  id: "kami",
  label: "Kami · 和纸",
  seeds: {
    surface: "#f4eee0",
    ink: "#1a1a1a",
    accent: "#1f4f7c", // 油墨蓝
    hero: "#1a1a1a",
  },
};

export const SWISS_IKB: ThemeSpec = {
  id: "swiss-ikb",
  label: "Swiss · International Klein Blue",
  seeds: {
    surface: "#fcfcfc",
    ink: "#0a0a0a",
    accent: "#1338be", // IKB 克莱因蓝
    hero: "#1338be",
  },
  type: {
    fontText: '"Inter", "Helvetica Neue", sans-serif',
    fontDisplay: '"Inter", "Helvetica Neue", sans-serif',
  },
};

export const DUSK: ThemeSpec = {
  id: "dusk",
  label: "Dusk · 暮色",
  seeds: {
    surface: "#f7f5ef",
    ink: "#191718",
    accent: "#c95643", // 暮色橙
    hero: "#191718",
  },
};

export const DUNE_DARK: ThemeSpec = {
  id: "dune-dark",
  label: "Dune Dark · 数据故事",
  seeds: {
    surface: "#0e0e10",
    ink: "#f5f5f0",
    accent: "#ff8c42", // Dune Analytics 橙
    hero: "#0e0e10",
  },
  type: {
    fontText: '"Inter", -apple-system, sans-serif',
    fontMono: '"JetBrains Mono", "Menlo", monospace',
  },
};

export const PRESS: ThemeSpec = {
  id: "press",
  label: "Press · Stripe Press 长文",
  seeds: {
    surface: "#fcfcf8",
    ink: "#0c0c0d",
    accent: "#6f5dca", // 紫蓝
    hero: "#0c0c0d",
  },
  type: {
    fontText: '"Source Serif 4", Georgia, serif',
    fontDisplay: '"Source Serif 4", Georgia, serif',
  },
};

// V27-U · 参考 op7418/guizang-ppt-skill 补 4 套真差异化主题
// guizang 5 套 ink/paper 二元结构里挑色板·已有 monocle(墨水经典)·补另 4 套

export const INDIGO_PORCELAIN: ThemeSpec = {
  id: "indigo-porcelain",
  label: "靛蓝瓷 · 学术期刊",
  seeds: {
    surface: "#f1f3f5", // 瓷白
    ink: "#0a1f3d",    // 深靛
    accent: "#1f4f7c", // 蓝印花瓷
    hero: "#0a1f3d",
  },
  type: {
    fontText: '"Source Serif 4", "Noto Serif SC", Georgia, serif',
    fontDisplay: '"Source Serif 4", "Noto Serif SC", Georgia, serif',
  },
};

export const FOREST_INK: ThemeSpec = {
  id: "forest-ink",
  label: "森林墨 · 国家地理",
  seeds: {
    surface: "#f5f1e8", // 象牙
    ink: "#1a2e1f",    // 深林绿
    accent: "#3a6e4a", // 苔藓绿
    hero: "#1a2e1f",
  },
  type: {
    fontText: '"Source Serif 4", "Noto Serif SC", Georgia, serif',
    fontDisplay: '"Source Serif 4", "Noto Serif SC", Georgia, serif',
  },
};

export const KRAFT: ThemeSpec = {
  id: "kraft",
  label: "牛皮纸 · 信封信纸",
  seeds: {
    surface: "#eedfc7", // 暖米
    ink: "#2a1e13",    // 深棕墨
    accent: "#a85c2c", // 红棕烙印
    hero: "#2a1e13",
  },
  type: {
    fontText: '"Source Serif 4", "Noto Serif SC", Georgia, serif',
    fontDisplay: '"Source Serif 4", "Noto Serif SC", Georgia, serif',
  },
};

// citrus-pop · seed.surface 直接给浅黄(否则 ramp 会派生到几乎白)
// 让 hero 用纯柠檬黄(它是 cover background 走 --plain-hero) · cover 真显黄
export const CITRUS_POP: ThemeSpec = {
  id: "citrus-pop",
  label: "柠檬黄 · 消费活力",
  seeds: {
    surface: "#fff8d6", // 浅蜂蜜黄(ramp 起始锚)
    ink: "#0a0a0a",    // 纯黑(对比度需要)
    accent: "#FFD500", // 柠檬黄 accent · 真黄
    hero: "#FFD500",   // cover hero 段直接黄底
  },
  type: {
    fontText: '"Inter", "Helvetica Neue", sans-serif',
    fontDisplay: '"Inter", "Helvetica Neue", sans-serif',
  },
};

export const ALL_THEMES_V3: ThemeSpec[] = [
  MONOCLE,
  KAMI,
  SWISS_IKB,
  DUSK,
  DUNE_DARK,
  PRESS,
  INDIGO_PORCELAIN,
  FOREST_INK,
  KRAFT,
  CITRUS_POP,
];

export const DEFAULT_THEME_V3 = "monocle";

export function getThemeSpec(id: string): ThemeSpec {
  return ALL_THEMES_V3.find((t) => t.id === id) ?? MONOCLE;
}
