/**
 * V32 · 从一个品牌色推导整套设计 token。
 *
 * 给 Step3「Create design system」用:用户只给一个 accent(+ 明/暗基调),
 * 这里长出 15 个语义色 —— 用户不该被逼着手调 15 个色值。
 *
 * ⚠ WCAG 是硬约束,不是"尽量":
 * CLAUDE.md / WEB-RULES 写着「任何文本对比度 ≥ 4.5:1」。所以正文色不是
 * 拍脑袋定的,而是**算出对比度后挑到达标为止**;accent 若自身对比不够,
 * 会派生一个更深的 accentStrong 专门用于文字/描边。
 *
 * 颜色数学都在 OKLCH 上做(感知均匀),不用 HSL —— HSL 的 L 和人眼亮度
 * 脱节,同一个 L 值不同色相的实际明度差很远,做对比度控制会失准。
 */
import type { ColorTokens, DesignTokens } from "./design-tokens";

// ── sRGB ↔ 线性 ↔ OKLab ↔ OKLCH ────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** sRGB 分量 → 线性光(gamma 解码) */
const srgbToLin = (u: number): number => {
  const c = u / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const linToSrgb = (c: number): number => {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return v * 255;
};

function rgbToOklch(r: number, g: number, b: number): [number, number, number] {
  const [lr, lg, lb] = [srgbToLin(r), srgbToLin(g), srgbToLin(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B);
  let H = (Math.atan2(B, A) * 180) / Math.PI;
  if (H < 0) H += 360;
  return [L, C, H];
}

function oklchToHex(L: number, C: number, H: number): string {
  const h = (H * Math.PI) / 180;
  const A = C * Math.cos(h);
  const B = C * Math.sin(h);
  const l_ = L + 0.3963377774 * A + 0.2158037573 * B;
  const m_ = L - 0.1055613458 * A - 0.0638541728 * B;
  const s_ = L - 0.0894841775 * A - 1.291485548 * B;
  const [l, m, s] = [l_ ** 3, m_ ** 3, s_ ** 3];
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return rgbToHex(linToSrgb(r), linToSrgb(g), linToSrgb(b));
}

// ── WCAG 对比度 ────────────────────────────────────────────

/** 相对亮度(WCAG 2.x 定义) */
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);
}

/** 两色对比度(1 ~ 21) */
export function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)];
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * 沿 OKLCH 的 L 轴推 hue,直到与 bg 的对比度达标。
 * dir=-1 往暗推(浅底用),+1 往亮推(深底用)。
 * 推到端点仍不达标就返回纯黑/纯白 —— 宁可牺牲色相也不牺牲可读性。
 */
function pushUntilContrast(
  seedHex: string,
  bg: string,
  target: number,
  dir: -1 | 1,
  /**
   * chroma 上限。不传 = 保留 seed 的全部彩度(accent 类要的)。
   *
   * ⚠ 文字/描边**必须**限彩度。不限的话正文会变成"高饱和品牌色"
   * (实测 accent=#0070f3 推出 text=#0042c2 —— 一篇纯蓝的文档),
   * 虽然对比度达标但违反 WEB-RULES §14「accent 是标识符不是装饰」。
   * 正文该是近中性、只带一丝品牌色相的灰。
   */
  maxChroma?: number,
): string {
  const [, C0, H] = rgbToOklch(...hexToRgb(seedHex));
  const C = maxChroma != null ? Math.min(C0, maxChroma) : C0;
  for (let i = 0; i <= 20; i++) {
    const L = dir < 0 ? 0.95 - i * 0.047 : 0.05 + i * 0.047;
    const cand = oklchToHex(Math.max(0, Math.min(1, L)), C, H);
    if (contrast(cand, bg) >= target) return cand;
  }
  return dir < 0 ? "#000000" : "#ffffff";
}

/**
 * 文字/描边的 chroma 上限。
 * 0.02 在 OKLCH 上大约是"看得出偏冷/偏暖,但读起来是灰"的程度;
 * 描边可以稍微多一点彩度(它是装饰性的,不承载阅读)。
 */
const TEXT_CHROMA = 0.02;
const BORDER_CHROMA = 0.05;

/** 保色相调 L(用于 surface 阶梯这种不需要对比度保证的) */
function shiftL(hex: string, dl: number, chromaScale = 1): string {
  const [L, C, H] = rgbToOklch(...hexToRgb(hex));
  return oklchToHex(Math.max(0, Math.min(1, L + dl)), C * chromaScale, H);
}

export type DeriveInput = {
  /** 品牌主色 · #RGB 或 #RRGGBB */
  accent: string;
  scheme?: "light" | "dark";
  radius?: string;
  gap?: string;
  font?: { body?: string; display?: string; mono?: string };
};

