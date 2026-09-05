/**
 * V32 · 结构化设计 token —— 把模板的视觉 DNA 从"CSS 字符串"变成"可读数据"。
 *
 * 为什么需要:37 套模板的 token 现在藏在 `themeCss` 里(`:root{--plain-accent:#0071E3;…}`)。
 * 字符串状态下做不了任何一件下面的事:
 *   - 列出"这套系统的色板"给用户看(设计系统浏览器)
 *   - 让 AI 读到真实配色(生成时不再瞎猜)
 *   - 程序化对比两套系统 / 改一个 accent 全套联动
 *
 * ⚠ 关键设计决定:**不重写 37 套模板**,而是从它们现有的 themeCss 里**解析**出来。
 *
 * 理由:每套的 DNA 都是手调的(apple-studio 注释里写着「flat 铁律:0 圆角」、
 * 「blue on white 对比 4.6:1 达标」)。粗暴地把硬编码色提成统一 token 表会丢掉
 * 这些设计意图,而且 37 套 × 每套目视验收的成本远超收益。解析方案零风险:
 * 模板文件一行不改,token 是派生出来的视图。
 *
 * 模板普遍用两层间接:`--plain-accent: var(--blue)` → `--blue: #0071E3`。
 * 所以解析要**解 var() 引用**;`color-mix(...)` 这类无法静态求值的保留原样
 * (浏览器能算,展示时直接当 CSS 值用即可)。
 */

/** 语义色 —— 与 --plain-* 一一对应(实测 37 套模板共用这套词汇) */
export type ColorTokens = {
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  textMute: string;
  textFaint: string;
  border: string;
  borderStrong: string;
  accent: string;
  accentStrong: string;
  accentBg: string;
  success: string;
  warn: string;
  danger: string;
  dangerBg: string;
};

export type DesignTokens = {
  color: ColorTokens;
  /** 圆角(--v32-radius)· apple 那种 flat 模板是 "0px" */
  radius: string;
  /** 块间距(--v32-gap) */
  gap: string;
  /** 正文 / 标题 / 等宽字体栈(从模板私有 --font-* 解析,可能缺) */
  font: { body?: string; display?: string; mono?: string };
  /** 明暗基调 —— 来自 meta.scheme,展示时决定预览底色 */
  scheme: "light" | "dark";
};

/** --plain-* 名 → ColorTokens 字段 */
const COLOR_MAP: Record<string, keyof ColorTokens> = {
  "--plain-bg": "bg",
  "--plain-surface": "surface",
  "--plain-surface-2": "surface2",
  "--plain-text": "text",
  "--plain-text-mute": "textMute",
  "--plain-text-faint": "textFaint",
  "--plain-border": "border",
  "--plain-border-strong": "borderStrong",
  "--plain-accent": "accent",
  "--plain-accent-strong": "accentStrong",
  "--plain-accent-bg": "accentBg",
  "--plain-success": "success",
  "--plain-warn": "warn",
  "--plain-danger": "danger",
  "--plain-danger-bg": "dangerBg",
};

const FALLBACK: ColorTokens = {
  bg: "#ffffff",
  surface: "#f7f7f8",
  surface2: "#efeff1",
  text: "#1a1a1a",
  textMute: "#55555c",
  textFaint: "#8a8a92",
  border: "#e2e2e6",
  borderStrong: "#d3d3d9",
  accent: "#f0533a",
  accentStrong: "#d8402a",
  accentBg: "rgba(240,83,58,.10)",
  success: "#2e7d5b",
  warn: "#a8761f",
  danger: "#b3402f",
  dangerBg: "rgba(179,64,47,.10)",
};

/**
 * 抓出 CSS 里所有 `--name: value;` 声明。
 *
 * 故意用正则而不是真 CSS parser:themeCss 是我们自己写的、格式稳定,
 * 引一个 parser 进 worker bundle 不值得(10MiB 墙的教训)。
 * 值里含 `;` 的情况(如某些 font stack)不会出现 —— 字体栈用逗号分隔。
 */
