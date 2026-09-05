/**
 * Theme spec → flat CSS variables map
 *
 * 接收 ThemeSpec(语义层 + 种子色),按规则派生所有 token。
 * 输出 { vars: Record<cssVar, hex>, css: string }
 *
 * 用法:
 *   const { css } = compileTheme(MONOCLE_SPEC)
 *   <style>{css}</style>
 */
import { ramp, type Ramp, type RampShade } from "./ramp";
import { bestContrastWith, mostVivid, closestColor } from "./selectors";
import { mix, hexToRgb, relativeLuminance } from "./color";

export type ThemeSpec = {
  id: string;
  label?: string;
  /** 种子色(用户/AI 唯一指定的输入) */
  seeds: {
    surface: string;
    ink: string;
    accent: string;
    /** 可选 hero 暗底 · 用于 cover / hero-question 等暗页 */
    hero?: string;
  };
  /** 字号/间距/圆角 · 简单常量,不派生(留给以后) */
  type?: {
    fontText?: string;
    fontDisplay?: string;
    fontMono?: string;
    fontUi?: string;
  };
  space?: { unit?: number }; // 单位 px,默认 8
  radius?: { card?: string; pill?: string };
  /** 状态色硬编码(positive / warning / negative)· 语义不能派生 */
  status?: {
    positive?: string;
    warn?: string;
    negative?: string;
  };
};

export type CompiledTheme = {
  id: string;
  label?: string;
  vars: Record<string, string>;
  css: string;
  /** 详细派生过程(用于调试) */
  derived: {
    palette: { s: Ramp; n: Ramp; a: Ramp };
    semantic: Record<string, string>;
  };
};

