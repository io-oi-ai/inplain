import { Command } from "commander";
import { readFileSync } from "node:fs";
import { fail } from "../output";
import { requireLlmEnv } from "../llm-client";
import { runGenerateDeck, runEditDeck, emitResult } from "../run-agent";
import { runGenerateV31, emitV31Result } from "../run-v31";
import { resolveProjectId } from "../config";
// V36 fix · @/core 值改 action 回调内动态 import,打破 CLI ESM 循环依赖(见 run-agent.ts)
import type { JsonPatchOp } from "@/core";
import { writeFileSync } from "node:fs";
import { registerRenderVideo } from "./render-video";

export function registerDeck(program: Command): void {
  const deck = program
    .command("deck")
    .description("Deck artifact (presentation) — generate / edit. Or use `plain generate --as deck`.");

  deck
    .command("generate")
    .description("Generate a deck from a prompt or a source document")
    .option("--intent <text>", "What the deck should be about")
    .option("--from <file>", "Read a local .md/.txt file as the intent (e.g. tech spec → deck)")
    .option("--mode <mode>", "brief (8-12 pages) or feature (18-28 pages)", "brief")
    .option("--template <slug>", "Render with a specific template (see `plain templates`)")
    .option("--density <level>", "low = 8-12 screens, high = 18-28 screens", "low")
    .option("--content-out <file>", "Also write the content JSON to a file (re-editable)")
    .option("-o, --output <file>", "write source to file (default: stdout)")
    .option("--push", "also upsert to your cloud workspace (sync to Web/App)")
    .option("--id <id>", "with --push: update an existing cloud doc by id")
    .option("--project <id>", "Bind to a project (default from `plain project use`)")
    .option("--no-project", "Force unfiled · override default project")
    .action(async (opts) => {
      // V27-L · --intent / --from 二选一(必须给一个)
      let intent = opts.intent as string | undefined;
      if (opts.from) {
        try {
          const content = readFileSync(opts.from, "utf8");
          intent = intent
            ? `${intent}\n\n以下是参考文档内容:\n\n${content}`
            : `基于以下文档生成一份 deck · 抓核心结构和最有价值的论点:\n\n${content}`;
        } catch (e) {
          fail(`failed to read --from file: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      if (!intent) {
        fail("provide --intent <text> or --from <file>");
      }
      requireLlmEnv({ agentId: "deck-generate" });

      // V31 · --template 走模版生成(content JSON → 模版渲染 HTML)
      if (opts.template) {
        const r = await runGenerateV31({
          kind: "deck",
          intent: intent!,
          templateSlug: opts.template,
          density: opts.density === "high" ? "high" : "low",
        });
        emitV31Result(r, { outFile: opts.output, contentOut: opts.contentOut });
        return;
      }

      const result = await runGenerateDeck({ intent: intent!, mode: opts.mode });
      const projectId =
        opts.project === false ? null : resolveProjectId(opts.project as string | undefined);
      await emitResult(result, {
        outFile: opts.output,
        push: opts.push,
        cloudId: opts.id,
        projectId,
      });
    });

  deck
    .command("edit")
    .description("Edit an existing deck via natural-language instruction or JSON Patch")
    .argument("<file>", "deck source file (.md)")
    .option("--instruction <text>", "what to change (calls LLM)")
    .option("--patch <json>", "RFC 6902 ops as JSON string (no LLM)")
    .option("-o, --output <file>", "write modified source (default: overwrite input)")
    .option("--push", "also upsert to your cloud workspace (sync to Web/App)")
    .option("--id <id>", "with --push: update an existing cloud doc by id")
    .action(async (file, opts) => {
      const source = readFileSync(file, "utf8");
      const outFile = opts.output ?? file;

      // --patch 路径:不调 LLM。V21 切 v2:parse → tryApply → serialize
      if (opts.patch) {
        // V36 fix · 动态 import 打破 CLI ESM 循环依赖(见文件头注释)
        const { tryApply, DeckDocV2, parseDeckV2, serializeDeckV2 } = await import("@/core");
        let ops: JsonPatchOp[];
        try {
          ops = JSON.parse(opts.patch) as JsonPatchOp[];
        } catch (e) {
          fail("invalid --patch JSON", e);
        }
        const current = parseDeckV2(source);
        if (!current) fail("source 不是合法 v2 deck DSL · 无法 patch");
        const r = tryApply(current, ops, DeckDocV2);
        if (!r.ok) fail(`patch failed: ${r.error}`);
        const newSource = serializeDeckV2(r.doc);
        writeFileSync(outFile, newSource);
        process.stderr.write(`✓ patched ${outFile}\n`);
        return;
      }

      // --instruction 路径:调 LLM
      if (!opts.instruction) {
        fail("provide --instruction <text> or --patch <json>");
      }
      requireLlmEnv({ agentId: "deck-edit" });
      const result = await runEditDeck({ source, instruction: opts.instruction });
      await emitResult(result, { outFile, push: opts.push, cloudId: opts.id });
    });

  // `plain deck render-video <file.md>` — Marp → mp4 with TTS + BGM.
  registerRenderVideo(deck);
}
