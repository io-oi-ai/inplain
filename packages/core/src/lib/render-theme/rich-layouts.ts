/**
 * 富 layout 渲染:stats / timeline / image-hero / image-split。
 *
 * 策略:
 * 在 Marp 渲染之前,把 <!-- plain-data:xxx --> JSON 块展开成 HTML,
 * 同时把 <!-- layout:xxx --> 转成 Marp 的 class directive `<!-- _class: xxx -->`,
 * 这样 CSS 能按 class 区分排版。
 *
 * Marp 支持 html:true,所以我们可以直接往 slide markdown 里插 <div>。
 */

import type {
  StatCard,
  TimelineItem,
  SlideImage,
  Callout,
  ProgressItem,
  ComparePair,
  QuoteBlock,
  Profile,
  CodeBlock,
  Sparkline,
  ActDivider,
  PipelineStep,
  ArticleSpread,
  EditorLetter,
  PhotoEssay,
  DataFeature,
  SidebarStory,
  PullQuoteBreak,
  QuadrantData,
  WaterfallData,
  VennData,
  SwimlaneData,
  LayerStackData,
} from "@/lib/agents/types";

/**
 * 从源 markdown 扫出所有富 slide 的数据,按 slide 顺序返回。
 * 返回的是全部 slide 的列表(包括普通 slide 为 null),下标和 Marp 输出的 section 对齐。
 */
export type RichSlideData =
  | { layout: "stats"; data: StatCard[] }
  | { layout: "timeline"; data: TimelineItem[] }
  | { layout: "image-hero" | "image-split"; data: SlideImage }
  | { layout: "callout"; data: Callout }
  | { layout: "progress"; data: ProgressItem[] }
  | { layout: "compare"; data: ComparePair }
  | { layout: "quote-block"; data: QuoteBlock }
  | { layout: "profile"; data: Profile[] }
  | { layout: "code"; data: CodeBlock }
  | { layout: "sparkline"; data: Sparkline[] }
  | { layout: "act-divider"; data: ActDivider }
  | { layout: "pipeline"; data: PipelineStep[] }
  | { layout: "hero-question"; data: null }
  | { layout: "article-spread"; data: ArticleSpread }
  | { layout: "editor-letter"; data: EditorLetter }
  | { layout: "photo-essay"; data: PhotoEssay }
  | { layout: "data-feature"; data: DataFeature }
  | { layout: "sidebar-story"; data: SidebarStory }
  | { layout: "pull-quote-break"; data: PullQuoteBreak }
  | { layout: "quadrant"; data: QuadrantData }
  | { layout: "waterfall"; data: WaterfallData }
  | { layout: "venn"; data: VennData }
  | { layout: "swimlane"; data: SwimlaneData }
  | { layout: "layer-stack"; data: LayerStackData }
  | null;

export function extractRichSlides(src: string): RichSlideData[] {
  const body = src.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, ""); // 去 frontmatter
  const chunks = body.split(/\n[ \t]*---[ \t]*\n/).map((c) => c.trim()).filter(Boolean);
  return chunks.map((chunk) => {
    const layoutMatch = chunk.match(/<!--\s*layout:([a-z-]+)\s*-->/);
    const layout = layoutMatch?.[1];
    if (!layout) return null;
    if (layout === "stats") {
      const data = parseJsonBlock<StatCard[]>(chunk, "stats");
      return data ? { layout: "stats", data } : null;
    }
    if (layout === "timeline") {
      const data = parseJsonBlock<TimelineItem[]>(chunk, "timeline");
      return data ? { layout: "timeline", data } : null;
    }
    if (layout === "image-hero" || layout === "image-split") {
      const data = parseJsonBlock<SlideImage>(chunk, "image");
      return data ? { layout, data } : null;
    }
    if (layout === "callout") {
      const data = parseJsonBlock<Callout>(chunk, "callout");
      return data ? { layout, data } : null;
    }
    if (layout === "progress") {
      const data = parseJsonBlock<ProgressItem[]>(chunk, "progress");
      return data ? { layout, data } : null;
    }
    if (layout === "compare") {
      const data = parseJsonBlock<ComparePair>(chunk, "compare");
      return data ? { layout, data } : null;
    }
    if (layout === "quote-block") {
      const data = parseJsonBlock<QuoteBlock>(chunk, "quote-block");
      return data ? { layout, data } : null;
    }
    if (layout === "profile") {
      const data = parseJsonBlock<Profile[]>(chunk, "profiles");
      return data ? { layout, data } : null;
    }
    if (layout === "code") {
      const data = parseJsonBlock<CodeBlock>(chunk, "code");
      return data ? { layout, data } : null;
    }
    if (layout === "sparkline") {
      const data = parseJsonBlock<Sparkline[]>(chunk, "sparklines");
      return data ? { layout, data } : null;
    }
    if (layout === "act-divider") {
      const data = parseJsonBlock<ActDivider>(chunk, "act-divider");
      return data ? { layout, data } : null;
    }
    if (layout === "pipeline") {
      const data = parseJsonBlock<PipelineStep[]>(chunk, "pipeline");
      return data ? { layout, data } : null;
    }
    if (layout === "hero-question") {
      return { layout, data: null };
    }
    if (layout === "article-spread") {
      const data = parseJsonBlock<ArticleSpread>(chunk, "article-spread");
      return data ? { layout, data } : null;
    }
    if (layout === "editor-letter") {
      const data = parseJsonBlock<EditorLetter>(chunk, "editor-letter");
      return data ? { layout, data } : null;
    }
    if (layout === "photo-essay") {
      const data = parseJsonBlock<PhotoEssay>(chunk, "photo-essay");
      return data ? { layout, data } : null;
    }
    if (layout === "data-feature") {
      const data = parseJsonBlock<DataFeature>(chunk, "data-feature");
      return data ? { layout, data } : null;
    }
    if (layout === "sidebar-story") {
      const data = parseJsonBlock<SidebarStory>(chunk, "sidebar-story");
      return data ? { layout, data } : null;
    }
    if (layout === "pull-quote-break") {
      const data = parseJsonBlock<PullQuoteBreak>(chunk, "pull-quote-break");
      return data ? { layout, data } : null;
    }
    if (layout === "quadrant") {
      const data = parseJsonBlock<QuadrantData>(chunk, "quadrant");
      return data ? { layout, data } : null;
    }
    if (layout === "waterfall") {
      const data = parseJsonBlock<WaterfallData>(chunk, "waterfall");
      return data ? { layout, data } : null;
    }
    if (layout === "venn") {
      const data = parseJsonBlock<VennData>(chunk, "venn");
      return data ? { layout, data } : null;
    }
    if (layout === "swimlane") {
      const data = parseJsonBlock<SwimlaneData>(chunk, "swimlane");
      return data ? { layout, data } : null;
    }
    if (layout === "layer-stack") {
      const data = parseJsonBlock<LayerStackData>(chunk, "layer-stack");
      return data ? { layout, data } : null;
    }
    return null;
  });
}

