/**
 * Plain v2 渲染器 · 共享 chrome
 *
 * 三种产物(deck/doc/sheet)都用同一套外壳:
 *   - 顶部 nav: Plain. brand · breadcrumb / meta · actions
 *   - 底部 footer: Made with Plain. 水印(branded 控制,Framer 模式)
 *
 * 详见 CLAUDE.md · docs/THEME-LANGUAGE.md
 */

import type { PlainTheme } from "@/lib/theme-v2/theme-schema";
import { MERMAID_SCRIPT, MERMAID_CSS } from "@/lib/render-theme/mermaid";


/** 产物 <html lang>。默认 en;PLAIN_LANG 可覆盖(不影响内容语言,只是标记)。 */
function htmlLang(): string {
  return (typeof process !== "undefined" ? process.env?.PLAIN_LANG : undefined) || "en";
}

export type ChromeOptions = {
  /** 文档类型:控制 actions / 演示模式按钮 */
  kind: "deck" | "doc" | "sheet";
  /** 顶部面包屑分段(ALL CAPS 短词,如 ["DECK", "CLIENT PROPOSAL", "2026.05"]) */
  breadcrumb?: string[];
  /**
   * 显示在 actions 里的可点按钮。
   * `intent`(可选)= 内置语义动作 id:
   *   "share" / "export-pptx" / "export-docx" / "export-xlsx" / "export-html" / "copy-md" / "copy-csv" / "download-md" / "download-csv"
   * 标了 intent 的 button 会绑一个 click → window.postMessage,
   * 给宿主页(/s/[id] iframe parent)消费。href 是普通外链路径。
   */
  actions?: Array<{ label: string; intent?: string; href?: string; primary?: boolean }>;
  /** 是否带水印 —— 免费/匿名用户 true,付费 false。Framer 模式。 */
  branded: boolean;
};

/**
 * 顶部 nav HTML(sticky)。
 *
 * deck 模式有 `scroll / present` 切换按钮(右上)。
 * doc / sheet 没有那个切换。
 */
export function renderTopNav(opts: ChromeOptions): string {
  const breadcrumb = (opts.breadcrumb ?? [])
    .map(
      (seg, i) =>
        `${i > 0 ? `<span class="plain-nav-sep">/</span>` : ""}<span>${escapeHtml(seg)}</span>`,
    )
    .join("");

  const actions = (opts.actions ?? [])
    .map((a) => {
      const cls = `plain-nav-btn${a.primary ? " plain-nav-btn-primary" : ""}`;
      if (a.href) {
        return `<a class="${cls}" href="${escapeAttr(a.href)}" target="_blank" rel="noopener">${escapeHtml(a.label)}</a>`;
      }
      const intent = a.intent ? ` data-plain-intent="${escapeAttr(a.intent)}"` : "";
      return `<button class="${cls}" type="button"${intent}>${escapeHtml(a.label)}</button>`;
    })
    .join("");

  const modeToggle =
    opts.kind === "deck"
      ? `<div class="plain-mode-toggle-group" role="tablist" aria-label="View mode">
          <button class="plain-mode-toggle active" type="button" data-mode="scroll">scroll</button>
          <button class="plain-mode-toggle" type="button" data-mode="present">present</button>
        </div>`
      : "";

  return `<nav class="plain-nav">
  <div class="plain-nav-inner">
    <div class="plain-nav-breadcrumb">${breadcrumb}</div>
    <div class="plain-nav-actions">
      ${modeToggle}
      ${actions}
    </div>
  </div>
</nav>`;
}

/**
 * 底部水印。
 *
 * 设计原则:用户分享的报告里可能有他们自己的 logo 或品牌信息,
 * 我们不强调平台名字 —— 仅右下角一处低调悬浮水印体现出处,
 * 不再叠加底部 footer 文案,避免重复抢镜。
 *
 * branded === true(免费/匿名)→ 右下角一处悬浮水印
 * branded === false(付费)→ 不渲染任何水印 / footer
 */
export function renderFooterAndWatermark(opts: ChromeOptions): string {
  if (!opts.branded) return "";
  // 开源/自托管默认不打水印 —— 产物是使用者的,不该带别人的品牌和外链。
  // 托管版通过 PLAIN_BRAND_URL 开启(见 docs);未设则整块不渲染。
  const brandUrl = typeof process !== "undefined" ? process.env?.PLAIN_BRAND_URL : undefined;
  if (!brandUrl) return "";
  return `<a class="plain-watermark" href="${brandUrl}" target="_blank" rel="noopener" title="Made with Plain">
    <span class="plain-watermark-kicker">made with</span>
    <span class="plain-watermark-brand">Plain<span class="plain-dot">.</span></span>
  </a>`;
}

