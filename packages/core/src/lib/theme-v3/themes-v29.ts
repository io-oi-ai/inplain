/**
 * V29 · 10 套有 DNA 的 design system
 *
 * 每套主题独立的 5 层结构 · 不是单层 hex 变化。
 * 参考 zarazhangrui/frontend-slides 的 design.md schema 提炼。
 *
 * 命名规则:`v29-{name}` · 跟老 theme id 分开 · 保证向后兼容
 * AI / 用户选新主题写 frontmatter theme: v29-biennale 即用
 */
import type { ThemeSpecV29 } from "./spec";

// ─────────────────────────────────────────────────────────────
// #1 · Biennale Yellow · 美术馆 biennale 海报
// ─────────────────────────────────────────────────────────────
export const V29_BIENNALE: ThemeSpecV29 = {
  id: "v29-biennale",
  label: "Biennale Yellow",
  vibe: "美术馆海报 · Instrument Serif italic + sun-glow + 1px hairline · 禁圆角阴影",
  colors: {
    surface: "#fdf6e3",
    ink: "#0a0a0a",
    accent: "#f5c518",
    hero: "#1a1a1a",
  },
  typography: {
    display: {
      font: '"Instrument Serif", "Source Serif 4", Georgia, serif',
      size: "clamp(4rem, 11vw, 9rem)",
      lh: 0.86,
      ls: "-0.018em",
      weight: 400,
      italic: true,
    },
    displayMd: {
      font: '"Instrument Serif", Georgia, serif',
      size: "clamp(2.4rem, 5vw, 4rem)",
      lh: 0.95,
      ls: "-0.01em",
      weight: 400,
    },
    numeralJumbo: {
      font: '"Instrument Serif", Georgia, serif',
      size: "clamp(5rem, 14vw, 12rem)",
      lh: 0.85,
      ls: "-0.04em",
      weight: 400,
    },
    headline: {
      font: '"Instrument Serif", Georgia, serif',
      size: "clamp(2rem, 4vw, 3rem)",
      lh: 1.05,
      ls: "-0.01em",
      weight: 400,
    },
    microLabel: {
      font: '"Archivo", "Inter", sans-serif',
      size: "11px",
      lh: 1.4,
      ls: "0.28em",
      weight: 600,
      transform: "uppercase",
    },
    bodyLede: {
      font: '"Archivo", "Inter", sans-serif',
      size: "20px",
      lh: 1.55,
      weight: 400,
    },
    body: {
      font: '"Archivo", "Inter", sans-serif',
      size: "16px",
      lh: 1.7,
      weight: 400,
    },
    quote: {
      font: '"Instrument Serif", Georgia, serif',
      size: "clamp(1.6rem, 3vw, 2.4rem)",
      lh: 1.25,
      ls: "-0.005em",
      weight: 400,
      italic: true,
    },
    mono: {
      font: '"JetBrains Mono", "Menlo", monospace',
      size: "13px",
      lh: 1.6,
      weight: 400,
    },
  },
  unit: { base: 8 },
  decoration: {
    radius: 0, // Biennale 禁圆角
    shadow: "none", // 禁阴影
    hairline: true,
    sunGlow: true,
    grain: 0.4,
  },
  layoutGrammar: {
    cover: "left-bias-yellow-pop",
    content: "two-col",
    quote: "huge-italic",
  },
};

