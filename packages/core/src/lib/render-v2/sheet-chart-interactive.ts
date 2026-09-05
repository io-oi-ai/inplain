/**
 * Sheet 图表交互运行时(零依赖,~2KB)。
 *
 * SSR 出的 ECharts SVG 是静态的(无 tooltip)。这段脚本给带 data-chart 的时序图容器
 * (.plain-chart-hover)挂一个零依赖 tooltip:鼠标在图表区移动 → 按 x 比例算最近数据列 →
 * 浮一个 tooltip 显示该列各 series 的值。还画一条竖直 hover 参考线。
 *
 * 自包含、不依赖 ECharts runtime、不撞 bundle 墙、prefers-reduced-motion 无关(非动画)。
 * data-chart = JSON { x: string[], series: [{name, values}], yFormat? }
 */
export const SHEET_CHART_INTERACTIVE = `
(function(){
  if (typeof document === 'undefined') return;
  // 简易数值格式化(够 tooltip 用 · 千分位 + K/M/B 缩写)
  function fmtNum(n, token){
    if (n == null) return '–';
    var abs = Math.abs(n);
    if (token && /a$/.test(token)) {
      if (abs >= 1e9) return (n/1e9).toFixed(1)+'B';
      if (abs >= 1e6) return (n/1e6).toFixed(1)+'M';
      if (abs >= 1e3) return (n/1e3).toFixed(1)+'K';
    }
    if (token && /^pct/.test(token)) return (n*100).toFixed(1)+'%';
    if (token && /^usd/.test(token)) return '$'+n.toLocaleString();
    return n.toLocaleString();
  }
  function makeTip(){
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;z-index:99999;pointer-events:none;opacity:0;'
      + 'background:rgba(18,20,28,.94);color:#E8EAF6;font:500 11px/1.5 system-ui,sans-serif;'
      + 'padding:7px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.12);'
      + 'box-shadow:0 4px 16px rgba(0,0,0,.4);white-space:nowrap;transition:opacity .08s;backdrop-filter:blur(6px)';
    document.body.appendChild(t);
    return t;
  }
  var tip = null;
  function tipOn(){ if(!tip) tip = makeTip(); return tip; }

  document.querySelectorAll('.plain-chart-hover').forEach(function(box){
    var data;
    try { data = JSON.parse(box.getAttribute('data-chart')); } catch(e){ return; }
    if (!data || !data.x || !data.x.length || !data.series) return;
    var svg = box.querySelector('svg');
    if (!svg) return;
    // 竖直参考线
    var line = document.createElement('div');
    line.style.cssText = 'position:absolute;top:0;bottom:0;width:1px;background:rgba(255,255,255,.25);opacity:0;pointer-events:none';
    box.style.position = 'relative';
    box.appendChild(line);

    box.addEventListener('mousemove', function(ev){
      var r = box.getBoundingClientRect();
      var relX = (ev.clientX - r.left) / r.width;
      // 绘图区左右边界:手写 SVG 给精确比例(plotL/plotR),ECharts 用经验值 8%~92%
      var pL = (typeof data.plotL === 'number') ? data.plotL : 0.08;
      var pR = (typeof data.plotR === 'number') ? data.plotR : 0.92;
      var frac = Math.max(0, Math.min(1, (relX - pL) / (pR - pL)));
      var idx = Math.round(frac * (data.x.length - 1));
      if (idx < 0 || idx >= data.x.length) return;
      var t = tipOn();
      var rows = data.series.map(function(s){
        return '<div style="display:flex;justify-content:space-between;gap:14px">'
          + '<span style="opacity:.7">'+s.name+'</span>'
          + '<span style="font-variant-numeric:tabular-nums">'+fmtNum(s.values[idx], data.yFormat)+'</span></div>';
      }).join('');
      t.innerHTML = '<div style="font-weight:600;margin-bottom:4px">'+data.x[idx]+'</div>'+rows;
      t.style.opacity = '1';
      var tx = ev.clientX + 14, ty = ev.clientY + 14;
      if (tx + t.offsetWidth > window.innerWidth - 8) tx = ev.clientX - t.offsetWidth - 14;
      t.style.left = tx + 'px'; t.style.top = ty + 'px';
      // 参考线位置
      line.style.left = (relX * r.width) + 'px';
      line.style.opacity = '1';
    });
    box.addEventListener('mouseleave', function(){
      if (tip) tip.style.opacity = '0';
      line.style.opacity = '0';
    });
  });
})();
`;
