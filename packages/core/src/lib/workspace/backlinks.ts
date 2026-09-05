import { findRefs, parseSheetEmbed, type Ref } from "@/lib/agents/refs";
import type { Workspace, WorkspaceDoc } from "./types";

export type Backlink = {
  from: WorkspaceDoc; // 引用方
  refs: Ref[]; // 该 doc 中指向 target 的所有引用（含块嵌入转出的 pseudo-ref）
};

/**
 * 遍历 workspace，找出所有指向 targetId 的引用方。
 * - @ref: 通过 refs.ts 的 findRefs
 * - 块嵌入 [sheet:id]: 每行扫一次 parseSheetEmbed（只能引 sheet）
 */
export function findBacklinks(ws: Workspace, targetId: string): Backlink[] {
  const out: Backlink[] = [];
  for (const doc of ws.docs) {
    if (doc.id === targetId) continue;
    const matched: Ref[] = findRefs(doc.source).filter((r) => r.docId === targetId);
    // 块嵌入只针对 sheet；转成 pseudo Ref 方便上层统一处理
    for (const line of doc.source.split("\n")) {
      const em = parseSheetEmbed(line.trim());
      if (em && em.docId === targetId) {
        matched.push({
          kind: "sheet",
          docId: targetId,
          path: ["embed"],
          raw: em.raw,
        });
      }
    }
    if (matched.length > 0) out.push({ from: doc, refs: matched });
  }
  return out;
}