export function compileTheme(spec: ThemeSpec): CompiledTheme {
  // 1. 从种子生成 3 套 11 阶 ramp(surface / ink / accent)
  const s: Ramp = ramp(spec.seeds.surface);
  const n: Ramp = ramp(spec.seeds.ink);
  const a: Ramp = ramp(spec.seeds.accent);

  // 池:所有 33 色 + ink/accent seed 自己
  const inkPool: string[] = (Object.values(n) as string[]);
  const accentPool: string[] = (Object.values(a) as string[]);

  // V25 · dark mode 检测
  // 旧实现:paper 永远取 s["50"] (浅色端),不论 seed 是黑是白
  // 导致 dune-dark (seed.surface=#0e0e10) 编出来变浅底 → bug
  // 现在:看 seed.surface 的 relative luminance,< 0.18 视为 dark theme,
  // paper/surface/raised 全部走 ramp 暗端,ink 自动从 ramp 亮端选
  const surfaceL = relativeLuminance(hexToRgb(spec.seeds.surface));
  const isDark = surfaceL < 0.18;

  // 2. 语义 token(派生规则)· 按 isDark 二分路径
  const surfaceBase = isDark ? s["950"] : s["100"];
  const semantic: Record<string, string> = {
    // 表面 · dark 走暗端 / light 走亮端
    paper: isDark ? s["950"] : s["50"],
    surface: isDark ? s["900"] : s["100"],
    raised: isDark ? s["800"] : "#ffffff",
    // 文字 · 用 bestContrast 自动达 WCAG · 根据 surfaceBase 选最佳对比
    ink: bestContrastWith(surfaceBase, inkPool),
    "ink-soft": isDark ? n["300"] : n["700"],
    "ink-mute": isDark ? n["500"] : n["500"],
    "ink-subtle": isDark ? n["700"] : n["400"],
    // 强调色 · mostVivid + 至少 4.5 对比 against surfaceBase
    accent: mostVivid(accentPool, {
      against: surfaceBase,
      minContrast: 4.5,
      not: [a["50"], a["100"], a["900"], a["950"]],
    }),
    // accent 上的文字 · 自动反白/黑
    "on-accent": "", // 下面单独算(依赖 accent 已 set)
    // 边线 · 用感知最接近 surface 的 ink 阶
    rule: isDark ? n["800"] : closestColor(surfaceBase, inkPool),
    "rule-strong": isDark ? n["700"] : closestColor(surfaceBase, inkPool.slice(0, 6)),
    // hover · accent 加 10% 黑 (dark mode 加 10% 白)
    hover: "",
    // hero 暗背景 · dark theme 直接复用 paper
    "hero-bg": spec.seeds.hero ?? (isDark ? s["950"] : n["950"]),
    "hero-fg": "", // 下面算
    // 状态色(语义不可派生,接 spec.status)
    positive: spec.status?.positive ?? "#2e7d52",
    warn: spec.status?.warn ?? "#c08a2a",
    negative: spec.status?.negative ?? "#c44545",
  };
  // accent / hero 上的文字 = bestContrast 自动反
  semantic["on-accent"] = bestContrastWith(semantic.accent, [
    ...inkPool,
    ...(Object.values(s) as string[]),
  ]);
  semantic.hover = mix(semantic.accent, isDark ? "#ffffff" : "#000000", 0.12);
  semantic["hero-fg"] = bestContrastWith(semantic["hero-bg"], [
    ...inkPool,
    ...(Object.values(s) as string[]),
  ]);

  // 3. typography / space / radius defaults
  const type = {
    fontText: spec.type?.fontText ?? '"Source Serif 4", "Noto Serif SC", serif',
    fontDisplay: spec.type?.fontDisplay ?? '"Source Serif 4", "Noto Serif SC", serif',
    fontMono: spec.type?.fontMono ?? '"JetBrains Mono", "Menlo", monospace',
    fontUi: spec.type?.fontUi ?? '"Inter", "PingFang SC", -apple-system, sans-serif',
  };
  const space = spec.space?.unit ?? 8;
  const radius = {
    card: spec.radius?.card ?? "8px",
    pill: spec.radius?.pill ?? "9999px",
  };

  // 4. 拼 CSS vars
  const vars: Record<string, string> = {
    // semantic
    "--plain-paper": semantic.paper,
    "--plain-surface": semantic.surface,
    "--plain-raised": semantic.raised,
    "--plain-ink": semantic.ink,
    "--plain-ink-soft": semantic["ink-soft"],
    "--plain-ink-mute": semantic["ink-mute"],
    "--plain-ink-subtle": semantic["ink-subtle"],
    "--plain-accent": semantic.accent,
    "--plain-on-accent": semantic["on-accent"],
    "--plain-hover": semantic.hover,
    "--plain-rule": semantic.rule,
    "--plain-rule-strong": semantic["rule-strong"],
    "--plain-hero-bg": semantic["hero-bg"],
    "--plain-hero-fg": semantic["hero-fg"],
    "--plain-positive": semantic.positive,
    "--plain-warn": semantic.warn,
    "--plain-negative": semantic.negative,
    // fonts
    "--plain-font-text": type.fontText,
    "--plain-font-display": type.fontDisplay,
    "--plain-font-mono": type.fontMono,
    "--plain-font-ui": type.fontUi,
    // V27-U · space token 系统升级 · 从 7 阶扩到 12 阶 · 让 deck/doc 渲染产物更呼吸
    // space=8 → space-7=48 / space-12=96 · 旧 layout 大量用 var(--plain-space-8, 64px)
    // 缺这些 token 时永远 fallback 到字面值 · 切主题 = 不可控
    "--plain-space-1": `${space * 0.5}px`,    // 4
    "--plain-space-2": `${space}px`,           // 8
    "--plain-space-3": `${space * 1.5}px`,     // 12
    "--plain-space-4": `${space * 2}px`,       // 16
    "--plain-space-5": `${space * 3}px`,       // 24
    "--plain-space-6": `${space * 4}px`,       // 32
    "--plain-space-7": `${space * 6}px`,       // 48
    "--plain-space-8": `${space * 8}px`,       // 64
    "--plain-space-9": `${space * 10}px`,      // 80
    "--plain-space-10": `${space * 12}px`,     // 96
    "--plain-space-11": `${space * 14}px`,     // 112
    "--plain-space-12": `${space * 16}px`,     // 128 · cover / hero / 大 break 段用
    // radius
    "--plain-radius-card": radius.card,
    "--plain-radius-pill": radius.pill,
    // motion defaults
    "--plain-dur-fast": "120ms",
    "--plain-dur-mid": "240ms",
    "--plain-ease-ui": "cubic-bezier(0.2, 0, 0.13, 1.5)",
  };

  // expose palette(给高级用户用 · `var(--plain-palette-n-700)` 等)
  (["s", "n", "a"] as const).forEach((label) => {
    const r = label === "s" ? s : label === "n" ? n : a;
    (Object.keys(r) as RampShade[]).forEach((shade) => {
      vars[`--plain-palette-${label}-${shade}`] = r[shade];
    });
  });

  const css = `:root[data-plain-theme="${spec.id}"] {\n${Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n")}\n}`;

  return {
    id: spec.id,
    label: spec.label,
    vars,
    css,
    derived: { palette: { s, n, a }, semantic },
  };
}