function rawDecls(css: string): Map<string, string> {
  const out = new Map<string, string>();
  const re = /(--[a-z0-9-]+)\s*:\s*([^;{}]+)\s*;/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    // 同名多次声明:后面的覆盖前面的(与 CSS 级联一致)
    out.set(m[1].trim(), m[2].trim());
  }
  return out;
}

/**
 * 解 `var(--x)` / `var(--x, fallback)` 的间接引用。
 * 带深度上限防自引用死循环(`--a: var(--a)` 这种手误)。
 */
function resolveVar(value: string, decls: Map<string, string>, depth = 0): string {
  if (depth > 8) return value;
  const m = value.match(/^var\(\s*(--[a-z0-9-]+)\s*(?:,\s*([^)]+))?\)$/i);
  if (!m) return value;
  const target = decls.get(m[1]);
  if (target === undefined) return (m[2] ?? value).trim(); // 用 var() 自带 fallback
  return resolveVar(target, decls, depth + 1);
}

/**
 * 从模板的 themeCss 解析出结构化 tokens。
 * 缺失的项走 FALLBACK(不留 undefined —— 展示层不该到处判空)。
 */
export function extractTokens(
  themeCss: string,
  scheme: "light" | "dark" = "light",
): DesignTokens {
  const decls = rawDecls(themeCss);
  const pick = (name: string): string | undefined => {
    const raw = decls.get(name);
    return raw === undefined ? undefined : resolveVar(raw, decls);
  };

  const color = { ...FALLBACK };
  for (const [cssName, field] of Object.entries(COLOR_MAP)) {
    const v = pick(cssName);
    if (v) color[field] = v;
  }

  return {
    color,
    radius: pick("--v32-radius") ?? "8px",
    gap: pick("--v32-gap") ?? "20px",
    font: {
      body: pick("--font-body") ?? pick("--font-ui"),
      display: pick("--font-display") ?? pick("--font-serif"),
      mono: pick("--font-mono"),
    },
    scheme,
  };
}

/**
 * 反向:tokens → CSS。给 Step3(用户自建系统)用 —— 用户调完色板后
 * 生成能直接喂 renderReport 的 themeCss。
 *
 * 只输出公共契约那批(--plain-… 和 --v32-…),不碰模板私有 var:
 * 自建系统没有"私有 DNA",它就是一组 token 值。
 */
export function tokensToCss(t: DesignTokens): string {
  const c = t.color;
  const lines = [
    `--plain-bg: ${c.bg}`,
    `--plain-surface: ${c.surface}`,
    `--plain-surface-2: ${c.surface2}`,
    `--plain-text: ${c.text}`,
    `--plain-text-mute: ${c.textMute}`,
    `--plain-text-faint: ${c.textFaint}`,
    `--plain-border: ${c.border}`,
    `--plain-border-strong: ${c.borderStrong}`,
    `--plain-accent: ${c.accent}`,
    `--plain-accent-strong: ${c.accentStrong}`,
    `--plain-accent-bg: ${c.accentBg}`,
    `--plain-success: ${c.success}`,
    `--plain-warn: ${c.warn}`,
    `--plain-danger: ${c.danger}`,
    `--plain-danger-bg: ${c.dangerBg}`,
    `--v32-radius: ${t.radius}`,
    `--v32-gap: ${t.gap}`,
    ...(t.font.body ? [`--font-body: ${t.font.body}`] : []),
    ...(t.font.display ? [`--font-display: ${t.font.display}`] : []),
    ...(t.font.mono ? [`--font-mono: ${t.font.mono}`] : []),
  ];
  return `:root {\n  ${lines.join(";\n  ")};\n}`;
}

/** 展示用分组 —— 设计系统浏览器按这个顺序列色板 */
export const COLOR_GROUPS: Array<{ group: string; keys: Array<keyof ColorTokens> }> = [
  { group: "surface", keys: ["bg", "surface", "surface2"] },
  { group: "text", keys: ["text", "textMute", "textFaint"] },
  { group: "line", keys: ["border", "borderStrong"] },
  { group: "accent", keys: ["accent", "accentStrong", "accentBg"] },
  { group: "semantic", keys: ["success", "warn", "danger", "dangerBg"] },
];
