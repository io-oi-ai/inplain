/**
 * Plain v2 · Doc renderer
 *
 * 输入:Plain DSL v2 doc source(markdown + ::: blocks)
 * 输出:完整 HTML(长文 + 左 TOC + 顶部 sticky nav + 滚动进度条 + 水印)
 */

// V19 · 切到 theme-v3 规则化系统
import { compileAnyTheme } from "@/lib/theme-v3";
import { parseDsl } from "./parse-dsl";
import {
  renderDocSection,
  renderCallout,
  renderMd,
  extractToc,
  DOC_CSS,
} from "./doc-blocks";
import {
  renderTopNav,
  renderFooterAndWatermark,
  wrapHtml,
  escapeHtml,
  escapeAttr,
  SCROLL_PROGRESS_CSS,
  SCROLL_PROGRESS_SCRIPT,
  navActionScript,
  MERMAID_HYDRATE_SCRIPT,
} from "./chrome";
import { VISUAL_EDIT_SCRIPT } from "@/lib/export/visual-edit-script";
import { BASE_ELEMENTS_CSS } from "./base-elements";
import { CODE_BLOCK_CSS, CODE_BLOCK_SCRIPT, renderCodeBlock, renderCodeGroup, parseFenceInfo } from "./code-block";
import { DOC_INTERACTIVE_CSS, renderTabs, renderAccordion, renderSteps, renderCards } from "./doc-interactive";
import { DOC_ASK_CSS, DOC_ASK_SCRIPT, renderAskFab, qaShareIdScript } from "./doc-ask";

export type DocRenderOptions = {
  source: string;
  themeOverride?: string;
  /** Framer 模式水印:默认 true(安全 default,免费/匿名显示水印) */
  branded?: boolean;
  breadcrumb?: string[];
  actions?: Array<{ label: string; intent?: string; href?: string; primary?: boolean }>;
  /** V25.5 · 嵌入模式 · share view 已有自己 toolbar · 顶栏不渲染 actions */
  embed?: boolean;
  /** 文档问答(「问这篇文档」悬浮按钮)开关 · 默认 true(向后兼容) · 显式 false 才隐藏 */
  enableQa?: boolean;
  /** 分享页访客问答:传 shareId → 渲染访客模式问答按钮(扣作者账),即使 embed。
      无此值时:非 embed + enableQa 才渲染作者模式问答(工作台预览,扣自己)。 */
  qaShareId?: string;
};

export function renderDoc(opts: DocRenderOptions): string {
  const parsed = parseDsl(opts.source);

  const themeId =
    opts.themeOverride ??
    (typeof parsed.front.theme === "string" ? parsed.front.theme : "press");
  const compiled = compileAnyTheme(themeId);

  // 顺次渲染 blocks
  const parts: string[] = [];
  let cgSeq = 0;
  for (const b of parsed.blocks) {
    if (b.kind === "md") {
      parts.push(renderMd(b.text));
    } else if (b.kind === "callout") {
      parts.push(renderCallout(b.variant, b.body));
    } else if (b.kind === "section") {
      parts.push(renderDocSection(b.name, b.variant, b.data));
    } else if (b.kind === "code-group") {
      const tabs = b.tabs.map((t) => {
        const { lang, title } = parseFenceInfo(t.info);
        return { label: title || lang.toUpperCase() || "CODE", html: renderCodeBlock(t.code, t.info) };
      });
      parts.push(renderCodeGroup(tabs, `cg${cgSeq++}`));
    } else if (b.kind === "interactive") {
      const sections = b.sections.map((s) => ({ title: s.title, bodyHtml: renderMd(s.body) }));
      if (b.name === "tabs") parts.push(renderTabs(sections, `tb${cgSeq++}`));
      else if (b.name === "accordion") parts.push(renderAccordion(sections));
      else if (b.name === "steps") parts.push(renderSteps(sections));
      else if (b.name === "cards") parts.push(renderCards(sections));
    }
  }

  // 提 TOC(扫文章内 h2)
  let bodyHtml = parts.join("\n");
  const tocResult = extractToc(bodyHtml);
  bodyHtml = tocResult.html;
  const toc = tocResult.toc;

  const tocHtml =
    toc.length > 0
      ? `<aside class="plain-toc">
          <h4>目录</h4>
          <ul>${toc
            .map(
              (t, i) =>
                `<li><a href="#${escapeAttr(t.id)}"${i === 0 ? ' class="active"' : ""}>${escapeHtml(t.text)}</a></li>`,
            )
            .join("")}</ul>
          ${
            typeof parsed.front.author === "string"
              ? `<div class="plain-toc-reading-time">${escapeHtml(`by ${parsed.front.author}`)}</div>`
              : ""
          }
        </aside>`
      : "";

  const title = String(parsed.front.title ?? "Plain doc");

  const breadcrumb =
    opts.breadcrumb ?? buildDefaultBreadcrumb(title, parsed.front.date);

  const branded = opts.branded !== false;
  // V25.5 embed (share view iframe):宿主页已渲染顶部 toolbar + 右下水印
  //   → iframe 内完全不渲染 nav / footer · 只剩内容
  const nav = opts.embed
    ? ""
    : renderTopNav({
        kind: "doc",
        breadcrumb,
        actions:
          opts.actions ??
          [
            { label: "Share link", intent: "share" },
            { label: "Export .docx", intent: "export-docx", primary: true },
          ],
        branded,
      });

  const footer = opts.embed
    ? ""
    : renderFooterAndWatermark({
        kind: "doc",
        branded,
      });

  // 问答渲染规则:
  //   - 访客模式(传 qaShareId):渲染问答按钮 + 注入 shareId(扣作者账),即使 embed
  //   - 作者模式(无 qaShareId):非 embed + enableQa≠false 才渲染(工作台预览,扣自己)
  const qaOn = opts.enableQa !== false;
  const guestQa = !!opts.qaShareId && qaOn;
  const authorQa = !opts.qaShareId && !opts.embed && qaOn;
  const showQa = guestQa || authorQa;
  const askFab = showQa ? renderAskFab("doc") : "";
  const body = `<div class="plain-progress"></div>
${nav}
<div class="plain-doc-container">
  ${tocHtml}
  <article class="plain-article">${bodyHtml}</article>
</div>
${footer}
${askFab}`;

  return wrapHtml({
    title,
    kind: "doc",
    themeId: compiled.id,
    themeCss: compiled.css,
    bodyHtml: body,
    extraHead: `<style>${BASE_ELEMENTS_CSS}</style><style>${DOC_CSS}</style><style>${SCROLL_PROGRESS_CSS}</style><style>${CODE_BLOCK_CSS}</style><style>${DOC_INTERACTIVE_CSS}</style><style>${DOC_ASK_CSS}</style>
<style>
.plain-toc-reading-time {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--plain-rule);
  color: var(--plain-ink-mute);
  font-size: 10px;
}
</style>`,
    extraScripts: SCROLL_PROGRESS_SCRIPT + tocActiveScript() + navActionScript() + VISUAL_EDIT_SCRIPT + MERMAID_HYDRATE_SCRIPT + `<script>${CODE_BLOCK_SCRIPT}</script>` + (showQa ? (guestQa ? qaShareIdScript(opts.qaShareId!) : "") + `<script>${DOC_ASK_SCRIPT}</script>` : ""),
  });
}

