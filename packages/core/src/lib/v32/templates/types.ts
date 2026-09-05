/**
 * V32 S2 · 模板接口(先定义 · S3 才有真模板)
 *
 * 一份 Document 只输出 content JSON;模板负责渲染成 HTML。
 * 换模板 0 调 AI —— 因为 block DOM 结构由兜底 renderer 保证,
 * 模板只覆盖它想接管的 block 类型 + 提供 theme CSS(token 值)。
 *
 * 跟 v31 的差别:v31 每个模板一个大 render 函数;
 * V32 模板是"贴片"——只填 theme token + 可选覆盖个别 block renderer,
 * renderReport 统一组装 present/report 两态。
 */
import type { Block, BlockType } from "../content/schema";

/** 模板元信息(对齐 v31 TemplateMeta) */
export type TemplateMetaV32 = {
  slug: string;
  name: string;
  tagline?: string;
  scheme: "light" | "dark";
  density?: "low" | "high" | "both";
  bestFor?: string;
};

/**
 * 渲染上下文 · 传给每个 block renderer。
 * renderReport 负责构造,内含复用工具(escapeHtml/editAttrs 等)与当前 mode。
 */
export type RenderCtx = {
  /** 当前渲染态 */
  mode: "report" | "present";
  /** 文档密度(来自 doc.meta.density) */
  density: "low" | "high";
  /**
   * 该 block 在树中的 path 前缀(用于 editAttrs)。
   * V32 约定用 block.id 而非下标:`/blocks/<id>`;子字段 append `/field`。
   */
  pathPrefix: string;
  /** XSS 防护 · 复用 v31 util.escapeHtml */
  esc: (s: unknown) => string;
  /** 打 data-plain-* 可视编辑属性 · 复用 v31 util.editAttrs */
  edit: (path: string, label: string, opts?: { text?: boolean }) => string;
  /** markdown → html(段落/列表) */
  md: (src: string) => string;
  /**
   * 递归渲染一个子 block(group 用)。
   * renderReport 注入,内部会挑模板覆盖或兜底 renderer。
   */
  renderChild: (block: Block) => string;
};

/** 单个 block 的渲染函数签名 */
export type BlockRenderer = (block: Block, ctx: RenderCtx) => string;

/**
 * V32 模板 · S2 只需一个"素模板"(纯 token 默认样式)让渲染跑起来。
 *
 * - themeCss:模板 DNA(定义 --plain-* / --v32-* token 的实际值 + 排版细节)
 * - blocks:只覆盖模板想接管的 block 类型;缺的用兜底 block-renderers
 * - presentChrome:present mode 下注入 stage 内的持久 chrome(pagenum 等 HTML 片段)
 */
export type TemplateV32 = {
  meta: TemplateMetaV32;
  /** <link> 字符串(用 util.fontLinks 生成),可空 */
  fonts: string;
  /** 模板样式(token 值 + 覆盖) */
  themeCss: string;
  /** 部分覆盖:模板没实现某 block → renderReport 回退兜底 renderer */
  blocks?: Partial<Record<BlockType, BlockRenderer>>;
  /** present mode stage 内的持久 chrome HTML(可选) */
  presentChrome?: string;
};
