/**
 * Mermaid 图表支持。
 *
 * 策略:**客户端渲染**。服务端只负责把 ```mermaid 代码块改写成 <pre class="mermaid">,
 * iframe 里注入 mermaid.js CDN + init 脚本,浏览器自己渲染成 SVG。
 *
 * - 零服务端开销,Marp/Doc/Sheet 三条路径统一
 * - Mermaid 自己是 ~1MB,按需 defer 加载,不阻塞首屏
 * - 明暗主题:init 时读 document[data-theme],自动选色
 */

/**
 * 把 source 里的 ```mermaid 代码块改成 <pre class="mermaid">...</pre>,
 * 其他代码块不动。返回 { src, hasMermaid }。
 *
 * 只在 Doc / Sheet 直接 render markdown 时用;Marp 场景 Marp 自己会处理代码块,
 * 改写时机不同(见 route.ts 的 deck 分支)。
 */
export function extractMermaidBlocks(src: string): { src: string; hasMermaid: boolean } {
  let hit = false;
  const out = src.replace(
    /```mermaid\n([\s\S]*?)```/g,
    (_m, code) => {
      hit = true;
      return `<pre class="mermaid">${escapeHtml(code.trim())}</pre>`;
    },
  );
  return { src: out, hasMermaid: hit };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** iframe 里的 Mermaid 启动脚本。注入到 body 末尾。 */
export const MERMAID_SCRIPT = `
<script type="module">
  // 按需加载 mermaid:只有页面含 .mermaid 节点才加
  if (document.querySelector('.mermaid')) {
    try {
      const { default: mermaid } = await import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs');
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'neutral',
        fontFamily: 'Inter, "PingFang SC", system-ui, sans-serif',
        themeVariables: {
          primaryColor: isDark ? '#60a5fa' : '#2563eb',
          primaryTextColor: isDark ? '#ededed' : '#1a1a1a',
          lineColor: isDark ? '#60a5fa' : '#2563eb',
        },
      });
      await mermaid.run({ querySelector: '.mermaid' });
    } catch (e) {
      console.warn('[mermaid] failed to load:', e);
    }
  }
</script>
`;

/** Mermaid 节点的统一样式:容器居中,防换行影响图形。 */
export const MERMAID_CSS = `
.mermaid {
  display: flex;
  justify-content: center;
  margin: 24px 0;
  background: transparent;
  font-family: inherit;
}
.mermaid svg { max-width: 100%; height: auto; }
`;