// ─────────────────────────────────────────────────────────────
// #2 · Sakura Chroma · 70s 卡带包装
// ─────────────────────────────────────────────────────────────
export const V29_SAKURA: ThemeSpecV29 = {
  id: "v29-sakura",
  label: "Sakura Chroma",
  vibe: "70s 卡带包装 · Big Shoulders 900 极压缩 · 对角 ribbon + 红印章",
  colors: {
    surface: "#fff5f5",
    ink: "#1a0a0a",
    accent: "#d62828",
    hero: "#264653",
  },
  typography: {
    display: {
      font: '"Big Shoulders Display", "Anton", "Impact", sans-serif',
      size: "clamp(4rem, 10vw, 8rem)",
      lh: 0.9,
      ls: "-0.02em",
      weight: 900,
      transform: "uppercase",
    },
    displayMd: {
      font: '"Big Shoulders Display", "Anton", sans-serif',
      size: "clamp(2rem, 4vw, 3.5rem)",
      lh: 0.95,
      ls: "-0.01em",
      weight: 800,
      transform: "uppercase",
    },
    numeralJumbo: {
      font: '"Big Shoulders Display", "Anton", sans-serif',
      size: "clamp(5rem, 13vw, 10rem)",
      lh: 0.85,
      weight: 900,
    },
    headline: {
      font: '"Big Shoulders Display", "Anton", sans-serif',
      size: "clamp(1.8rem, 3.5vw, 2.6rem)",
      lh: 1.05,
      weight: 800,
      transform: "uppercase",
    },
    microLabel: {
      font: '"JetBrains Mono", "Menlo", monospace',
      size: "10px",
      lh: 1.4,
      ls: "0.22em",
      weight: 600,
      transform: "uppercase",
    },
    body: {
      font: '"Albert Sans", "Inter", sans-serif',
      size: "16px",
      lh: 1.65,
      weight: 400,
    },
    quote: {
      font: '"Albert Sans", "Inter", sans-serif',
      size: "clamp(1.4rem, 2.6vw, 2rem)",
      lh: 1.3,
      weight: 600,
      italic: true,
    },
    mono: {
      font: '"JetBrains Mono", "Menlo", monospace',
      size: "13px",
      lh: 1.6,
      weight: 400,
    },
  },
  unit: { base: 8 },
  decoration: {
    radius: 0,
    shadow: "offset-block",
    ribbon: true,
    seal: true,
    grain: 0.3,
  },
  layoutGrammar: {
    cover: "frame-stamp",
    content: "two-col",
    quote: "stamp-box",
  },
};

// ─────────────────────────────────────────────────────────────
// #3 · 8-Bit Orbit · CRT 启动屏
// ─────────────────────────────────────────────────────────────
export const V29_8BIT: ThemeSpecV29 = {
  id: "v29-8bit",
  label: "8-Bit Orbit",
  vibe: "CRT 启动屏 · Tektur pixel-grid · 4px 单位 · scanlines · 多层硬阴影",
  colors: {
    surface: "#0a0e27",
    ink: "#e4f1ff",
    accent: "#00ff88",
    hero: "#000000",
  },
  typography: {
    display: {
      font: '"Tektur", "VT323", "Courier New", monospace',
      size: "clamp(3rem, 8vw, 6.5rem)",
      lh: 1.05,
      ls: "0.04em",
      weight: 700,
      transform: "uppercase",
    },
    displayMd: {
      font: '"Tektur", "VT323", monospace',
      size: "clamp(1.8rem, 4vw, 3rem)",
      lh: 1.1,
      ls: "0.06em",
      weight: 600,
      transform: "uppercase",
    },
    numeralJumbo: {
      font: '"Tektur", "VT323", monospace',
      size: "clamp(4rem, 12vw, 9rem)",
      lh: 0.95,
      ls: "0.04em",
      weight: 700,
    },
    headline: {
      font: '"Chakra Petch", "Tektur", monospace',
      size: "clamp(1.6rem, 3vw, 2.4rem)",
      lh: 1.2,
      ls: "0.04em",
      weight: 600,
      transform: "uppercase",
    },
    microLabel: {
      font: '"Space Mono", "Menlo", monospace',
      size: "11px",
      lh: 1.4,
      ls: "0.2em",
      weight: 700,
      transform: "uppercase",
    },
    body: {
      font: '"Chakra Petch", "Inter", sans-serif',
      size: "15px",
      lh: 1.6,
      weight: 400,
    },
    mono: {
      font: '"Space Mono", "Menlo", monospace',
      size: "13px",
      lh: 1.5,
      weight: 400,
    },
  },
  unit: { base: 4 }, // 8-Bit 用 4px grid
  decoration: {
    radius: 0,
    shadow: "stacked-pixel",
    scanlines: true,
    grain: 0,
  },
  layoutGrammar: {
    cover: "crt-boot",
    content: "two-col",
    quote: "huge-italic",
  },
};

