/**
 * plain ls / pull / push / rm —— CLI ↔ 云端 workspace 文档同步。
 *
 * 同账户跨平台(Web / App / CLI)看的是同一张 documents 表。
 * 鉴权走 plain login 拿到的 API key(/api/gateway/v1/workspace/documents)。
 *
 * 命令心智:
 *   plain ls                                列云端文档
 *   plain ls --kind deck                    过滤
 *   plain pull <id> [-o file]               拉单份
 *   plain pull --all <dir>                  全量备份到目录
 *   plain push <file> [--id <id>]           推本地到云端(无 id = 新建)
 *   plain rm <id>                           删
 */
import { Command } from "commander";
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { nanoid } from "nanoid";
import { emit, fail, progress, getOutputMode } from "../output";
import { gatewayFetch } from "../gateway-client";
import { resolveProjectId } from "../config";

type DocKind = "deck" | "doc" | "sheet";

type CloudDoc = {
  id: string;
  kind: DocKind;
  title: string;
  source: string;
  created_at: string;
  updated_at: string;
  last_render_at: string | null;
  forked_from: string | null;
  base_turn_id: string | null;
};

export function registerWorkspace(program: Command): void {
  // ── plain ls ──────────────────────────────────────────
  program
    .command("ls")
    .description("List cloud documents (Web/App/CLI shared workspace)")
    .option("--kind <kind>", "Filter by kind: deck | doc | sheet")
    .option("--search <text>", "Filter by title substring (case-insensitive)")
    .option("--limit <n>", "Show only first N rows (after filter)", parseInt)
    .option(
      "--project <id>",
      "V27-S · Filter by project · use 'unfiled' / '-' for project-less docs",
    )
    .action(async (opts) => {
      const kindFilter = opts.kind as DocKind | undefined;
      if (kindFilter && !["deck", "doc", "sheet"].includes(kindFilter)) {
        fail("--kind must be deck | doc | sheet");
      }
      // V27-S · server-side projectId · sentinel 兼容 'unfiled' / '-'
      let projectQuery = "";
      if (opts.project) {
        const p =
          opts.project === "unfiled" || opts.project === "-" ? "__unfiled__" : opts.project;
        projectQuery = `${kindFilter ? "&" : "?"}projectId=${encodeURIComponent(p)}`;
      }
      const r = await gatewayFetch<{ docs: CloudDoc[] }>({
        path: `workspace/documents${kindFilter ? `?kind=${kindFilter}` : ""}${projectQuery}`,
      }).catch((e) => fail(String(e instanceof Error ? e.message : e)));
      let docs = r.docs;
      // V27-O · 客户端过滤 · prod docs 数量不大 · 不值得加 server query
      if (opts.search) {
        const q = String(opts.search).toLowerCase();
        docs = docs.filter((d) => d.title.toLowerCase().includes(q));
      }
      if (typeof opts.limit === "number" && opts.limit > 0) {
        docs = docs.slice(0, opts.limit);
      }

      if (getOutputMode() === "json") {
        emit({ docs });
        return;
      }

      if (docs.length === 0) {
        process.stdout.write("(no documents)\n");
        return;
      }
      const idW = 12;
      const kindW = 6;
      const titleW = 38;
      // header
      process.stdout.write(
        pad("ID", idW) + pad("KIND", kindW) + pad("TITLE", titleW) + "UPDATED\n",
      );
      for (const d of docs) {
        process.stdout.write(
          pad(d.id.slice(0, 10) + "…", idW) +
            pad(d.kind, kindW) +
            pad(truncate(d.title, titleW - 2), titleW) +
            relTime(d.updated_at) +
            "\n",
        );
      }
    });

  // ── plain pull ────────────────────────────────────────
  program
    .command("pull")
    .description("Download cloud document(s) to local files")
    .argument("[id]", "Document id (omit when using --all)")
    .option("-o, --output <file>", "Write to specific file (default: <title>.<kind>.md)")
    .option("--all <dir>", "Download all documents to this directory")
    .action(async (id, opts) => {
      if (opts.all) {
        const dir = opts.all as string;
        if (existsSync(dir) && !statSync(dir).isDirectory()) {
          fail(`${dir} exists and is not a directory`);
        }
        mkdirSync(dir, { recursive: true });
        const r = await gatewayFetch<{ docs: CloudDoc[] }>({
          path: "workspace/documents",
        }).catch((e) => fail(String(e instanceof Error ? e.message : e)));
        for (const d of r.docs) {
          const fname = `${sanitize(d.title)}.${d.kind}.md`;
          const out = join(dir, fname);
          writeFileSync(out, d.source);
          progress(`✓ ${out}  (${d.source.length} bytes)`);
        }
        if (getOutputMode() === "json") {
          emit({ count: r.docs.length, dir });
        } else {
          process.stdout.write(`pulled ${r.docs.length} docs → ${dir}\n`);
        }
        return;
      }

      if (!id) fail("provide <id> or --all <dir>");
      const r = await gatewayFetch<{ doc: CloudDoc }>({
        path: `workspace/documents/${encodeURIComponent(id)}`,
      }).catch((e) => fail(String(e instanceof Error ? e.message : e)));
      const d = r.doc;
      const out = opts.output ?? `${sanitize(d.title)}.${d.kind}.md`;
      writeFileSync(out, d.source);
      if (getOutputMode() === "json") {
        emit({ id: d.id, kind: d.kind, file: out, bytes: d.source.length });
      } else {
        progress(`✓ wrote ${out} (${d.source.length} bytes)`);
      }
    });

  // ── plain push ────────────────────────────────────────
  program
    .command("push")
    .description("Upload a local source file to cloud workspace")
    .argument("<file>", "Local source file (.md)")
    .option("--id <id>", "Update an existing document by id (default: create new)")
    .option(
      "--kind <kind>",
      "Document kind: deck | doc | sheet (default: infer from filename or frontmatter)",
    )
    .option("--title <title>", "Override title (default: infer from frontmatter or filename)")
    .option(
      "--project <id>",
      "V27-Q · Bind doc to a project (web 工作台同款 · default from `plain project use`)",
    )
    .option("--no-project", "Force unfiled (override default project)")
    .action(async (file, opts) => {
      if (!existsSync(file)) fail(`file not found: ${file}`);
      const source = readFileSync(file, "utf8");
      const kind = (opts.kind as DocKind | undefined) ?? inferKind(file, source);
      if (!kind) {
        fail(
          "could not infer --kind from filename or frontmatter. Pass --kind deck|doc|sheet.",
        );
      }
      const title = opts.title ?? inferTitle(source) ?? basename(file).replace(/\.[^.]+$/, "");
      const id = opts.id ?? nanoid(10);
      const now = Date.now();
      // V27-Q · resolve project · --no-project 显式不带 · 否则用 default
      const projectId =
        opts.project === false ? null : resolveProjectId(opts.project as string | undefined);

      const r = await gatewayFetch<{ ok: boolean; id: string }>({
        method: "POST",
        path: "workspace/documents",
        body: {
          id,
          kind,
          title,
          source,
          createdAt: now,
          updatedAt: now,
          projectId: projectId ?? null,
        },
      }).catch((e) => fail(String(e instanceof Error ? e.message : e)));

      if (getOutputMode() === "json") {
        emit({ id: r.id, kind, title, bytes: source.length, projectId: projectId ?? null });
      } else {
        progress(
          `✓ ${opts.id ? "updated" : "created"} ${r.id}  (${kind} · ${title}${projectId ? ` · project=${projectId}` : ""})`,
        );
        process.stdout.write(`${r.id}\n`);
      }
    });

  // ── plain rm ──────────────────────────────────────────
  // V27-S · 支持批量:plain rm id1 id2 id3
  // V27-S · --unfiled 一次清空所有未归类 doc
  program
    .command("rm")
    .description("Delete cloud document(s) · batch + --unfiled supported")
    .argument("[ids...]", "One or more document ids")
    .option("--unfiled", "Delete ALL docs not bound to any project (uses confirmation)")
    .option("-y, --yes", "Skip confirmation prompt")
    .action(async (ids: string[], opts) => {
      let targets: string[] = ids ?? [];
      if (opts.unfiled) {
        // 拉全部 unfiled docs
        const r = await gatewayFetch<{ docs: Array<{ id: string; title: string }> }>({
          path: "workspace/documents?projectId=__unfiled__",
        }).catch((e) => fail(String(e instanceof Error ? e.message : e)));
        const unfiledIds = (r.docs ?? []).map((d) => d.id);
        targets = [...targets, ...unfiledIds];
        if (unfiledIds.length === 0) {
          progress("(no unfiled docs to delete)");
          return;
        }
        if (!opts.yes) {
          process.stderr.write(`! 即将删除 ${unfiledIds.length} 份未归类 doc:\n`);
          for (const d of r.docs) {
            process.stderr.write(`    ${d.id}  ${d.title}\n`);
          }
          process.stderr.write(`  用 -y 跳过确认 · 或重新跑加 --yes\n`);
          process.exit(1);
        }
      }
      if (targets.length === 0) {
        fail("provide at least one <id> · or use --unfiled");
      }
      // 串行删 · 避免单次请求并发过高
      let okCount = 0;
      const failed: Array<{ id: string; error: string }> = [];
      for (const id of targets) {
        try {
          await gatewayFetch({
            method: "DELETE",
            path: `workspace/documents/${encodeURIComponent(id)}`,
          });
          okCount += 1;
          progress(`✓ deleted ${id}`);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          failed.push({ id, error: msg });
          process.stderr.write(`✗ ${id}: ${msg}\n`);
        }
      }
      if (getOutputMode() === "json") {
        emit({ deleted: okCount, failed });
      } else {
        progress(`done · ${okCount} deleted${failed.length ? ` · ${failed.length} failed` : ""}`);
      }
      if (failed.length > 0 && okCount === 0) process.exit(1);
    });
}

