/**
 * Tailwind-style 11 阶色阶生成 · 从一个种子色派生 50..950
 *
 * 心智:
 *   - 输入 seed(任意 hex,通常落 500-600 档)
 *   - 输出 { 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950 }
 *   - 使用 OKLCH lightness 曲线,保持 hue 不变
 *   - L 曲线参考 Tailwind v3 neutral 系(50 ~ 0.98 · 950 ~ 0.14)
 *   - chroma 在 500-700 段最强,两端衰减(感知最自然)
 *
 * 不依赖 dittotones(MIT 但避免新依赖)· 用固定 L/C 曲线 · 实测够用
 */
import { hexToOklch, oklchToHex, type Oklch } from "./color";

export type RampShade =
  | "50" | "100" | "200" | "300" | "400"
  | "500" | "600" | "700" | "800" | "900" | "950";

export type Ramp = Record<RampShade, string>;

// L 曲线:从 50 (最亮) 到 950 (最暗) · 参考 Tailwind v3 sky 系
const L_CURVE: Record<RampShade, number> = {
  "50":  0.985,
  "100": 0.963,
  "200": 0.918,
  "300": 0.846,
  "400": 0.743,
  "500": 0.629,
  "600": 0.534,
  "700": 0.443,
  "800": 0.358,
  "900": 0.272,
  "950": 0.180,
};

// C 衰减系数:500 = 100%, 50/950 = 30%(端点饱和度低)
const C_FALLOFF: Record<RampShade, number> = {
  "50":  0.18,
  "100": 0.32,
  "200": 0.55,
  "300": 0.78,
  "400": 0.92,
  "500": 1.00,
  "600": 0.95,
  "700": 0.85,
  "800": 0.68,
  "900": 0.48,
  "950": 0.30,
};

/**
 * 从 seed 色生成 11 阶。
 * - seed 的 OKLCH hue 保留(色相不变)
 * - L 按 L_CURVE 固定
 * - C 用 seed 的 chroma × C_FALLOFF(端点低饱和)
 *
 * 中性 ramp(seed 几乎无 chroma)→ 输出纯灰阶
 * 高饱和 ramp(seed 高 chroma)→ 输出有色阶
 */
export function ramp(seedHex: string): Ramp {
  const seed = hexToOklch(seedHex);
  const baseC = seed.C;
  const out: Partial<Ramp> = {};
  for (const shade of Object.keys(L_CURVE) as RampShade[]) {
    const oklch: Oklch = {
      L: L_CURVE[shade],
      C: baseC * C_FALLOFF[shade],
      h: seed.h,
    };
    out[shade] = oklchToHex(oklch);
  }
  return out as Ramp;
}
