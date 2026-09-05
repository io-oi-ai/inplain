/**
 * plain project · CLI/Web 对等 · 项目(Project)CRUD。
 *
 * 心智:
 *   plain project ls                      列我的所有项目
 *   plain project create <name>           新建项目 · 出 ID
 *   plain project rm <id>                 归档
 *   plain project restore <id>            恢复归档
 *   plain project rename <id> <newName>   改名
 */
import { Command } from "commander";
import { emit, fail, progress, getOutputMode } from "../output";
import { apiKey, gatewayBase, gatewayFetch } from "../gateway-client";
import { loadConfig, saveConfig, resolveProjectId } from "../config";

type Project = {
  id: string;
  name: string;
  description: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

function originFromGatewayBase(): string {
  try {
    const u = new URL(gatewayBase());
    return `${u.protocol}//${u.host}`;
  } catch {
    return "https://inplain.app";
  }
}

async function apiFetch<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const url = `${originFromGatewayBase()}${path}`;
  const headers: Record<string, string> = {
    authorization: `Bearer ${apiKey()}`,
  };
  let body: string | undefined;
  if (init.body !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(init.body);
  }
  const r = await fetch(url, { method: init.method ?? "GET", headers, body });
  if (!r.ok) {
    let msg = `project api ${r.status}`;
    try {
      const j = (await r.json()) as { error?: string };
      if (j.error) msg = `${msg}: ${j.error}`;
    } catch {}
    throw new Error(msg);
  }
  return (await r.json()) as T;
}

export function registerProject(program: Command): void {
  const project = program
    .command("project")
    .alias("proj")
    .description("Manage workspace projects");

  // plain project ls
  project
    .command("ls")
    .description("List your projects")
    .option("--archived", "Show only archived projects")
    .action(async (opts) => {
      const path = opts.archived
        ? "/api/workspace/projects?include=archived-only"
        : "/api/workspace/projects";
      const r = await apiFetch<{ projects: Project[] }>(path).catch((e) =>
        fail(String(e instanceof Error ? e.message : e)),
      );
      if (getOutputMode() === "json") {
        emit(r);
        return;
      }
      if (!r.projects || r.projects.length === 0) {
        process.stdout.write("(no projects)\n");
        return;
      }
      for (const p of r.projects) {
        const flag = p.archived ? "[archived] " : "";
        process.stdout.write(
          `${p.id.slice(0, 12).padEnd(13)} ${flag}${p.name}\n`,
        );
      }
    });

  // plain project create <name>
  project
    .command("create")
    .description("Create a new project")
    .argument("<name>", "Project name")
    .option("--description <text>", "Project description")
    .action(async (name, opts) => {
      const r = await apiFetch<{ project: Project }>("/api/workspace/projects", {
        method: "POST",
        body: { name, description: opts.description ?? "" },
      }).catch((e) => fail(String(e instanceof Error ? e.message : e)));
      if (getOutputMode() === "json") {
        emit(r);
        return;
      }
      progress(`✓ created project ${r.project.id} (${r.project.name})`);
      process.stdout.write(`${r.project.id}\n`);
    });

  // plain project rm <id> · archive
  project
    .command("rm")
    .description("Archive a project")
    .argument("<id>", "Project id")
    .action(async (id) => {
      await apiFetch(`/api/workspace/projects/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: { archived: true },
      }).catch((e) => fail(String(e instanceof Error ? e.message : e)));
      progress(`✓ archived ${id}`);
    });

  // plain project restore <id>
  project
    .command("restore")
    .description("Restore an archived project")
    .argument("<id>", "Project id")
    .action(async (id) => {
      await apiFetch(`/api/workspace/projects/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: { archived: false },
      }).catch((e) => fail(String(e instanceof Error ? e.message : e)));
      progress(`✓ restored ${id}`);
    });

  // plain project rename <id> <new name>
  project
    .command("rename")
    .description("Rename a project")
    .argument("<id>", "Project id")
    .argument("<name>", "New name")
    .action(async (id, name) => {
      await apiFetch(`/api/workspace/projects/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: { name },
      }).catch((e) => fail(String(e instanceof Error ? e.message : e)));
      progress(`✓ renamed ${id} → ${name}`);
    });

  // V27-Q · plain project use <id> · 设默认 project · 之后所有 push/generate 自动带
  project
    .command("use")
    .description("Set default project for push/generate/import (saved to config)")
    .argument("[id]", "Project id (omit + --clear to unset)")
    .option("--clear", "Clear the default project")
    .action(async (id, opts) => {
      const cfg = loadConfig();
      if (opts.clear || id === "--clear") {
        delete cfg.defaultProjectId;
        saveConfig(cfg);
        progress("✓ default project cleared");
        return;
      }
      if (!id) {
        fail("provide <id> or --clear");
      }
      cfg.defaultProjectId = id;
      saveConfig(cfg);
      progress(`✓ default project set to ${id}`);
      progress("  subsequent push / generate / import will bind to this project unless --no-project");
    });

  // V27-Q · plain project current · 看当前默认 project
  project
    .command("current")
    .description("Show the current default project (--project > env > config)")
    .action(async () => {
      const projectId = resolveProjectId();
      if (getOutputMode() === "json") {
        emit({ projectId: projectId ?? null });
        return;
      }
      if (!projectId) {
        process.stdout.write("(no default project · CLI doc 进未归类)\n");
        return;
      }
      process.stdout.write(`${projectId}\n`);
    });

  // V27-R · plain project move <docId> <projectId>
  // 把已有 cloud doc 移动到指定 project · 也支持移出归类(target = "unfiled" / "-")
  project
    .command("move")
    .description("Move a cloud doc into a project (use 'unfiled' or '-' to remove from project)")
    .argument("<docId>", "Cloud doc id")
    .argument("<projectId>", "Target project id · or 'unfiled' / '-' to unfile")
    .action(async (docId: string, projectId: string) => {
      const next =
        projectId === "unfiled" || projectId === "-" || projectId === "__unfiled__"
          ? null
          : projectId;
      // 走 gateway 路径(Bearer token 认证) · /api/workspace/* 只认 session cookie,CLI 用不了
      await gatewayFetch({
        path: `workspace/documents/${encodeURIComponent(docId)}`,
        method: "PATCH",
        body: { projectId: next },
      }).catch((e) => fail(String(e instanceof Error ? e.message : e)));
      progress(`✓ moved ${docId} → ${next ?? "unfiled"}`);
    });
}
