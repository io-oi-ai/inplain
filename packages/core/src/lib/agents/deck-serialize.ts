import type {
  DeckDoc,
  Slide,
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
} from "./types";
import {
  StatCard as StatCardSchema,
  TimelineItem as TimelineItemSchema,
  SlideImage as SlideImageSchema,
  Callout as CalloutSchema,
  ProgressItem as ProgressItemSchema,
  ComparePair as ComparePairSchema,
  QuoteBlock as QuoteBlockSchema,
  Profile as ProfileSchema,
  CodeBlock as CodeBlockSchema,
  Sparkline as SparklineSchema,
  ActDivider as ActDividerSchema,
  PipelineStep as PipelineStepSchema,
  ArticleSpread as ArticleSpreadSchema,
  EditorLetter as EditorLetterSchema,
  PhotoEssay as PhotoEssaySchema,
  DataFeature as DataFeatureSchema,
  SidebarStory as SidebarStorySchema,
  PullQuoteBreak as PullQuoteBreakSchema,
  QuadrantData as QuadrantDataSchema,
  WaterfallData as WaterfallDataSchema,
  VennData as VennDataSchema,
  SwimlaneData as SwimlaneDataSchema,
  LayerStackData as LayerStackDataSchema,
} from "./types";
import { z } from "zod";
import { findIcon, findIllustration } from "../render-theme/deck-assets";
import { findLogo } from "../render-theme/deck-logos";

/**
 * DeckDoc → Marp markdown 字符串。
 * 约定：每页一个 `---` 分隔符（除首页外）；speaker notes 用 HTML 注释。
 */
export function deckToMarp(doc: DeckDoc): string {
  const front = [
    "---",
    "marp: true",
    `theme: ${doc.theme}`,
    "paginate: true",
    "---",
    "",
  ].join("\n");

  const pages = doc.slides.map((s) => slideToMarp(s)).join("\n\n---\n\n");
  return rewriteAssetMarkers(front + pages + "\n");
}

/**
 * 重写 AI 生成的 asset/icon/logo 占位符到真实素材库路径。
 *
 * - `![asset:abstract-grid](anything)` → `![abstract-grid](/deck-assets/illustrations/abstract-grid.svg)`
 *   (block-level illustration, 适合 hero / image-hero / 章节配图)
 * - `![icon:rocket](anything)` → `<img src="/deck-assets/icons/rocket.svg" alt="rocket" class="plain-icon" />`
 *   (inline icon, 适合 bullet 前缀 / 标题旁)
 * - `![logo:claude](anything)` → `<img src="/deck-assets/logos/claude.svg" alt="Claude" class="plain-logo" />`
 *   (inline brand logo; multicolor logos drop the class so SVG keeps own colors)
 *
 * 若 id 不在 manifest 中,保留原 markdown(graceful degradation)。
 * AI 也可能写自定义 alt: `![icon:rocket "launch"](_)` —— 我们用 alt 部分(若有)否则用 id。
 */
