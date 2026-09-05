/**
 * V32 · 把「网站实测出来的设计系统」映射成 Plain 的 DesignTokens。
 *
 * 输入是 dembrandt(MIT · https://github.com/dembrandt/dembrandt)的抽取结果:
 * Playwright 渲染真实页面 → 读 computed style → 统计出色板 / 字体 / 圆角。
 * 用户只要给自己公司官网的 URL,就能拿到**自己品牌真正的样子**,
 * 而不是从一个 accent 硬推(deriveTokens 那条路)。
 *
 * ⚠ 为什么不直接用它的值落库:
 *   1. 官网的对比度不一定达标(hero 上的浅灰小字很常见)。Plain 的产物是
 *      要交付给第三方看的文档,WEB-RULES「文本对比度 ≥ 4.5:1」是硬约束。
 *      所以映射完**必须过 auditContrast**,不达标的项用 deriveTokens 的
 *      pushUntilContrast 逻辑救回来。
 *   2. 它给的是 rgb() 字符串 + 一个按出现次数排序的长色板,
 *      Plain 要的是 15 个语义槽位。中间需要"按 role 归位"。
 *
 * 抽取本身跑不在 Worker 上(要真浏览器),所以这一步在 CLI 侧完成,
 * 只把结果 POST 给服务端。这个文件是**纯函数**,两边都能 import。
 */
import { deriveTokens, contrast } from "./derive-tokens";
import type { ColorTokens, DesignTokens } from "./design-tokens";

/** dembrandt JSON 里我们用到的那部分(它的输出字段远多于此) */
export type DembrandtExtract = {
  siteName?: string;
  colors?: {
    semantic?: {
      primary?: string;
      secondary?: string;
      background?: string;
      text?: string;
      accent?: string;
    };
    palette?: Array<{
      normalized?: string;
      count?: number;
      role?: string;
      confidence?: string;
      oklch?: string;
    }>;
    /** 站点自己声明的 CSS 变量 —— 比频次统计权威得多(见 pickAccent) */
    cssVariables?: Record<string, { value?: string; hex?: string }>;
  };
  typography?: {
    styles?: Array<{ context?: string; family?: string; fallbacks?: string; count?: number }>;
  };
  borderRadius?: { values?: Array<{ numericValue?: number; count?: number; confidence?: string }> };
  spacing?: { values?: Array<{ numericValue?: number; count?: number }> };
};

/** rgb()/rgba() → #rrggbb;已经是 hex 就原样返回;认不出返回 null */
function toHex(input: string | undefined | null): string | null {
  if (!input) return null;
  const s = input.trim();
  if (/^#[0-9a-f]{6}$/i.test(s)) return s.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(s)) {
    const h = s.slice(1);
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toLowerCase();
  }
  const m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (!m) return null;
  const c = (v: string) =>
    Math.max(0, Math.min(255, Math.round(parseFloat(v)))).toString(16).padStart(2, "0");
  return `#${c(m[1])}${c(m[2])}${c(m[3])}`;
}

