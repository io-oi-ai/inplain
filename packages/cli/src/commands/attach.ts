/**
 * plain attach · CLI/Web 对等 · 项目附件管理。
 *
 * 心智:
 *   plain attach upload <projectId> <file> [<file2> ...]
 *   plain attach ls <projectId>
 *   plain attach rm <projectId> <assetId>
 */
import { Command } from "commander";
import { readFileSync, existsSync, statSync } from "node:fs";
import { basename } from "node:path";
import { emit, fail, progress, getOutputMode } from "../output";
import { apiKey, gatewayBase } from "../gateway-client";

type Asset = {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_url: string;
  uploaded_at: string;
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
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".csv": "text/csv",
  ".tsv": "text/tab-separated-values",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".json": "application/json",
  ".yaml": "application/yaml",
  ".yml": "application/yaml",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function guessMime(file: string): string {
  const dot = file.lastIndexOf(".");
  if (dot < 0) return "application/octet-stream";
  return EXT_MIME[file.slice(dot).toLowerCase()] ?? "application/octet-stream";
}

export function registerAttach(program: Command): void {
  const attach = program
    .command("attach")
    .description("Manage project assets");

  // plain attach upload <projectId> <file...>
  attach
    .command("upload")
    .description("Upload one or more files to a project")
    .argument("<projectId>", "Target project id")
    .argument("<files...>", "Local files to upload")
    .action(async (projectId: string, files: string[]) => {
      const uploaded: Asset[] = [];
      const failed: Array<{ file: string; error: string }> = [];
      for (const file of files) {
        if (!existsSync(file) || !statSync(file).isFile()) {
          failed.push({ file, error: "not a file" });
          continue;
        }
        const buf = readFileSync(file);
        const fd = new FormData();
        const mime = guessMime(file);
        // Node 22+ Blob 接受 buffer
        fd.append(
          "file",
          new Blob([buf], { type: mime }),
          basename(file),
        );
        const url = `${originFromGatewayBase()}/api/workspace/projects/${encodeURIComponent(projectId)}/assets`;
        try {
          const r = await fetch(url, {
            method: "POST",
            headers: { authorization: `Bearer ${apiKey()}` },
            body: fd,
          });
          if (!r.ok) {
            const j = (await r.json().catch(() => ({}))) as { error?: string };
            failed.push({ file, error: j.error ?? `HTTP ${r.status}` });
            continue;
          }
          const j = (await r.json()) as { asset: Asset };
          uploaded.push(j.asset);
          progress(`✓ ${file} → ${j.asset.storage_url}`);
        } catch (e) {
          failed.push({ file, error: e instanceof Error ? e.message : String(e) });
        }
      }

      if (getOutputMode() === "json") {
        emit({ uploaded, failed });
        return;
      }
      if (failed.length > 0) {
        process.stderr.write(`✗ ${failed.length} failed:\n`);
        for (const f of failed) {
          process.stderr.write(`  ${f.file}: ${f.error}\n`);
        }
      }
      // stdout 出 URL 清单 · 方便管道
      for (const a of uploaded) {
        process.stdout.write(`${a.storage_url}\n`);
      }
      if (failed.length > 0 && uploaded.length === 0) process.exit(1);
    });

  // plain attach ls <projectId>
  attach
    .command("ls")
    .description("List assets of a project")
    .argument("<projectId>", "Project id")
    .action(async (projectId: string) => {
      const url = `${originFromGatewayBase()}/api/workspace/projects/${encodeURIComponent(projectId)}/assets`;
      const r = await fetch(url, {
        headers: { authorization: `Bearer ${apiKey()}` },
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        fail(j.error ?? `HTTP ${r.status}`);
      }
      const j = (await r.json()) as { assets: Asset[] };
      if (getOutputMode() === "json") {
        emit(j);
        return;
      }
      if (!j.assets || j.assets.length === 0) {
        process.stdout.write("(no assets)\n");
        return;
      }
      for (const a of j.assets) {
        const kb = Math.max(1, Math.round(a.size_bytes / 1024));
        process.stdout.write(
          `${a.id.slice(0, 10).padEnd(11)} ${`${kb}KB`.padStart(8)}  ${a.filename}\n`,
        );
        process.stdout.write(`  ${a.storage_url}\n`);
      }
    });

  // plain attach rm <projectId> <assetId>
  attach
    .command("rm")
    .description("Delete an asset")
    .argument("<projectId>", "Project id")
    .argument("<assetId>", "Asset id")
    .action(async (projectId: string, assetId: string) => {
      const url = `${originFromGatewayBase()}/api/workspace/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}`;
      const r = await fetch(url, {
        method: "DELETE",
        headers: { authorization: `Bearer ${apiKey()}` },
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        fail(j.error ?? `HTTP ${r.status}`);
      }
      progress(`✓ deleted asset ${assetId}`);
    });
}
