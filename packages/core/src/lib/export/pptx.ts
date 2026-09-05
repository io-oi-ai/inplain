import PptxGenJS from "pptxgenjs";
import type { DeckDoc, Slide } from "@/lib/agents/types";

/**
 * 主题 → PPTX 配色表(6 个主题和 Marp 的保持一致)。
 * 每份主题给 4 个 hex 串:bg / titleColor / textColor / accent。
 */
type ThemePalette = {
  bg: string;
  coverBg: string;
  coverText: string;
  title: string;
  text: string;
  accent: string;
};
const THEME_PALETTES: Record<string, ThemePalette> = {
  "plain-mono": { bg: "FBFBFA", coverBg: "1A1A1A", coverText: "FAFAFA", title: "1A1A1A", text: "3A3A3A", accent: "2563EB" },
  "plain-editorial": { bg: "F9F5EF", coverBg: "F9F5EF", coverText: "1A1612", title: "1A1612", text: "3A3329", accent: "C8661F" },
  "plain-bold": { bg: "FFFFFF", coverBg: "2563EB", coverText: "FFFFFF", title: "111111", text: "333333", accent: "2563EB" },
  "plain-serene": { bg: "F0F7F4", coverBg: "F0F7F4", coverText: "1E3A3A", title: "1E3A3A", text: "3F5E5E", accent: "5A8A7A" },
  "plain-dusk": { bg: "1A1026", coverBg: "1A1026", coverText: "EDE9FE", title: "EDE9FE", text: "C4B5FD", accent: "A78BFA" },
  "plain-kami": { bg: "F5F4ED", coverBg: "F5F4ED", coverText: "141413", title: "141413", text: "3D3D3A", accent: "1B365D" },
};
function getPalette(theme: string | undefined): ThemePalette {
  return THEME_PALETTES[theme ?? "plain-mono"] ?? THEME_PALETTES["plain-mono"];
}

// 优先中英文混排安全的字体(PPT 在 Mac 和 Windows 都能渲染)
const FONT_BODY = "PingFang SC";
const FONT_SERIF = "Songti SC";

/**
 * DeckDoc → PPTX buffer。
 * - 根据 deck theme 选配色
 * - 中文字体显式指定(避免 Windows 落到 SimSun,Mac 落到 Apple SD Gothic)
 * - 布局:cover / content / two-col / quote
 * Speaker notes 放到 slide.addNotes()。
 */
export async function deckDocToPptx(doc: DeckDoc): Promise<Uint8Array> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 inches, 常用宽屏 16:9
  pptx.title = doc.slides[0]?.title ?? "Plain Deck";

  const palette = getPalette(doc.theme);

  for (const s of doc.slides) {
    const slide = pptx.addSlide();
    slide.background = { color: s.layout === "cover" ? palette.coverBg : palette.bg };
    switch (s.layout) {
      case "cover":
        renderCover(slide, s, palette);
        break;
      case "two-col":
        renderTwoCol(slide, s, palette);
        break;
      case "quote":
        renderQuote(slide, s, palette);
        break;
      case "content":
      default:
        renderContent(slide, s, palette);
        break;
    }
    if (s.notes) slide.addNotes(s.notes);
  }

  // outputType "arraybuffer" 在 Node 和 Cloudflare Workers 都可用，无需 Buffer polyfill
  const buf = await pptx.write({ outputType: "arraybuffer" });
  if (buf instanceof Uint8Array) return buf;
  if (buf instanceof ArrayBuffer) return new Uint8Array(buf);
  // 理论不会走到；保底把 string 当 latin1 编码
  if (typeof buf === "string") {
    const out = new Uint8Array(buf.length);
    for (let i = 0; i < buf.length; i++) out[i] = buf.charCodeAt(i) & 0xff;
    return out;
  }
  throw new Error("pptxgenjs returned unexpected type");
}

/**
 * 去掉 @icon:name / mermaid 代码块等 PPT 不能渲染的 markdown 元素。
 * - @icon:xxx 替换为对应 emoji(PPT 原生支持 emoji)或留白
 * - mermaid 代码块告知用户去 HTML 预览看图
 * - 保留 → / 「」 等已 normalize 过的字符
 */