/** hex → OKLCH chroma(0~0.4)· 用来判断"这是不是一个有色彩的品牌色" */
function chroma(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = [f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return Math.hypot(
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  );
}

/** 有彩色才配当 accent(灰/黑/白 chroma 接近 0) */
const CHROMATIC = 0.04;

/**
 * 挑品牌主色。优先级从高到低:
 *   1. 站点**自己声明的** `--*accent*` / `--*brand*` / `--*primary*` CSS 变量
 *      —— 这是设计系统的一等公民,比任何统计都权威(Linear 实测:
 *      频次最高的"accent"是个绿色状态点,而 `--color-accent` 才是品牌紫)
 *   2. semantic.primary(dembrandt 的猜测)· 要求有彩度
 *   3. palette 里 role=accent 且有彩度的、出现最多的那个
 *   4. semantic.accent
 * 全都不靠谱 → null(调用方回落到中性默认色)
 */
function pickAccent(colors: NonNullable<DembrandtExtract["colors"]>): string | null {
  const vars = colors.cssVariables ?? {};
  // ⚠ 只认"语义级"变量名,不认"色板叶子"。
  // Linear 的 `--color-accent` 是品牌色;Stripe 的
  // `--hds-color-accentColorMode-ruby-icon-solid` 只是色板里一个 ruby 色阶
  // —— 后者含 accent 字样但完全不是主色。区分信号是**名字的具体程度**:
  // 语义变量短(段数少、无色名、无数字档位)。
  const HUE_WORD =
    /(ruby|lemon|magenta|orange|cyan|teal|lime|amber|violet|indigo|rose|pink|red|green|blue|yellow|purple|gray|grey|slate|zinc|neutral)/i;
  const DERIVED = /(tint|muted|subtle|bg|background|hover|active|disabled|light|pale|gradient|alt)/i;
  const varHit = Object.entries(vars)
    .filter(([k]) => {
      const name = k.replace(/^--/, "");
      if (!/(accent|brand|primary)/i.test(name)) return false;
      if (DERIVED.test(name) || HUE_WORD.test(name)) return false;
      if (/\d{2,}/.test(name)) return false; // -200 / -500 这种色阶档位
      // 段数:`color-accent` = 2 段可以;`hds-color-accentColorMode-icon-solid` 太深
      return name.split("-").filter(Boolean).length <= 3;
    })
    .map(([, v]) => toHex(v.hex ?? v.value))
    .find((h): h is string => h != null && chroma(h) >= CHROMATIC);
  if (varHit) return varHit;

  const sem = colors.semantic ?? {};
  const primary = toHex(sem.primary);
  if (primary && chroma(primary) >= CHROMATIC) return primary;

  const fromPalette = (colors.palette ?? [])
    .filter((p) => p.role === "accent")
    .map((p) => ({ hex: toHex(p.normalized), count: p.count ?? 0 }))
    .filter((p): p is { hex: string; count: number } => p.hex != null && chroma(p.hex) >= CHROMATIC)
    .sort((a, b) => b.count - a.count)[0]?.hex;
  if (fromPalette) return fromPalette;

  const accent = toHex(sem.accent);
  if (accent && chroma(accent) >= CHROMATIC) return accent;
  return primary ?? accent ?? null;
}

/** 感知亮度(0~1)· 判明暗基调用 */
function lum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
}

/** 从字体栈里挑第一个族名(去引号) */
function firstFamily(family?: string, fallbacks?: string): string | undefined {
  const raw = [family, fallbacks].filter(Boolean).join(", ");
  if (!raw) return undefined;
  return raw
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean)
    .join(", ");
}

export type ImportResult = {
  tokens: DesignTokens;
  /** 哪些槽位是"官网实测值",哪些是为了达标/缺失而由我们补的 */
  provenance: Record<string, "measured" | "repaired" | "derived">;
  /** 建议的系统名(用户可改) */
  suggestedName: string;
};

/**
 * 主入口:dembrandt 抽取结果 → Plain DesignTokens(保证过 WCAG)。
 *
 * 策略:
 *   - bg / text / accent 三个"锚点"优先用实测语义色
 *   - 其余 12 个槽位没有可靠实测来源 → 用 deriveTokens(accent, scheme) 生成,
 *     再把实测到的 bg/text 覆盖回去
 *   - 最后逐项验对比度,不达标的换成 derive 出来的那一份(它数学上保证达标)
 */