/**
 * Chrome 用的 CSS。
 *
 * 这套样式以 var(--plain-*) 为基础,跟主题切换自动适配。
 * 不内嵌主题 :root,主题块由 themeToCss() 单独生成,本 CSS 只消费变量。
 */
export const CHROME_CSS = `
/* ─────────── nav (sticky top, lightweight) ─────────── */
.plain-nav {
  position: sticky; top: 0; z-index: 50;
  background: color-mix(in srgb, var(--plain-paper) 92%, transparent);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid color-mix(in srgb, var(--plain-rule) 60%, transparent);
}
.plain-nav-inner {
  max-width: 1120px; margin: 0 auto;
  padding: 14px 28px;
  display: flex; align-items: center; gap: 16px;
  min-height: 52px;
}
.plain-dot { color: var(--plain-accent); }
.plain-nav-breadcrumb {
  display: flex; gap: 10px; align-items: center;
  font-family: var(--plain-font-ui);
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--plain-ink-soft);
  flex: 1; min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.plain-nav-breadcrumb > span:first-child {
  color: var(--plain-ink);
  font-weight: 600;
}
.plain-nav-sep { opacity: 0.35; font-weight: 300; }
.plain-nav-actions { display: flex; gap: 4px; align-items: center; }

/* ghost 次按钮:无边框,仅 hover 浅底 */
.plain-nav-btn {
  font-family: var(--plain-font-ui);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
  padding: 6px 12px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  border-radius: var(--plain-radius-card);
  color: var(--plain-ink-soft);
  text-decoration: none;
  transition: all var(--plain-dur-fast) var(--plain-ease-ui);
  line-height: 1.4;
  white-space: nowrap;
}
.plain-nav-btn:hover {
  color: var(--plain-ink);
  background: color-mix(in srgb, var(--plain-ink) 6%, transparent);
}

/* primary 主按钮:细描边 + accent 字色,hover 时 fill */
.plain-nav-btn-primary {
  background: transparent;
  color: var(--plain-ink);
  border-color: var(--plain-ink-soft);
}
.plain-nav-btn-primary:hover {
  background: var(--plain-ink);
  border-color: var(--plain-ink);
  color: var(--plain-paper);
}

/* scroll/present 切换:segmented control,共用一个 border 容器 */
.plain-mode-toggle-group {
  display: inline-flex;
  border: 1px solid var(--plain-rule);
  border-radius: var(--plain-radius-card);
  padding: 2px;
  background: color-mix(in srgb, var(--plain-ink) 3%, transparent);
}
.plain-mode-toggle {
  font-family: var(--plain-font-ui);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  padding: 4px 10px;
  border: none;
  background: transparent;
  color: var(--plain-ink-mute);
  cursor: pointer;
  border-radius: calc(var(--plain-radius-card) - 2px);
  transition: all var(--plain-dur-fast) var(--plain-ease-ui);
  line-height: 1.4;
}
.plain-mode-toggle:hover { color: var(--plain-ink); }
.plain-mode-toggle.active {
  background: var(--plain-paper);
  color: var(--plain-ink);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--plain-ink) 12%, transparent);
}

/* ─────────── watermark (right-bottom floater) ─────────── */
.plain-watermark {
  position: fixed; right: 20px; bottom: 20px;
  z-index: 99;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 14px;
  border-radius: var(--plain-radius-pill);
  background: color-mix(in srgb, var(--plain-ink) 88%, transparent);
  color: var(--plain-paper);
  text-decoration: none;
  box-shadow: 0 4px 18px -4px rgba(0,0,0,0.35);
  backdrop-filter: blur(8px);
  transition: transform var(--plain-dur-mid) var(--plain-ease-ui);
}
.plain-watermark:hover {
  transform: translateY(-1px);
  background: var(--plain-ink);
}
.plain-watermark-kicker {
  font-family: var(--plain-font-ui);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  opacity: 0.7;
}
.plain-watermark-brand {
  font-family: var(--plain-font-display);
  font-size: 14px;
  line-height: 1;
  letter-spacing: -0.005em;
  font-weight: 500;
}

/* ─────────── 演示模式触发(deck 用) ─────────── */
body[data-plain-mode="present"] {
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  height: 100vh;
}
body[data-plain-mode="present"] section.plain-section {
  scroll-snap-align: start;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* ── V21 · fenced chart / mermaid ────────────────────────────────── */
.plain-fenced-chart {
  margin: 2em 0;
  text-align: center;
}
.plain-fenced-chart svg { max-width: 100%; height: auto; }
.plain-fenced-chart figcaption {
  margin-top: 0.5em;
  font-size: 13px;
  color: var(--plain-muted);
  font-style: italic;
}
.plain-fenced-mermaid {
  margin: 2em 0;
  text-align: center;
}
.plain-fenced-mermaid svg {
  max-width: 100%;
  height: auto;
  /* V32 · mermaid 客户端 CDN 渲染出的 SVG · 给个透明底防止跟 panel/card
     卡片底色冲突。 */
  background: transparent;
}
.plain-fenced-mermaid.mermaid-error {
  border: 1px dashed var(--plain-rule);
  background: color-mix(in srgb, var(--plain-negative) 8%, transparent);
  padding: 12px;
  border-radius: 4px;
  text-align: left;
}
.plain-fenced-mermaid.mermaid-error pre {
  font-family: var(--plain-font-mono);
  font-size: 12px;
  color: var(--plain-ink-soft);
  margin: 0 0 8px;
  white-space: pre-wrap;
}
.plain-fenced-mermaid.mermaid-error figcaption {
  font-family: var(--plain-font-mono);
  font-size: 11px;
  color: var(--plain-negative);
}
.plain-fenced-error {
  margin: 2em 0;
  padding: 1em;
  border: 1px dashed var(--plain-rule);
  color: var(--plain-danger, #c33);
  font-size: 13px;
}
.plain-fenced-error pre {
  margin-top: 0.5em;
  white-space: pre-wrap;
  font-size: 11px;
  opacity: 0.7;
}
`;