const ICON_FALLBACK_EMOJI: Record<string, string> = {
  check: "✓",
  "check-circle": "✓",
  x: "✗",
  "x-circle": "✗",
  "alert-triangle": "⚠",
  info: "ℹ",
  "arrow-right": "→",
  "arrow-left": "←",
  "arrow-up": "↑",
  "arrow-down": "↓",
  "trending-up": "↗",
  "trending-down": "↘",
  users: "👥",
  user: "👤",
  target: "🎯",
  flag: "🚩",
  zap: "⚡",
  rocket: "🚀",
  star: "★",
  heart: "❤",
  lightbulb: "💡",
  calendar: "📅",
  clock: "🕐",
  tag: "🏷",
};

function cleanForPptx(s: string): string {
  return s
    .replace(/@icon:([a-z0-9-]+)/gi, (_m, rawName) => {
      const name = String(rawName).toLowerCase();
      return ICON_FALLBACK_EMOJI[name] ?? ""; // 未映射就去掉
    })
    .replace(/^```mermaid[\s\S]*?```/gm, "[流程图 · 见 HTML 预览]")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** 过滤掉 bullet 数组里清洗后为空的项,避免 PPT 出现空项。 */
function cleanBullets(bullets: string[]): string[] {
  return bullets.map(cleanForPptx).filter((s) => s.length > 0);
}

function renderCover(slide: PptxGenJS.Slide, s: Slide, p: ThemePalette) {
  slide.addText(cleanForPptx(s.title), {
    x: 0.5,
    y: 2.5,
    w: "90%",
    h: 1.5,
    fontSize: 48,
    bold: true,
    color: p.coverText,
    align: "center",
    fontFace: FONT_SERIF,
  });
  const subBullets = cleanBullets(s.bullets);
  if (subBullets.length > 0) {
    slide.addText(subBullets.join("  ·  "), {
      x: 0.5,
      y: 4.2,
      w: "90%",
      h: 1,
      fontSize: 22,
      color: p.coverText,
      align: "center",
      fontFace: FONT_BODY,
    });
  }
}

function renderContent(slide: PptxGenJS.Slide, s: Slide, p: ThemePalette) {
  slide.addText(cleanForPptx(s.title), {
    x: 0.5,
    y: 0.4,
    w: "90%",
    h: 0.8,
    fontSize: 32,
    bold: true,
    color: p.title,
    fontFace: FONT_SERIF,
  });
  const contentBullets = cleanBullets(s.bullets);
  if (contentBullets.length > 0) {
    slide.addText(
      contentBullets.map((text) => ({ text, options: { bullet: true } })),
      {
        x: 0.5,
        y: 1.5,
        w: "90%",
        h: 5.5,
        fontSize: 20,
        color: p.text,
        paraSpaceAfter: 12,
        fontFace: FONT_BODY,
      },
    );
  }
}

function renderTwoCol(slide: PptxGenJS.Slide, s: Slide, p: ThemePalette) {
  slide.addText(cleanForPptx(s.title), {
    x: 0.5,
    y: 0.4,
    w: "90%",
    h: 0.8,
    fontSize: 30,
    bold: true,
    color: p.title,
    fontFace: FONT_SERIF,
  });
  const bullets = cleanBullets(s.bullets);
  const half = Math.ceil(bullets.length / 2);
  const left = bullets.slice(0, half);
  const right = bullets.slice(half);
  if (left.length > 0) {
    slide.addText(
      left.map((text) => ({ text, options: { bullet: true } })),
      { x: 0.5, y: 1.5, w: 6, h: 5.5, fontSize: 18, color: p.text, fontFace: FONT_BODY },
    );
  }
  if (right.length > 0) {
    slide.addText(
      right.map((text) => ({ text, options: { bullet: true } })),
      { x: 6.8, y: 1.5, w: 6, h: 5.5, fontSize: 18, color: p.text, fontFace: FONT_BODY },
    );
  }
}

function renderQuote(slide: PptxGenJS.Slide, s: Slide, p: ThemePalette) {
  slide.addText(`「${cleanForPptx(s.title)}」`, {
    x: 1,
    y: 2,
    w: "80%",
    h: 3,
    fontSize: 32,
    italic: true,
    color: p.title,
    align: "center",
    fontFace: FONT_SERIF,
  });
  const attribution = s.bullets.length > 0 ? cleanForPptx(s.bullets[0]) : "";
  if (attribution) {
    slide.addText(`— ${attribution}`, {
      x: 1,
      y: 5.2,
      w: "80%",
      h: 0.7,
      fontSize: 18,
      color: p.text,
      align: "center",
      fontFace: FONT_BODY,
    });
  }
}