// ─────────────────────────────────────────────────────────────
// #4 · Cobalt Grid · 设计研究公报
// ─────────────────────────────────────────────────────────────
export const V29_COBALT: ThemeSpecV29 = {
  id: "v29-cobalt",
  label: "Cobalt Grid",
  vibe: "设计研究公报 · graph-paper canvas · 单一 cobalt accent · hairline rule",
  colors: {
    surface: "#fafafa",
    ink: "#0a0a0a",
    accent: "#0040c8",
    hero: "#0040c8",
  },
  typography: {
    display: {
      font: '"Inter", "Helvetica Neue", sans-serif',
      size: "clamp(3.5rem, 9vw, 7rem)",
      lh: 0.95,
      ls: "-0.025em",
      weight: 700,
    },
    displayMd: {
      font: '"Inter", sans-serif',
      size: "clamp(2.2rem, 4.5vw, 3.6rem)",
      lh: 1.05,
      ls: "-0.015em",
      weight: 600,
    },
    numeralJumbo: {
      font: '"Inter", sans-serif',
      size: "clamp(5rem, 13vw, 10rem)",
      lh: 0.85,
      ls: "-0.04em",
      weight: 800,
    },
    headline: {
      font: '"Inter", sans-serif',
      size: "clamp(1.8rem, 3.5vw, 2.6rem)",
      lh: 1.2,
      ls: "-0.01em",
      weight: 600,
    },
    microLabel: {
      font: '"JetBrains Mono", "Menlo", monospace',
      size: "10px",
      lh: 1.4,
      ls: "0.18em",
      weight: 500,
      transform: "uppercase",
    },
    body: {
      font: '"Inter", sans-serif',
      size: "15px",
      lh: 1.7,
      weight: 400,
    },
    mono: {
      font: '"JetBrains Mono", "Menlo", monospace',
      size: "13px",
      lh: 1.6,
      weight: 400,
    },
  },
  unit: { base: 8 },
  decoration: {
    radius: 0,
    shadow: "none",
    hairline: true,
    graphPaper: true,
  },
  layoutGrammar: {
    cover: "ledger-rows",
    content: "graph-card",
    quote: "ledger-line",
  },
};

// ─────────────────────────────────────────────────────────────
// #5 · Emerald Editorial · 严肃杂志 masthead
// ─────────────────────────────────────────────────────────────
export const V29_EMERALD: ThemeSpecV29 = {
  id: "v29-emerald",
  label: "Emerald Editorial",
  vibe: "严肃杂志 masthead · Bodoni-style serif + double-rule · 三色克制",
  colors: {
    surface: "#fbf9f5",
    ink: "#0a1a14",
    accent: "#1a5d3a",
    hero: "#0a1a3d",
  },
  typography: {
    display: {
      font: '"Bodoni Moda", "Cormorant Garamond", Georgia, serif',
      size: "clamp(3.5rem, 8vw, 6.5rem)",
      lh: 1.0,
      ls: "-0.01em",
      weight: 800,
    },
    displayMd: {
      font: '"Bodoni Moda", "Cormorant Garamond", serif',
      size: "clamp(2rem, 4vw, 3.2rem)",
      lh: 1.1,
      weight: 700,
    },
    numeralJumbo: {
      font: '"Bodoni Moda", "Cormorant Garamond", serif',
      size: "clamp(5rem, 12vw, 9rem)",
      lh: 0.95,
      weight: 800,
    },
    headline: {
      font: '"Bodoni Moda", "Cormorant Garamond", serif',
      size: "clamp(1.8rem, 3.5vw, 2.6rem)",
      lh: 1.15,
      weight: 700,
    },
    microLabel: {
      font: '"Inter", sans-serif',
      size: "10px",
      lh: 1.4,
      ls: "0.28em",
      weight: 600,
      transform: "uppercase",
    },
    bodyLede: {
      font: '"Source Serif 4", "Lora", Georgia, serif',
      size: "20px",
      lh: 1.7,
      weight: 400,
      italic: true,
    },
    body: {
      font: '"Source Serif 4", "Lora", Georgia, serif',
      size: "16px",
      lh: 1.8,
      weight: 400,
    },
    quote: {
      font: '"Bodoni Moda", "Cormorant Garamond", serif',
      size: "clamp(1.6rem, 3vw, 2.2rem)",
      lh: 1.4,
      weight: 400,
      italic: true,
    },
    mono: {
      font: '"JetBrains Mono", "Menlo", monospace',
      size: "13px",
      lh: 1.6,
      weight: 400,
    },
  },
  unit: { base: 8 },
  decoration: {
    radius: 0,
    shadow: "none",
    hairline: true,
    grain: 0.5,
  },
  layoutGrammar: {
    cover: "masthead-double-rule",
    content: "single-narrow",
    quote: "huge-italic",
  },
};

