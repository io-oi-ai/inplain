/**
 * `plain install` — 一条命令把 Plain MCP server 装进本地 AI 工具。
 *
 * 借鉴 OfficeCLI 的 `install`:检测本地有哪些 AI 工具(Claude Code / Cursor / VS Code),
 * 自动把 Plain 的 MCP server(`plain mcp` stdio)写进各自的 MCP 配置文件,
 * 省去用户手动编辑 JSON 的摩擦。
 *
 * Plain 的产物是网页(deck/doc/sheet → HTML),MCP 让 agent 能 generate/edit/export 这些。
 * 不碰 Office 文件路线(那是 OfficeCLI 的事),只是借它"零摩擦接入"的工程做法。
 *
 * 幂等:已配置则跳过/更新,不重复写。--dry-run 只打印不写。
 */
import { Command } from "commander";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * 把打包进 dist/skill 的 Plain Claude Code skill 装到 ~/.claude/skills/plain/。
 * 让 Claude Code 用户装了 CLI 后,agent 自动懂"怎么用 plain 生成/编辑 artifact"。
 * 幂等:整目录覆盖复制。返回是否装成功。
 */
function installSkill(dryRun: boolean): { ok: boolean; dest: string; reason?: string } {
  // dist/index.js 同级的 skill/ (build.mjs 复制进去的)
  const here = dirname(fileURLToPath(import.meta.url));
  const src = join(here, "skill", "plain");
  const dest = join(homedir(), ".claude", "skills", "plain");
  if (!existsSync(src)) return { ok: false, dest, reason: "skill 源不存在(dev 未构建?)" };
  if (dryRun) return { ok: true, dest };
  try {
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest, { recursive: true });
    return { ok: true, dest };
  } catch (e) {
    return { ok: false, dest, reason: e instanceof Error ? e.message : String(e) };
  }
}

type Target = {
  key: string;
  label: string;
  /** 配置文件路径(绝对) */
  path: string;
  /** MCP server 在配置 JSON 里的容器 key 路径 · 不同工具结构略不同 */
  containerKey: "mcpServers" | "servers";
  /** 该工具配置文件是否存在(= 是否装了这个工具) */
  detected: boolean;
};

const MCP_ENTRY = {
  command: "plain",
  args: ["mcp"],
};

function targets(): Target[] {
  const home = homedir();
  const cwd = process.cwd();
  const defs: Array<Omit<Target, "detected">> = [
    // Claude Code · 全局 ~/.claude.json(mcpServers)
    { key: "claude", label: "Claude Code", path: join(home, ".claude.json"), containerKey: "mcpServers" },
    // Cursor · 全局 ~/.cursor/mcp.json
    { key: "cursor", label: "Cursor", path: join(home, ".cursor", "mcp.json"), containerKey: "mcpServers" },
    // VS Code (Copilot/MCP) · 项目 .vscode/mcp.json(servers)
    { key: "vscode", label: "VS Code", path: join(cwd, ".vscode", "mcp.json"), containerKey: "servers" },
  ];
  return defs.map((d) => ({
    ...d,
    // Claude/Cursor 看配置文件;VS Code 看是否在含 .vscode 的项目里(或已有该文件)
    detected:
      existsSync(d.path) ||
      (d.key === "vscode" && existsSync(join(cwd, ".vscode"))) ||
      (d.key === "cursor" && existsSync(join(home, ".cursor"))) ||
      (d.key === "claude" && existsSync(join(home, ".claude.json"))),
  }));
}

/** 把 Plain MCP entry 合并进一个配置文件(幂等) · 返回 'added' | 'updated' | 'unchanged' */
function applyTo(t: Target, dryRun: boolean): "added" | "updated" | "unchanged" | "error" {
  try {
    let cfg: Record<string, unknown> = {};
    if (existsSync(t.path)) {
      try {
        cfg = JSON.parse(readFileSync(t.path, "utf8")) as Record<string, unknown>;
      } catch {
        return "error"; // 配置文件存在但坏 JSON · 不覆盖,让用户自己看
      }
    }
    const container = (cfg[t.containerKey] ?? {}) as Record<string, unknown>;
    const existing = container["plain"];
    const want = JSON.stringify(MCP_ENTRY);
    const had = existing ? JSON.stringify(existing) : null;
    if (had === want) return "unchanged";

    if (!dryRun) {
      container["plain"] = MCP_ENTRY;
      cfg[t.containerKey] = container;
      mkdirSync(dirname(t.path), { recursive: true });
      writeFileSync(t.path, JSON.stringify(cfg, null, 2) + "\n", "utf8");
    }
    return had === null ? "added" : "updated";
  } catch {
    return "error";
  }
}

export function registerInstall(program: Command): void {
  program
    .command("install")
    .description("Install the Plain MCP server into Claude Code / Cursor / VS Code")
    .option("--dry-run", "Show what would be written without writing it")
    .option("--all", "Configure every supported tool, not just detected ones")
    .action(async (opts: { dryRun?: boolean; all?: boolean }) => {
      const all = targets();
      const chosen = opts.all ? all : all.filter((t) => t.detected);

      if (chosen.length === 0) {
        process.stdout.write(
          "未检测到 Claude Code / Cursor / VS Code 的配置。\n" +
            "用 `plain install --all` 强制为全部工具写配置,或先装好其中一个再运行。\n",
        );
        return;
      }

      process.stdout.write(
        opts.dryRun ? "── plain install (dry-run) ──\n" : "── plain install ──\n",
      );
      let wrote = 0;
      for (const t of chosen) {
        const r = applyTo(t, !!opts.dryRun);
        const mark =
          r === "added" ? "✓ 新增" :
          r === "updated" ? "✓ 更新" :
          r === "unchanged" ? "· 已是最新" :
          "✗ 失败(配置文件坏 JSON,跳过)";
        if (r === "added" || r === "updated") wrote++;
        process.stdout.write(`  ${mark.padEnd(8)} ${t.label.padEnd(12)} ${t.path}\n`);
      }
      // 顺带装 Claude Code skill(教 agent 怎么用 plain 生成/编辑 artifact)
      const sk = installSkill(!!opts.dryRun);
      if (sk.ok) {
        process.stdout.write(`  ${(opts.dryRun ? "· 待装" : "✓ skill").padEnd(8)} ${"skill".padEnd(12)} ${sk.dest}\n`);
      } else {
        process.stdout.write(`  · 跳过 skill (${sk.reason})\n`);
      }

      if (opts.dryRun) {
        process.stdout.write("\n(dry-run · 未写入。去掉 --dry-run 实际安装。)\n");
      } else if (wrote > 0 || sk.ok) {
        process.stdout.write(
          `\n完成 · 重启对应 AI 工具后,Plain 的 generate/edit/export 工具即可用。\n` +
            `Claude Code 会读到 plain skill,自动懂如何生成/编辑 artifact。\n` +
            `(需要登录:运行 \`plain login\`)\n`,
        );
      } else {
        process.stdout.write("\n无改动 · 全部已是最新。\n");
      }
    });
}