/**
 * 从品牌色推导整套 tokens。
 *
 * 语义色(success/warn/danger)不跟品牌色走 —— 它们是**约定俗成的信号**
 * (绿=成功、黄=注意、红=危险),染成品牌色会让"危险"失去警示作用。
 * 只做一件事:把它们的明度调到与当前底色对比达标。
 */
export function deriveTokens(input: DeriveInput): DesignTokens {
  const scheme = input.scheme ?? "light";
  const dark = scheme === "dark";
  const accentSeed = input.accent.startsWith("#") ? input.accent : `#${input.accent}`;
  const [, accC, accH] = rgbToOklch(...hexToRgb(accentSeed));

  // 底色:带一丝品牌色相的中性(纯灰会显得和品牌无关)
  const bg = dark ? oklchToHex(0.16, Math.min(accC, 0.02), accH) : oklchToHex(0.99, Math.min(accC, 0.012), accH);
  const surface = dark ? shiftL(bg, 0.05) : shiftL(bg, -0.025);
  const surface2 = dark ? shiftL(bg, 0.1) : shiftL(bg, -0.055);

  // 文字:必须达标。正文 7:1(AAA 正文),次要 4.5:1,最弱 3:1(仅装饰性)
  const dir: -1 | 1 = dark ? 1 : -1;
  // 正文用 12:1 而不是刚过 7:1。pushUntilContrast 是"从浅往深走,一达标就停",
  // 所以给 7 会停在**刚好及格**的中灰(#4a515c 这种),读起来发虚。
  // 真实站点的正文都接近纯黑(Vercel #171717 / Linear #f7f8f8)——
  // 正文该是"明确的黑/白",不是"勉强达标的灰"。
  const text = pushUntilContrast(accentSeed, bg, 12, dir, TEXT_CHROMA);
  const textMute = pushUntilContrast(accentSeed, bg, 4.5, dir, TEXT_CHROMA);
  const textFaint = pushUntilContrast(accentSeed, bg, 3, dir, TEXT_CHROMA);

  // 线条:不承载文字,只要看得见(1.4 / 2.2 足够)
  const border = pushUntilContrast(accentSeed, bg, 1.4, dir, BORDER_CHROMA);
  const borderStrong = pushUntilContrast(accentSeed, bg, 2.2, dir, BORDER_CHROMA);

  // accent 自身可能对比不够(亮黄、浅粉)→ accentStrong 专门给文字/描边用
  const accent = accentSeed;
  const accentStrong =
    contrast(accentSeed, bg) >= 4.5 ? shiftL(accentSeed, dark ? 0.08 : -0.08) : pushUntilContrast(accentSeed, bg, 4.5, dir);
  const accentBg = `color-mix(in oklab, ${accentSeed} ${dark ? 18 : 10}%, ${bg})`;

  // 语义色:固定色相(绿 145 / 黄 85 / 红 27),只调明度到达标
  const semantic = (hue: number, target: number) => {
    const seed = oklchToHex(dark ? 0.72 : 0.55, 0.13, hue);
    return contrast(seed, bg) >= target ? seed : pushUntilContrast(seed, bg, target, dir);
  };
  const danger = semantic(27, 4.5);

  const color: ColorTokens = {
    bg,
    surface,
    surface2,
    text,
    textMute,
    textFaint,
    border,
    borderStrong,
    accent,
    accentStrong,
    accentBg,
    success: semantic(145, 4.5),
    warn: semantic(85, 4.5),
    danger,
    dangerBg: `color-mix(in oklab, ${danger} ${dark ? 18 : 10}%, ${bg})`,
  };

  return {
    color,
    radius: input.radius ?? "8px",
    gap: input.gap ?? "24px",
    font: input.font ?? {},
    scheme,
  };
}

/** 自检:推导结果里所有"文本类"token 是否都对 bg 达标 */
export function auditContrast(t: DesignTokens): Array<{ key: string; ratio: number; ok: boolean }> {
  const bg = t.color.bg;
  const checks: Array<[string, string, number]> = [
    ["text", t.color.text, 7],
    ["textMute", t.color.textMute, 4.5],
    ["textFaint", t.color.textFaint, 3],
    ["accentStrong", t.color.accentStrong, 4.5],
    ["success", t.color.success, 4.5],
    ["warn", t.color.warn, 4.5],
    ["danger", t.color.danger, 4.5],
  ];
  return checks.map(([key, val, min]) => {
    const ratio = contrast(val, bg);
    return { key, ratio: Math.round(ratio * 100) / 100, ok: ratio >= min };
  });
}
