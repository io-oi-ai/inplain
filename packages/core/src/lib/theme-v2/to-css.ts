/**
 * Plain 主题语言 v2 · L2 → L3 · CSS 生成
 *
 * 这是渲染器跟主题之间的唯一接口。
 * 输入 PlainTheme,输出一段 :root CSS 变量块。
 * 渲染器只读 --plain-* 变量,永远不知道当前主题 id。
 *
 * 详见 docs/THEME-LANGUAGE.md
 */

import type { PlainTheme } from "./theme-schema";
import type { FontStep } from "./primitives";
import {
  DEFAULT_FONT_SCALE,
  DEFAULT_SPACE,
  DEFAULT_RADIUS,
  DEFAULT_MOTION,
} from "./primitives";

/**
 * 把主题转成 :root { --plain-xxx: yyy; } CSS。
 *
 * 输出可直接 inline `<style>` 注入,或拼到外联 stylesheet。
 *
 * 不输出 selector 外的内容(没有 body / 没有 reset)。
 * 渲染器自己用这些变量写 layout CSS。
 */
export function themeToCss(theme: PlainTheme): string {
  const c = theme.colors;
  const f = theme.fonts;
  const type = { ...DEFAULT_FONT_SCALE, ...(theme.type ?? {}) };
  const space = { ...DEFAULT_SPACE, ...(theme.space ?? {}) };
  const radius = { ...DEFAULT_RADIUS, ...(theme.radius ?? {}) };
  const motion = { ...DEFAULT_MOTION, ...(theme.motion ?? {}) };
  const chrome = theme.chrome;

  const lines: string[] = [];
  lines.push(`/* Plain theme v2: ${theme.id} · ${theme.label} */`);
  lines.push(`:root {`);

  // ── color ──
  lines.push(`  --plain-paper: ${c.paper};`);
  lines.push(`  --plain-surface: ${c.surface};`);
  lines.push(`  --plain-raised: ${c.raised};`);
  lines.push(`  --plain-ink: ${c.ink};`);
  lines.push(`  --plain-ink-soft: ${c.inkSoft};`);
  lines.push(`  --plain-ink-mute: ${c.inkMute};`);
  lines.push(`  --plain-accent: ${c.accent};`);
  lines.push(`  --plain-on-accent: ${c.onAccent};`);
  lines.push(`  --plain-hero: ${c.hero};`);
  lines.push(`  --plain-on-hero: ${c.onHero};`);
  lines.push(`  --plain-positive: ${c.positive};`);
  lines.push(`  --plain-negative: ${c.negative};`);
  // 派生:rule(outline) = ink × 12%
  lines.push(`  --plain-rule: color-mix(in srgb, ${c.ink} 12%, transparent);`);
  // 派生:accent-soft = accent × 15%
  lines.push(`  --plain-accent-soft: color-mix(in srgb, ${c.accent} 15%, transparent);`);

  // ── font ──
  lines.push(`  --plain-font-display: ${f.display};`);
  lines.push(`  --plain-font-text: ${f.text};`);
  lines.push(`  --plain-font-ui: ${f.ui};`);
  lines.push(`  --plain-font-mono: ${f.mono};`);

  // ── font size + line + weight + tracking ──
  for (const [key, step] of Object.entries(type)) {
    emitFontStep(lines, key, step as FontStep);
  }

  // ── space ──
  lines.push(`  --plain-space-half: ${space.half};`);
  lines.push(`  --plain-space-1: ${space.s1};`);
  lines.push(`  --plain-space-2: ${space.s2};`);
  lines.push(`  --plain-space-3: ${space.s3};`);
  lines.push(`  --plain-space-4: ${space.s4};`);
  lines.push(`  --plain-space-6: ${space.s6};`);
  lines.push(`  --plain-space-8: ${space.s8};`);
  lines.push(`  --plain-space-12: ${space.s12};`);
  lines.push(`  --plain-space-16: ${space.s16};`);

  // ── radius ──
  lines.push(`  --plain-radius-sharp: ${radius.sharp};`);
  lines.push(`  --plain-radius-soft: ${radius.soft};`);
  lines.push(`  --plain-radius-card: ${radius.card};`);
  lines.push(`  --plain-radius-pill: ${radius.pill};`);
  lines.push(`  --plain-radius-blob: ${radius.blob};`);

  // ── motion ──
  lines.push(`  --plain-ease-page: ${motion.easePage};`);
  lines.push(`  --plain-ease-data: ${motion.easeData};`);
  lines.push(`  --plain-ease-ui: ${motion.easeUi};`);
  lines.push(`  --plain-dur-fast: ${motion.durFast};`);
  lines.push(`  --plain-dur-mid: ${motion.durMid};`);
  lines.push(`  --plain-dur-slow: ${motion.durSlow};`);

  // ── chrome flags(0/1, 让渲染 CSS 用 calc 或 :where 切分支)──
  lines.push(`  --plain-chrome-kicker-bar: ${chrome.kickerBar ? 1 : 0};`);
  lines.push(`  --plain-chrome-drop-cap: ${chrome.dropCap ? 1 : 0};`);
  lines.push(`  --plain-chrome-rule: ${chrome.ruleStyle};`);
  lines.push(`  --plain-chrome-card-shadow: ${chrome.cardShadow};`);
  lines.push(`  --plain-chrome-strong: ${chrome.strongStyle};`);
  lines.push(`  --plain-chrome-quote: ${chrome.quoteStyle};`);

  // ── meta ──
  lines.push(`  --plain-theme-id: "${theme.id}";`);
  lines.push(`  --plain-theme-mood: "${theme.mood}";`);

  lines.push(`}`);
  return lines.join("\n");
}

function emitFontStep(lines: string[], key: string, step: FontStep): void {
  const kebab = key.replace(/([A-Z])/g, "-$1").toLowerCase();
  lines.push(`  --plain-size-${kebab}: ${step.size};`);
  lines.push(`  --plain-line-${kebab}: ${step.line};`);
  lines.push(`  --plain-weight-${kebab}: ${step.weight};`);
  if (step.tracking !== undefined) {
    lines.push(`  --plain-tracking-${kebab}: ${step.tracking}em;`);
  }
}

/**
 * 给一组主题生成完整 CSS(用 data-theme-id 区分):
 *
 *   [data-plain-theme="monocle"] { ... }
 *   [data-plain-theme="dune-dark"] { ... }
 *
 * 用法:在 <html data-plain-theme="monocle"> 上切主题,
 * 渲染器内任意层 :root 写 var(--plain-xxx) 都能读到。
 */
export function themesToScopedCss(themes: ReadonlyArray<PlainTheme>): string {
  return themes
    .map((t) => themeToCss(t).replace(/^:root \{/m, `[data-plain-theme="${t.id}"] {`))
    .join("\n\n");
}