function parseJsonBlock<T>(chunk: string, kind: string): T | null {
  const re = new RegExp(`<!--\\s*plain-data:${kind}\\s*\\n([\\s\\S]*?)\\n\\s*-->`);
  const m = chunk.match(re);
  if (!m) return null;
  try { return JSON.parse(m[1]) as T; } catch { return null; }
}

/**
 * 在 source level 处理富 layout:把 `<!-- layout:xxx -->` 和 `<!-- tone:xxx -->`
 * 合并成一个 Marp `<!-- _class: plain-layout-xxx plain-tone-xxx -->` class directive。
 *
 * 处理顺序很重要:必须按 slide 拆开,在每个 slide 里收集 layout + tone,合成一行
 * `_class:` 指令(Marp 的 `_class` 只对当前 slide 生效,但同一 slide 多个 `_class` 会
 * 覆盖,所以必须合并)。
 */
export function expandRichLayouts(src: string): string {
  // 按行首 --- 切 slide(保留 frontmatter 在第 0 块)
  const parts = src.split(/(\n[ \t]*---[ \t]*\n)/);
  return parts
    .map((part, i) => {
      // 偶数下标是内容,奇数下标是分隔符
      if (i % 2 === 1) return part;
      // 跳过 frontmatter(第 0 块如果以 --- 开头并含 marp:)
      if (i === 0 && /^---\s*\nmarp:/m.test(part)) return part;

      const layoutMatch = part.match(/<!--\s*layout:([a-z-]+)\s*-->/);
      const toneMatch = part.match(/<!--\s*tone:(hero-dark|hero-light|light|dark)\s*-->/);
      // cover variants: orthogonal hero-page styling (gradient / mesh / spotlight / grid / tape / photo)
      const coverMatch = part.match(/<!--\s*cover:(gradient|mesh|spotlight|grid|tape|photo)\s*-->/);
      if (!layoutMatch && !toneMatch && !coverMatch) return part;

      const classes: string[] = [];
      if (layoutMatch) classes.push(`plain-layout-${layoutMatch[1]}`);
      if (toneMatch) classes.push(`plain-tone-${toneMatch[1]}`);
      if (coverMatch) classes.push(`plain-cover-${coverMatch[1]}`);

      // 选哪条注释作 anchor 替换成 _class 指令:layout > cover > tone(任一存在即可)
      let out = part;
      const anchor = layoutMatch
        ? /<!--\s*layout:[a-z-]+\s*-->/
        : coverMatch
          ? /<!--\s*cover:(gradient|mesh|spotlight|grid|tape|photo)\s*-->/
          : /<!--\s*tone:(hero-dark|hero-light|light|dark)\s*-->/;
      out = out.replace(anchor, `<!-- _class: ${classes.join(" ")} -->`);
      // 清掉残留 tone / cover 注释(以防一条 slide 上写了多个)
      out = out.replace(/<!--\s*tone:(hero-dark|hero-light|light|dark)\s*-->\s*\n?/g, "");
      out = out.replace(/<!--\s*cover:(gradient|mesh|spotlight|grid|tape|photo)\s*-->\s*\n?/g, "");
      return out;
    })
    .join("");
}

/**
 * 在 Marp 渲染完的 HTML 里,为每个 section.plain-layout-xxx 注入对应的富内容。
 * 做法:按 section 的 id 顺序和 extractRichSlides 拿到的 RichSlideData 对齐。
 */