export function rewriteAssetMarkers(md: string): string {
  // Markdown image: ![alt](src)。alt 形如 "asset:xxx" / "icon:xxx" / "logo:xxx"。
  // 我们抓 ![<prefix>:<id>...](url) 整体替换。
  const re = /!\[(asset|icon|logo):([a-z0-9][a-z0-9-]*)([^\]]*)\]\(([^)]*)\)/gi;
  md = md.replace(re, (match, kind: string, id: string, _rest: string, _url: string) => {
    if (kind === "icon") {
      const entry = findIcon(id);
      if (!entry) return match;
      // inline icon: 用 raw HTML,marp/markdown 直通,带 class 让 theme 上 size/color
      return `<img src="${entry.path}" alt="${id}" class="plain-icon" />`;
    }
    if (kind === "logo") {
      const entry = findLogo(id);
      if (!entry) return match;
      const altSafe = entry.name.replace(/"/g, "&quot;");
      // multicolor logo: SVG 自带颜色,不加 plain-logo class(否则 currentColor 会盖掉)
      if (entry.multicolor) {
        return `<img src="${entry.path}" alt="${altSafe}" />`;
      }
      return `<img src="${entry.path}" alt="${altSafe}" class="plain-logo" />`;
    }
    // kind === "asset" → illustration (block-level markdown image)
    const entry = findIllustration(id);
    if (!entry) return match;
    return `![${id}](${entry.path})`;
  });

  // V27-U · AI 偶尔写 ![alt](asset:xxx) 而非 ![asset:xxx](_) · url 是 asset:xxx
  // 浏览器不认 asset:// scheme · 直接报 ERR_UNKNOWN_URL_SCHEME 显示空白方框
  // 兜底:任何 ](asset:...) ](icon:...) ](logo:...) 全部清成 placeholder · 不让坏 URL 进 DOM
  const urlRe = /!\[([^\]]*)\]\((asset|icon|logo):([^)]*)\)/gi;
  md = md.replace(urlRe, (_match, alt: string, _kind: string, _id: string) => {
    // 用纯文本 figcaption 兜底 · 至少不让用户看到 broken image
    return `*[${alt || "图片占位"}]*`;
  });

  // V27-U · 同样兜底 <img src="asset:xxx"> · 这是 AI 生成 raw HTML 时编的
  const htmlAssetRe = /<img[^>]*\s+src=["'](asset|icon|logo):[^"']*["'][^>]*>/gi;
  md = md.replace(htmlAssetRe, (_match) => `<span class="plain-asset-missing">[图片占位]</span>`);

  return md;
}

function slideToMarp(s: Slide): string {
  const heading = s.layout === "cover" ? `# ${s.title}` : `## ${s.title}`;
  const bullets =
    s.bullets.length > 0 ? "\n\n" + s.bullets.map((b) => `- ${b}`).join("\n") : "";
  const notes = s.notes ? `\n\n<!-- speaker notes: ${s.notes.replace(/-->/g, "--&gt;")} -->` : "";
  const idComment = `<!-- id:${s.id} -->`;
  const layoutComment = s.layout !== "content" && s.layout !== "cover"
    ? `\n<!-- layout:${s.layout} -->`
    : "";
  const toneComment = s.tone ? `\n<!-- tone:${s.tone} -->` : "";
  const coverComment = s.coverVariant ? `\n<!-- cover:${s.coverVariant} -->` : "";
  const chromeComment = s.chrome ? `\n<!-- chrome:${s.chrome.replace(/-->/g, "--&gt;")} -->` : "";

  // 富字段用 HTML 注释块编码,marpToDeck 回读。normalize.ts 已保护 <!--...-->
  const rich: string[] = [];
  const emit = (kind: string, data: unknown) => {
    rich.push(`<!-- plain-data:${kind}\n${JSON.stringify(data, null, 2)}\n-->`);
  };
  if (s.stats && s.stats.length > 0) emit("stats", s.stats);
  if (s.timeline && s.timeline.length > 0) emit("timeline", s.timeline);
  if (s.image) emit("image", s.image);
  if (s.callout) emit("callout", s.callout);
  if (s.progress && s.progress.length > 0) emit("progress", s.progress);
  if (s.compare) emit("compare", s.compare);
  if (s.quoteBlock) emit("quote-block", s.quoteBlock);
  if (s.profiles && s.profiles.length > 0) emit("profiles", s.profiles);
  if (s.code) emit("code", s.code);
  if (s.sparklines && s.sparklines.length > 0) emit("sparklines", s.sparklines);
  if (s.actDivider) emit("act-divider", s.actDivider);
  if (s.pipeline && s.pipeline.length > 0) emit("pipeline", s.pipeline);
  if (s.articleSpread) emit("article-spread", s.articleSpread);
  if (s.editorLetter) emit("editor-letter", s.editorLetter);
  if (s.photoEssay) emit("photo-essay", s.photoEssay);
  if (s.dataFeature) emit("data-feature", s.dataFeature);
  if (s.sidebarStory) emit("sidebar-story", s.sidebarStory);
  if (s.pullQuoteBreak) emit("pull-quote-break", s.pullQuoteBreak);
  if (s.quadrant) emit("quadrant", s.quadrant);
  if (s.waterfall) emit("waterfall", s.waterfall);
  if (s.venn) emit("venn", s.venn);
  if (s.swimlane) emit("swimlane", s.swimlane);
  if (s.layerStack) emit("layer-stack", s.layerStack);
  const richBlock = rich.length > 0 ? "\n\n" + rich.join("\n\n") : "";

  return `${idComment}${layoutComment}${toneComment}${coverComment}${chromeComment}\n\n${heading}${bullets}${richBlock}${notes}`;
}

