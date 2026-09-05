/**
 * Monocle · 杂志学院派(默认主题)
 *
 * vibe: 暖纸底 + Source Serif 衬线大字 + 千禧粉 kicker + drop-cap
 * 灵感: Monocle Magazine · A Book Apart · Apricot
 * 适合: 客户提案 / 长文 brand 叙事 / 杂志专题
 */
import type { PlainTheme } from "../theme-schema";

export const MONOCLE: PlainTheme = {
  id: "monocle",
  label: "Monocle 杂志",
  vibe: "暖纸 · 衬线 · 千禧粉 kicker · drop-cap",
  contexts: ["deck", "doc", "all"],
  mood: "warm",

  colors: {
    paper:    "#faf7f1",
    surface:  "#f1ecdf",
    raised:   "#ffffff",
    ink:      "#1b1b1b",
    inkSoft:  "#2a2a2a",
    inkMute:  "#6c6660",
    accent:   "#e8a4a4",   // 千禧粉
    onAccent: "#1b1b1b",
    hero:     "#1b1b1b",
    onHero:   "#faf7f1",
    positive: "#2e7d52",
    negative: "#c44545",
  },

  fonts: {
    display: '"Source Serif 4", "Plantin", "Noto Serif SC", Georgia, serif',
    text:    '"Source Serif 4", "Plantin", "Noto Serif SC", Georgia, serif',
    ui:      '"Inter", "Helvetica Neue", "PingFang SC", sans-serif',
    mono:    '"JetBrains Mono", "IBM Plex Mono", monospace',
  },

  chrome: {
    kickerBar: true,           // h2 前竖红线
    dropCap: true,             // 段落首字下沉(Stripe Press 风)
    ruleStyle: "solid",
    cardShadow: "subtle",
    strongStyle: "marker",     // 黄色 highlight
    quoteStyle: "pull-quote",
  },
};