export function postProcessRichLayouts(html: string, richData: RichSlideData[]): string {
  let idx = -1;
  return html.replace(
    /<section\b([^>]*)>([\s\S]*?)<\/section>/g,
    (_m, attrs: string, inner: string) => {
      idx += 1;
      const data = richData[idx];
      if (!data) return `<section${attrs}>${inner}</section>`;
      let richHtml = "";
      if (data.layout === "stats") richHtml = renderStats(data.data);
      else if (data.layout === "timeline") richHtml = renderTimeline(data.data);
      else if (data.layout === "image-hero" || data.layout === "image-split") {
        richHtml = renderImage(data.data, data.layout);
      }
      else if (data.layout === "callout") richHtml = renderCallout(data.data);
      else if (data.layout === "progress") richHtml = renderProgress(data.data);
      else if (data.layout === "compare") richHtml = renderCompare(data.data);
      else if (data.layout === "quote-block") richHtml = renderQuoteBlock(data.data);
      else if (data.layout === "profile") richHtml = renderProfiles(data.data);
      else if (data.layout === "code") richHtml = renderCode(data.data);
      else if (data.layout === "sparkline") richHtml = renderSparklines(data.data);
      else if (data.layout === "act-divider") richHtml = renderActDivider(data.data);
      else if (data.layout === "pipeline") richHtml = renderPipeline(data.data);
      else if (data.layout === "hero-question") {
        richHtml = `<div class="plain-hero-question-wrapper"></div>`;
      }
      else if (data.layout === "article-spread") {
        // article-spread 替换整个 section inner(它包含完整结构)
        return `<section${attrs}>${renderArticleSpread(data.data)}</section>`;
      }
      else if (data.layout === "editor-letter") {
        return `<section${attrs}>${renderEditorLetter(data.data)}</section>`;
      }
      else if (data.layout === "photo-essay") {
        return `<section${attrs}>${renderPhotoEssay(data.data)}</section>`;
      }
      else if (data.layout === "data-feature") {
        return `<section${attrs}>${renderDataFeature(data.data)}</section>`;
      }
      else if (data.layout === "sidebar-story") {
        return `<section${attrs}>${renderSidebarStory(data.data)}</section>`;
      }
      else if (data.layout === "pull-quote-break") {
        return `<section${attrs}>${renderPullQuoteBreak(data.data)}</section>`;
      }
      // V16 kami SVG diagrams:都包成 .ed-diagram-frame 留出 title 上方空间
      else if (data.layout === "quadrant") richHtml = renderQuadrant(data.data);
      else if (data.layout === "waterfall") richHtml = renderWaterfall(data.data);
      else if (data.layout === "venn") richHtml = renderVenn(data.data);
      else if (data.layout === "swimlane") richHtml = renderSwimlane(data.data);
      else if (data.layout === "layer-stack") richHtml = renderLayerStack(data.data);
      return `<section${attrs}>${inner}\n${richHtml}\n</section>`;
    },
  );
}

function renderStats(stats: StatCard[]): string {
  const cards = stats
    .slice(0, 6)
    .map(
      (c) => `<div class="plain-stat-card">
  <div class="plain-stat-value">${escapeHtml(c.value)}</div>
  ${c.delta ? `<div class="plain-stat-delta ${deltaClass(c.delta)}">${escapeHtml(c.delta)}</div>` : ""}
  <div class="plain-stat-label">${escapeHtml(c.label)}</div>
  ${c.hint ? `<div class="plain-stat-hint">${escapeHtml(c.hint)}</div>` : ""}
</div>`,
    )
    .join("\n");
  return `<div class="plain-stats-grid" data-count="${stats.length}">\n${cards}\n</div>`;
}

function deltaClass(delta: string): string {
  const d = delta.trim();
  if (d.startsWith("+") || /增加|↑|up/i.test(d)) return "plain-stat-up";
  if (d.startsWith("-") || /减少|↓|down/i.test(d)) return "plain-stat-down";
  return "";
}

function renderTimeline(items: TimelineItem[]): string {
  const nodes = items
    .map(
      (it, idx) => `<div class="plain-timeline-node" data-idx="${idx}">
  <div class="plain-timeline-dot"></div>
  <div class="plain-timeline-when">${escapeHtml(it.when)}</div>
  <div class="plain-timeline-label">${escapeHtml(it.label)}</div>
  ${it.hint ? `<div class="plain-timeline-hint">${escapeHtml(it.hint)}</div>` : ""}
</div>`,
    )
    .join("\n");
  return `<div class="plain-timeline" data-count="${items.length}">\n${nodes}\n</div>`;
}

function renderImage(img: SlideImage, layout: string): string {
  const alt = escapeHtml(img.alt ?? "");
  const url = escapeHtml(img.url);
  if (layout === "image-hero") {
    return `<div class="plain-image-hero" style="background-image:url('${url}')">
  <img src="${url}" alt="${alt}" style="display:none" />
  ${img.caption ? `<div class="plain-image-caption">${escapeHtml(img.caption)}</div>` : ""}
</div>`;
  }
  // image-split
  return `<div class="plain-image-split">
  <img src="${url}" alt="${alt}" />
  ${img.caption ? `<div class="plain-image-caption">${escapeHtml(img.caption)}</div>` : ""}
</div>`;
}

