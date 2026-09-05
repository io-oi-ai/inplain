/**
 * V32 · 渲染工具集(从 v31/templates/util.ts 迁入)
 *
 * 迁移背景:v32 统一块架构上线后,v31 只剩这一个文件被 v32 依赖
 * (render-report / block-renderers / 38 个模板)。把活着的符号搬过来,
 * v31 整目录即可删除,不再有 v32 → v31 的反向依赖。
 *
 * 只搬了**仍被引用**的 10 个符号。以下 v31 时代的产物已随旧渲染器一起废弃,
 * 未迁入(实测全库零引用):
 *   wrapDeck / wrapDoc / wrapSheet —— 旧「模板自己出整页 HTML」的外壳,
 *     v32 由 render-report.ts 统一出壳,不需要。
 *   SHEET_BASE_CSS / SHEET_SCALER_JS —— 旧 sheet 独立渲染路径,
 *     v32 的 sheet 是 present mode 的 CSS 分支。
 *   mediaBgStyle —— 旧 media-split 的 background 计算。
 *
 * editAttrs 的 path 语义:v32 用 `/blocks/<blockId>/<field>`(稳定 id),
 * 不是 v31 的数组下标 —— 详见 render-report.ts 与 patch-content route。
 */

export function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


export function escapeAttr(s: unknown): string {
  return escapeHtml(s);
}

/** 把 [a,b,c] 合并成"a · b · c" · 空过滤 */

/** 把 [a,b,c] 合并成"a · b · c" · 空过滤 */
export function pipe(parts: Array<string | null | undefined>): string {
  return parts.filter((s) => s && s.length > 0).join(" · ");
}

/**
 * media-split / image section 的图片 background style 生成器。
 * 支持 crop:cropX(-50~50)/ cropY(-50~50)/ cropScale(1-4)存在 content 里,
 * 渲染时转成 background-position + background-size。
 * 对标 HTML-Slides-Editor 的 pan/scale/object-position 方案,
 * 只是这里用 background-* 而非 <img> object-position(模板统一用 bg-image)。
 *
 * @param src   图片 URL
 * @param opts  crop 参数(可选,未传默认 center/cover)
 */

/**
 * V31 元素级可视编辑 · 给模板里的文本元素打 data-plain-* 属性串
 *
 * 用法(贴进现有标签的开标签,零视觉副作用 — 只加属性):
 *   <h1 class="t-display-hero" ${editAttrs(`/slides/${idx}/display`, "封面大标题")}>${escapeHtml(s.display)}</h1>
 *
 * path = DeckContent 的 JSON Pointer(/slides/{i}/{field} · 数组项 /slides/{i}/items/{j}/{sub})
 * → iframe 里 VISUAL_EDIT_SCRIPT 点中 → postMessage select → InspectorPanel 编辑 →
 *   /api/agent-v31/patch-content 按这个 path 改 content → renderDeck 重渲。
 *
 * opts.text=false 时只可点选(不进 contenteditable),给非纯文本字段用。
 */
export function editAttrs(path: string, label: string, opts?: { text?: boolean }): string {
  const text = opts?.text !== false; // 默认文本可直接 inline 编辑
  return (
    `data-plain-clickable="true" data-plain-kind="deck"` +
    ` data-plain-path="${escapeAttr(path)}"` +
    (text ? ` data-plain-editable="true" data-plain-text-path="${escapeAttr(path)}"` : ``) +
    ` data-plain-label="${escapeAttr(label)}"`
  );
}

/**
 * 通用 viewport-base CSS · 来自 frontend-slides 标准
 *
 * 每个模板的 html 都要 inline 这一段(占位 var(--stage-bg) · 模板覆盖)
 */

/**
 * 通用 viewport-base CSS · 来自 frontend-slides 标准
 *
 * 每个模板的 html 都要 inline 这一段(占位 var(--stage-bg) · 模板覆盖)
 */
