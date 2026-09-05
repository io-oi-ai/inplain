/**
 * Deck 动效脚本：IntersectionObserver 触发入场 + 页内元素 stagger。
 * Gamma 风：低饱和度、短时长、自然曲线；不让用户晕。
 *
 * 默认开启；在 iframe URL param `?anim=0` 或 localStorage key plain.anim=off 时关闭。
 */
export const DECK_ANIM_SCRIPT = `
<style>
  @media (prefers-reduced-motion: reduce) {
    [data-plain-anim] { transition: none !important; }
  }

  /* 每张 slide 初始态 */
  .marpit > svg {
    opacity: 0;
    transform: translateY(16px) scale(0.985);
    transition:
      opacity 0.55s cubic-bezier(0.2, 0.8, 0.2, 1),
      transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1);
    will-change: opacity, transform;
  }
  .marpit > svg.plain-in {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  /* 页内元素 stagger */
  .marpit > svg h1, .marpit > svg h2, .marpit > svg h3,
  .marpit > svg p, .marpit > svg li, .marpit > svg blockquote,
  .marpit > svg pre, .marpit > svg table {
    opacity: 0;
    transform: translateY(8px);
    transition:
      opacity 0.45s cubic-bezier(0.2, 0.8, 0.2, 1),
      transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .marpit > svg.plain-in h1,
  .marpit > svg.plain-in h2,
  .marpit > svg.plain-in h3,
  .marpit > svg.plain-in p,
  .marpit > svg.plain-in li,
  .marpit > svg.plain-in blockquote,
  .marpit > svg.plain-in pre,
  .marpit > svg.plain-in table {
    opacity: 1;
    transform: translateY(0);
  }

  /* 动效关闭态（通过 html[data-anim="off"]） */
  html[data-anim="off"] .marpit > svg,
  html[data-anim="off"] .marpit > svg * {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }

  /* 进度条入场从 0 填充 */
  .marpit > svg .plain-progress-fill { width: 0 !important; }
  .marpit > svg.plain-in .plain-progress-fill {
    width: var(--plain-progress-target, 0%) !important;
  }
  html[data-anim="off"] .plain-progress-fill {
    transition: none !important;
  }

  /* Timeline 节点按序亮起 */
  .marpit > svg .plain-timeline-node {
    opacity: 0.25;
    transition: opacity 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .marpit > svg.plain-in .plain-timeline-node { opacity: 1; }

  /* 数字 / stat value 从半透明 → 实 */
  .marpit > svg .plain-stat-value,
  .marpit > svg .plain-spark-value {
    opacity: 0;
    transition: opacity 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .marpit > svg.plain-in .plain-stat-value,
  .marpit > svg.plain-in .plain-spark-value { opacity: 1; }
</style>
<script>
(function() {
  var root = document.documentElement;
  var KEY = 'plain.anim';

  // 检查 localStorage + URL param
  try {
    var saved = localStorage.getItem(KEY);
    var urlParam = new URLSearchParams(location.search).get('anim');
    if (saved === 'off' || urlParam === '0') {
      root.setAttribute('data-anim', 'off');
      return;
    }
  } catch {}

  // 给每个 section 内的关键元素错开延迟
  function applyStagger() {
    var slides = document.querySelectorAll('.marpit > svg');
    slides.forEach(function(s) {
      var children = s.querySelectorAll(
        'h1, h2, h3, p, li, blockquote, pre, table'
      );
      children.forEach(function(el, i) {
        var delay = Math.min(i * 80, 600); // 最多 600ms 累计延迟
        el.style.transitionDelay = delay + 'ms';
      });
      // timeline 节点依次亮起
      s.querySelectorAll('.plain-timeline-node').forEach(function(el, i) {
        el.style.transitionDelay = (200 + i * 120) + 'ms';
      });
      // stats 卡片 value 依次出现
      s.querySelectorAll('.plain-stat-value, .plain-spark-value').forEach(function(el, i) {
        el.style.transitionDelay = (300 + i * 120) + 'ms';
      });
      // progress fill 延迟触发
      s.querySelectorAll('.plain-progress-fill').forEach(function(el, i) {
        var target = el.getAttribute('data-target') || '0';
        el.style.setProperty('--plain-progress-target', target + '%');
        el.style.transitionDelay = (400 + i * 150) + 'ms';
      });
    });
  }

  /** 数字从 0 滚到目标值。仅对纯数字 + 千分位 + 可选 % 的 value 生效。 */
  function animateCountUp(el) {
    var raw = (el.textContent || '').trim();
    // 支持 "12,345" / "82%" / "12,345 万元" / "+25%"
    var m = raw.match(/^([-+]?[0-9,\.]+)(\\s*\\S*)?$/);
    if (!m) return;
    var numStr = m[1].replace(/,/g, '');
    var target = parseFloat(numStr);
    if (!Number.isFinite(target)) return;
    var suffix = (m[2] || '').trim();
    var decimals = (numStr.split('.')[1] || '').length;
    var duration = 900;
    var start = performance.now();
    var fmt = function(n) {
      var s = n.toFixed(decimals);
      // 千分位
      var parts = s.split('.');
      parts[0] = parts[0].replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',');
      return parts.join('.') + (suffix ? ' ' + suffix : '');
    };
    function step(now) {
      var t = Math.min(1, (now - start) / duration);
      // easeOutExpo
      var eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      el.textContent = fmt(target * eased);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function animateSlide(slide) {
    // countUp 仅对 stat / spark value
    slide.querySelectorAll('.plain-stat-value, .plain-spark-value').forEach(function(el, i) {
      setTimeout(function() { animateCountUp(el); }, 300 + i * 120);
    });
  }

  // IntersectionObserver：滚到视口触发入场
  function observe() {
    var slides = document.querySelectorAll('.marpit > svg');
    if (slides.length === 0) return;

    // 首屏立即展示（避免空白感）
    if (slides[0]) {
      requestAnimationFrame(function() {
        slides[0].classList.add('plain-in');
        animateSlide(slides[0]);
      });
    }

    if (!('IntersectionObserver' in window)) {
      // 兜底：直接全部显示
      slides.forEach(function(s) { s.classList.add('plain-in'); animateSlide(s); });
      return;
    }

    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting && !e.target.classList.contains('plain-in')) {
          e.target.classList.add('plain-in');
          animateSlide(e.target);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

    slides.forEach(function(s, i) {
      if (i === 0) return; // 首屏已处理
      io.observe(s);
    });
  }

  function init() {
    applyStagger();
    observe();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    requestAnimationFrame(init);
  }
})();
</script>
`;
