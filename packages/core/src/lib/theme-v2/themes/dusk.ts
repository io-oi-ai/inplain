/**
 * Dusk · AI / Linear / 科技
 *
 * vibe: 深紫底 + 薰衣草字 + 微圆角 + 流体 motion
 * 灵感: Linear · Vercel(暗主题部分)· Anthropic
 * 适合: AI 产品发布 / SaaS / 开发者工具
 */
import type { PlainTheme } from "../theme-schema";

export const DUSK: PlainTheme = {
  id: "dusk",
  label: "紫色暗夜",
  vibe: "深紫 · 薰衣草字 · 科技感 · 流体动画",
  contexts: ["deck", "doc", "all"],
  mood: "dark",

  colors: {
    paper:    "#1a1026",
    surface:  "#251838",
    raised:   "#2d1e42",
    ink:      "#ede9fe",
    inkSoft:  "#d4cbf7",
    inkMute:  "#a392c8",
    accent:   "#a78bfa",   // 薰衣草紫
    onAccent: "#1a1026",
    hero:     "#0e0618",   // 更深的 hero(对比 paper)
    onHero:   "#ede9fe",
    positive: "#34d399",
    negative: "#f87171",
  },

  fonts: {
    display: '"Inter", "Helvetica Neue", sans-serif',
    text:    '"Inter", "Helvetica Neue", "PingFang SC", sans-serif',
    ui:      '"Inter", "Helvetica Neue", sans-serif',
    mono:    '"JetBrains Mono", "Fira Code", monospace',
  },

  radius: {
    sharp: "0",
    soft:  "6px",
    card:  "12px",   // 软一点,科技感
    pill:  "999px",
    blob:  "20px",
  },

  motion: {
    // 暗主题节奏更流体,慢一点
    easePage: "cubic-bezier(0.16, 1, 0.3, 1)",
    durMid:   "320ms",
    durSlow:  "600ms",
  },

  chrome: {
    kickerBar: false,          // 暗主题不需要 bar 强调,色对比已经够
    dropCap: false,
    ruleStyle: "solid",
    cardShadow: "pronounced",  // 暗主题里阴影是必要的(用更深的紫)
    strongStyle: "underline",  // accent 色下划线
    quoteStyle: "left-bar",
  },
};
