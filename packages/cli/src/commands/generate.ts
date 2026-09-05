/**
 * `plain generate` · V32 统一 artifact 生成入口
 *
 * 不再从"选 deck/doc/sheet"开始 —— 一句意图直接长出一份 living artifact。
 * `--as deck|doc|sheet` 只是表达倾向(present 演示 / report 长文 / dashboard 数据),
 * 默认 deck(当前最成熟路径)。底层复用 runGenerateV31(三 kind 已统一)。
 *
 * 旧命令 `plain deck|doc|sheet generate` 仍可用(内部转调这里),向后兼容。
 */
import { Command } from "commander";
import { readFileSync } from "node:fs";
import { fail } from "../output";
import { requireLlmEnv } from "../llm-client";
import { runGenerateV31, emitV31Result } from "../run-v31";
import type { V31Kind } from "@/lib/v31/generate-content";

const FORMS: readonly V31Kind[] = ["deck", "doc", "sheet"] as const;

export function registerGenerate(program: Command): void {
  program
    .command("generate")
    .alias("gen")
    .description(
      "Generate a living artifact from one sentence — Plain picks the expression, or use --as.",
    )
    .argument("[intent...]", "What the artifact should be about (free text)")
    .option("--as <form>", "expression: deck (present) | doc (report) | sheet (dashboard)", "deck")
    .option("--from <file>", "read a local .md/.txt file as the intent")
    .option("--template <slug>", "template slug (see `plain templates`); default biennale-yellow")
    .option("--density <level>", "low (compact) / high (rich)", "low")
    .option("--content-out <file>", "also write the structured source JSON (re-editable)")
    .option("-o, --output <file>", "write HTML to file (default: stdout)")
    .action(async (intentParts: string[], opts) => {
      const form = String(opts.as) as V31Kind;
      if (!FORMS.includes(form)) {
        fail(`unknown --as "${opts.as}". Use one of: ${FORMS.join(" | ")}`);
      }

      let intent = (intentParts ?? []).join(" ").trim() || undefined;
      if (opts.from) {
        try {
          const doc = readFileSync(opts.from, "utf8");
          intent = intent
            ? `${intent}\n\n参考文档内容:\n\n${doc}`
            : `基于以下文档生成一份 artifact · 抓核心结构与最有价值的论点:\n\n${doc}`;
        } catch (e) {
          fail(`failed to read --from file: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      if (!intent) fail("provide an intent (free text) or --from <file>");

      requireLlmEnv({ agentId: `generate-${form}` });

      const r = await runGenerateV31({
        kind: form,
        intent: intent!,
        templateSlug: opts.template ?? "biennale-yellow",
        density: opts.density === "high" ? "high" : "low",
      });
      // 渲染前校验反馈(借鉴 Bento validate)· 打 stderr 不污染 stdout 的 HTML
      if (r.warnings && r.warnings !== "✓ no issues") {
        process.stderr.write(`\n检查:\n${r.warnings}\n`);
      }
      emitV31Result(r, { outFile: opts.output, contentOut: opts.contentOut });
    });
}
