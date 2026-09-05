import { Command } from "commander";
import { emit, getOutputMode } from "../output";
// V36 fix · 动态 import 打破 CLI ESM 循环依赖(见 run-agent.ts):v32/templates 在分量内

/**
 * plain templates — 列出所有可用模版(给 deck/doc/sheet --template 用)。
 * 纯本地常量(listTemplates 无 LLM/网络),离线可用。
 */
export function registerTemplates(program: Command): void {
  program
    .command("templates")
    .description("List available templates (slug · name · scheme)")
    .action(async () => {
      const { listTemplatesV32 } = await import("@/lib/v32/templates");
      const all = listTemplatesV32().map((t) => t.meta);
      if (getOutputMode() === "json") {
        emit(all);
        return;
      }
      process.stdout.write(`Available templates (${all.length}):\n\n`);
      const pad = Math.max(...all.map((t) => t.slug.length)) + 2;
      for (const t of all) {
        const scheme = t.scheme === "dark" ? "◐ dark " : "○ light";
        process.stdout.write(
          `  ${t.slug.padEnd(pad)} ${scheme}  ${t.name}\n` +
            `  ${" ".repeat(pad)} ${" ".repeat(7)}  ${t.tagline}\n\n`,
        );
      }
      process.stdout.write(
        `Use: plain deck generate --template <slug> --intent "..."\n`,
      );
    });
}