function renderCallout(c: Callout): string {
  const tone = c.tone ?? "info";
  return `<div class="plain-callout plain-callout-${tone}">
  ${c.title ? `<div class="plain-callout-title">${escapeHtml(c.title)}</div>` : ""}
  <div class="plain-callout-body">${escapeHtml(c.body)}</div>
</div>`;
}

function renderProgress(items: ProgressItem[]): string {
  const rows = items.slice(0, 8).map((p) => {
    const v = Math.max(0, Math.min(100, p.value));
    return `<div class="plain-progress-row">
  <div class="plain-progress-head">
    <div class="plain-progress-label">${escapeHtml(p.label)}</div>
    <div class="plain-progress-value">${v}%</div>
  </div>
  <div class="plain-progress-track">
    <div class="plain-progress-fill" style="width:${v}%" data-target="${v}"></div>
  </div>
  ${p.hint ? `<div class="plain-progress-hint">${escapeHtml(p.hint)}</div>` : ""}
</div>`;
  }).join("\n");
  return `<div class="plain-progress">\n${rows}\n</div>`;
}

function renderCompare(c: ComparePair): string {
  const col = (label: string, items: string[], side: "left" | "right") =>
    `<div class="plain-compare-col plain-compare-${side}">
  <div class="plain-compare-label">${escapeHtml(label)}</div>
  <ul class="plain-compare-list">${items.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
</div>`;
  return `<div class="plain-compare">
${col(c.leftLabel, c.leftBullets ?? [], "left")}
<div class="plain-compare-divider"></div>
${col(c.rightLabel, c.rightBullets ?? [], "right")}
</div>`;
}

function renderQuoteBlock(q: QuoteBlock): string {
  const initial = (q.author ?? "?").trim().charAt(0).toUpperCase();
  return `<div class="plain-quote-block">
  <div class="plain-quote-mark">"</div>
  <div class="plain-quote-text">${escapeHtml(q.text)}</div>
  <div class="plain-quote-attr">
    <div class="plain-quote-avatar">${escapeHtml(initial)}</div>
    <div class="plain-quote-meta">
      <div class="plain-quote-name">${escapeHtml(q.author)}</div>
      ${q.role ? `<div class="plain-quote-role">${escapeHtml(q.role)}</div>` : ""}
    </div>
  </div>
</div>`;
}

function renderProfiles(profiles: Profile[]): string {
  const cards = profiles.slice(0, 8).map((p) => {
    const initial = (p.initial ?? p.name).trim().charAt(0).toUpperCase();
    return `<div class="plain-profile-card">
  <div class="plain-profile-avatar">${escapeHtml(initial)}</div>
  <div class="plain-profile-name">${escapeHtml(p.name)}</div>
  ${p.role ? `<div class="plain-profile-role">${escapeHtml(p.role)}</div>` : ""}
</div>`;
  }).join("\n");
  return `<div class="plain-profiles" data-count="${profiles.length}">\n${cards}\n</div>`;
}

function renderCode(c: CodeBlock): string {
  const lang = (c.language ?? "").toLowerCase();
  const lines = c.code.split("\n");
  const numbered = lines.map((line, i) =>
    `<span class="plain-code-line"><span class="plain-code-ln">${i + 1}</span><span class="plain-code-src">${escapeHtml(line) || " "}</span></span>`,
  ).join("");
  return `<div class="plain-code-block">
  ${c.title ? `<div class="plain-code-title">${escapeHtml(c.title)}<span class="plain-code-lang">${escapeHtml(lang)}</span></div>` : `<div class="plain-code-title"><span class="plain-code-lang">${escapeHtml(lang)}</span></div>`}
  <pre class="plain-code-body"><code class="language-${escapeHtml(lang)}">${numbered}</code></pre>
</div>`;
}

function renderSparklines(items: Sparkline[]): string {
  const cards = items.slice(0, 6).map((s) => {
    const svg = sparklineSvg(s.points);
    const deltaCls = s.delta && (s.delta.startsWith("+") || /增加|↑|up/i.test(s.delta)) ? "plain-stat-up"
      : s.delta && (s.delta.startsWith("-") || /减少|↓|down/i.test(s.delta)) ? "plain-stat-down" : "";
    return `<div class="plain-spark-card">
  <div class="plain-spark-top">
    <div class="plain-spark-label">${escapeHtml(s.label)}</div>
    ${s.delta ? `<div class="plain-spark-delta ${deltaCls}">${escapeHtml(s.delta)}</div>` : ""}
  </div>
  <div class="plain-spark-value">${escapeHtml(s.value)}</div>
  <div class="plain-spark-chart">${svg}</div>
</div>`;
  }).join("\n");
  return `<div class="plain-sparklines" data-count="${items.length}">\n${cards}\n</div>`;
}

/**
 * Sparkline SVG:宽 200 高 40,自动缩放到数据范围。
 */
