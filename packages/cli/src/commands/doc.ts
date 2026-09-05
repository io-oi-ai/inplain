import { Command } from "commander";
import { readFileSync, writeFileSync } from "node:fs";
import { fail } from "../output";
import { requireLlmEnv } from "../llm-client";
import { runGenerateDoc, runEditDoc, emitResult } from "../run-agent";
import { runGenerateV31, emitV31Result } from "../run-v31";
import { resolveProjectId } from "../config";
// V36 fix · @/core 值改 action 回调内动态 import,打破 CLI ESM 循环依赖(见 run-agent.ts)
import type { JsonPatchOp } from "@/core";

export function registerDoc(program: Command): void {
  const doc = program
    .command("doc")
    .description("Doc artifact (long-form report) — generate / edit. Or use `plain generate --as doc`.");

  doc
    .command("generate")
    .description("Generate a doc from a prompt or source document")
    .option("--intent <text>", "What the doc should be about")
    .option("--from <file>", "Read local .md/.txt/.pdf-ish text as source · turn into structured doc")
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
            ? `${intent}\n\n以下是参考文档内容:\n\n${content}`
            : `基于以下文档生成一份结构化 Plain doc · 保留关键论点 · 加合理结构:\n\n${content}`;
        } catch (e) {
          fail(`failed to read --from file: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      if (!intent) fail("provide --intent <text> or --from <file>");
      requireLlmEnv({ agentId: "doc-generate" });
      if (opts.template) {
        const r = await runGenerateV31({
          kind: "doc",
          intent: intent!,
          templateSlug: opts.template,
          density: opts.density === "high" ? "high" : "low",
        });
        emitV31Result(r, { outFile: opts.output, contentOut: opts.contentOut });
        return;
      }
      const result = await runGenerateDoc({ intent: intent! });
      const projectId =
        opts.project === false ? null : resolveProjectId(opts.project as string | undefined);
      await emitResult(result, {
        outFile: opts.output,
        push: opts.push,
        cloudId: opts.id,
        projectId,
      });
    });

  doc
    .command("edit")
    .description("Edit an existing doc via natural-language instruction or JSON Patch")
    .argument("<file>", "doc source file (.md)")
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
        const { tryApply, DocDocV2Schema, parseDocV2, serializeDocV2 } = await import("@/core");
        let ops: JsonPatchOp[];
        try {
          ops = JSON.parse(opts.patch) as JsonPatchOp[];
        } catch (e) {
          fail("invalid --patch JSON", e);
        }
        const current = parseDocV2(source);
        if (!current) fail("source 不是合法 v2 doc DSL · 无法 patch");
        const r = tryApply(current, ops, DocDocV2Schema);
        if (!r.ok) fail(`patch failed: ${r.error}`);
        const newSource = serializeDocV2(r.doc);
        writeFileSync(outFile, newSource);
        process.stderr.write(`✓ patched ${outFile}\n`);
        return;
      }

      if (!opts.instruction) fail("provide --instruction <text> or --patch <json>");
      requireLlmEnv({ agentId: "doc-edit" });
      const result = await runEditDoc({ source, instruction: opts.instruction });
      await emitResult(result, { outFile, push: opts.push, cloudId: opts.id });
    });
}