/**
 * 通用 nav 行为脚本 —— 三种产物共用。
 *
 * 运行时检测两种场景:
 *
 * a) **iframe 嵌入**(/s/[id] 用 srcDoc):有 window.parent,
 *    按钮 click → postMessage 给 host,宿主 doExport / doShare。
 *
 * b) **standalone 打开**(用户下载的 .html 离线 / 直接打开):
 *    无 host,按钮在加载完后**重写**成 "Edit in Plain" 一类的外链,
 *    跳回 https://inplain.app(让 user 在 Plain 重新操作)。
 *    这样桌面那份独立 .html 也不会出现「按钮失效」的体验。
 */
export function navActionScript(): string {
  // 独立打开的产物里,那些"分享 / 导出"按钮需要一个后端才能工作。
  // 托管版把它们改写成跳回自己的工作台;开源自托管没有那个工作台,
  // 与其留一堆点了跳到别人网站的按钮,不如直接移除。
  const brandUrl = typeof process !== "undefined" ? process.env?.PLAIN_BRAND_URL : undefined;
  const openInPlain = brandUrl
    ? `a.href = ${JSON.stringify(brandUrl + "/app")}; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Open in Plain'; btn.replaceWith(a);`
    : "btn.remove();";
  return `
<script>
(function() {
  var isStandalone = (function() {
    try { return !window.parent || window.parent === window; }
    catch (e) { return true; }
  })();

  if (isStandalone) {
    // 没有宿主可以处理这些动作 —— 按配置决定:改写成外链(托管版)或移除(自托管)。
    document.querySelectorAll('[data-plain-intent]').forEach(function(btn) {
      var a = document.createElement('a');
      a.className = btn.className;
      ${openInPlain}
    });
    return;
  }

  // iframe 嵌入:转发 intent 给 parent
  document.querySelectorAll('[data-plain-intent]').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      window.parent.postMessage(
        { source: 'plain-share-action', intent: btn.dataset.plainIntent },
        '*',
      );
    });
  });
})();
</script>`;
}

