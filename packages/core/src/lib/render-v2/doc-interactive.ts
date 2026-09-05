/**
 * Doc 交互块三件套(对标 GitBook / Mintlify · 零依赖 · 自包含)。
 *
 *  - Tabs    · radio + :checked 兄弟选择器(无 JS),切内容面板
 *  - Accordion · 原生 <details>/<summary>,可折叠,无 JS
 *  - Steps   · 编号竖线步骤(纯 CSS counter)
 *
 * 每块的 body 是 markdown(由 caller 传入 renderMd 渲染好的 HTML)。
 * DSL 在 parse-dsl 用 `## 标题` 切 section,见 splitByH2。
 */
import { escapeHtml, escapeAttr } from "./chrome";

type Section = { title: string; bodyHtml: string };

/** Tabs · radio + :checked 纯 CSS 切换 */
export function renderTabs(sections: Section[], id: string): string {
  if (sections.length === 0) return "";
  const radios = sections
    .map(
      (_, i) =>
        `<input type="radio" name="tb-${escapeAttr(id)}" id="tb-${escapeAttr(id)}-${i}" class="tb-radio"${i === 0 ? " checked" : ""}>`,
    )
    .join("");
  const labels = sections
    .map(
      (s, i) =>
        `<label for="tb-${escapeAttr(id)}-${i}" class="tb-tab">${escapeHtml(s.title)}</label>`,
    )
    .join("");
  const panels = sections
    .map((s) => `<div class="tb-panel">${s.bodyHtml}</div>`)
    .join("");
  return `<div class="plain-tabs">
    ${radios}
    <div class="tb-tabbar">${labels}</div>
    <div class="tb-panels">${panels}</div>
  </div>`;
}

/** Accordion · 原生 <details>,首项默认展开 */
export function renderAccordion(sections: Section[]): string {
  if (sections.length === 0) return "";
  return `<div class="plain-accordion">
    ${sections
      .map(
        (s, i) =>
          `<details class="ac-item"${i === 0 ? " open" : ""}>
            <summary class="ac-summary">${escapeHtml(s.title)}</summary>
            <div class="ac-body">${s.bodyHtml}</div>
          </details>`,
      )
      .join("")}
  </div>`;
}

/** Steps · 编号竖线步骤 */
export function renderSteps(sections: Section[]): string {
  if (sections.length === 0) return "";
  return `<div class="plain-steps">
    ${sections
      .map(
        (s) =>
          `<div class="st-item">
            <div class="st-marker"></div>
            <div class="st-content">
              <div class="st-title">${escapeHtml(s.title)}</div>
              <div class="st-body">${s.bodyHtml}</div>
            </div>
          </div>`,
      )
      .join("")}
  </div>`;
}

/**
 * Cards 网格(图标 + 标题 + 描述 + 可选链接)。
 * 约定:每张卡 title 可写成 `[文字](url)` → 整卡可点击;
 * body 首行若是单个 emoji/图标字符,提为卡图标。
 */
export function renderCards(sections: Section[]): string {
  if (sections.length === 0) return "";
  const cards = sections
    .map((s) => {
      // title 里抽链接 [text](url)
      const linkM = s.title.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      const titleText = linkM ? linkM[1] : s.title;
      const href = linkM ? linkM[2] : "";
      const tag = href ? "a" : "div";
      const hrefAttr = href ? ` href="${escapeAttr(href)}"` : "";
      const arrow = href ? `<span class="cd-arrow">→</span>` : "";
      return `<${tag} class="cd-card${href ? " cd-link" : ""}"${hrefAttr}>
        <div class="cd-title">${escapeHtml(titleText)}${arrow}</div>
        <div class="cd-body">${s.bodyHtml}</div>
      </${tag}>`;
    })
    .join("");
  return `<div class="plain-cards" data-n="${sections.length}">${cards}</div>`;
}