// ─────────────────────────────────────────────────────────────
// #6 · Pin & Paper · 田野笔记本
// ─────────────────────────────────────────────────────────────
export const V29_PINPAPER: ThemeSpecV29 = {
  id: "v29-pinpaper",
  label: "Pin & Paper",
  vibe: "田野笔记本 · Caveat 手写 · 安全别针 · paper-grain · 油墨蓝",
  colors: {
    surface: "#f5efe0",
    ink: "#1a2538",
    accent: "#d4654d",
    hero: "#1a2538",
  },
  typography: {
    display: {
      font: '"Caveat", "Kalam", cursive',
      size: "clamp(4rem, 10vw, 7.5rem)",
      lh: 0.95,
      ls: "-0.01em",
      weight: 700,
    },
    displayMd: {
      font: '"Caveat", cursive',
      size: "clamp(2.2rem, 4.5vw, 3.6rem)",
      lh: 1.05,
      weight: 600,
    },
    numeralJumbo: {
      font: '"Caveat", "Kalam", cursive',
      size: "clamp(5rem, 13vw, 10rem)",
      lh: 0.9,
      weight: 700,
    },
    headline: {
      font: '"Caveat", cursive',
      size: "clamp(2rem, 3.8vw, 2.8rem)",
      lh: 1.15,
      weight: 600,
    },
    microLabel: {
      font: '"Kalam", "Caveat", cursive',
      size: "12px",
      lh: 1.4,
      ls: "0.1em",
      weight: 600,
      transform: "uppercase",
    },
    body: {
      font: '"Kalam", "Source Sans 3", sans-serif',
      size: "16px",
      lh: 1.7,
      weight: 400,
    },
    quote: {
      font: '"Caveat", cursive',
      size: "clamp(1.8rem, 3vw, 2.4rem)",
      lh: 1.3,
      weight: 600,
      italic: true,
    },
    mono: {
      font: '"JetBrains Mono", "Menlo", monospace',
      size: "13px",
      lh: 1.6,
      weight: 400,
    },
  },
  unit: { base: 8 },
  decoration: {
    radius: 6,
    shadow: "soft-card",
    pin: true,
    grain: 0.8,
  },
  layoutGrammar: {
    cover: "center-stack",
    content: "single-narrow",
    quote: "hand-writing",
  },
};

// ─────────────────────────────────────────────────────────────
// #7 · Stencil & Tablet · 考古手册
// ─────────────────────────────────────────────────────────────
export const V29_STENCIL: ThemeSpecV29 = {
  id: "v29-stencil",
  label: "Stencil & Tablet",
  vibe: "考古手册 · 六色土系 earth palette · 镂空 stencil 标题 · 触觉档案",
  colors: {
    surface: "#e8dcc4",
    ink: "#3a2818",
    accent: "#a83a1a",
    hero: "#2a1a0e",
  },
  typography: {
    display: {
      font: '"Archivo Black", "Anton", sans-serif',
      size: "clamp(3.5rem, 9vw, 7rem)",
      lh: 0.95,
      ls: "-0.01em",
      weight: 900,
      transform: "uppercase",
    },
    displayMd: {
      font: '"Archivo Black", "Anton", sans-serif',
      size: "clamp(2rem, 4vw, 3.2rem)",
      lh: 1.05,
      weight: 900,
      transform: "uppercase",
    },
    numeralJumbo: {
      font: '"Archivo Black", "Anton", sans-serif',
      size: "clamp(4.5rem, 12vw, 9rem)",
      lh: 0.9,
      weight: 900,
    },
    headline: {
      font: '"Archivo Black", sans-serif',
      size: "clamp(1.8rem, 3.5vw, 2.6rem)",
      lh: 1.15,
      weight: 900,
      transform: "uppercase",
    },
    microLabel: {
      font: '"Archivo", sans-serif',
      size: "11px",
      lh: 1.4,
      ls: "0.24em",
      weight: 700,
      transform: "uppercase",
    },
    body: {
      font: '"Inter", "Source Sans 3", sans-serif',
      size: "15px",
      lh: 1.7,
      weight: 400,
    },
    quote: {
      font: '"Archivo", sans-serif',
      size: "clamp(1.6rem, 3vw, 2.2rem)",
      lh: 1.3,
      weight: 700,
    },
    mono: {
      font: '"JetBrains Mono", monospace',
      size: "13px",
      lh: 1.6,
      weight: 400,
    },
  },
  unit: { base: 8 },
  decoration: {
    radius: 2,
    shadow: "offset-block",
    stencilTitle: true,
    grain: 0.7,
  },
  layoutGrammar: {
    cover: "left-bias-yellow-pop",
    content: "two-col",
    quote: "stamp-box",
  },
};