export const VIEWPORT_BASE_CSS = `
html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: var(--stage-bg, #000); }
.deck-viewport { position: fixed; inset: 0; overflow: hidden; background: var(--stage-bg, #000); }
.deck-stage {
  position: absolute; left: 0; top: 0;
  width: 1920px; height: 1080px;
  overflow: hidden; transform-origin: 0 0;
  background: var(--slide-bg, #fff);
}
.slide {
  position: absolute; inset: 0;
  width: 1920px; height: 1080px;
  overflow: hidden; display: block;
  visibility: hidden; opacity: 0; pointer-events: none;
  background: var(--slide-bg, #fff);
  /* B · 翻页过渡:横向滑动 + 淡入(不再瞬切) · 非 active 偏移到一侧 */
  transform: translateX(var(--slide-shift, 60px));
  transition: opacity 420ms cubic-bezier(0.22,1,0.36,1), transform 420ms cubic-bezier(0.22,1,0.36,1), visibility 0s linear 420ms;
}
.slide.active {
  visibility: visible; opacity: 1; pointer-events: auto; z-index: 1;
  transform: translateX(0);
  transition: opacity 420ms cubic-bezier(0.22,1,0.36,1), transform 420ms cubic-bezier(0.22,1,0.36,1), visibility 0s;
}
/* 翻页方向:向后翻(prev)时新页从左侧滑入 · JS 切 data-dir 控制 */
.deck-stage[data-dir="prev"] .slide { --slide-shift: -60px; }
.deck-stage[data-dir="next"] .slide { --slide-shift: 60px; }

/* ── A · 长页滚动模式 ──────────────────────────────────
   .deck-viewport.scroll-mode:slide 从 absolute 叠放 → 垂直流式,viewport 可滚动。
   stage 取消 transform scale(改由每个 slide 自己 letterbox),slide 之间留间隔。 */
.deck-viewport.scroll-mode { overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; scroll-behavior: smooth; }
.deck-viewport.scroll-mode .deck-stage {
  position: relative; width: 100%; height: auto; transform: none !important;
  display: flex; flex-direction: column; align-items: center; gap: 0;
  background: var(--stage-bg, #000);
}
.deck-viewport.scroll-mode .slide {
  position: relative; inset: auto;
  visibility: visible; opacity: 1; pointer-events: auto;
  transform: none; transition: none;
  /* 保持 16:9 · 宽度撑满(letterbox 由 aspect-ratio 控),整页缩放交给 CSS scale */
  flex: none;
}
.deck-viewport.scroll-mode .deck-nav { display: none; }
img, video, canvas, svg { max-width: 100%; max-height: 100%; }
.deck-controls { position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); z-index: 1000; }
/* 上/下页按钮 · 固定在 viewport 两侧,不依赖键盘焦点(工作台 iframe 也能翻页) */
.deck-nav { position: fixed; top: 50%; transform: translateY(-50%); z-index: 1000;
  width: 44px; height: 44px; border-radius: 999px; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.42); color: #fff; font-size: 20px; line-height: 1;
  backdrop-filter: blur(6px); transition: background 160ms ease, opacity 160ms ease;
  -webkit-tap-highlight-color: transparent; user-select: none; }
.deck-nav:hover { background: rgba(0,0,0,0.66); }
.deck-nav:disabled { opacity: 0.22; cursor: default; }
.deck-nav-prev { left: 18px; }
.deck-nav-next { right: 18px; }
/* 浏览模式切换(幻灯片 ⇄ 长页滚动) · 右上角 */
.deck-mode-toggle { position: fixed; top: 18px; right: 18px; z-index: 1001;
  height: 34px; padding: 0 14px; border-radius: 999px; border: none; cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(0,0,0,0.42); color: #fff; font: 600 12px/1 system-ui, sans-serif;
  backdrop-filter: blur(6px); transition: background 160ms ease;
  -webkit-tap-highlight-color: transparent; user-select: none; }
.deck-mode-toggle:hover { background: rgba(0,0,0,0.66); }
@media print { .deck-nav, .deck-mode-toggle { display: none !important; } }
@media (prefers-reduced-motion: reduce) {
  .slide { transition: none; }
}
@media print {
  html, body { width: 1920px; height: auto; overflow: visible; background: #fff; }
  .deck-viewport { position: static; overflow: visible; background: #fff; }
  .deck-stage { position: static; width: auto; height: auto; transform: none !important; background: none; }
  .slide { position: static; width: 1920px; height: 1080px; opacity: 1; visibility: visible; page-break-after: always; display: block !important; }
  .deck-controls { display: none !important; }
}
`.trim();

