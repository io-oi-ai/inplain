/**
 * Selector 函数 · design-book 风(自己重写 · 无依赖)
 *
 * 这些 selector 操作"色池"(数组),返回单个 hex。
 * 比 design-book 简化:不做依赖图,eager 计算一次。
 *
 * 提供:
 *   - bestContrastWith(target, pool)        最高对比度
 *   - minContrastWith(target, pool, ratio)  满足最低对比度的第一个
 *   - mostVivid(pool, opts)                 chroma 最大 + 可选 contrast 闸
 *   - closestColor(target, pool)            感知最接近
 */
import { contrast, hexToOklch } from "./color";

/** 在 pool 里找跟 target 对比度最高的 */
export function bestContrastWith(target: string, pool: string[]): string {
  let best = pool[0];
  let bestRatio = 0;
  for (const c of pool) {
    const r = contrast(target, c);
    if (r > bestRatio) {
      bestRatio = r;
      best = c;
    }
  }
  return best;
}

/** 在 pool 里找第一个对比度 ≥ ratio 的(优先选感知最接近 target 的) */
export function minContrastWith(
  target: string,
  pool: string[],
  minRatio = 4.5,
): string {
  const candidates = pool.filter((c) => contrast(target, c) >= minRatio);
  if (candidates.length === 0) return bestContrastWith(target, pool);
  // 选最接近的(感知距离最小)
  return closestColor(target, candidates);
}

/**
 * mostVivid:从 pool 选 OKLCH chroma 最大的色
 * opts.against + opts.minContrast 时,过滤掉对比度不够的
 * opts.not 排除特定颜色(避免选到自己)
 */
export function mostVivid(
  pool: string[],
  opts: { against?: string; minContrast?: number; not?: string[] } = {},
): string {
  const exclude = new Set(opts.not ?? []);
  let candidates = pool.filter((c) => !exclude.has(c));
  if (opts.against && opts.minContrast) {
    const filtered = candidates.filter(
      (c) => contrast(c, opts.against!) >= opts.minContrast!,
    );
    if (filtered.length > 0) candidates = filtered;
  }
  let best = candidates[0];
  let bestC = -1;
  for (const c of candidates) {
    const oklch = hexToOklch(c);
    if (oklch.C > bestC) {
      bestC = oklch.C;
      best = c;
    }
  }
  return best;
}

/** OKLab 感知距离最近的 */
export function closestColor(target: string, pool: string[]): string {
  const t = hexToOklch(target);
  let best = pool[0];
  let bestDist = Infinity;
  for (const c of pool) {
    const o = hexToOklch(c);
    // 简化感知距离 · OKLCH 内 sqrt((dL*2)^2 + dC^2 + (dh/180)^2)
    const dL = (t.L - o.L) * 2;
    const dC = t.C - o.C;
    const dh = Math.min(Math.abs(t.h - o.h), 360 - Math.abs(t.h - o.h)) / 180;
    const dist = Math.sqrt(dL * dL + dC * dC + dh * dh);
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return best;
}