// ─────────────────────────────────────────────────────────────
// #8 · Monochrome · 手排活字账本
// ─────────────────────────────────────────────────────────────
export const V29_MONOCHROME: ThemeSpecV29 = {
  id: "v29-monochrome",
  label: "Monochrome Ledger",
  vibe: "手排活字账本 · 纯黑 Lora serif on ivory · 零颜色 · ledger 行",
  colors: {
    surface: "#fdfaf2",
    ink: "#0a0a0a",
    accent: "#0a0a0a", // 真零颜色
    hero: "#0a0a0a",
  },
  typography: {
    display: {
      font: '"Lora", "Source Serif 4", "Cormorant Garamond", Georgia, serif',
      size: "clamp(3rem, 7vw, 5.5rem)",
      lh: 1.1,
      ls: "-0.005em",
      weight: 500,
    },
    displayMd: {
      font: '"Lora", Georgia, serif',
      size: "clamp(1.8rem, 3.8vw, 2.8rem)",
      lh: 1.2,
      weight: 500,
    },
    numeralJumbo: {
      font: '"Lora", Georgia, serif',
      size: "clamp(4rem, 11vw, 8.5rem)",
      lh: 0.95,
      weight: 500,
    },
    headline: {
      font: '"Lora", Georgia, serif',
      size: "clamp(1.6rem, 3.2vw, 2.4rem)",
      lh: 1.25,
      weight: 600,
    },
    microLabel: {
      font: '"Lora", Georgia, serif',
      size: "11px",
      lh: 1.4,
      ls: "0.22em",
      weight: 500,
      transform: "uppercase",
    },
    body: {
      font: '"Lora", "Source Serif 4", Georgia, serif',
      size: "17px",
      lh: 1.85,
      weight: 400,
    },
    bodySm: {
      font: '"Lora", Georgia, serif',
      size: "14px",
      lh: 1.7,
      weight: 400,
    },
    quote: {
      font: '"Lora", Georgia, serif',
      size: "clamp(1.6rem, 3vw, 2.2rem)",
      lh: 1.5,
      weight: 400,
      italic: true,
    },
    mono: {
      font: '"JetBrains Mono", "Menlo", monospace',
      size: "13px",
      lh: 1.6,
      weight: 400,
    },
  },
  unit: { base: 8 },
  decoration: {
    radius: 0,
    shadow: "none",
    hairline: true,
    grain: 0.6,
  },
  layoutGrammar: {
    cover: "ledger-rows",
    content: "ledger-rows",
    quote: "ledger-line",
  },
};

// ─────────────────────────────────────────────────────────────
// #9 · Pink Script · 深夜杂志
// ─────────────────────────────────────────────────────────────
export const V29_PINK: ThemeSpecV29 = {
  id: "v29-pink",
  label: "Pink Script",
  vibe: "深夜杂志专题 · 黑底 + 热粉 accent · Instrument Serif 标题",
  colors: {
    surface: "#0a0a0a",
    ink: "#f5e8e8",
    accent: "#ff3b8b",
    hero: "#000000",
  },
  typography: {
    display: {
      font: '"Instrument Serif", "Cormorant Garamond", Georgia, serif',
      size: "clamp(4rem, 11vw, 9rem)",
      lh: 0.9,
      ls: "-0.015em",
      weight: 400,
      italic: true,
    },
    displayMd: {
      font: '"Instrument Serif", Georgia, serif',
      size: "clamp(2.2rem, 4.5vw, 3.6rem)",
      lh: 1.05,
      weight: 400,
      italic: true,
    },
    numeralJumbo: {
      font: '"Instrument Serif", Georgia, serif',
      size: "clamp(5rem, 14vw, 11rem)",
      lh: 0.85,
      ls: "-0.03em",
      weight: 400,
      italic: true,
    },
    headline: {
      font: '"Instrument Serif", Georgia, serif',
      size: "clamp(1.8rem, 3.5vw, 2.6rem)",
      lh: 1.15,
      weight: 400,
      italic: true,
    },
    microLabel: {
      font: '"Inter", sans-serif',
      size: "10px",
      lh: 1.4,
      ls: "0.3em",
      weight: 600,
      transform: "uppercase",
    },
    body: {
      font: '"Inter", "Source Sans 3", sans-serif',
      size: "16px",
      lh: 1.7,
      weight: 400,
    },
    quote: {
      font: '"Instrument Serif", Georgia, serif',
      size: "clamp(1.8rem, 3.2vw, 2.4rem)",
      lh: 1.3,
      weight: 400,
      italic: true,
    },
    mono: {
      font: '"JetBrains Mono", monospace',
      size: "13px",
      lh: 1.6,
      weight: 400,
    },
  },
  unit: { base: 8 },
  decoration: {
    radius: 8,
    shadow: "soft-glow",
    sunGlow: true,
    grain: 0.2,
  },
  layoutGrammar: {
    cover: "center-stack",
    content: "single-narrow",
    quote: "huge-italic",
  },
};

