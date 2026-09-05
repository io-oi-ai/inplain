/**
 * iframe 内 theme toggle：右上角浮动按钮，切换 data-theme="light" / "dark"
 * 用 localStorage (scope 到 window.name 或默认 key) 记住用户偏好。
 */
export const THEME_TOGGLE_SCRIPT = `
<style>
  .plain-theme-toggle {
    position: fixed;
    top: 12px;
    right: 12px;
    z-index: 9999;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 1px solid var(--plain-border);
    background: var(--plain-bg-raised);
    color: var(--plain-text-secondary);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    box-shadow: 0 2px 8px rgba(0,0,0,.08);
    transition: transform 0.15s ease, background 0.15s ease;
    -webkit-user-select: none;
    user-select: none;
  }
  .plain-theme-toggle:hover {
    transform: scale(1.05);
  }
  @media print {
    .plain-theme-toggle { display: none !important; }
  }
</style>
<button class="plain-theme-toggle" aria-label="Toggle theme" title="Toggle light / dark"></button>
<script>
(function() {
  var KEY = 'plain.theme';
  var root = document.documentElement;
  var btn = document.querySelector('.plain-theme-toggle');

  function getPref() {
    try { return localStorage.getItem(KEY); } catch { return null; }
  }
  function setPref(v) {
    try { localStorage.setItem(KEY, v); } catch {}
  }
  function apply(theme) {
    root.setAttribute('data-theme', theme);
    if (btn) btn.textContent = theme === 'dark' ? '☀' : '☾';
  }

  var saved = getPref();
  var sysDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  var initial = saved || (sysDark ? 'dark' : 'light');
  apply(initial);

  if (btn) {
    btn.addEventListener('click', function() {
      var current = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      var next = current === 'dark' ? 'light' : 'dark';
      apply(next);
      setPref(next);
    });
  }
})();
</script>
`;
