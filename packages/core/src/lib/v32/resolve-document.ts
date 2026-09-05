/**
 * V32 · 存量 content → Document 的统一收口 + 渲染
 *
 * 为什么要这个文件:切 route 到 V32 时,每个 route 都要重复同一段
 * 「先按 Document 解析,失败就 fromV31 惰性升级,再 renderReport」。
 * patch-content 已经手写过一遍;剩下 7 个 route 再抄 7 遍 = 7 处可以各自写错的地方。
 * 收成一个函数,存量兼容的语义只有一处定义。
 *
 * 惰性升级(lazy upgrade)语义:
 *   存量 ai-v31 文档的 content 是 v31 三套结构(slides / blocks / rows),
 *   DB 里 format 仍标 'ai-v31'(V32 复用此标签避 CHECK 约束迁移)。
 *   读的时候转、编辑落库时写回 Document 结构 —— 不需要一次性刷库,
 *   也不需要运行时长期挂 adapter:数据会随用户使用自然收敛。
 */
import { DocumentSchema, type Document } from "./content/schema";
import { fromV31 } from "./migrate/from-v31";
import { getTemplateV32 } from "./templates";
import { renderReport } from "./render/render-report";

export type V32Kind = "deck" | "doc" | "sheet";

/**
 * 把「可能是 v31 也可能是 v32」的 content 解析成 Document。
 *
 * 先试 v32 DocumentSchema(新数据走这条,零成本);失败再按 kind 走 fromV31。
 * 两条都不通才抛 —— 抛出的是 fromV31 的错误,因为那说明数据既不是新结构、
 * 也不是能识别的旧结构,后者的报错信息对定位更有用。
 */
export function resolveDocument(content: unknown, kind: V32Kind): Document {
  const parsed = DocumentSchema.safeParse(content);
  if (parsed.success) return parsed.data;
  return fromV31(kind, content);
}

/** resolveDocument + renderReport 一步到位(绝大多数 route 只需要这个) */
export function renderStoredContent(
  content: unknown,
  kind: V32Kind,
  templateSlug?: string,
): { doc: Document; html: string } {
  const doc = resolveDocument(content, kind);
  const html = renderReport(doc, getTemplateV32(templateSlug));
  return { doc, html };
}