// ─────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────

function pad(s: string, w: number): string {
  if (s.length >= w) return s.slice(0, w - 1) + " ";
  return s + " ".repeat(w - s.length);
}

function truncate(s: string, w: number): string {
  if (s.length <= w) return s;
  return s.slice(0, w - 1) + "…";
}

function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hr ago`;
  if (diff < 30 * 86_400_000) return `${Math.floor(diff / 86_400_000)} days ago`;
  return new Date(iso).toISOString().slice(0, 10);
}

function sanitize(name: string): string {
  return (
    name
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "untitled"
  );
}

/** 优先看 frontmatter `plain: deck@v2 | doc@v2 | sheet@v2`,fallback 看文件名 */
function inferKind(file: string, source: string): DocKind | null {
  // V22-F · 容错带引号 plain: "deck@v2"
  const m = source.match(/^---\s*\n[\s\S]*?\nplain:\s*["']?(deck|doc|sheet)@v2/m);
  if (m) return m[1] as DocKind;
  // 老格式 frontmatter:`kind: sheet` / `marp: true`(deck)
  if (/^---\s*\n[\s\S]*?\nkind:\s*sheet/m.test(source)) return "sheet";
  if (/^---\s*\n[\s\S]*?\nmarp:\s*true/m.test(source)) return "deck";
  // 文件名 *.deck.md / *.doc.md / *.sheet.md
  const lower = basename(file).toLowerCase();
  if (lower.endsWith(".deck.md")) return "deck";
  if (lower.endsWith(".doc.md")) return "doc";
  if (lower.endsWith(".sheet.md")) return "sheet";
  // 单纯 .md → 当 doc
  if (extname(lower) === ".md") return "doc";
  return null;
}

/** 从 frontmatter `title: X` 抽 */
function inferTitle(source: string): string | null {
  const m = source.match(/^---\s*\n[\s\S]*?\ntitle:\s*([^\n]+)/m);
  if (m) {
    return m[1].trim().replace(/^["']|["']$/g, "");
  }
  // fallback:第一个 # heading
  const h = source.match(/^#\s+(.+)$/m);
  return h ? h[1].trim() : null;
}
