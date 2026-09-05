/**
 * Kami · 中文严肃 / 内部出版
 *
 * vibe: 米麻纸 + 中文衬线 + 油墨蓝 bar accent
 * 灵感: 三联 · 中信 · 国内严肃出版物 · tw93/kami 项目
 * 适合: 中文复盘 / 公文 / 内部沟通 / 行业报告
 */
import type { PlainTheme } from "../theme-schema";

export const KAMI: PlainTheme = {
  id: "kami",
  label: "宣纸油墨蓝",
  vibe: "米麻纸 · 中文衬线 · 油墨蓝 · 内部出版",
  contexts: ["deck", "doc", "all"],
  mood: "warm",

  colors: {
    paper:    "#f5f4ed",
    surface:  "#eceae0",
    raised:   "#ffffff",
    ink:      "#141413",
    inkSoft:  "#2a2a28",
    inkMute:  "#4d4c48",
    accent:   "#1B365D",   // 油墨蓝
    onAccent: "#ffffff",
    hero:     "#141413",
    onHero:   "#f5f4ed",
    positive: "#16a34a",
    negative: "#dc2626",
  },

  fonts: {
    display: '"Source Han Serif SC", "Noto Serif SC", "Songti SC", Georgia, serif',
    text:    '"Source Han Serif SC", "Noto Serif SC", "Songti SC", Georgia, serif',
    ui:      '"Inter", "PingFang SC", "Hiragino Sans GB", sans-serif',
    mono:    '"JetBrains Mono", "SF Mono", monospace',
  },

  // 中文衬线大字字重轻一点更耐看
  type: {
    heroXl: { size: "5rem",   line: 1.1,  weight: 500, tracking: -0.012 },
    heroL:  { size: "3.6rem", line: 1.15, weight: 500, tracking: -0.012 },
    h1:     { size: "2rem",   line: 1.25, weight: 500 },
    h2:     { size: "1.5rem", line: 1.35, weight: 500 },
  },

  chrome: {
    kickerBar: true,           // h2 前竖蓝线(标志性)
    dropCap: false,
    ruleStyle: "solid",
    cardShadow: "none",
    strongStyle: "bold-only",  // 中文不适合 marker highlight
    quoteStyle: "left-bar",
  },
};