/**
 * 通用 stage scaler script · 把 1920×1080 stage 缩放到 viewport
 * 沿用 frontend-slides 的逻辑 · 让 deck 在任何屏都 letterbox 显示
 */

/**
 * 通用 stage scaler script · 把 1920×1080 stage 缩放到 viewport
 * 沿用 frontend-slides 的逻辑 · 让 deck 在任何屏都 letterbox 显示
 */
export const STAGE_SCALER_JS = `
(function() {
  const stage = document.querySelector('.deck-stage');
  const viewport = document.querySelector('.deck-viewport');
  if (!stage || !viewport) return;
  const slides = Array.from(document.querySelectorAll('.slide'));
  let mode = 'deck'; // 'deck'(幻灯片) | 'scroll'(长页滚动)
  let idx = 0;

  // ── 幻灯片模式:整个 stage letterbox 缩放 ──
  function fitDeck() {
    const w = viewport.clientWidth, h = viewport.clientHeight;
    const s = Math.min(w / 1920, h / 1080);
    const tx = (w - 1920 * s) / 2;
    const ty = (h - 1080 * s) / 2;
    stage.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')';
  }
  // ── 滚动模式:每个 slide 独立缩放占满视口宽 · stage 顺序流式 ──
  // transform:scale 不改 layout box(slide 仍占 1920×1080)→ 用负 margin 把 layout
  //   占位收缩到缩放后的真实视觉尺寸,消除右侧/底部空白。
  function fitScroll() {
    stage.style.transform = 'none';
    const w = viewport.clientWidth;
    const s = w / 1920;
    const scaledH = 1080 * s;
    slides.forEach((sl) => {
      sl.style.transformOrigin = '0 0';
      sl.style.transform = 'scale(' + s + ')';
      // layout 盒原本 1920×1080 → 负 margin 收到 w×scaledH,后面 slide 才贴紧、不溢出
      sl.style.marginRight = (w - 1920) + 'px';
      sl.style.marginBottom = (scaledH - 1080) + 'px';
    });
  }
  function fit() { if (mode === 'scroll') fitScroll(); else fitDeck(); }
  window.addEventListener('resize', fit);

  function show(i) {
    var prev = idx;
    idx = Math.max(0, Math.min(slides.length - 1, i));
    var dir = idx >= prev ? 'next' : 'prev';
    stage.setAttribute('data-dir', dir);
    slides.forEach((s, k) => s.classList.toggle('active', k === idx));
    const pn = document.querySelector('.pagenum');
    if (pn) pn.textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
    const prevBtn = document.querySelector('.deck-nav-prev');
    const nextBtn = document.querySelector('.deck-nav-next');
    if (prevBtn) prevBtn.disabled = idx === 0;
    if (nextBtn) nextBtn.disabled = idx === slides.length - 1;
    if (prev !== idx) {
      try {
        document.querySelectorAll('[data-plain-selected]').forEach(x => x.removeAttribute('data-plain-selected'));
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ source: 'plain-preview', type: 'select-cleared' }, '*');
        }
      } catch (e) {}
    }
  }

  // ── 模式切换 ──
  function setMode(m) {
    if (m === mode) return;
    mode = m;
    const btn = document.querySelector('.deck-mode-toggle');
    if (mode === 'scroll') {
      viewport.classList.add('scroll-mode');
      slides.forEach((s) => s.classList.add('active')); // 全部可见
      if (btn) btn.textContent = '⊞ Slides';
      fitScroll();
      // 滚到当前页
      var cur = slides[idx];
      if (cur) cur.scrollIntoView({ block: 'start' });
    } else {
      viewport.classList.remove('scroll-mode');
      slides.forEach((s) => { s.style.transform = ''; s.style.marginBottom = ''; s.style.marginRight = ''; });
      if (btn) btn.textContent = '☰ Scroll';
      fitDeck();
      show(idx);
    }
  }

  document.addEventListener('keydown', (e) => {
    if (mode === 'scroll') return; // 滚动模式交给浏览器原生滚动
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); show(idx + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); show(idx - 1); }
    else if (e.key === 'Home') { e.preventDefault(); show(0); }
    else if (e.key === 'End') { e.preventDefault(); show(slides.length - 1); }
  });
  // 滚轮翻页(仅幻灯片模式 · 滚动模式走原生滚动)
  let wheelAcc = 0, wheelLock = false;
  viewport.addEventListener('wheel', (e) => {
    if (mode === 'scroll') return;
    e.preventDefault();
    if (wheelLock) return;
    wheelAcc += e.deltaY;
    if (Math.abs(wheelAcc) < 40) return;
    show(idx + (wheelAcc > 0 ? 1 : -1));
    wheelAcc = 0;
    wheelLock = true;
    setTimeout(() => { wheelLock = false; }, 550);
  }, { passive: false });
  // 滚动模式:同步当前页号(滚到哪页更新 pagenum)
  viewport.addEventListener('scroll', () => {
    if (mode !== 'scroll') return;
    var mid = viewport.scrollTop + viewport.clientHeight / 2;
    var acc = 0;
    for (var k = 0; k < slides.length; k++) {
      var h = slides[k].getBoundingClientRect().height;
      if (mid >= acc && mid < acc + h) { idx = k; break; }
      acc += h;
    }
    var pn = document.querySelector('.pagenum');
    if (pn) pn.textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
  }, { passive: true });

  const prevBtn = document.querySelector('.deck-nav-prev');
  const nextBtn = document.querySelector('.deck-nav-next');
  if (prevBtn) prevBtn.addEventListener('click', () => show(idx - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => show(idx + 1));
  const modeBtn = document.querySelector('.deck-mode-toggle');
  if (modeBtn) modeBtn.addEventListener('click', () => setMode(mode === 'deck' ? 'scroll' : 'deck'));

  try { if (stage) stage.classList.add('anim-ready'); } catch(e) {}
  fitDeck();
  show(0);
})();
`.trim();

