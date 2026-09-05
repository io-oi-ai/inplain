/**
 * Plain Motion — Deck 进出场动画系统(PR #A3)
 *
 * 设计目标:用纯 CSS keyframes + 共享 IntersectionObserver,在元素进入视口时
 * 触发一次入场动画,零运行时依赖,降级安全。媲美 PowerPoint 进出场动画。
 *
 * 7 种 motion type:
 *   fade / fade-up / fade-down / slide-left / slide-right / zoom / stagger
 *
 * 触发规则:
 *   - 默认所有顶级 section 自动带 `motion="fade-up"`(可在 frontmatter 调)
 *   - frontmatter `motion: false` 关闭所有动画
 *   - frontmatter `motion: { default: "<type>" }` 改默认 motion type
 *   - markdown 里 `<!-- motion:zoom -->` 注释给紧跟的 section 单独指定
 *   - <ul>/<ol> 自动获得 stagger(列表项依次入场)
 *   - 尊重 prefers-reduced-motion(直接给所有 [data-motion] 加 is-visible 跳过动画)
 *
 * 接入:
 *   - MOTION_CSS 追加到 RICH_LAYOUT_CSS 末尾(走主题层,因为 section 在 SVG foreignObject 里)
 *   - MOTION_JS 注入到 deck body 末尾,作为 wrapper 脚本
 *   - normalize.ts 把 frontmatter / 注释转成隐藏的 span marker:
 *     `<span class="plain-motion-marker" data-motion="<type>" hidden></span>`
 *     注入每张 slide 的起始处
 *
 * 注意:Marp 会吃掉 HTML 注释,所以 motion marker 必须用 raw HTML 元素(span)
 * 才能进入渲染产物 DOM。MOTION_JS 在运行时读取每个 section 内第一个
 * `.plain-motion-marker`,把它的 data-motion 提升给 parent section,然后把
 * marker(以及 Marp 把它包装出来的空 <p>)删掉。
 */

/** 全部支持的 motion 类型。供 normalize.ts 校验。 */
export const MOTION_TYPES = [
  "fade",
  "fade-up",
  "fade-down",
  "slide-left",
  "slide-right",
  "zoom",
  "stagger",
] as const;

export type MotionType = (typeof MOTION_TYPES)[number];

export const DEFAULT_MOTION: MotionType = "fade-up";

/** 校验是否合法 motion type。 */
export function isMotionType(s: string): s is MotionType {
  return (MOTION_TYPES as readonly string[]).includes(s);
}

// ─────────────────────────────────────────────────────────────
// MOTION_CSS —— 追加到 RICH_LAYOUT_CSS 末尾,跟随主题进入 SVG foreignObject
// ─────────────────────────────────────────────────────────────
export const MOTION_CSS = `

/* ─────── Plain Motion (PR #A3) ───────
 * 7 种入场动画;CSS-only,IntersectionObserver 触发 .is-visible。
 * 尊重 prefers-reduced-motion:reduce 偏好下不做任何 transform,直接显示。
 */
@media (prefers-reduced-motion: no-preference) {
  [data-motion] {
    opacity: 0;
    transition: opacity 400ms cubic-bezier(0.16,1,0.3,1), transform 400ms cubic-bezier(0.16,1,0.3,1);
    will-change: opacity, transform;
  }
  [data-motion="fade"]        { /* opacity only */ }
  [data-motion="fade-up"]     { transform: translateY(24px); }
  [data-motion="fade-down"]   { transform: translateY(-24px); }
  [data-motion="slide-left"]  { transform: translateX(-40px); }
  [data-motion="slide-right"] { transform: translateX(40px); }
  [data-motion="zoom"]        { transform: scale(0.92); }
  [data-motion].is-visible {
    opacity: 1;
    transform: none;
  }
  /* stagger:容器里的子元素依次 fade-up,delay 80ms 递增 */
  [data-motion="stagger"] {
    opacity: 1; /* 容器本体不动 */
  }
  [data-motion="stagger"] > * {
    opacity: 0;
    transform: translateY(16px);
    transition: opacity 400ms cubic-bezier(0.16,1,0.3,1), transform 400ms cubic-bezier(0.16,1,0.3,1);
    transition-delay: calc(var(--stagger-index, 0) * 80ms);
  }
  [data-motion="stagger"].is-visible > * {
    opacity: 1;
    transform: none;
  }
}
/* prefers-reduced-motion: reduce 下,把 [data-motion] 视为已可见(transition 也清掉) */
@media (prefers-reduced-motion: reduce) {
  [data-motion],
  [data-motion="stagger"] > * {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
}
`;

// ─────────────────────────────────────────────────────────────
// MOTION_JS —— 注入到 deck body 末尾的共享 IntersectionObserver
//
// 体积约束:gzip 后 < 1KB。任务列出的预算 < 3KB minified,绰绰有余。
// ─────────────────────────────────────────────────────────────
export const MOTION_JS = `<script>
(function(){
  var doc = document;
  // 1. 找每个 section 内的 .plain-motion-marker(由 normalize.processDeckMotion 注入),
  //    把它的 data-motion 提升给所在 section,然后把 marker 删掉。
  //    Marp 会把 raw HTML 块包进 <p>,所以 marker 的实际 DOM 结构往往是
  //    <section><p><span class="plain-motion-marker" ...></span></p>...</section>。
  //    顺手把那个空 <p> 也清掉(它只含 marker)。
  doc.querySelectorAll('section .plain-motion-marker').forEach(function(marker){
    var sec = marker.closest('section');
    if (!sec) return;
    var t = marker.getAttribute('data-motion');
    if (t && !sec.hasAttribute('data-motion')) sec.setAttribute('data-motion', t);
    var p = marker.parentElement;
    marker.remove();
    if (p && p.tagName === 'P' && !p.textContent.trim() && p.children.length === 0) {
      p.remove();
    }
  });
  // 2. 兼容路径:如果哪天通过 Marp _class: plain-motion-<type> 也注入了,翻译过来。
  doc.querySelectorAll('section[data-class]').forEach(function(sec){
    if (sec.hasAttribute('data-motion')) return;
    var dc = sec.getAttribute('data-class') || '';
    var m = dc.match(/plain-motion-([a-z-]+)/);
    if (m) sec.setAttribute('data-motion', m[1]);
  });
  // 3. 给 deck 内所有 <ul>/<ol> 自动加 data-motion="stagger"(已显式指定的跳过)。
  doc.querySelectorAll('section ul, section ol').forEach(function(el){
    if (!el.hasAttribute('data-motion')) el.setAttribute('data-motion', 'stagger');
  });
  // 4. a11y 兜底:prefers-reduced-motion 下,跳过 observer 直接全部可见
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    doc.querySelectorAll('[data-motion]').forEach(function(el){ el.classList.add('is-visible'); });
    return;
  }
  // 5. 给 stagger 子元素挂上 index var
  doc.querySelectorAll('[data-motion="stagger"]').forEach(function(el){
    var kids = el.children;
    for (var i = 0; i < kids.length; i++) {
      kids[i].style.setProperty('--stagger-index', String(i));
    }
  });
  // 6. 兜底:没有 IntersectionObserver 直接全部显示
  if (!('IntersectionObserver' in window)) {
    doc.querySelectorAll('[data-motion]').forEach(function(el){ el.classList.add('is-visible'); });
    return;
  }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  doc.querySelectorAll('[data-motion]').forEach(function(el){ io.observe(el); });
})();
</script>`;