export const DOC_INTERACTIVE_CSS = `
/* Cards 网格 */
.plain-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;margin:1.5rem 0}
.plain-cards .cd-card{display:block;padding:1.1rem 1.2rem;border:1px solid var(--plain-rule,rgba(128,128,128,.18));border-radius:10px;background:var(--plain-surface,rgba(128,128,128,.03));transition:border-color .15s,transform .15s,box-shadow .15s;text-decoration:none;color:inherit}
@media (hover:hover) and (pointer:fine){
.plain-cards .cd-link:hover{border-color:var(--plain-accent,#3b82f6);transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.08)}
.plain-cards .cd-link:hover .cd-arrow{opacity:1;transform:translateX(3px)}
}
.plain-cards .cd-title{font-weight:600;font-size:1rem;margin-bottom:.4rem;display:flex;align-items:center;justify-content:space-between;gap:.5rem}
.plain-cards .cd-arrow{opacity:.4;transition:transform .15s,opacity .15s}
.plain-cards .cd-body{font-size:.88rem;opacity:.78;line-height:1.55}
.plain-cards .cd-body > :first-child{margin-top:0}
.plain-cards .cd-body > :last-child{margin-bottom:0}
/* Tabs */
.plain-tabs{margin:1.5rem 0;border:1px solid var(--plain-rule,rgba(128,128,128,.18));border-radius:10px;overflow:hidden}
.plain-tabs .tb-radio{position:absolute;opacity:0;pointer-events:none}
.plain-tabs .tb-tabbar{display:flex;gap:.15rem;flex-wrap:wrap;padding:.35rem .4rem 0;background:var(--plain-surface,rgba(128,128,128,.05));border-bottom:1px solid var(--plain-rule,rgba(128,128,128,.18))}
.plain-tabs .tb-tab{font-size:.82rem;padding:.45rem .9rem;border-radius:7px 7px 0 0;cursor:pointer;opacity:.6;font-weight:500;transition:opacity .15s,background .15s;color:var(--plain-ink,inherit)}
.plain-tabs .tb-tab:hover{opacity:.9}
.plain-tabs .tb-panel{display:none;padding:1rem 1.2rem}
.plain-tabs .tb-panel > :first-child{margin-top:0}
.plain-tabs .tb-panel > :last-child{margin-bottom:0}
.plain-tabs .tb-radio:nth-of-type(1):checked ~ .tb-tabbar .tb-tab:nth-of-type(1),
.plain-tabs .tb-radio:nth-of-type(2):checked ~ .tb-tabbar .tb-tab:nth-of-type(2),
.plain-tabs .tb-radio:nth-of-type(3):checked ~ .tb-tabbar .tb-tab:nth-of-type(3),
.plain-tabs .tb-radio:nth-of-type(4):checked ~ .tb-tabbar .tb-tab:nth-of-type(4),
.plain-tabs .tb-radio:nth-of-type(5):checked ~ .tb-tabbar .tb-tab:nth-of-type(5),
.plain-tabs .tb-radio:nth-of-type(6):checked ~ .tb-tabbar .tb-tab:nth-of-type(6){opacity:1;background:var(--plain-bg,#fff);box-shadow:inset 0 -2px 0 var(--plain-accent,#3b82f6)}
.plain-tabs .tb-radio:nth-of-type(1):checked ~ .tb-panels .tb-panel:nth-of-type(1),
.plain-tabs .tb-radio:nth-of-type(2):checked ~ .tb-panels .tb-panel:nth-of-type(2),
.plain-tabs .tb-radio:nth-of-type(3):checked ~ .tb-panels .tb-panel:nth-of-type(3),
.plain-tabs .tb-radio:nth-of-type(4):checked ~ .tb-panels .tb-panel:nth-of-type(4),
.plain-tabs .tb-radio:nth-of-type(5):checked ~ .tb-panels .tb-panel:nth-of-type(5),
.plain-tabs .tb-radio:nth-of-type(6):checked ~ .tb-panels .tb-panel:nth-of-type(6){display:block}
/* Accordion */
.plain-accordion{margin:1.5rem 0;border:1px solid var(--plain-rule,rgba(128,128,128,.18));border-radius:10px;overflow:hidden}
.plain-accordion .ac-item{border-bottom:1px solid var(--plain-rule,rgba(128,128,128,.14))}
.plain-accordion .ac-item:last-child{border-bottom:0}
.plain-accordion .ac-summary{cursor:pointer;padding:.85rem 1.1rem;font-weight:600;font-size:.92rem;list-style:none;display:flex;align-items:center;gap:.5rem;transition:background .15s}
.plain-accordion .ac-summary::-webkit-details-marker{display:none}
.plain-accordion .ac-summary::before{content:"›";display:inline-block;transition:transform .2s;opacity:.5;font-size:1.1em}
.plain-accordion .ac-item[open] .ac-summary::before{transform:rotate(90deg)}
.plain-accordion .ac-summary:hover{background:var(--plain-surface,rgba(128,128,128,.05))}
.plain-accordion .ac-body{padding:0 1.1rem 1rem 2.1rem}
.plain-accordion .ac-body > :first-child{margin-top:0}
.plain-accordion .ac-body > :last-child{margin-bottom:0}
/* Steps */
.plain-steps{margin:1.5rem 0;counter-reset:st}
.plain-steps .st-item{display:grid;grid-template-columns:2rem 1fr;gap:.9rem;position:relative;padding-bottom:1.4rem}
.plain-steps .st-item:not(:last-child)::before{content:"";position:absolute;left:.95rem;top:2rem;bottom:0;width:2px;background:var(--plain-rule,rgba(128,128,128,.2))}
.plain-steps .st-marker{width:2rem;height:2rem;border-radius:50%;background:var(--plain-accent,#3b82f6);color:#fff;display:flex;align-items:center;justify-content:center;font-size:.85rem;font-weight:600;z-index:1}
.plain-steps .st-marker::before{counter-increment:st;content:counter(st)}
.plain-steps .st-title{font-weight:600;font-size:.98rem;margin-bottom:.3rem;padding-top:.25rem}
.plain-steps .st-body > :first-child{margin-top:0}
.plain-steps .st-body > :last-child{margin-bottom:0}
`;
