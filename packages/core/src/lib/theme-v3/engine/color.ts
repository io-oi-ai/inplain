/**
 * 极简颜色引擎 · 不依赖 culori(避免新依赖污染 lock)
 *
 * 实现:
 *   - hex / rgb 互转
 *   - sRGB ↔ OKLab(感知均匀色彩空间)
 *   - WCAG 2.1 对比度计算
 *
 * 参考:culori (MIT) + Björn Ottosson 原始论文。代码自己写,clean room。
 */

export type Rgb = { r: number; g: number; b: number };
export type Oklch = { L: number; C: number; h: number };

// ─────────────────────────────────────────────
// hex ↔ rgb
// ─────────────────────────────────────────────

export function hexToRgb(hex: string): Rgb {
  const m = hex.replace(/^#/, "");
  const v =
    m.length === 3
      ? m.split("").map((c) => c + c).join("")
      : m.length === 6
        ? m
        : "000000";
  const n = parseInt(v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const c = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

// ─────────────────────────────────────────────
// sRGB ↔ linear
// ─────────────────────────────────────────────

function srgbToLinear(c: number): number {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}
function linearToSrgb(x: number): number {
  return (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055) * 255;
}

// ─────────────────────────────────────────────
// sRGB ↔ OKLab ↔ OKLch (Björn Ottosson 2020)
// ─────────────────────────────────────────────

function rgbToOklab({ r, g, b }: Rgb): { L: number; a: number; b: number } {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  // sRGB → LMS
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const lc = Math.cbrt(l);
  const mc = Math.cbrt(m);
  const sc = Math.cbrt(s);
  return {
    L: 0.2104542553 * lc + 0.793617785 * mc - 0.0040720468 * sc,
    a: 1.9779984951 * lc - 2.428592205 * mc + 0.4505937099 * sc,
    b: 0.0259040371 * lc + 0.7827717662 * mc - 0.808675766 * sc,
  };
}

function oklabToRgb({ L, a, b }: { L: number; a: number; b: number }): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return {
    r: linearToSrgb(Math.max(0, Math.min(1, lr))),
    g: linearToSrgb(Math.max(0, Math.min(1, lg))),
    b: linearToSrgb(Math.max(0, Math.min(1, lb))),
  };
}

export function rgbToOklch(rgb: Rgb): Oklch {
  const { L, a, b } = rgbToOklab(rgb);
  const C = Math.sqrt(a * a + b * b);
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return { L, C, h: (h + 360) % 360 };
}

export function oklchToRgb({ L, C, h }: Oklch): Rgb {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  return oklabToRgb({ L, a, b });
}

export function hexToOklch(hex: string): Oklch {
  return rgbToOklch(hexToRgb(hex));
}
export function oklchToHex(c: Oklch): string {
  return rgbToHex(oklchToRgb(c));
}

// ─────────────────────────────────────────────
// WCAG 2.1 对比度 · 4.5 = AA · 7 = AAA
// ─────────────────────────────────────────────

export function relativeLuminance({ r, g, b }: Rgb): number {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** WCAG contrast ratio. 1 = same · 21 = max(black on white) */
export function contrast(a: Rgb | string, b: Rgb | string): number {
  const ra = typeof a === "string" ? hexToRgb(a) : a;
  const rb = typeof b === "string" ? hexToRgb(b) : b;
  const la = relativeLuminance(ra) + 0.05;
  const lb = relativeLuminance(rb) + 0.05;
  return la > lb ? la / lb : lb / la;
}

// ─────────────────────────────────────────────
// 颜色变换:lighten / darken / mix
// ─────────────────────────────────────────────

/** 在 OKLCH L 维度上加减(perceptual lightness) */
export function shiftL(hex: string, deltaL: number): string {
  const c = hexToOklch(hex);
  c.L = Math.max(0, Math.min(1, c.L + deltaL));
  return oklchToHex(c);
}

/** 调整饱和度(C) */
export function shiftC(hex: string, deltaC: number): string {
  const c = hexToOklch(hex);
  c.C = Math.max(0, c.C + deltaC);
  return oklchToHex(c);
}

/** 在 OKLab 空间线性插值,perceptually-uniform mix */
export function mix(a: string, b: string, t: number): string {
  const oa = rgbToOklab(hexToRgb(a));
  const ob = rgbToOklab(hexToRgb(b));
  return rgbToHex(
    oklabToRgb({
      L: oa.L + (ob.L - oa.L) * t,
      a: oa.a + (ob.a - oa.a) * t,
      b: oa.b + (ob.b - oa.b) * t,
    }),
  );
}
