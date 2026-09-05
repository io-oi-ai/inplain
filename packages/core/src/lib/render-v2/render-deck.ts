/**
 * Plain v2 · Deck renderer
 *
 * 输入:Plain DSL v2 deck source(.md,frontmatter `plain: deck@v2`)
 * 输出:完整 HTML 字符串(可直接 share / 嵌 iframe)
 *
 * 三大职责:
 *   1. 解析 source(parse-dsl) → blocks 列表
 *   2. 每个 section block → 一个 layout HTML 片段(deck-layouts)
 *   3. 拼装外壳(chrome):主题 CSS + nav + watermark + present mode 切换
 */

// V19 · 切到 theme-v3 规则化系统(替代 theme-v2 硬编码 hex 表)
// V29 · compileAnyTheme · 自动判断 V29(5 层 design system)或 legacy
import { compileTheme, getThemeSpec, compileAnyTheme } from "@/lib/theme-v3";
import { parseDsl } from "./parse-dsl";
import { renderDeckSection, DECK_CSS } from "./deck-layouts";
import { BASE_ELEMENTS_CSS } from "./base-elements";
import {
  renderTopNav,
  renderFooterAndWatermark,
  wrapHtml,
  escapeHtml,
  PRESENT_TOGGLE_SCRIPT,
  NAV_ACTION_SCRIPT,
  MERMAID_HYDRATE_SCRIPT,
} from "./chrome";
import { VISUAL_EDIT_SCRIPT } from "@/lib/export/visual-edit-script";
import { DOC_ASK_CSS, DOC_ASK_SCRIPT, renderAskFab, qaShareIdScript } from "./doc-ask";

export type DeckRenderOptions = {
  /** 用户的源 markdown 字符串 */
  source: string;
  /** 强制主题(URL 参数 / 用户切主题选择器)优先于 frontmatter theme */
  themeOverride?: string;
  /** Framer 模式水印:免费/匿名 true,付费 false。默认 true(安全 default) */
  branded?: boolean;
  /** breadcrumb 顶部导航(如 ["DECK", "CLIENT PROPOSAL", "2026.05"]) */
  breadcrumb?: string[];
  /** action 按钮(默认显示「分享」+「导出 .pptx」) */
  actions?: Array<{ label: string; intent?: string; href?: string; primary?: boolean }>;
  /** V25.5 · 嵌入模式 · share view 已有自己 toolbar · 顶栏不渲染 actions
      (breadcrumb + scroll/present 切换仍渲染 · 保留 deck 视觉骨架) */
  embed?: boolean;
  /** 问答「问这个演示」开关 · 默认 true · 显式 false 隐藏 */
  enableQa?: boolean;
  /** 分享页访客问答:传 shareId → 渲染访客模式问答(扣作者账),即使 embed */
  qaShareId?: string;
  /** 竖版社交分享卡(小红书/朋友圈/IG):只渲染第一个 section(封面),固定 3:4,去 nav+水印。
      默认 undefined = 现状不变。见 deck-layouts DECK_CSS 的 [data-plain-social] 段。 */
  socialCard?: "portrait" | null;
};

