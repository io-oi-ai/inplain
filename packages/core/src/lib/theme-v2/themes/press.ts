/**
 * Press · Stripe Press 长文风
 *
 * vibe: 暖白 + Source Serif + 紫蓝 gradient 偶用 + 高密度长文
 * 灵感: Stripe Press · The Browser Company · A List Apart
 * 适合: 深度 essay / 长 memo / 技术 explainer
 */
import type { PlainTheme } from "../theme-schema";

export const PRESS: PlainTheme = {
  id: "press",
  label: "Stripe Press 长文",
  vibe: "暖白 · Source Serif · 紫蓝 gradient · 长文密度",
  contexts: ["doc", "all"],
  mood: "light",

  colors: {
    paper:    "#fdfcfa",
    surface:  "#f5f2ed",
    raised:   "#ffffff",
    ink:      "#1a1a1a",
    inkSoft:  "#2a2a2a",
    inkMute:  "#6a6663",
    accent:   "#635bff",   // Stripe 紫
    onAccent: "#ffffff",
    hero:     "#1a1a1a",
    onHero:   "#fdfcfa",
    positive: "#0d894f",
    negative: "#c0383d",
  },

  fonts: {
    display: '"Source Serif 4", "Charter", Georgia, serif',
    text:    '"Source Serif 4", "Charter", Georgia, serif',
    ui:      '"Inter", "Helvetica Neue", sans-serif',
    mono:    '"JetBrains Mono", "IBM Plex Mono", monospace',
  },

  type: {
    body:   { size: "1.125rem", line: 1.75, weight: 400 },  // 长文阅读字号大
    small:  { size: "0.9375rem", line: 1.6, weight: 400 },
  },

  chrome: {
    kickerBar: false,
    dropCap: true,             // 段落首字下沉(经典 essay)
    ruleStyle: "solid",
    cardShadow: "subtle",
    strongStyle: "underline",  // 紫色波浪/直 underline
    quoteStyle: "left-bar",
  },
};
