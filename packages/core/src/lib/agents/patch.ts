import { applyPatch, deepClone, type Operation } from "fast-json-patch";
import type { ZodType } from "zod";
import type { JsonPatchOp } from "./types";

export type PatchResult<T> =
  | { ok: true; doc: T }
  | { ok: false; error: string };

/**
 * 泛化的"干跑 + schema 校验"patch 应用器。
 * 三类 agent（deck / doc / sheet）共用一份逻辑。
 *
 * 步骤：
 * 1. 深拷贝当前 doc
 * 2. apply patch（validateOperation=true，非法 op 会抛异常）
 * 3. 用传入的 Zod schema 再校验结果是否仍是合法文档
 * 永不修改入参。
 */
export function tryApply<T>(
  current: T,
  ops: JsonPatchOp[],
  schema: ZodType<T>,
): PatchResult<T> {
  try {
    const cloned = deepClone(current);
    const result = applyPatch(
      cloned,
      ops as unknown as Operation[],
      /* validateOperation */ true,
      /* mutateDocument */ true,
    );
    const newDoc = result.newDocument as unknown;
    const parsed = schema.safeParse(newDoc);
    if (!parsed.success) {
      return {
        ok: false,
        error: `patch applied but result failed schema validation: ${parsed.error.message}`,
      };
    }
    return { ok: true, doc: parsed.data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `patch apply failed: ${msg}` };
  }
}