// ─────────────────────────────────────────────────────────────
// #10 · Vellum · 学者夜读本
// ─────────────────────────────────────────────────────────────
export const V29_VELLUM: ThemeSpecV29 = {
  id: "v29-vellum",
  label: "Vellum",
  vibe: "学者夜读本 · navy 底 + 暖黄 Cormorant serif · dusty teal 单 accent · 安静智识",
  colors: {
    surface: "#0a1a3d",
    ink: "#f5e6c4",
    accent: "#5fa8a8",
    hero: "#050d1f",
  },
  typography: {
    display: {
      font: '"Cormorant Garamond", "Source Serif 4", Georgia, serif',
      size: "clamp(3.5rem, 9vw, 7rem)",
      lh: 1.0,
      ls: "-0.01em",
      weight: 500,
    },
    displayMd: {
      font: '"Cormorant Garamond", Georgia, serif',
      size: "clamp(2rem, 4vw, 3.2rem)",
      lh: 1.1,
      weight: 500,
    },
    numeralJumbo: {
      font: '"Cormorant Garamond", Georgia, serif',
      size: "clamp(4.5rem, 12vw, 9rem)",
      lh: 0.92,
      weight: 600,
    },
    headline: {
      font: '"Cormorant Garamond", Georgia, serif',
      size: "clamp(1.8rem, 3.5vw, 2.6rem)",
      lh: 1.2,
      weight: 600,
    },
    microLabel: {
      font: '"Inter", sans-serif',
      size: "10px",
      lh: 1.4,
      ls: "0.26em",
      weight: 500,
      transform: "uppercase",
    },
    bodyLede: {
      font: '"Cormorant Garamond", "Source Serif 4", Georgia, serif',
      size: "20px",
      lh: 1.7,
      weight: 400,
      italic: true,
    },
    body: {
      font: '"Source Serif 4", "Cormorant Garamond", Georgia, serif',
      size: "16px",
      lh: 1.8,
      weight: 400,
    },
    quote: {
      font: '"Cormorant Garamond", Georgia, serif',
      size: "clamp(1.6rem, 3vw, 2.2rem)",
      lh: 1.4,
      weight: 400,
      italic: true,
    },
    mono: {
      font: '"JetBrains Mono", monospace',
      size: "13px",
      lh: 1.6,
      weight: 400,
    },
  },
  unit: { base: 8 },
  decoration: {
    radius: 0,
    shadow: "none",
    hairline: true,
    grain: 0.55,
  },
  layoutGrammar: {
    cover: "masthead-double-rule",
    content: "single-narrow",
    quote: "huge-italic",
  },
};

// ─────────────────────────────────────────────────────────────
// All V29 themes
// ─────────────────────────────────────────────────────────────
export const ALL_V29_THEMES: ThemeSpecV29[] = [
  V29_BIENNALE,
  V29_SAKURA,
  V29_8BIT,
  V29_COBALT,
  V29_EMERALD,
  V29_PINPAPER,
  V29_STENCIL,
  V29_MONOCHROME,
  V29_PINK,
  V29_VELLUM,
];

export function getV29ThemeSpec(id: string): ThemeSpecV29 | undefined {
  return ALL_V29_THEMES.find((t) => t.id === id);
}
