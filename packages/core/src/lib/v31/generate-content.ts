/**
 * V31 content 生成 · server-agnostic 共享入口
 *
 * 从 /api/agent-v31/generate 抽出来,让 **web route + CLI** 共用一份
 * "用户 prompt → 符合 zod schema 的 v31 content JSON" 逻辑。
 *
 * 只依赖 ai + v31 schema/prompts —— 无 next / auth / db,CLI 可直接 import。
 * 三件套(deck/doc/sheet)统一:按 kind 选 system prompt + schema。
 */
import { generateText, type LanguageModel } from "ai";
import { noThinking } from "@/lib/agent/provider/no-thinking";
import {
  DeckContentSchema,
  DocContentSchema,
  SheetContentSchema,
  type DeckContent,
  type DocContent,
  type SheetContent,
} from "@/lib/v31/content/schema";
import {
  DECK_CONTENT_SYSTEM_PROMPT,
  DOC_CONTENT_SYSTEM_PROMPT,
  SHEET_CONTENT_SYSTEM_PROMPT,
  buildUserPromptForContent,
} from "@/lib/v31/prompts/content-prompts";

export type V31Kind = "deck" | "doc" | "sheet";
export type V31Content = DeckContent | DocContent | SheetContent;

const SYSTEM_BY_KIND: Record<V31Kind, string> = {
  deck: DECK_CONTENT_SYSTEM_PROMPT,
  doc: DOC_CONTENT_SYSTEM_PROMPT,
  sheet: SHEET_CONTENT_SYSTEM_PROMPT,
};

function schemaByKind(kind: V31Kind) {
  return kind === "deck"
    ? DeckContentSchema
    : kind === "doc"
      ? DocContentSchema
      : SheetContentSchema;
}

/**
 * 生成 v31 content JSON。zod 校验失败 retry 1 次(把错误回喂模型自修)。
 */
export async function generateV31Content(args: {
  model: LanguageModel;
  kind: V31Kind;
  userPrompt: string;
  density?: "low" | "high";
  templateHint?: string;
}): Promise<V31Content> {
  const { model, kind, userPrompt } = args;
  const density = args.density ?? "high";
  const system = SYSTEM_BY_KIND[kind];
  const schema = schemaByKind(kind);
  const userMessage = buildUserPromptForContent({
    userPrompt,
    kind,
    density,
    templateHint: args.templateHint,
  });

  let lastErr: string | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { text } = await generateText({
      model,
      system,
      prompt:
        attempt === 0
          ? userMessage
          : `${userMessage}\n\n上次输出 zod 校验失败:\n${lastErr}\n\n再来一次 · 严格按 schema。`,
      maxOutputTokens: 16000,
      temperature: 1,
      ...noThinking(model),
    });

    // 清洗 ```json fence
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
    }
    // 取首个 {…}(模型偶尔加前后噪声)
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) cleaned = cleaned.slice(start, end + 1);

    try {
      const parsed = JSON.parse(cleaned);
      return schema.parse(parsed) as V31Content;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      if (attempt === 1) {
        throw new Error(`v31 ${kind} content 校验失败: ${lastErr}`);
      }
    }
  }
  throw new Error("unreachable");
}