export function tokensFromExtract(x: DembrandtExtract): ImportResult {
  const sem = x.colors?.semantic ?? {};
  const palette = (x.colors?.palette ?? []).filter((p) => p.normalized);

  const measuredBg = toHex(sem.background);
  const measuredText = toHex(sem.text);
  const measuredAccent = pickAccent(x.colors ?? {});

  // 基调:看实测底色亮度;没测到就按浅色(绝大多数官网)
  const scheme: "light" | "dark" =
    measuredBg != null && lum(measuredBg) < 0.4 ? "dark" : "light";

  // 圆角:取"高置信 + 出现最多"的那一档(官网上 1px/2px 这种噪音要避开)
  // 上限 24px:官网上出现最多的圆角常是 pill 按钮(9999px / 999px),
  // 拿它当**文档块**的圆角会让每张卡片变成胶囊。Plain 的 radius 是块级语义。
  const radii = (x.borderRadius?.values ?? [])
    .filter(
      (v) => typeof v.numericValue === "number" && v.numericValue >= 4 && v.numericValue <= 24,
    )
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
  const radius = radii[0]?.numericValue != null ? `${radii[0].numericValue}px` : undefined;

  // 字体:正文取 context=text 里出现最多的族;标题取 heading-*
  const styles = x.typography?.styles ?? [];
  const pick = (pred: (c: string) => boolean): string | undefined => {
    const hit = styles
      .filter((s) => pred(s.context ?? ""))
      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))[0];
    return firstFamily(hit?.family, hit?.fallbacks);
  };
  // 正文不能是等宽字体。官网常在高频 UI 标签(徽章 / 数字 / 代码)上用 mono,
  // 频次统计会把它顶成"正文",但拿它排一篇文档会非常难读。
  const isMono = (f?: string) => !!f && /\bmono|monospace|courier|consolas|menlo\b/i.test(f);
  const bodyRaw = pick((c) => c === "text" || c === "body" || c === "paragraph");
  const displayRaw = pick((c) => c.startsWith("heading"));
  const body = isMono(bodyRaw) ? (isMono(displayRaw) ? undefined : displayRaw) : bodyRaw;
  const display = displayRaw ?? body;
  const mono = isMono(bodyRaw) ? bodyRaw : undefined;

  // ── 先用实测 accent 走一遍 derive,拿到 15 个数学上达标的槽位 ──
  const base = deriveTokens({
    accent: measuredAccent ?? (scheme === "dark" ? "#7aa2ff" : "#0071e3"),
    scheme,
    radius,
    font: {
      ...(body ? { body } : {}),
      ...(display ? { display } : {}),
      ...(mono ? { mono } : {}),
    },
  });

  const provenance: Record<string, "measured" | "repaired" | "derived"> = {};
  for (const k of Object.keys(base.color)) provenance[k] = "derived";

  const color: ColorTokens = { ...base.color };

  // ── 把可靠的实测值覆盖回去 ──
  if (measuredBg) {
    color.bg = measuredBg;
    provenance.bg = "measured";
  }
  if (measuredAccent) {
    color.accent = measuredAccent;
    provenance.accent = "measured";
  }
  if (measuredText) {
    color.text = measuredText;
    provenance.text = "measured";
  }

  // ── WCAG 兜底:覆盖后可能破坏对比(实测 bg 换了,derive 出来的文字色不再匹配)──
  // 达标线跟 deriveTokens/auditContrast 保持一致。
  const NEED: Array<[keyof ColorTokens, number]> = [
    ["text", 7],
    ["textMute", 4.5],
    ["textFaint", 3],
    ["accentStrong", 4.5],
    ["success", 4.5],
    ["warn", 4.5],
    ["danger", 4.5],
  ];
  // bg 变了就要拿新 bg 重新 derive 一套候选来救
  const rescue =
    measuredBg && measuredBg !== base.color.bg
      ? deriveTokens({ accent: color.accent, scheme, radius }).color
      : base.color;

  for (const [key, min] of NEED) {
    if (contrast(color[key], color.bg) >= min) continue;
    // 优先用 rescue 的同名槽位;它若还不达标,就退到纯黑/纯白
    const cand = rescue[key];
    if (contrast(cand, color.bg) >= min) {
      color[key] = cand;
    } else {
      color[key] = scheme === "dark" ? "#ffffff" : "#000000";
    }
    provenance[key] = "repaired";
  }

  // accentBg / dangerBg 是 `color-mix(... , <bg>)` —— derive 时用的是它自己
  // 推的 bg。实测 bg 覆盖进来后这两条会跟错底色(浅到看不出,但在深色官网上
  // 会明显发灰),所以按最终 bg 重算。
  const mixPct = scheme === "dark" ? 18 : 10;
  color.accentBg = `color-mix(in oklab, ${color.accent} ${mixPct}%, ${color.bg})`;
  color.dangerBg = `color-mix(in oklab, ${color.danger} ${mixPct}%, ${color.bg})`;

  return {
    tokens: {
      color,
      radius: base.radius,
      gap: base.gap,
      font: base.font,
      scheme,
    },
    provenance,
    suggestedName: (x.siteName ?? "").trim() || "Imported system",
  };
}