/** 演示模式切换的 inline script(仅 deck 用,跟 navActionScript 并存) */
export const PRESENT_TOGGLE_SCRIPT = `
<style>
/* V19 · Speaker notes 浮窗(演讲模式 only) */
.plain-speaker-notes {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 90;
  max-width: 380px;
  padding: 14px 18px;
  background: rgba(20, 20, 22, 0.92);
  color: rgba(245, 245, 240, 0.95);
  font-family: var(--plain-font-ui, "Inter", -apple-system, sans-serif);
  font-size: 13px;
  line-height: 1.55;
  border-radius: 10px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px -8px rgba(0, 0, 0, 0.4);
  opacity: 0;
  pointer-events: none;
  transform: translateY(10px);
  transition: opacity 220ms ease, transform 220ms ease;
}
.plain-speaker-notes-kicker {
  display: block;
  font-family: var(--plain-font-mono, "JetBrains Mono", monospace);
  font-size: 9px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(245, 245, 240, 0.55);
  margin-bottom: 6px;
}
.plain-speaker-notes-body {
  display: block;
}
/* present 模式 + 当前 section 有 notes 才显示 */
body[data-plain-mode="present"] .plain-speaker-notes[data-has-notes="true"] {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}
/* scroll 模式永远隐藏 */
body:not([data-plain-mode="present"]) .plain-speaker-notes {
  display: none;
}
</style>
<script>
(function() {
  var body = document.body;
  // V19 · 给 body 加一个 fixed speaker-notes 浮窗 · 永远存在,by section 切内容
  var notesEl = document.createElement('div');
  notesEl.className = 'plain-speaker-notes';
  notesEl.setAttribute('data-has-notes', 'false');
  notesEl.innerHTML = '<span class="plain-speaker-notes-kicker">SPEAKER NOTES</span><span class="plain-speaker-notes-body"></span>';
  body.appendChild(notesEl);
  var notesBody = notesEl.querySelector('.plain-speaker-notes-body');

  // 哪个 section 当前居中 · 用 IntersectionObserver
  function updateNotes() {
    var sections = document.querySelectorAll('section.plain-section');
    var center = window.innerHeight / 2;
    var currentNotes = '';
    sections.forEach(function (s) {
      var r = s.getBoundingClientRect();
      if (r.top <= center && r.bottom >= center) {
        currentNotes = s.getAttribute('data-plain-speaker-notes') || '';
      }
    });
    if (currentNotes) {
      notesBody.textContent = currentNotes;
      notesEl.setAttribute('data-has-notes', 'true');
    } else {
      notesEl.setAttribute('data-has-notes', 'false');
    }
  }
  window.addEventListener('scroll', updateNotes, { passive: true });
  window.addEventListener('resize', updateNotes);
  updateNotes();

  // mode toggle
  document.querySelectorAll('.plain-mode-toggle').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var mode = btn.dataset.mode;
      body.dataset.plainMode = mode;
      document.querySelectorAll('.plain-mode-toggle').forEach(function(b) {
        b.classList.toggle('active', b.dataset.mode === mode);
      });
      // 切到 present 时立即刷新 notes
      if (mode === 'present') updateNotes();
    });
  });
})();
</script>`;

/** 滚动进度条(doc 用) */
export const SCROLL_PROGRESS_CSS = `
.plain-progress {
  position: fixed; top: 0; left: 0;
  height: 2px; width: 0%;
  background: var(--plain-accent);
  z-index: 100;
  transition: width 0.1s;
}
`;

export const SCROLL_PROGRESS_SCRIPT = `
<script>
(function() {
  var bar = document.querySelector('.plain-progress');
  if (!bar) return;
  window.addEventListener('scroll', function() {
    var h = document.documentElement;
    var pct = (h.scrollTop / Math.max(1, (h.scrollHeight - h.clientHeight))) * 100;
    bar.style.width = pct + '%';
  });
})();
</script>`;

/**
 * V32 · mermaid 改回客户端 CDN 渲染。
 *
 * 把 beautiful-mermaid + elkjs(~2-4MB)移出 Cloudflare Worker bundle
 * (worker gzip 超 10MiB 部署失败)。server 端 renderMermaidFenced 只输出
 * <pre class="mermaid">,真正渲染由此处注入的脚本在 iframe 里完成:
 *   - MERMAID_CSS · .mermaid 容器居中样式
 *   - MERMAID_SCRIPT · 按需 import mermaid@11 CDN + mermaid.run()
 *
 * 复用 render-theme/mermaid.ts 的客户端方案(与 Doc/Sheet/Marp 三条路径统一)。
 * MERMAID_SCRIPT 自带 <script type="module"> 标签;MERMAID_CSS 是裸 CSS,需包 <style>。
 *
 * 此 export 被注入 render-deck.ts / render-doc.ts 的 extraScripts。
 */
export const MERMAID_HYDRATE_SCRIPT = `<style>${MERMAID_CSS}</style>${MERMAID_SCRIPT}`;

/**
 * V29 · Google Fonts 完整字体表 · 覆盖 10 套 design system 用到的所有 family
 * 改成单一 link · 一次加载所有字体
 */