/**
 * Google Fonts preconnect + load 一组 family
 * 每个模板自己列要的 family
 */

/**
 * Google Fonts preconnect + load 一组 family
 * 每个模板自己列要的 family
 */
export function fontLinks(families: string[]): string {
  const q = families
    .map((f) => "family=" + f.replace(/ /g, "+"))
    .join("&");
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?${q}&display=swap" rel="stylesheet">`;
}

/**
 * Deck 翻页入场动效:切到某页(.slide.active)时,页内顶层元素错落淡入上移。
 * 纯 CSS · .active class 触发(deck 翻页本就切 active)· 不碰 layout(只 opacity/transform)·
 * reduced-motion 全降级。切走的页 reset 回初始,下次翻回来重新播。
 */

/**
 * Deck 翻页入场动效:切到某页(.slide.active)时,页内顶层元素错落淡入上移。
 * 纯 CSS · .active class 触发(deck 翻页本就切 active)· 不碰 layout(只 opacity/transform)·
 * reduced-motion 全降级。切走的页 reset 回初始,下次翻回来重新播。
 */
export const DECK_PAGE_ANIM_CSS = `
@media (prefers-reduced-motion: no-preference) {
  /* 仅 JS 接管(.anim-ready)后启用 → 无 JS/JS 挂时元素默认可见,绝不白屏 */
  .deck-stage.anim-ready .slide > * {
    opacity: 0;
    transform: translateY(18px);
    transition: opacity 0.55s cubic-bezier(0.16,1,0.3,1), transform 0.55s cubic-bezier(0.16,1,0.3,1);
  }
  .deck-stage.anim-ready .slide.active > * { opacity: 1; transform: none; }
  /* 顶层块逐个 stagger(切页时错落入场,最多 6 个) */
  .deck-stage.anim-ready .slide.active > *:nth-child(1){transition-delay:.06s}
  .deck-stage.anim-ready .slide.active > *:nth-child(2){transition-delay:.14s}
  .deck-stage.anim-ready .slide.active > *:nth-child(3){transition-delay:.22s}
  .deck-stage.anim-ready .slide.active > *:nth-child(4){transition-delay:.30s}
  .deck-stage.anim-ready .slide.active > *:nth-child(5){transition-delay:.38s}
  .deck-stage.anim-ready .slide.active > *:nth-child(6){transition-delay:.46s}
}
/* 打印 / 导出:所有页元素强制可见(不靠 active) */
@media print {
  .slide > * { opacity: 1 !important; transform: none !important; }
}
`.trim();

