/**
 * 把 JSON Patch 翻译成人话，给 chat UI 展示。
 * 策略：
 *   1. 优先用 AI 返回的 rationale（≥ 5 字时直接用）
 *   2. 否则根据 ops 的 path 启发式生成描述
 *
 * i18n：本文件是纯逻辑（无 React context），不能直接 useTranslations。
 * 由渲染层（chat UI）传入一个 next-intl translator `t`（scope 为 `Chat.patch`），
 * 各函数用 `t(key, values?)` 取本地化文案。
 */

import type { JsonPatchOp, DocKind } from "./types";

/** next-intl translator（scope: Chat.patch）。渲染层用 useTranslations("Chat.patch") 传入。 */
export type PatchTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

const ordinal = (t: PatchTranslator, idx: number) =>
  t("ordinal", { n: idx + 1 });

export function summarizePatch(
  kind: DocKind,
  ops: JsonPatchOp[],
  rationale: string | undefined,
  t: PatchTranslator,
): string {
  // 1. AI 给出了可读 rationale 就用它
  if (rationale && rationale.trim().length >= 5) {
    return rationale.trim();
  }
  if (ops.length === 0) {
    // AI 没生成任何 patch。可能是：router 判错、模型认为无需改、prompt 不清楚
    return t("noChange");
  }
  if (ops.length > 3) return t("appliedCount", { count: ops.length });

  const parts = ops.map((op) => describeOp(kind, op, t));
  return parts.join("；");
}

function actionLabel(t: PatchTranslator, op: JsonPatchOp["op"]): string {
  switch (op) {
    case "replace":
      return t("action.replace");
    case "remove":
      return t("action.remove");
    case "add":
      return t("action.add");
    case "move":
      return t("action.move");
    case "copy":
      return t("action.copy");
    default:
      return t("action.modify");
  }
}

function describeOp(kind: DocKind, op: JsonPatchOp, t: PatchTranslator): string {
  return `${actionLabel(t, op.op)}${describePath(kind, op.path, t)}`;
}

/**
 * 从 ops 抽出"改动位置清单",给 UI 展示逐条改动。
 * - 每条:人话描述 + 原始 path + op 类型
 * - 去重（同一 path 的多个 op 合一行）
 */
export type AffectedChange = {
  path: string;
  op: JsonPatchOp["op"];
  label: string;
};
export function listAffected(
  kind: DocKind,
  ops: JsonPatchOp[],
  t: PatchTranslator,
): AffectedChange[] {
  const seen = new Set<string>();
  const out: AffectedChange[] = [];
  for (const op of ops) {
    const key = `${op.op}:${op.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // listAffected 用更短的动词（改/删/加/挪/复制/改）
    const action =
      op.op === "replace"
        ? t("actionShort.replace")
        : op.op === "remove"
          ? t("actionShort.remove")
          : op.op === "add"
            ? t("actionShort.add")
            : op.op === "move"
              ? t("actionShort.move")
              : op.op === "copy"
                ? t("actionShort.copy")
                : t("actionShort.modify");
    out.push({
      path: op.path,
      op: op.op,
      label: `${action} ${describePath(kind, op.path, t)}`,
    });
  }
  return out;
}

export function describePath(
  kind: DocKind,
  path: string,
  t: PatchTranslator,
): string {
  const seg = path.split("/").filter(Boolean);
  if (seg.length === 0) return t("path.document");

  if (kind === "deck") {
    if (seg[0] === "slides") {
      if (seg[1] === "-") return t("path.deck.newSlide");
      const idx = parseInt(seg[1] ?? "", 10);
      if (Number.isFinite(idx)) {
        const page = t("path.deck.page", { ord: ordinal(t, idx) });
        if (!seg[2]) return page;
        if (seg[2] === "title") return t("path.deck.pageTitle", { page });
        if (seg[2] === "notes") return t("path.deck.pageNotes", { page });
        if (seg[2] === "layout") return t("path.deck.pageLayout", { page });
        if (seg[2] === "bullets") {
          if (seg[3] === "-") return t("path.deck.pageNewBullet", { page });
          const bi = parseInt(seg[3] ?? "", 10);
          return Number.isFinite(bi)
            ? t("path.deck.pageBullet", { page, ord: ordinal(t, bi) })
            : t("path.deck.pageBullets", { page });
        }
      }
    }
    if (seg[0] === "theme") return t("path.deck.theme");
  }

  if (kind === "doc") {
    if (seg[0] === "title") return t("path.doc.title");
    if (seg[0] === "author") return t("path.doc.author");
    if (seg[0] === "date") return t("path.doc.date");
    if (seg[0] === "blocks") {
      if (seg[1] === "-") return t("path.doc.newBlock");
      const idx = parseInt(seg[1] ?? "", 10);
      if (Number.isFinite(idx)) {
        const block = t("path.doc.block", { ord: ordinal(t, idx) });
        if (!seg[2]) return block;
        if (seg[2] === "text") return t("path.doc.blockText", { block });
        if (seg[2] === "level") return t("path.doc.blockLevel", { block });
        if (seg[2] === "items") {
          if (seg[3] === "-") return t("path.doc.blockNewItem", { block });
          const bi = parseInt(seg[3] ?? "", 10);
          return Number.isFinite(bi)
            ? t("path.doc.blockItem", { block, ord: ordinal(t, bi) })
            : t("path.doc.blockList", { block });
        }
        if (seg[2] === "code") return t("path.doc.blockCode", { block });
        if (seg[2] === "ordered") return t("path.doc.blockOrdered", { block });
      }
    }
  }

  if (kind === "sheet") {
    if (seg[0] === "title") return t("path.sheet.title");
    if (seg[0] === "narrative") return t("path.sheet.narrative");
    if (seg[0] === "columns") {
      if (seg[1] === "-") return t("path.sheet.newColumn");
      const idx = parseInt(seg[1] ?? "", 10);
      return Number.isFinite(idx)
        ? t("path.sheet.column", { ord: ordinal(t, idx) })
        : t("path.sheet.columns");
    }
    if (seg[0] === "rows") {
      if (seg[1] === "-") return t("path.sheet.newRow");
      const idx = parseInt(seg[1] ?? "", 10);
      if (Number.isFinite(idx)) {
        const row = t("path.sheet.row", { ord: ordinal(t, idx) });
        if (seg[2]) return t("path.sheet.rowCol", { row, col: seg[2] });
        return row;
      }
    }
    if (seg[0] === "charts") {
      if (seg[1] === "-") return t("path.sheet.newChart");
      const idx = parseInt(seg[1] ?? "", 10);
      return Number.isFinite(idx)
        ? t("path.sheet.chart", { ord: ordinal(t, idx) })
        : t("path.sheet.charts");
    }
  }

  return t("path.fallback", { path });
}