const V29_FONT_LINK = "https://fonts.googleapis.com/css2?" + [
  "family=Source+Serif+4:opsz,wght@8..60,300;8..60,400;8..60,500;8..60,600;8..60,700",
  "family=Noto+Serif+SC:wght@300;400;500;700",
  "family=Inter:wght@300;400;500;600;700;800",
  "family=JetBrains+Mono:wght@400;500;600",
  "family=Instrument+Serif:ital@0;1", // Biennale / Pink
  "family=Archivo:wght@400;500;600;700;800;900", // Biennale / Stencil
  "family=Archivo+Black", // Stencil
  "family=Big+Shoulders+Display:wght@600;700;800;900", // Sakura
  "family=Albert+Sans:wght@400;500;600;700", // Sakura
  "family=Tektur:wght@400;500;600;700", // 8-Bit
  "family=Chakra+Petch:wght@400;500;600;700", // 8-Bit
  "family=Space+Mono:wght@400;700", // 8-Bit
  "family=Bodoni+Moda:wght@500;600;700;800", // Emerald
  "family=Cormorant+Garamond:wght@400;500;600;700", // Emerald / Vellum
  "family=Caveat:wght@400;500;600;700", // Pin & Paper
  "family=Kalam:wght@300;400;700", // Pin & Paper
  "family=Lora:wght@400;500;600;700", // Monochrome
  "family=Anton", // Sakura/Stencil fallback
  "family=VT323", // 8-Bit fallback
  "family=Source+Sans+3:wght@400;500;600", // 通用
  "display=swap",
].join("&");

/** 组装完整 HTML 外壳 */
export function wrapHtml(opts: {
  title: string;
  themeId: string;
  themeCss: string;
  bodyHtml: string;
  bodyClass?: string;
  /** 文档类型 · 写进 data-plain-kind 让 VISUAL_EDIT_SCRIPT 决定打 deck/doc/sheet 标记。
   *  不传时 VISUAL_EDIT_SCRIPT 默认 'deck'(历史行为)。 */
  kind?: "deck" | "doc" | "sheet";
  /** 已经注入到 head 的额外 CSS / link */
  extraHead?: string;
  extraScripts?: string;
  /** 竖版社交分享卡:在 <html> 上加 data-plain-social="portrait",CSS 据此固定 3:4 + 隐藏 chrome */
  socialCard?: "portrait" | null;
}): string {
  const kindAttr = opts.kind ? ` data-plain-kind="${escapeAttr(opts.kind)}"` : "";
  const socialAttr = opts.socialCard ? ` data-plain-social="${escapeAttr(opts.socialCard)}"` : "";
  return `<!doctype html>
<html lang="${htmlLang()}" data-plain-theme="${escapeAttr(opts.themeId)}"${kindAttr}${socialAttr}>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(opts.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${V29_FONT_LINK}" rel="stylesheet">
<style>${opts.themeCss}</style>
<style>${BASE_RESET_CSS}</style>
<style>${CHROME_CSS}</style>
<style>${PLAIN_MOTION_CSS}</style>
${opts.extraHead ?? ""}
</head>
<body${opts.bodyClass ? ` class="${escapeAttr(opts.bodyClass)}"` : ""}>
${opts.bodyHtml}
${opts.extraScripts ?? ""}
${PLAIN_MOTION_SCRIPT}
</body>
</html>`;
}

