/**
 * Plain Core —— 与 UI / 框架解耦的内核。
 *
 * 任何运行时(Web / Node / Tauri / CLI)都能 import 这个 barrel,
 * 拿到完整的 agent + render + export 能力。
 *
 * 边界:
 * - 只 re-export 已经是纯函数的实现(零 React / 零 DOM 依赖)
 * - 不引入新 API,不重新实现任何东西
 * - 当 src/lib/* 还在 React 里被广泛 import 时,这层是稳定契约;
 *   未来要把实现物理搬到 src/core/ 也不影响外部消费方
 *
 * 不包含:
 * - useWorkspace / useAuth 等 React hooks(在 src/lib/workspace/use*.ts)
 * - storage adapter(localStorage / Supabase / FileSystem)——下一步引入,
 *   作为 StorageAdapter interface + 多实现
 * - 视觉编辑脚本(visual-edit-script.ts,只在 iframe 注入用)
 */

// =============================================================================
// Types —— 三件套的 schema 定义
// =============================================================================
// 这些名字在 src/lib/agents/types.ts 里同时是 Zod schema(value)和 inferred type。
// 用普通 export(不是 export type),让消费方既能 .parse() 也能当类型用。
export {
  DeckDoc,
  Slide,
  StatCard,
  TimelineItem,
  DocDoc,
  DocBlock,
  SheetDoc,
  SheetColumn,
  SheetChart,
  Intent,
} from "@/lib/agents/types";
export type {
  DocKind,
  AgentEvent,
  JsonPatchOp,
} from "@/lib/agents/types";

export type {
  Workspace,
  WorkspaceDoc,
  WorkspaceContext,
} from "@/lib/workspace/types";
export { toContext } from "@/lib/workspace/types";

// =============================================================================
// Agents —— Plain DSL v2 web-first(section-based markdown)
// V21 · 删除 v1 agent;Plain 单一 agent 路径。v1 serialize 仅给 pptx/docx/xlsx 导出转换用。
// V26-E.5 · routeIntent / AgentError 不再从 core 重新 export
//   - routeIntent · LLM 自决策替代 · 新代码改 import { Agent } from "@/lib/agent"
//   - AgentError · 直接 import { AgentError } from "@/lib/agents/errors" 仍可用
//   生命周期:V27 清理完 generate.ts/edit.ts 旧实现后,这一节整段删
// =============================================================================

export {
  generateDeckV2,
  generateDocV2,
  generateSheetV2,
} from "@/lib/agents-v2/generate";
export {
  editDeckV2,
  editDocV2,
  editSheetV2,
} from "@/lib/agents-v2/edit";
export type { EditInput as EditInputV2, EditResult as EditResultV2 } from "@/lib/agents-v2/edit";
export {
  parseDeckV2,
  parseDocV2,
  parseSheetV2,
} from "@/lib/agents-v2/adapter";
export {
  serializeDeck as serializeDeckV2,
  serializeDoc as serializeDocV2,
  serializeSheet as serializeSheetV2,
} from "@/lib/agents-v2/serialize";
export {
  DeckDocV2,
  DocDocV2 as DocDocV2Schema,
  SheetDocV2 as SheetDocV2Schema,
} from "@/lib/agents-v2/schemas";
export type {
  DeckDocV2 as DeckDocV2Type,
  DocDocV2 as DocDocV2Type,
  SheetDocV2 as SheetDocV2Type,
  DeckSection,
  SheetSection,
} from "@/lib/agents-v2/schemas";

// =============================================================================
// Serialize —— 源文件 ↔ JSON 双向
// =============================================================================
export { deckToMarp, marpToDeck } from "@/lib/agents/deck-serialize";
export { docToMd, mdToDoc } from "@/lib/agents/doc-serialize";
export { sheetToSource, sourceToSheet } from "@/lib/agents/sheet-serialize";

// =============================================================================
// Refs —— 跨文档引用解析
// =============================================================================
export {
  findRefs,
  replaceRefs,
  parseSheetEmbed,
} from "@/lib/agents/refs";
export type { Ref } from "@/lib/agents/refs";

export { resolveRef, sheetToHtmlTable } from "@/lib/agents/resolve";
export type { Resolved } from "@/lib/agents/resolve";

// =============================================================================
// Patch —— RFC 6902 局部编辑(给定 ops + Zod schema → 校验后的新文档)
// =============================================================================
export { tryApply } from "@/lib/agents/patch";

// =============================================================================
// Workspace 纯逻辑(无 React)
// =============================================================================
export { extractTitle } from "@/lib/workspace/title";
export { findBacklinks } from "@/lib/workspace/backlinks";

// =============================================================================
// Lint
// =============================================================================
// V21 · v1 linter (lintDeck/lintDoc/lintSheet) 已删除 · v2 linter 待补

// =============================================================================
// V22-D · LLM 啰嗦容错:从 raw text 抠出 HTML(5 级 fallback)
// 当前未接到 generate 路径(v2 agent 走 zod schema,不漏 raw HTML),
// 留给 V23+ 流式渲染 / 导出预览路径用。
// =============================================================================
export { extractHtml, previewHtml } from "@/lib/agents/extract-html";

// =============================================================================
// Export —— 三件套的二进制导出
// 注:这些库(pptxgenjs / docx / xlsx)在 Node 和 Browser 都能跑
// =============================================================================
export { deckDocToPptx } from "@/lib/export/pptx";
export { docDocToDocx } from "@/lib/export/docx";
export { sheetDocToXlsx } from "@/lib/export/xlsx";