export function renderDeck(opts: DeckRenderOptions): string {
  const parsed = parseDsl(opts.source);

  // V19 · 主题 resolve · 走 theme-v3 规则化系统(seed → 派生 token,WCAG AA 保证)
  // V29 · compileAnyTheme · 自动识别 V29 ID(v29-biennale 等)走 5 层 spec
  const themeId =
    opts.themeOverride ??
    (typeof parsed.front.theme === "string" ? parsed.front.theme : "monocle");
  const compiled = compileAnyTheme(themeId);

  // 渲染 sections —— deck 只关心 `kind: section`,其他 md / callout 暂忽略
  // V19 · 给每个 section 标 data-plain-path,让 visual-edit-script 能:
  //   1. 点击元素时定位到 source 路径
  //   2. 拖 asset 到 section 时把 src 替换到对应 path
  const sections: string[] = [];
  let sectionIdx = 0;
  for (const b of parsed.blocks) {
    if (b.kind === "section") {
      const html = renderDeckSection(b.name, b.data);
      // V19 · 演讲模式 speakerNotes:把 notes 编成 data-plain-speaker-notes attr,
      // 主体不显示 · PRESENT_TOGGLE_SCRIPT 在 present 模式读它弹浮窗
      const speakerNotes = typeof b.data["speaker-notes"] === "string"
        ? String(b.data["speaker-notes"])
        : typeof b.data.speakerNotes === "string"
          ? String(b.data.speakerNotes)
          : "";
      const notesAttr = speakerNotes
        ? `data-plain-speaker-notes="${escapeHtml(speakerNotes)}" `
        : "";
      const tagged = html.replace(
        /^<section /,
        `<section data-plain-clickable="true" data-plain-path="/sections/${sectionIdx}" data-plain-kind="deck" data-plain-label="${escapeHtml(`第 ${sectionIdx + 1} 页 · ${b.name}`)}" data-plain-section-name="${b.name}" ${notesAttr}`,
      );
      sections.push(tagged);
      sectionIdx += 1;
    }
  }

  const title = String(parsed.front.title ?? "Plain deck");

  // breadcrumb 默认从 frontmatter 推断 [DECK, title 大写]
  const breadcrumb =
    opts.breadcrumb ?? buildDefaultBreadcrumb(title, parsed.front.date);

  // 默认 branded = true(Framer 模式安全 default,免费/匿名都显示水印)
  const branded = opts.branded !== false;

  // 竖版社交卡:只出封面(第一个 section),无 nav/水印/问答。等价于最干净的 embed。
  const isSocial = opts.socialCard === "portrait";
  const sectionsOut = isSocial ? sections.slice(0, 1) : sections;

  // V25.5 embed (share view iframe):宿主页已渲染顶部 toolbar + 右下水印
  //   → iframe 内完全不渲染 nav / footer · 只剩 sections 内容
  // 非 embed 模式(workspace preview / 下载 standalone .html / 老版本)保持双 chrome
  const nav = (opts.embed || isSocial)
    ? ""
    : renderTopNav({
        kind: "deck",
        breadcrumb,
        actions:
          opts.actions ??
          [
            { label: "分享链接", intent: "share" },
            { label: "导出 .pptx", intent: "export-pptx", primary: true },
          ],
        branded,
      });

  const footer = (opts.embed || isSocial)
    ? ""
    : renderFooterAndWatermark({
        kind: "deck",
        branded,
      });

  // 访客模式(qaShareId,扣作者)或作者模式(无 shareId+非 embed,扣自己)。社交卡不带问答。
  const qaOn = opts.enableQa !== false && !isSocial;
  const guestQa = !!opts.qaShareId && qaOn;
  const authorQa = !opts.qaShareId && !opts.embed && qaOn;
  const showQa = guestQa || authorQa;
  const askFab = showQa ? renderAskFab("deck") : "";

  return wrapHtml({
    title,
    kind: "deck",
    themeId: compiled.id,
    themeCss: compiled.css,
    bodyHtml: `${nav}${sectionsOut.join("\n")}${footer}${askFab}`,
    socialCard: isSocial ? "portrait" : null,
    extraHead: `<style>${BASE_ELEMENTS_CSS}</style><style>${DECK_CSS}</style><style>${DOC_ASK_CSS}</style>`,
    extraScripts: PRESENT_TOGGLE_SCRIPT + NAV_ACTION_SCRIPT + VISUAL_EDIT_SCRIPT + MERMAID_HYDRATE_SCRIPT + (showQa ? (guestQa ? qaShareIdScript(opts.qaShareId!) : "") + `<script>${DOC_ASK_SCRIPT}</script>` : ""),
  });
}

function buildDefaultBreadcrumb(title: string, date: unknown): string[] {
  const segs: string[] = ["DECK"];
  if (title) segs.push(title.length > 40 ? title.slice(0, 40) + "…" : title);
  if (typeof date === "string") segs.push(date);
  return segs;
}

// re-export for renderer callers
export { DECK_CSS };
export { renderDeckSection };

// suppress unused (used by re-export above)
void escapeHtml;