/** 三种产物共用的 base reset(box-sizing / body 默认排版) */
export const BASE_RESET_CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
html {
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
  scroll-padding-top: 24px;
}
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
body {
  background: var(--plain-paper);
  color: var(--plain-ink);
  font-family: var(--plain-font-text);
  font-size: 17px;
  line-height: 1.75;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
`;

// ─────────────────────────────────────────────
// HTML escape helpers
// ─────────────────────────────────────────────

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeAttr(s: string): string {
  return escapeHtml(s);
}

/** util:从 theme registry 查表(避免 render-deck/doc/sheet 重复实现) */
export function resolveTheme(
  themeId: string,
  registry: ReadonlyArray<PlainTheme>,
  fallbackId: string,
): PlainTheme {
  return (
    registry.find((t) => t.id === themeId) ??
    registry.find((t) => t.id === fallbackId) ??
    registry[0]
  );
}

// ─────────────────────────────────────────────
// 全局入场动效系统(三件套 deck/doc/sheet 共用)
//
// 设计(守 WEB-RULES):只用 opacity/transform(不 animate layout)· ease-out 曲线 ·
//   prefers-reduced-motion 全降级 · scroll 进视口才触发(IntersectionObserver)·
//   KPI 数字 countup · 图表 line-draw / bar-rise。
// 元素自动命中:[data-reveal] 或常见 section/panel/kpi/chart class · 无需模版改 markup。
// ─────────────────────────────────────────────
export const PLAIN_MOTION_CSS = `
@media (prefers-reduced-motion: no-preference) {
  /* scroll-reveal 初始态(JS 加 .is-in 后还原) */
  [data-reveal], .plain-reveal {
    opacity: 0;
    transform: translateY(14px);
    transition: opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1);
    will-change: opacity, transform;
  }
  [data-reveal].is-in, .plain-reveal.is-in { opacity: 1; transform: none; }
  /* 同组子项逐个 stagger(最多 6 个,避免长尾) */
  [data-reveal-stagger] > * { opacity: 0; transform: translateY(12px);
    transition: opacity 0.55s cubic-bezier(0.16,1,0.3,1), transform 0.55s cubic-bezier(0.16,1,0.3,1); }
  [data-reveal-stagger].is-in > * { opacity: 1; transform: none; }
  [data-reveal-stagger].is-in > *:nth-child(1){transition-delay:.04s}
  [data-reveal-stagger].is-in > *:nth-child(2){transition-delay:.10s}
  [data-reveal-stagger].is-in > *:nth-child(3){transition-delay:.16s}
  [data-reveal-stagger].is-in > *:nth-child(4){transition-delay:.22s}
  [data-reveal-stagger].is-in > *:nth-child(5){transition-delay:.28s}
  [data-reveal-stagger].is-in > *:nth-child(6){transition-delay:.34s}
  /* 图表入场:折线画出 + 面积淡入 + 柱子升起 */
  .plain-chart-line { stroke-dasharray: var(--pl-len,1200); stroke-dashoffset: var(--pl-len,1200);
    transition: stroke-dashoffset 1.1s cubic-bezier(0.16,1,0.3,1); }
  .is-in .plain-chart-line { stroke-dashoffset: 0; }
  .plain-chart-area-fill { opacity: 0; transition: opacity 0.9s ease 0.3s; }
  .is-in .plain-chart-area-fill { opacity: 1; }
  .plain-chart-bar, rect.plain-bar { transform: scaleY(0); transform-origin: bottom;
    transition: transform 0.7s cubic-bezier(0.16,1,0.3,1); }
  .is-in .plain-chart-bar, .is-in rect.plain-bar { transform: scaleY(1); }

  /* ── v31 通用图表动效(renderMiniChart 的 .pl-* class · 一改惠及 39 模板) ── */
  /* 柱子从底升起 · stagger 由 JS 设 --pl-i */
  .is-in rect.pl-bar { transform: scaleY(0); transition: transform 0.7s cubic-bezier(0.16,1,0.3,1);
    transition-delay: calc(var(--pl-i, 0) * 0.05s); }
  .is-in.pl-played rect.pl-bar { transform: scaleY(1); }
  /* 折线画出 */
  .pl-line { stroke-dasharray: var(--pl-len, 1400); stroke-dashoffset: var(--pl-len, 1400); }
  .is-in.pl-played .pl-line { stroke-dashoffset: 0; transition: stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1); }
  /* 折线/散点 点淡入(跟在线后) */
  .pl-dot { opacity: 0; }
  .is-in.pl-played .pl-dot { opacity: 1; transition: opacity 0.4s ease calc(0.5s + var(--pl-i,0)*0.04s); }
  /* 饼图扇区淡入 */
  .pl-slice { opacity: 0; }
  .is-in.pl-played .pl-slice { opacity: 1; transition: opacity 0.5s ease calc(var(--pl-i,0)*0.07s); }

  /* ── 微交互:hover 高亮(让"图片"变"可探索") ── */
  .pl-bar, .pl-dot, .pl-slice { transition: filter 0.15s ease, opacity 0.15s ease; cursor: default; }
  svg:hover .pl-bar:not(:hover), svg:hover .pl-slice:not(:hover) { opacity: 0.45; }
  .pl-bar:hover, .pl-slice:hover { filter: brightness(1.08); }
  .pl-dot:hover { r: 6; filter: brightness(1.1); }

  /* 卡片 hover 浮起(KPI / chart panel · 让静态卡也"活") */
  .panel-kpi, .panel-chart, .plain-kpi, .plain-panel {
    transition: transform 0.2s cubic-bezier(0.16,1,0.3,1), box-shadow 0.2s ease; }
  .panel-kpi:hover, .panel-chart:hover, .plain-kpi:hover, .plain-panel:hover {
    transform: translateY(-2px); }

  /* 进度条 / 占比条:宽度从 0 长出(命中 v31 bar-fill + render-v2 progress bar) */
  .bar-fill, .plain-progress-fill, [data-bar-fill] {
    transform: scaleX(0); transform-origin: left;
    transition: transform 0.9s cubic-bezier(0.16,1,0.3,1) 0.1s;
  }
  .is-in .bar-fill, .is-in .plain-progress-fill, .is-in [data-bar-fill] { transform: scaleX(1); }

  /* 表格行:进视口后逐行淡入(数据表更有节奏) */
  .is-in table tbody tr, .is-in .plain-table tbody tr {
    animation: plain-row-in 0.5s cubic-bezier(0.16,1,0.3,1) backwards;
  }
  .is-in table tbody tr:nth-child(1){animation-delay:.05s}
  .is-in table tbody tr:nth-child(2){animation-delay:.10s}
  .is-in table tbody tr:nth-child(3){animation-delay:.15s}
  .is-in table tbody tr:nth-child(4){animation-delay:.20s}
  .is-in table tbody tr:nth-child(5){animation-delay:.25s}
  .is-in table tbody tr:nth-child(6){animation-delay:.30s}
  .is-in table tbody tr:nth-child(7){animation-delay:.35s}
  .is-in table tbody tr:nth-child(8){animation-delay:.40s}
  @keyframes plain-row-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

  /* 封面 / 大图:进场 subtle ken-burns(极缓慢放大,有"活"感不抢镜) */
  [data-kenburns] img, .plain-cover-img img {
    transform: scale(1.04); transition: transform 6s ease-out;
  }
  .is-in [data-kenburns] img, .is-in .plain-cover-img img { transform: scale(1); }
}
`;

// 客户端 hydrate:scroll-reveal(IntersectionObserver)+ KPI countup。
// 无依赖纯 JS · 渲染产物里内联 · reduced-motion 直接全显示不动。
export const PLAIN_MOTION_SCRIPT = `<script>
(function(){
  try{
    var rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // 自动给常见容器打 reveal 标记(模版没显式标也能动)
    // 命中:显式标记 + render-v2 panel class + v31 sheet-stage 直接子块 + v31 card-* +
    //   doc article 直接子块 + present section。覆盖 v2/v31 两套渲染的实际结构。
    var sel = [
      '[data-reveal]', '.plain-reveal',
      '.plain-sheet-section', '.plain-panel', '.plain-kpi', '.plain-chart',
      '.sheet-stage > *', '.sheet-stage > * > *',
      '.doc-article > *', '[data-present-section] > *',
      // v31 模版的 panel(让 KPI/图表 panel 进场 + 触发图表播放)
      '.panel-kpi', '.panel-chart',
    ].join(',');
    var nodes = Array.prototype.slice.call(document.querySelectorAll(sel));
    if(rm || !('IntersectionObserver' in window)){
      nodes.forEach(function(n){ n.classList.add('is-in'); });
      return;
    }
    nodes.forEach(function(n){ if(!n.hasAttribute('data-reveal')) n.classList.add('plain-reveal'); });
    // 折线 dash 长度(让画出动画准确)· 覆盖 render-v2(.plain-chart-line) + v31(.pl-line)
    document.querySelectorAll('.plain-chart-line, .pl-line').forEach(function(p){
      try{ var L=p.getTotalLength&&p.getTotalLength(); if(L) p.style.setProperty('--pl-len', Math.ceil(L)); }catch(e){}
    });
    // v31 图表元素 stagger 序号(柱/点/扇区 依次进场)
    document.querySelectorAll('svg').forEach(function(svg){
      ['.pl-bar','.pl-dot','.pl-slice'].forEach(function(s){
        var els = svg.querySelectorAll(s);
        for(var i=0;i<els.length;i++){ els[i].style.setProperty('--pl-i', i); }
      });
    });
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(e.isIntersecting){
          e.target.classList.add('is-in');
          countup(e.target);
          // 触发该容器内图表的进场动画(柱升/线画/扇区淡入)
          playCharts(e.target);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    nodes.forEach(function(n){ io.observe(n); });
    // 给容器内含 .pl-* 的 SVG / 自身 加 pl-played 触发动画
    function playCharts(scope){
      var svgs = [];
      if(scope.matches && scope.matches('svg')) svgs.push(scope);
      scope.querySelectorAll && scope.querySelectorAll('svg').forEach(function(s){ svgs.push(s); });
      svgs.forEach(function(svg){
        if(svg.querySelector && (svg.querySelector('.pl-bar')||svg.querySelector('.pl-line')||svg.querySelector('.pl-slice')||svg.querySelector('.pl-dot'))){
          svg.classList.add('is-in'); svg.classList.add('pl-played');
        }
      });
    }
    // KPI 数字 countup(命中 render-v2 plain-* + v31 模版 stat/kpi/value class)
    function countup(scope){
      // 命中 render-v2(.plain-*) + v31 模版(.panel-kpi .value / .kpi .value 等)
      var cvSel = '.plain-kpi-value,.plain-stat-value,.kpi-value,.stat-value,.big-number,[data-countup],.panel-kpi .value';
      var vals = scope.matches && (scope.matches('.plain-kpi')||scope.matches('.panel-kpi')) ? [] : [];
      if(scope.matches && scope.matches('.panel-kpi')){ var sv=scope.querySelector('.value'); if(sv) vals.push(sv); }
      else if(scope.matches && scope.matches('.plain-kpi')) vals.push(scope);
      scope.querySelectorAll && scope.querySelectorAll(cvSel).forEach(function(el){ vals.push(el); });
      vals.forEach(function(el){
        var node = el.querySelector ? (el.querySelector('.plain-kpi-value,.plain-stat-value,.kpi-value,.stat-value')||el) : el;
        var raw = (node.textContent||'').trim();
        var m = raw.match(/^([^0-9-]*)(-?[0-9][0-9,]*\\.?[0-9]*)(.*)$/);
        if(!m) return;
        var pre=m[1], num=parseFloat(m[2].replace(/,/g,'')), suf=m[3];
        if(!isFinite(num)) return;
        var dec=(m[2].split('.')[1]||'').length, t0=null, dur=900;
        function step(ts){ if(!t0)t0=ts; var p=Math.min((ts-t0)/dur,1); var e=1-Math.pow(1-p,3);
          var v=(num*e); node.textContent=pre+(dec?v.toFixed(dec):Math.round(v).toLocaleString())+suf;
          if(p<1) requestAnimationFrame(step); else node.textContent=raw; }
        node.textContent=pre+'0'+suf; requestAnimationFrame(step);
      });
    }

    // ── 通用图表 tooltip(让"图片"变"可探索")──────────────
    // 任意带 data-v 的 SVG 元素(.pl-bar/.pl-dot/.pl-slice)hover → 浮出 标签/系列/值
    var tip = null;
    function ensureTip(){
      if(tip) return tip;
      tip = document.createElement('div');
      tip.setAttribute('role','tooltip');
      tip.style.cssText = 'position:fixed;z-index:99999;pointer-events:none;opacity:0;'
        + 'transform:translate(-50%,-100%);transition:opacity .12s ease;'
        + 'background:rgba(20,18,15,.94);color:#fff;font:500 12px/1.4 system-ui,sans-serif;'
        + 'padding:6px 9px;border-radius:8px;white-space:nowrap;box-shadow:0 6px 20px -6px rgba(0,0,0,.4);max-width:240px;';
      document.body.appendChild(tip);
      return tip;
    }
    function fmtNum(s){
      var n = parseFloat(s); if(!isFinite(n)) return s;
      if(Math.abs(n)>=1e9) return (n/1e9).toFixed(1)+'B';
      if(Math.abs(n)>=1e6) return (n/1e6).toFixed(1)+'M';
      if(Math.abs(n)>=1e4) return (n/1e3).toFixed(1)+'k';
      return n.toLocaleString();
    }
    function showTip(el, ev){
      var v = el.getAttribute('data-v'); if(v===null) return;
      var label = el.getAttribute('data-label')||'';
      var series = el.getAttribute('data-series')||'';
      var t = ensureTip();
      var head = label ? '<div style="opacity:.7;font-size:11px;margin-bottom:1px">'+label+'</div>' : '';
      var body = (series? '<span style="opacity:.8">'+series+'</span> · ':'') + '<b>'+fmtNum(v)+'</b>';
      t.innerHTML = head + body;
      t.style.left = ev.clientX + 'px';
      t.style.top = (ev.clientY - 10) + 'px';
      t.style.transform = 'translate(-50%,-100%)';
      t.style.opacity = '1';
    }
    function hideTip(){ if(tip) tip.style.opacity='0'; }
    document.addEventListener('mouseover', function(ev){
      var el = ev.target.closest && ev.target.closest('.pl-bar,.pl-dot,.pl-slice');
      if(el) showTip(el, ev);
    });
    document.addEventListener('mousemove', function(ev){
      if(tip && tip.style.opacity==='1'){
        var el = ev.target.closest && ev.target.closest('.pl-bar,.pl-dot,.pl-slice');
        if(el){ tip.style.left=ev.clientX+'px'; tip.style.top=(ev.clientY-10)+'px'; }
        else hideTip();
      }
    });
    document.addEventListener('mouseout', function(ev){
      var el = ev.target.closest && ev.target.closest('.pl-bar,.pl-dot,.pl-slice');
      if(el) hideTip();
    });
  }catch(e){}
})();
</script>`;

/**
 * 给任意完整 HTML 注入全局入场动效(scroll-reveal + KPI countup + 图表画出)。
 * v31 模板各自手写 wrap(不都走 wrapHtml/wrapXxx),在渲染出口统一注入最可靠。
 * </head> 前插 CSS,</body> 前插 script;没有则追加。
 */
export function injectMotion(html: string): string {
  const css = `<style>${PLAIN_MOTION_CSS}</style>`;
  const out = html.includes("</head>")
    ? html.replace("</head>", `${css}</head>`)
    : css + html;
  return out.includes("</body>")
    ? out.replace("</body>", `${PLAIN_MOTION_SCRIPT}</body>`)
    : out + PLAIN_MOTION_SCRIPT;
}
