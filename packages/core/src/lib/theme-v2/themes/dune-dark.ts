/**
 * Dune Dark · 数据 dashboard 主题
 *
 * vibe: 深底 + 橙锚点 + 等宽数字 + SQL 友好
 * 灵感: Dune Analytics · Grafana · Linear changelog
 * 适合: 财务面板 / 数据故事 / SQL workbook / 复盘 dashboard
 *
 * 核心心智:
 *   - 高密度信息:小字号 + 紧间距
 *   - tabular-nums:等宽数字对齐很重要
 *   - 单一锚点橙:warning / focal / accent 都靠它
 */
import type { PlainTheme } from "../theme-schema";

export const DUNE_DARK: PlainTheme = {
  id: "dune-dark",
  label: "Dune 深色仪表板",
  vibe: "深底 · 橙锚点 · 等宽数字 · SQL workbook",
  contexts: ["sheet", "all"],
  mood: "dark",

  colors: {
    paper:    "#0f1116",
    surface:  "#1a1d24",
    raised:   "#1e2129",
    ink:      "#e8eaed",
    inkSoft:  "#b0b5bf",
    inkMute:  "#6a7280",
    accent:   "#ff6b35",   // Dune 风的橙
    onAccent: "#0f1116",
    hero:     "#0a0c10",
    onHero:   "#e8eaed",
    positive: "#4ade80",
    negative: "#f87171",
  },

  fonts: {
    display: '"Inter", "Helvetica Neue", sans-serif',
    text:    '"Inter", "Helvetica Neue", "PingFang SC", sans-serif',
    ui:      '"JetBrains Mono", "SF Mono", monospace',   // dashboard UI 用 mono 更适合
    mono:    '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
  },

  // dashboard 信息密度高,字号都收紧
  type: {
    heroXl: { size: "4rem",     line: 1.0,  weight: 600 },
    heroL:  { size: "3rem",     line: 1.05, weight: 600 },
    heroM:  { size: "2rem",     line: 1.1,  weight: 600 },
    h1:     { size: "1.5rem",   line: 1.2,  weight: 600 },
    h2:     { size: "1.125rem", line: 1.3,  weight: 600 },
    h3:     { size: "1rem",     line: 1.35, weight: 600 },
    body:   { size: "0.875rem", line: 1.55, weight: 400 },
    small:  { size: "0.75rem",  line: 1.45, weight: 400 },
    micro:  { size: "0.625rem", line: 1.4,  weight: 500, tracking: 0.18 },
  },

  // dashboard 间距收紧
  space: {
    s4: "24px",     // 替代默认 32px
    s6: "36px",     // 替代默认 48px
    s8: "48px",     // 替代默认 64px
    s12: "64px",
  },

  radius: {
    soft: "4px",
    card: "6px",    // panel 卡片
    blob: "8px",
  },

  chrome: {
    kickerBar: false,
    dropCap: false,
    ruleStyle: "solid",
    cardShadow: "none",
    strongStyle: "bold-only",
    quoteStyle: "indent",
  },
};
