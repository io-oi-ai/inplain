import { Command } from "commander";
import { readFileSync, writeFileSync } from "node:fs";
import { fail } from "../output";
import { requireLlmEnv } from "../llm-client";
import { runGenerateSheet, runEditSheet, emitResult } from "../run-agent";
import { runGenerateV31, emitV31Result } from "../run-v31";
import { resolveProjectId } from "../config";
// V36 fix · @/core 值改 action 回调内动态 import,打破 CLI ESM 循环依赖(见 run-agent.ts)
import type { JsonPatchOp } from "@/core";

export function registerSheet(program: Command): void {
  const sheet = program
    .command("sheet")
    .description("Sheet artifact (data dashboard) — generate / edit. Or use `plain generate --as sheet`.");

  sheet
    .command("generate")
    .description("Generate a sheet from a prompt or local CSV / data file")
    .option("--intent <text>", "What the sheet should analyze")
    .option("--from <file>", "Use a CSV / JSON / Markdown file as the data source for the dashboard")
    .option("--template <slug>", "Render with a specific template (see `plain templates`)")
    .option("--density <level>", "low / high", "low")
    .option("--content-out <file>", "Also write the content JSON to a file")
    .option("-o, --output <file>", "write source to file (default: stdout)")
    .option("--push", "also upsert to your cloud workspace (sync to Web/App)")
    .option("--id <id>", "with --push: update an existing cloud doc by id")
    .option("--project <id>", "Bind to a project (default from `plain project use`)")
    .option("--no-project", "Force unfiled")
    .action(async (opts) => {
      let intent = opts.intent as string | undefined;
      if (opts.from) {
        try {
          const content = readFileSync(opts.from, "utf8");
          intent = intent
            ? `${intent}\n\n以下是参考数据 / 文档:\n\n${content}`
            : `基于以下数据生成一份 Plain Sheet dashboard · 选合适的 panel (big-number / chart / table) 呈现核心结论:\n\n${content}`;
        } catch (e) {
          fail(`failed to read --from file: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      if (!intent) fail("provide --intent <text> or --from <file>");
      requireLlmEnv({ agentId: "sheet-generate" });
      if (opts.template) {
        const r = await runGenerateV31({
          kind: "sheet",
          intent: intent!,
          templateSlug: opts.template,
          density: opts.density === "high" ? "high" : "low",
        });
        emitV31Result(r, { outFile: opts.output, contentOut: opts.contentOut });
        return;
      }
      const result = await runGenerateSheet({ intent: intent! });
      const projectId =
        opts.project === false ? null : resolveProjectId(opts.project as string | undefined);
      await emitResult(result, {
        outFile: opts.output,
        push: opts.push,
        cloudId: opts.id,
        projectId,
      });
    });

  sheet
    .command("edit")
    .description("Edit an existing sheet via natural-language instruction or JSON Patch")
    .argument("<file>", "sheet source file (.md)")
    .option("--instruction <text>", "what to change (calls LLM)")
    .option("--patch <json>", "RFC 6902 ops as JSON string (no LLM)")
    .option("-o, --output <file>", "write modified source (default: overwrite input)")
    .option("--push", "also upsert to your cloud workspace (sync to Web/App)")
    .option("--id <id>", "with --push: update an existing cloud doc by id")
    .action(async (file, opts) => {
      const source = readFileSync(file, "utf8");
      const outFile = opts.output ?? file;

      if (opts.patch) {
        // V36 fix · 动态 import 打破 CLI ESM 循环依赖(见文件头注释)
        const { tryApply, SheetDocV2Schema, parseSheetV2, serializeSheetV2 } = await import("@/core");
        let ops: JsonPatchOp[];
        try {
          ops = JSON.parse(opts.patch) as JsonPatchOp[];
        } catch (e) {
          fail("invalid --patch JSON", e);
        }
        const current = parseSheetV2(source);
        if (!current) fail("source 不是合法 v2 sheet DSL · 无法 patch");
        const r = tryApply(current, ops, SheetDocV2Schema);
        if (!r.ok) fail(`patch failed: ${r.error}`);
        const newSource = serializeSheetV2(r.doc);
        writeFileSync(outFile, newSource);
        process.stderr.write(`✓ patched ${outFile}\n`);
        return;
      }

      if (!opts.instruction) fail("provide --instruction <text> or --patch <json>");
      requireLlmEnv({ agentId: "sheet-edit" });
      const result = await runEditSheet({ source, instruction: opts.instruction });
      await emitResult(result, { outFile, push: opts.push, cloudId: opts.id });
    });
}