function sparklineSvg(points: number[]): string {
  if (points.length < 2) return "";
  const W = 200, H = 40, P = 2;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = (W - 2 * P) / (points.length - 1);
  const coords = points.map((v, i) => {
    const x = P + i * step;
    const y = H - P - ((v - min) / span) * (H - 2 * P);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const pathLine = `M ${coords.join(" L ")}`;
  const pathFill = `M ${coords[0].split(",")[0]},${H - P} L ${coords.join(" L ")} L ${coords[coords.length - 1].split(",")[0]},${H - P} Z`;
  const lastX = coords[coords.length - 1].split(",")[0];
  const lastY = coords[coords.length - 1].split(",")[1];
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" width="100%" height="40">
    <path d="${pathFill}" fill="currentColor" opacity="0.12"/>
    <path d="${pathLine}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${lastX}" cy="${lastY}" r="2.5" fill="currentColor"/>
  </svg>`;
}

// ─── Editorial Pack(Monocle 风) renderers ───

function renderArticleSpread(a: ArticleSpread): string {
  const paras = a.body.trim().split(/\n\n+/).map((p, i) =>
    i === 0
      ? `<p class="ed-body-p has-dropcap">${escapeHtml(p)}</p>`
      : `<p class="ed-body-p">${escapeHtml(p)}</p>`
  ).join("");
  return `<div class="ed-article-spread">
  <div class="ed-meta">
    <div class="ed-kicker">${escapeHtml(a.kicker)}</div>
    <h1 class="ed-hed">${escapeHtml(a.hed)}</h1>
    ${a.deck ? `<div class="ed-deck">${escapeHtml(a.deck)}</div>` : ""}
    ${a.byline ? `<div class="ed-byline">${escapeHtml(a.byline)}</div>` : ""}
  </div>
  <div class="ed-body">${paras}</div>
</div>`;
}

function renderEditorLetter(e: EditorLetter): string {
  const paras = e.body.trim().split(/\n\n+/).map((p) =>
    `<p class="ed-letter-p">${escapeHtml(p)}</p>`
  ).join("");
  return `<div class="ed-editor-letter">
  <div class="ed-letter-side">
    <div class="ed-kicker">${escapeHtml(e.kicker)}</div>
    <div class="ed-letter-sig">${escapeHtml(e.signature)}</div>
    ${e.role ? `<div class="ed-letter-role">${escapeHtml(e.role)}</div>` : ""}
    <div class="ed-letter-rule"></div>
  </div>
  <div class="ed-letter-body">${paras}</div>
</div>`;
}

function renderPhotoEssay(p: PhotoEssay): string {
  const align = p.alignment ?? "bottom-left";
  return `<div class="ed-photo-essay" style="background-image:url('${escapeHtml(p.url)}')" data-align="${align}">
  <div class="ed-photo-overlay"></div>
  <div class="ed-photo-lockup">
    <h2 class="ed-photo-hed">${escapeHtml(p.hed)}</h2>
    ${p.deck ? `<div class="ed-photo-deck">${escapeHtml(p.deck)}</div>` : ""}
    ${p.caption ? `<div class="ed-photo-caption">${escapeHtml(p.caption)}</div>` : ""}
  </div>
</div>`;
}

function renderDataFeature(d: DataFeature): string {
  // 简化版主图:用 sparkline 作为图表
  const chart = sparklineSvg(d.points);
  const axisLabels = (d.pointLabels ?? []).slice(0, d.points.length);
  const labelsRow = axisLabels.length > 0
    ? `<div class="ed-df-axis">${axisLabels.map((l) => `<span>${escapeHtml(l)}</span>`).join("")}</div>`
    : "";
  const annot = d.annotations.slice(0, 5).map((a) =>
    `<div class="ed-df-annot">
      <div class="ed-df-annot-label">${escapeHtml(a.label)}</div>
      <div class="ed-df-annot-text">${escapeHtml(a.text)}</div>
    </div>`
  ).join("");
  return `<div class="ed-data-feature">
  <div class="ed-df-head">
    <div class="ed-kicker">${escapeHtml(d.kicker)}</div>
    <h2 class="ed-df-hed">${escapeHtml(d.hed)}</h2>
  </div>
  <div class="ed-df-body">
    <div class="ed-df-chart">${chart}${labelsRow}</div>
    <div class="ed-df-annots">${annot}</div>
  </div>
  ${d.source ? `<div class="ed-df-source">SOURCE — ${escapeHtml(d.source)}</div>` : ""}
</div>`;
}

function renderSidebarStory(s: SidebarStory): string {
  const paras = s.mainBody.trim().split(/\n\n+/).map((p) =>
    `<p class="ed-side-p">${escapeHtml(p)}</p>`
  ).join("");
  const bullets = s.sideBullets.slice(0, 6).map((b) =>
    `<li>${escapeHtml(b)}</li>`
  ).join("");
  return `<div class="ed-sidebar-story">
  <div class="ed-side-main">
    <div class="ed-kicker">${escapeHtml(s.mainKicker)}</div>
    <h2 class="ed-side-hed">${escapeHtml(s.mainHed)}</h2>
    <div class="ed-side-body">${paras}</div>
  </div>
  <aside class="ed-side-aside">
    <div class="ed-side-aside-label">${escapeHtml(s.sideLabel)}</div>
    <h3 class="ed-side-aside-hed">${escapeHtml(s.sideHed)}</h3>
    <ol class="ed-side-aside-list">${bullets}</ol>
  </aside>
</div>`;
}

function renderPullQuoteBreak(q: PullQuoteBreak): string {
  return `<div class="ed-pull-quote-break">
  <div class="ed-pq-mark">"</div>
  <blockquote class="ed-pq-text">${escapeHtml(q.text)}</blockquote>
  <div class="ed-pq-rule"></div>
  <div class="ed-pq-attr">${escapeHtml(q.attribution)}</div>
</div>`;
}

function renderActDivider(a: ActDivider): string {
  return `<div class="plain-act-divider">
  <div class="plain-act-kicker">${escapeHtml(a.kicker)}</div>
  ${a.lead ? `<div class="plain-act-lead">${escapeHtml(a.lead)}</div>` : ""}
</div>`;
}

function renderPipeline(steps: PipelineStep[]): string {
  const nodes = steps.slice(0, 8).map((s) => `<div class="plain-pipeline-step">
  <div class="plain-pipeline-num">${escapeHtml(s.num)}</div>
  <div class="plain-pipeline-body">
    <div class="plain-pipeline-label">${escapeHtml(s.label)}</div>
    ${s.hint ? `<div class="plain-pipeline-hint">${escapeHtml(s.hint)}</div>` : ""}
  </div>
</div>`).join("\n");
  return `<div class="plain-pipeline">\n${nodes}\n</div>`;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─────────────────────────────────────────────
// V16 kami SVG diagrams
// 设计:每个 layout 输出独立 SVG,占满 section,
// 用 currentColor 让主题颜色自动跟随(brand 色 = primary,文字 = onSurface)。
// ─────────────────────────────────────────────

const SVG_W = 880;
const SVG_H = 420;

function renderQuadrant(d: QuadrantData): string {
  const cx = SVG_W / 2;
  const cy = SVG_H / 2;
  const padX = 80;
  const padY = 60;
  const x0 = padX;
  const x1 = SVG_W - padX;
  const y0 = padY;
  const y1 = SVG_H - padY;
  const toX = (v: number) => x0 + (v / 100) * (x1 - x0);
  const toY = (v: number) => y1 - (v / 100) * (y1 - y0);

  const ql = d.quadrantLabels;
  const labelTR = ql?.[0] ?? "";
  const labelTL = ql?.[1] ?? "";
  const labelBL = ql?.[2] ?? "";
  const labelBR = ql?.[3] ?? "";

  const points = d.points
    .map((p) => {
      const r = p.focal ? 8 : 5;
      const fill = p.focal ? "var(--plain-primary)" : "currentColor";
      const fontWeight = p.focal ? 600 : 400;
      return `<g transform="translate(${toX(p.x)},${toY(p.y)})">
  <circle r="${r}" fill="${fill}" opacity="${p.focal ? 1 : 0.8}"/>
  <text x="${r + 6}" y="4" font-size="13" font-weight="${fontWeight}" fill="currentColor">${escapeHtml(p.label)}</text>
</g>`;
    })
    .join("");

  return `<div class="plain-diagram plain-diagram-quadrant">
<svg viewBox="0 0 ${SVG_W} ${SVG_H}" xmlns="http://www.w3.org/2000/svg">
  <line x1="${x0}" y1="${y1}" x2="${x1}" y2="${y1}" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
  <line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1}" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
  <line x1="${cx}" y1="${y0}" x2="${cx}" y2="${y1}" stroke="currentColor" stroke-width="0.5" opacity="0.2" stroke-dasharray="3 3"/>
  <line x1="${x0}" y1="${cy}" x2="${x1}" y2="${cy}" stroke="currentColor" stroke-width="0.5" opacity="0.2" stroke-dasharray="3 3"/>
  <text x="${(x0 + cx) / 2}" y="${y0 - 12}" font-size="10" font-weight="600" fill="currentColor" opacity="0.55" text-anchor="middle" letter-spacing="2">${escapeHtml(labelTL.toUpperCase())}</text>
  <text x="${(cx + x1) / 2}" y="${y0 - 12}" font-size="10" font-weight="600" fill="currentColor" opacity="0.55" text-anchor="middle" letter-spacing="2">${escapeHtml(labelTR.toUpperCase())}</text>
  <text x="${(x0 + cx) / 2}" y="${y1 + 24}" font-size="10" font-weight="600" fill="currentColor" opacity="0.55" text-anchor="middle" letter-spacing="2">${escapeHtml(labelBL.toUpperCase())}</text>
  <text x="${(cx + x1) / 2}" y="${y1 + 24}" font-size="10" font-weight="600" fill="currentColor" opacity="0.55" text-anchor="middle" letter-spacing="2">${escapeHtml(labelBR.toUpperCase())}</text>
  <text x="${cx}" y="${SVG_H - 14}" font-size="11" font-weight="500" fill="currentColor" text-anchor="middle">${escapeHtml(d.xLabel)} →</text>
  <text x="${x0 - 18}" y="${cy}" font-size="11" font-weight="500" fill="currentColor" text-anchor="middle" transform="rotate(-90, ${x0 - 18}, ${cy})">${escapeHtml(d.yLabel)} →</text>
  ${points}
</svg>
</div>`;
}

function renderWaterfall(d: WaterfallData): string {
  const padX = 60;
  const padTop = 40;
  const padBottom = 80;
  const drawW = SVG_W - 2 * padX;
  const drawH = SVG_H - padTop - padBottom;
  const total = d.steps.length + 2;
  const barW = (drawW / total) * 0.66;
  const stepW = drawW / total;
  const acc: number[] = [d.startValue];
  for (const s of d.steps) acc.push(acc[acc.length - 1] + s.delta);
  const maxV = Math.max(...acc);
  const minV = Math.min(0, ...acc);
  const toY = (v: number) =>
    padTop + drawH - ((v - minV) / Math.max(1, maxV - minV)) * drawH;
  const baseY = toY(0);
  const unit = d.unit ?? "";

  const bars: string[] = [];
  // start
  {
    const x = padX + 0 * stepW + (stepW - barW) / 2;
    const top = toY(d.startValue);
    const h = baseY - top;
    bars.push(
      `<rect x="${x}" y="${top}" width="${barW}" height="${Math.abs(h)}" fill="currentColor" opacity="0.7"/>` +
        `<text x="${x + barW / 2}" y="${top - 8}" font-size="13" font-weight="600" fill="currentColor" text-anchor="middle">${d.startValue}${unit}</text>` +
        `<text x="${x + barW / 2}" y="${SVG_H - 28}" font-size="11" fill="currentColor" opacity="0.7" text-anchor="middle">${escapeHtml(d.startLabel)}</text>`,
    );
  }
  d.steps.forEach((s, i) => {
    const x = padX + (i + 1) * stepW + (stepW - barW) / 2;
    const startV = acc[i];
    const endV = acc[i + 1];
    const isPositive = s.delta >= 0;
    const top = toY(Math.max(startV, endV));
    const bottom = toY(Math.min(startV, endV));
    const h = bottom - top;
    const fill = isPositive ? "var(--plain-success, #16a34a)" : "var(--plain-danger, #dc2626)";
    bars.push(
      `<rect x="${x}" y="${top}" width="${barW}" height="${Math.max(2, h)}" fill="${fill}" opacity="0.85"/>` +
        `<text x="${x + barW / 2}" y="${top - 8}" font-size="12" font-weight="600" fill="currentColor" text-anchor="middle">${s.delta >= 0 ? "+" : ""}${s.delta}${unit}</text>` +
        `<text x="${x + barW / 2}" y="${SVG_H - 28}" font-size="11" fill="currentColor" opacity="0.7" text-anchor="middle">${escapeHtml(s.label)}</text>`,
    );
  });
  // end
  {
    const endVal = acc[acc.length - 1];
    const x = padX + (total - 1) * stepW + (stepW - barW) / 2;
    const top = toY(endVal);
    const h = baseY - top;
    bars.push(
      `<rect x="${x}" y="${Math.min(top, baseY)}" width="${barW}" height="${Math.abs(h)}" fill="var(--plain-primary)" opacity="0.9"/>` +
        `<text x="${x + barW / 2}" y="${Math.min(top, baseY) - 8}" font-size="13" font-weight="600" fill="currentColor" text-anchor="middle">${endVal}${unit}</text>` +
        `<text x="${x + barW / 2}" y="${SVG_H - 28}" font-size="11" fill="currentColor" opacity="0.7" text-anchor="middle">${escapeHtml(d.endLabel)}</text>`,
    );
  }

  return `<div class="plain-diagram plain-diagram-waterfall">
<svg viewBox="0 0 ${SVG_W} ${SVG_H}" xmlns="http://www.w3.org/2000/svg">
  <line x1="${padX}" y1="${baseY}" x2="${SVG_W - padX}" y2="${baseY}" stroke="currentColor" stroke-width="0.5" opacity="0.3"/>
  ${bars.join("\n  ")}
</svg>
</div>`;
}

function renderVenn(d: VennData): string {
  const cy = SVG_H / 2;
  const r = 130;
  const overlap = 75;
  const cx0 = SVG_W / 2 - (d.sets.length === 2 ? overlap : overlap * 1.1);
  const cx1 = SVG_W / 2 + (d.sets.length === 2 ? overlap : overlap * 1.1);
  const colors = ["var(--plain-primary)", "var(--plain-success, #16a34a)", "var(--plain-danger, #dc2626)"];
  const setCircles: string[] = [];
  if (d.sets.length === 2) {
    setCircles.push(
      `<circle cx="${cx0}" cy="${cy}" r="${r}" fill="${colors[0]}" opacity="0.18"/>`,
      `<circle cx="${cx1}" cy="${cy}" r="${r}" fill="${colors[1]}" opacity="0.18"/>`,
      `<text x="${cx0 - 30}" y="${cy - r - 12}" font-size="13" font-weight="600" fill="currentColor" text-anchor="middle">${escapeHtml(d.sets[0].label)}</text>`,
      `<text x="${cx1 + 30}" y="${cy - r - 12}" font-size="13" font-weight="600" fill="currentColor" text-anchor="middle">${escapeHtml(d.sets[1].label)}</text>`,
    );
    if (d.intersection) {
      setCircles.push(
        `<text x="${SVG_W / 2}" y="${cy + 6}" font-size="12" fill="currentColor" text-anchor="middle" font-weight="500">${escapeHtml(d.intersection)}</text>`,
      );
    }
  } else {
    const cx2 = SVG_W / 2;
    const cy2 = cy + 100;
    setCircles.push(
      `<circle cx="${cx0}" cy="${cy - 50}" r="${r}" fill="${colors[0]}" opacity="0.18"/>`,
      `<circle cx="${cx1}" cy="${cy - 50}" r="${r}" fill="${colors[1]}" opacity="0.18"/>`,
      `<circle cx="${cx2}" cy="${cy2}" r="${r}" fill="${colors[2]}" opacity="0.18"/>`,
      `<text x="${cx0 - 30}" y="${cy - 50 - r - 8}" font-size="13" font-weight="600" fill="currentColor" text-anchor="middle">${escapeHtml(d.sets[0].label)}</text>`,
      `<text x="${cx1 + 30}" y="${cy - 50 - r - 8}" font-size="13" font-weight="600" fill="currentColor" text-anchor="middle">${escapeHtml(d.sets[1].label)}</text>`,
      `<text x="${cx2}" y="${cy2 + r + 22}" font-size="13" font-weight="600" fill="currentColor" text-anchor="middle">${escapeHtml(d.sets[2].label)}</text>`,
    );
    if (d.intersection) {
      setCircles.push(
        `<text x="${SVG_W / 2}" y="${cy + 20}" font-size="12" fill="currentColor" text-anchor="middle" font-weight="500">${escapeHtml(d.intersection)}</text>`,
      );
    }
  }

  return `<div class="plain-diagram plain-diagram-venn">
<svg viewBox="0 0 ${SVG_W} ${SVG_H}" xmlns="http://www.w3.org/2000/svg">
  ${setCircles.join("\n  ")}
</svg>
</div>`;
}

function renderSwimlane(d: SwimlaneData): string {
  const padX = 100;
  const padY = 50;
  const drawH = SVG_H - 2 * padY;
  const drawW = SVG_W - padX - 30;
  const laneH = drawH / d.lanes.length;
  const lanes = d.lanes.map((lane, li) => {
    const ly = padY + li * laneH;
    const labelEl = `<text x="${padX - 18}" y="${ly + laneH / 2 + 5}" font-size="12" font-weight="500" fill="currentColor" text-anchor="end">${escapeHtml(lane.label)}</text>`;
    const laneRect = `<rect x="${padX}" y="${ly}" width="${drawW}" height="${laneH}" fill="${li % 2 === 0 ? "currentColor" : "transparent"}" opacity="${li % 2 === 0 ? 0.04 : 0}"/>`;
    const steps = lane.steps
      .map((s) => {
        const sx = padX + (s.at / 100) * drawW;
        const cy = ly + laneH / 2;
        return `<g transform="translate(${sx},${cy})">
  <circle r="6" fill="var(--plain-primary)"/>
  <text y="-12" font-size="11" font-weight="500" fill="currentColor" text-anchor="middle">${escapeHtml(s.label)}</text>
</g>`;
      })
      .join("");
    return [labelEl, laneRect, steps].join("\n  ");
  });
  return `<div class="plain-diagram plain-diagram-swimlane">
<svg viewBox="0 0 ${SVG_W} ${SVG_H}" xmlns="http://www.w3.org/2000/svg">
  ${lanes.join("\n  ")}
</svg>
</div>`;
}

function renderLayerStack(d: LayerStackData): string {
  const padX = 200;
  const padY = 40;
  const drawW = SVG_W - 2 * padX;
  const drawH = SVG_H - 2 * padY;
  const layerH = drawH / d.layers.length;
  // 数组下标 0 = 底层,d.layers.length-1 = 顶层
  const layers = d.layers.map((l, i) => {
    const idx = d.layers.length - 1 - i;
    const ly = padY + idx * layerH;
    const fillOpacity = 0.06 + i * 0.04;
    return `<g>
  <rect x="${padX}" y="${ly + 4}" width="${drawW}" height="${layerH - 8}" fill="var(--plain-primary)" opacity="${fillOpacity}" stroke="currentColor" stroke-opacity="0.2" stroke-width="0.5" rx="4"/>
  <text x="${padX + 20}" y="${ly + layerH / 2 + 4}" font-size="14" font-weight="500" fill="currentColor">${escapeHtml(l.label)}</text>
  ${l.hint ? `<text x="${padX + drawW - 20}" y="${ly + layerH / 2 + 4}" font-size="11" font-weight="400" fill="currentColor" opacity="0.6" text-anchor="end">${escapeHtml(l.hint)}</text>` : ""}
</g>`;
  });
  return `<div class="plain-diagram plain-diagram-layer-stack">
<svg viewBox="0 0 ${SVG_W} ${SVG_H}" xmlns="http://www.w3.org/2000/svg">
  ${layers.join("\n  ")}
</svg>
</div>`;
}
