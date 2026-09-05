import type { DocKind } from "@/lib/agents/types";

/**
 * V31 · doc 版本 entry(原 V30 ai-html-v30 设计 · V31 兼容复用)
 * 每个 doc 可以有多个版本(同一份 content/source 不同模板渲染),用户可在工作台切换。
 * `html` 直接喂 iframe srcdoc;不再走 callRender → render-v2 → blob URL 流程。
 */
export type DocVersion = {
  /** nanoid · 版本稳定标识,跨 client 同步 / undo / share */
  slug: string;
  /** 模板 slug(V31 = registry slug · V30 老数据 = INSPIRATIONS slug) */
  themeSlug: string;
  /** 渲染好的完整 HTML 字符串(<!DOCTYPE html> 起);喂 iframe srcdoc */
  html: string;
  /** 创建时间(ms epoch),用来显示 timeAgo */
  createdAt: number;
  /** 来源 · V31 加 edit-content;老 V30 generatedBy 也兼容此 union */
  generatedBy:
    | "create"
    | "regenerate-theme"
    | "inline-edit"
    | "ai-edit"
    | "edit-content";
};

export type DocFormat = "dsl-v2" | "ai-html-v30" | "ai-v31";

export type WorkspaceDoc = {
  id: string; // nanoid，稳定跨持久化
  kind: DocKind;
  title: string; // 从 source 解析出的显示名
  source: string; // 纯文本源文件
  createdAt: number;
  updatedAt: number;
  /**
   * 最后一次 render 使用的时间戳。用来判断引用是否过期：
   * 若某被引用文档的 updatedAt > 引用方的 lastRenderAt，则引用已过期。
   */
  lastRenderAt?: number;
  /**
   * V14-A 分支:本文档是从哪个 doc 分叉来的(空 = 原始文档)。
   * forkedFrom 是源 doc.id;baseTurnId 是源 doc 上的某条 turn id(用来标记分叉点)。
   */
  forkedFrom?: string;
  baseTurnId?: string;
  /**
   * V17 共享 chat:本文档的 chat 挂在哪个文档上(空 = 自己有独立 chat)。
   * 兄弟文件通过这个字段共享同一份 chat history。
   * 切到本文档时,前端 useChatHistory 会(透过 API)自动 resolve 到 anchor。
   */
  chatAnchorDocId?: string;
  /**
   * V27-U · 用户上传的 cover 图片 URL · 显示在 showcase 卡片 / 分享页 og / 链接预览
   * null/undefined = 走 coverMode 兜底
   */
  coverUrl?: string | null;
  /**
   * V27-U · cover 显示模式
   *   "uploaded"   = 用 coverUrl
   *   "first-page" = 自动截 cover slide(默认)
   *   "none"       = 不要 cover · 用灰底
   */
  coverMode?: "uploaded" | "first-page" | "none";
  /**
   * V30 · 文档形态
   *   "dsl-v2"      = 老 doc · source = Markdown/DSL · 走 callRender → render-v2(默认)
   *   "ai-html-v30" = 新 doc · source 仅作 prompt 历史 · 实际产物 = versions[active].html → iframe srcdoc
   * undefined / null = dsl-v2(向后兼容,老数据不写这个字段)
   */
  format?: DocFormat;
  /** V30 · 仅 format='ai-html-v30' 时有意义。空数组等同于"还没生成第一版" */
  versions?: DocVersion[];
  /** V30 · versions 数组里被激活那个的下标。format='ai-html-v30' 时必须 ∈ [0, versions.length-1] */
  activeVersionIdx?: number;
};

export type Workspace = {
  docs: WorkspaceDoc[];
  currentId: string | null;
};

/**
 * 发给后端 agent 的精简视图。只带 id/kind/source/title —— 足够 agent 解析 @ref。
 */
export type WorkspaceContext = Array<{
  id: string;
  kind: DocKind;
  title: string;
  source: string;
}>;

export function toContext(ws: Workspace): WorkspaceContext {
  return ws.docs.map((d) => ({
    id: d.id,
    kind: d.kind,
    title: d.title,
    source: d.source,
  }));
}