/**
 * Doc base CSS · 长文 article container · max 720px 居中 · 标准 article 容器
 * 模板自家 themeCss 之后再叠 · 模板覆盖 var(--font-*) + 颜色变量后就长出 DNA
 */
export const DOC_BASE_CSS = `
html {
  /* 长页滚动质感(零依赖):锚点平滑跳转 + iOS 惯性 + 边界回弹收敛 */
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
  scroll-padding-top: 24px;
}
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
html, body { margin: 0; padding: 0; background: var(--doc-page-bg, var(--slide-bg, #fff)); color: var(--doc-text, #1a1a1a); }
body { min-height: 100vh; }
.doc-page { width: 100%; min-height: 100vh; padding: 80px 24px 120px; box-sizing: border-box; }
.doc-article { max-width: 720px; margin: 0 auto; }
.doc-article > * + * { margin-top: 24px; }
@media print {
  html, body { background: #fff; }
  .doc-page { padding: 48px 24px; }
}
`.trim();

/** 简单 line/area/bar SVG · 给 sheet PanelChart 用 · stroke / fill 模板自定 */
export function renderMiniChart(opts: {
  variant: "line" | "bar" | "area" | "bar-stack" | "pie" | "scatter";
  x: Array<string | number>;
  series: Array<{ name: string; data: number[] }>;
  width: number;
  height: number;
  stroke: string;
  fill?: string;
  axis?: string;
  text?: string;
}): string {
  const W = opts.width;
  const H = opts.height;
  const padL = 44, padR = 16, padT = 12, padB = 28;
  const innerW = Math.max(10, W - padL - padR);
  const innerH = Math.max(10, H - padT - padB);
  const allVals = opts.series.flatMap((s) => s.data);
  const maxV = allVals.length ? Math.max(...allVals) : 1;
  const minV = Math.min(0, ...allVals);
  const range = maxV - minV || 1;
  const n = Math.max(opts.x.length, 1);
  const xAt = (i: number) => padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yAt = (v: number) => padT + innerH - ((v - minV) / range) * innerH;
  const axis = opts.axis ?? opts.stroke;
  const text = opts.text ?? opts.stroke;
  const fill = opts.fill ?? opts.stroke;

  const grid = `
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + innerH}" stroke="${axis}" stroke-width="1" opacity="0.4"/>
    <line x1="${padL}" y1="${padT + innerH}" x2="${padL + innerW}" y2="${padT + innerH}" stroke="${axis}" stroke-width="1" opacity="0.4"/>
  `;
  const xLabels = opts.x
    .map((xv, i) => {
      if (n > 8 && i % Math.ceil(n / 6) !== 0 && i !== n - 1) return "";
      return `<text x="${xAt(i)}" y="${padT + innerH + 18}" font-size="10" fill="${text}" text-anchor="middle" opacity="0.7">${escapeHtml(String(xv))}</text>`;
    })
    .join("");
  const yTicks = [0, 0.5, 1]
    .map((t) => {
      const v = minV + range * t;
      const yy = yAt(v);
      const lbl = Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0);
      return `<text x="${padL - 6}" y="${yy + 3}" font-size="10" fill="${text}" text-anchor="end" opacity="0.7">${escapeHtml(lbl)}</text>`;
    })
    .join("");

  if (opts.variant === "bar" || opts.variant === "bar-stack") {
    const barW = (innerW / n) * 0.62;
    const stackCount = opts.variant === "bar-stack" ? opts.series.length : 1;
    const bars = opts.x
      .map((xv, i) => {
        let cumY = padT + innerH;
        return opts.series
          .map((s, sIdx) => {
            const v = s.data[i] ?? 0;
            const h = ((v - minV) / range) * innerH / (opts.variant === "bar" ? opts.series.length : 1);
            // data-* 给通用 tooltip 读;class pl-bar 给 hover 高亮 + 进场升起动画(transform-origin 底边)
            const dataAttrs = `class="pl-bar" data-v="${v}" data-label="${escapeAttr(String(xv))}" data-series="${escapeAttr(s.name)}"`;
            if (opts.variant === "bar") {
              const subBarW = barW / opts.series.length;
              const x = xAt(i) - barW / 2 + sIdx * subBarW;
              const y = padT + innerH - h;
              const op = 1 - sIdx * 0.25;
              return `<rect ${dataAttrs} x="${x}" y="${y}" width="${subBarW - 2}" height="${h}" fill="${fill}" opacity="${op}" style="transform-box:fill-box;transform-origin:center bottom;"/>`;
            } else {
              const y = cumY - h;
              cumY = y;
              const op = 1 - sIdx * 0.18;
              return `<rect ${dataAttrs} x="${xAt(i) - barW / 2}" y="${y}" width="${barW}" height="${h}" fill="${fill}" opacity="${op}" style="transform-box:fill-box;transform-origin:center bottom;"/>`;
            }
          })
          .join("");
      })
      .join("");
    void stackCount;
    return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${grid}${yTicks}${bars}${xLabels}</svg>`;
  }

  if (opts.variant === "pie") {
    const cx = W / 2, cy = H / 2 + 6;
    const r = Math.min(W, H) / 2 - 24;
    const data = opts.series[0]?.data ?? [];
    const total = data.reduce((a, b) => a + b, 0) || 1;
    let acc = 0;
    const labels = opts.x;
    const slices = data
      .map((v, i) => {
        const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
        acc += v;
        const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
        const large = end - start > Math.PI ? 1 : 0;
        const x1 = cx + r * Math.cos(start);
        const y1 = cy + r * Math.sin(start);
        const x2 = cx + r * Math.cos(end);
        const y2 = cy + r * Math.sin(end);
        const op = 1 - i * 0.18;
        const pct = ((v / total) * 100).toFixed(0);
        return `<path class="pl-slice" data-v="${v}" data-label="${escapeAttr(String(labels[i] ?? ""))}" data-series="${pct}%" d="M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} Z" fill="${fill}" opacity="${op}"/>`;
      })
      .join("");
    return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${slices}</svg>`;
  }

  if (opts.variant === "scatter") {
    const dots = opts.series
      .flatMap((s, sIdx) =>
        s.data.map((v, i) => {
          const op = 1 - sIdx * 0.25;
          return `<circle class="pl-dot" data-v="${v}" data-label="${escapeAttr(String(opts.x[i] ?? ""))}" data-series="${escapeAttr(s.name)}" cx="${xAt(i)}" cy="${yAt(v)}" r="4" fill="${fill}" opacity="${op}"/>`;
        }),
      )
      .join("");
    return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${grid}${yTicks}${dots}${xLabels}</svg>`;
  }

  // line / area
  const paths = opts.series
    .map((s, sIdx) => {
      const pts = s.data.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ");
      const op = 1 - sIdx * 0.25;
      const areaPath =
        opts.variant === "area"
          ? `<polygon points="${xAt(0)},${padT + innerH} ${pts} ${xAt(s.data.length - 1)},${padT + innerH}" fill="${fill}" opacity="${0.18 * op}"/>`
          : "";
      const line = `<polyline class="pl-line" points="${pts}" fill="none" stroke="${opts.stroke}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" opacity="${op}"/>`;
      const dots = s.data
        .map((v, i) => `<circle class="pl-dot" data-v="${v}" data-label="${escapeAttr(String(opts.x[i] ?? ""))}" data-series="${escapeAttr(s.name)}" cx="${xAt(i)}" cy="${yAt(v)}" r="3" fill="${opts.stroke}" opacity="${op}"/>`)
        .join("");
      return areaPath + line + dots;
    })
    .join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${grid}${yTicks}${paths}${xLabels}</svg>`;
}