/**
 * Marp markdown → DeckDoc。
 * M1 最小解析器：
 * - 第一块 `---...---` frontmatter 提取 theme
 * - 用 `---` 分隔幻灯片
 * - 每片抓取：id 注释 / 第一个 heading 作为 title / `- ` 开头的 bullet / speaker notes 注释
 * 不支持 marp 高级语法（image syntax / math / html 等），V1 够用。
 */
export function marpToDeck(md: string): DeckDoc {
  const { body, theme } = stripFrontmatter(md);
  const rawSlides = splitSlides(body);
  const slides: Slide[] = rawSlides.map((chunk, idx) => parseSlide(chunk, idx));
  return { kind: "deck", theme, slides: slides.length > 0 ? slides : [fallbackSlide()] };
}

function stripFrontmatter(md: string): { body: string; theme: string } {
  const m = md.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!m) return { body: md, theme: "default" };
  const fm = m[1];
  const themeMatch = fm.match(/^\s*theme:\s*(\S+)/m);
  return {
    body: md.slice(m[0].length),
    theme: themeMatch?.[1] ?? "default",
  };
}

function splitSlides(body: string): string[] {
  // 以行首的 `---` 分隔（允许前后空白，但必须整行）
  return body
    .split(/\n[ \t]*---[ \t]*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseSlide(chunk: string, idx: number): Slide {
  const idMatch = chunk.match(/<!--\s*id:([a-zA-Z0-9_-]+)\s*-->/);
  const id = idMatch?.[1] ?? `s${idx + 1}`;

  const headingMatch = chunk.match(/^\s*(#{1,6})\s+(.+?)\s*$/m);
  const title = headingMatch?.[2]?.trim() ?? "";

  // layout 优先级:显式 <!-- layout:xxx --> > h1 自动判为 cover > 默认 content
  const layoutMatch = chunk.match(/<!--\s*layout:([a-z-]+)\s*-->/);
  const explicitLayout = layoutMatch?.[1];
  const VALID: Slide["layout"][] = [
    "cover", "content", "two-col", "quote",
    "stats", "timeline", "image-hero", "image-split",
    "callout", "progress", "compare", "quote-block", "profile", "code", "sparkline",
    "act-divider", "pipeline", "hero-question",
    "article-spread", "editor-letter", "photo-essay", "data-feature", "sidebar-story", "pull-quote-break",
    "quadrant", "waterfall", "venn", "swimlane", "layer-stack",
  ];
  let layout: Slide["layout"] = "content";
  if (explicitLayout && (VALID as string[]).includes(explicitLayout)) {
    layout = explicitLayout as Slide["layout"];
  } else if (headingMatch?.[1].length === 1) {
    layout = "cover";
  }

  const bullets: string[] = [];
  for (const line of chunk.split("\n")) {
    const m = line.match(/^\s*[-*]\s+(.+?)\s*$/);
    if (m) bullets.push(m[1]);
  }

  const notesMatch = chunk.match(/<!--\s*speaker notes:\s*([\s\S]*?)\s*-->/i);
  const notes = notesMatch?.[1];

  const toneMatch = chunk.match(/<!--\s*tone:(hero-dark|hero-light|light|dark)\s*-->/);
  const tone = toneMatch?.[1] as Slide["tone"] | undefined;

  const coverMatch = chunk.match(/<!--\s*cover:(gradient|mesh|spotlight|grid|tape|photo)\s*-->/);
  const coverVariant = coverMatch?.[1] as Slide["coverVariant"] | undefined;

  const chromeMatch = chunk.match(/<!--\s*chrome:\s*([\s\S]*?)\s*-->/);
  const chrome = chromeMatch?.[1];

  // 富字段:plain-data:xxx JSON 块
  const stats = parseDataBlock<StatCard[]>(chunk, "stats", z.array(StatCardSchema));
  const timeline = parseDataBlock<TimelineItem[]>(chunk, "timeline", z.array(TimelineItemSchema));
  const image = parseDataBlock<SlideImage>(chunk, "image", SlideImageSchema);
  const callout = parseDataBlock<Callout>(chunk, "callout", CalloutSchema);
  const progress = parseDataBlock<ProgressItem[]>(chunk, "progress", z.array(ProgressItemSchema));
  const compare = parseDataBlock<ComparePair>(chunk, "compare", ComparePairSchema);
  const quoteBlock = parseDataBlock<QuoteBlock>(chunk, "quote-block", QuoteBlockSchema);
  const profiles = parseDataBlock<Profile[]>(chunk, "profiles", z.array(ProfileSchema));
  const code = parseDataBlock<CodeBlock>(chunk, "code", CodeBlockSchema);
  const sparklines = parseDataBlock<Sparkline[]>(chunk, "sparklines", z.array(SparklineSchema));
  const actDivider = parseDataBlock<ActDivider>(chunk, "act-divider", ActDividerSchema);
  const pipeline = parseDataBlock<PipelineStep[]>(chunk, "pipeline", z.array(PipelineStepSchema));
  const articleSpread = parseDataBlock<ArticleSpread>(chunk, "article-spread", ArticleSpreadSchema);
  const editorLetter = parseDataBlock<EditorLetter>(chunk, "editor-letter", EditorLetterSchema);
  const photoEssay = parseDataBlock<PhotoEssay>(chunk, "photo-essay", PhotoEssaySchema);
  const dataFeature = parseDataBlock<DataFeature>(chunk, "data-feature", DataFeatureSchema);
  const sidebarStory = parseDataBlock<SidebarStory>(chunk, "sidebar-story", SidebarStorySchema);
  const pullQuoteBreak = parseDataBlock<PullQuoteBreak>(chunk, "pull-quote-break", PullQuoteBreakSchema);
  const quadrant = parseDataBlock<QuadrantData>(chunk, "quadrant", QuadrantDataSchema);
  const waterfall = parseDataBlock<WaterfallData>(chunk, "waterfall", WaterfallDataSchema);
  const venn = parseDataBlock<VennData>(chunk, "venn", VennDataSchema);
  const swimlane = parseDataBlock<SwimlaneData>(chunk, "swimlane", SwimlaneDataSchema);
  const layerStack = parseDataBlock<LayerStackData>(chunk, "layer-stack", LayerStackDataSchema);

  return {
    id,
    title,
    bullets,
    notes,
    layout,
    ...(tone ? { tone } : {}),
    ...(coverVariant ? { coverVariant } : {}),
    ...(chrome ? { chrome } : {}),
    ...(stats ? { stats } : {}),
    ...(timeline ? { timeline } : {}),
    ...(image ? { image } : {}),
    ...(callout ? { callout } : {}),
    ...(progress ? { progress } : {}),
    ...(compare ? { compare } : {}),
    ...(quoteBlock ? { quoteBlock } : {}),
    ...(profiles ? { profiles } : {}),
    ...(code ? { code } : {}),
    ...(sparklines ? { sparklines } : {}),
    ...(actDivider ? { actDivider } : {}),
    ...(pipeline ? { pipeline } : {}),
    ...(articleSpread ? { articleSpread } : {}),
    ...(editorLetter ? { editorLetter } : {}),
    ...(photoEssay ? { photoEssay } : {}),
    ...(dataFeature ? { dataFeature } : {}),
    ...(sidebarStory ? { sidebarStory } : {}),
    ...(pullQuoteBreak ? { pullQuoteBreak } : {}),
    ...(quadrant ? { quadrant } : {}),
    ...(waterfall ? { waterfall } : {}),
    ...(venn ? { venn } : {}),
    ...(swimlane ? { swimlane } : {}),
    ...(layerStack ? { layerStack } : {}),
  };
}

function parseDataBlock<T>(chunk: string, kind: string, schema: z.ZodType<T>): T | undefined {
  const re = new RegExp(`<!--\\s*plain-data:${kind}\\s*\\n([\\s\\S]*?)\\n\\s*-->`);
  const m = chunk.match(re);
  if (!m) return undefined;
  try {
    const raw = JSON.parse(m[1]);
    const parsed = schema.safeParse(raw);
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

function fallbackSlide(): Slide {
  return { id: "s1", title: "Untitled", bullets: [], layout: "cover" };
}