function tocActiveScript(): string {
  // TOC scroll-spy(IntersectionObserver)+ active 项自动滚入 TOC 视口 + 平滑点击
  return `<script>
(function() {
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('aside.plain-toc a'));
  if (tocLinks.length === 0) return;
  var map = {};
  var sections = [];
  tocLinks.forEach(function(a) {
    var id = (a.getAttribute('href') || '').replace(/^#/, '');
    var el = id && document.getElementById(id);
    if (el) { map[id] = a; sections.push(el); }
    // 平滑点击滚动
    a.addEventListener('click', function(ev) {
      if (el) { ev.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); history.replaceState(null, '', '#' + id); }
    });
  });
  if (sections.length === 0) return;
  var current = null;
  function setActive(id) {
    if (current === id) return;
    current = id;
    tocLinks.forEach(function(a) { a.classList.remove('active'); });
    var link = map[id];
    if (!link) return;
    link.classList.add('active');
    // active 项滚入 TOC 视口(长 TOC 时跟随)
    var aside = link.closest('aside.plain-toc');
    if (aside && aside.scrollHeight > aside.clientHeight) {
      var lr = link.getBoundingClientRect(), ar = aside.getBoundingClientRect();
      if (lr.top < ar.top + 40 || lr.bottom > ar.bottom - 40) {
        link.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }
  if ('IntersectionObserver' in window) {
    var visible = {};
    var ob = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) visible[e.target.id] = e.boundingClientRect.top;
        else delete visible[e.target.id];
      });
      // 选最靠上的可见 section
      var ids = Object.keys(visible);
      if (ids.length) {
        ids.sort(function(a, b) { return visible[a] - visible[b]; });
        setActive(ids[0]);
      } else {
        // 全不可见(在两个标题之间)→ 取最后一个滚过顶部的
        var top = window.scrollY + 100, best = null;
        sections.forEach(function(s) { if (s.offsetTop <= top) best = s.id; });
        if (best) setActive(best);
      }
    }, { rootMargin: '-80px 0px -70% 0px', threshold: 0 });
    sections.forEach(function(s) { ob.observe(s); });
  }
})();
</script>`;
}

function buildDefaultBreadcrumb(title: string, date: unknown): string[] {
  const segs: string[] = ["DOC"];
  if (title) segs.push(title.length > 40 ? title.slice(0, 40) + "…" : title);
  if (typeof date === "string") segs.push(date);
  return segs;
}
