/**
 * plain import · CLI/Web 对等 · 把 .pptx / .docx / .xlsx 导入 Plain DSL。
 *
 * 心智:
 *   plain import <file>                    解析 → 写 stdout 或文件
 *   plain import <file> -o new.md          指定输出文件
 *   plain import <file> --push             直接推到 cloud
 *
 * 导入产物当前是 v1 marp(deck)/ md(doc)/ csv(sheet)· 跟 V22+ v2 主路径
 * 仍有 gap · 但比"从 0 重写"快得多。后续 V28+ 会做 v1 → v2 自动转。
 */
import { Command } from "commander";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename, extname } from "node:path";
import { nanoid } from "nanoid";
import { emit, fail, progress, getOutputMode } from "../output";
import { apiKey, gatewayBase, gatewayFetch } from "../gateway-client";
import { resolveProjectId } from "../config";

type ImportResp = {
  kind: "deck" | "doc" | "sheet";
  source: string;
  title?: string;
};

function originFromGatewayBase(): string {
  try {
    const u = new URL(gatewayBase());
    return `${u.protocol}//${u.host}`;
  } catch {
    return "https://inplain.app";
  }
}

const EXT_MIME: Record<string, string> = {
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export function registerImport(program: Command): void {
  program
    .command("import")
    .description("Import .pptx / .docx / .xlsx into Plain DSL")
    .argument("<file>", "Source Office file")
    .option("-o, --output <file>", "Write source to file (default: stdout)")
    .option("--push", "Also upsert to cloud workspace")
    .option("--title <text>", "Override title")
    .option("--project <id>", "Bind to a project (default from `plain project use`)")
    .option("--no-project", "Force unfiled")
    .action(async (file: string, opts) => {
      if (!existsSync(file)) fail(`file not found: ${file}`);
      const ext = extname(file).toLowerCase();
      const mime = EXT_MIME[ext];
      if (!mime) {
        fail(`unsupported extension: ${ext} (need .pptx / .docx / .xlsx)`);
      }
      const buf = readFileSync(file);

      progress(`uploading ${file} → /api/import…`);
      const fd = new FormData();
      fd.append("file", new Blob([buf], { type: mime }), basename(file));

      const url = `${originFromGatewayBase()}/api/import`;
      const r = await fetch(url, {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey()}` },
        body: fd,
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        fail(j.error ?? `import HTTP ${r.status}`);
      }
      const result = (await r.json()) as ImportResp;

      const title = opts.title ?? result.title ?? basename(file).replace(/\.[^.]+$/, "");

      // 输出 source
      if (opts.output) {
        writeFileSync(opts.output, result.source);
        progress(`✓ wrote ${opts.output} (${result.source.length} bytes · ${result.kind})`);
      } else if (!opts.push && getOutputMode() !== "json") {
        process.stdout.write(result.source);
      }

      // 推 cloud
      let cloudId: string | undefined;
      if (opts.push) {
        const id = nanoid(10);
        const now = Date.now();
        const projectId =
          opts.project === false ? null : resolveProjectId(opts.project as string | undefined);
        const upR = await gatewayFetch<{ id: string }>({
          method: "POST",
          path: "workspace/documents",
          body: {
            id,
            kind: result.kind,
            title,
            source: result.source,
            createdAt: now,
            updatedAt: now,
            projectId: projectId ?? null,
          },
        }).catch((e) => fail(String(e instanceof Error ? e.message : e)));
        cloudId = upR.id;
        progress(`✓ pushed to cloud as ${cloudId}${projectId ? ` (project=${projectId})` : ""}`);
      }

      if (getOutputMode() === "json") {
        emit({
          kind: result.kind,
          title,
          bytes: result.source.length,
          file: opts.output,
          cloudId,
        });
      } else if (cloudId) {
        process.stdout.write(`${cloudId}\n`);
      }
    });
}
