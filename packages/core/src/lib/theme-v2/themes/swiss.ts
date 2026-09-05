/**
 * Swiss · 极简瑞士网格
 *
 * vibe: 极浅暖白 + Helvetica/Inter + IKB 克莱因蓝单色锚点 + sharp(零圆角)
 * 灵感: Massimo Vignelli · Müller-Brockmann · Vercel · op7418/guizang
 * 适合: 开发者 / B2B / AI 工具 / 学术海报
 *
 * 关键约束(瑞士风):
 *   - 单一锚点色 · 整套只用 IKB
 *   - 大字 ExtraLight (200) + 小字 Medium (500)
 *   - 0 圆角 · 0 阴影 · 0 渐变
 */
import type { PlainTheme } from "../theme-schema";

export const SWISS: PlainTheme = {
  id: "swiss",
  label: "瑞士网格",
  vibe: "白底 · 克莱因蓝 · 网格至上 · 极细字",
  contexts: ["deck", "doc", "all"],
  mood: "high-contrast",

  colors: {
    paper:    "#fafaf8",   // 极浅暖白(高级灰)
    surface:  "#f0f0ee",
    raised:   "#fafaf8",
    ink:      "#0a0a0a",
    inkSoft:  "#1a1a1a",
    inkMute:  "#737373",
    accent:   "#002FA7",   // IKB · International Klein Blue
    onAccent: "#ffffff",
    hero:     "#0a0a0a",
    onHero:   "#fafaf8",
    positive: "#002FA7",   // 单色调性:positive 也用 IKB
    negative: "#0a0a0a",
  },

  fonts: {
    display: '"Inter", "Helvetica Neue", "PingFang SC", sans-serif',
    text:    '"Inter", "Helvetica Neue", "PingFang SC", sans-serif',
    ui:      '"Inter", "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", sans-serif',
    mono:    '"JetBrains Mono", "SF Mono", Menlo, monospace',
  },

  // 大字 ExtraLight,小字 Medium(瑞士风纪律)
  type: {
    heroXl: { size: "10.5rem", line: 0.92, weight: 200, tracking: -0.025 },
    heroL:  { size: "7rem",    line: 0.95, weight: 200, tracking: -0.02 },
    heroM:  { size: "4.5rem",  line: 1.0,  weight: 200, tracking: -0.015 },
    h1:     { size: "3.5rem",  line: 1.05, weight: 300, tracking: -0.012 },
    h2:     { size: "1.75rem", line: 1.2,  weight: 500 },
    body:   { size: "1.0625rem", line: 1.55, weight: 400 },
  },

  radius: {
    sharp: "0",
    soft:  "0",   // swiss 全 0
    card:  "0",
    blob:  "0",
    // pill 仍保留 999(给 chip / button)
  },

  chrome: {
    kickerBar: true,           // 网格 + accent bar 是瑞士风核心
    dropCap: false,
    ruleStyle: "solid",
    cardShadow: "none",        // 瑞士风 0 阴影
    strongStyle: "bold-only",
    quoteStyle: "indent",
  },
};
