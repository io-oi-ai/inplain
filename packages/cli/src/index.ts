/**
 * Plain CLI 入口。
 *
 * 设计原则(见 reference_plain_oss_benchmarks.md):
 * - noun-verb 嵌套(plain deck generate / plain doc edit),便于 agent 通过 --help 树发现工具
 * - 默认人类可读输出(stdout 主结果 + stderr 进度);加 --json 切机器模式
 * - LLM 调用通过 llm-client.ts 抽象,gateway / direct 两种 backend
 * - MCP server (plain mcp) 是 CLI 子命令的薄包装,不重复实现 agent 逻辑
 *
 * 当前不在 monorepo 里——直接在主 repo 加 cli/ 目录,通过 tsx 跑。
 * 等 Phase 2 (Tauri Desktop) 真要 ship 时再拆 monorepo。
 */
import { Command } from "commander";
import { setOutputMode } from "./output";
import { applyConfigToEnv } from "./config";
import { registerDeck } from "./commands/deck";
import { registerDoc } from "./commands/doc";
import { registerSheet } from "./commands/sheet";
import { registerExport } from "./commands/export";
import { registerMcp } from "./commands/mcp";
import { registerLogin } from "./commands/login";
import { registerWorkspace } from "./commands/workspace";
import { registerShare } from "./commands/share";
import { registerProject } from "./commands/project";
import { registerAttach } from "./commands/attach";
import { registerImport } from "./commands/import";
import { registerTemplates } from "./commands/templates";
import { registerInstall } from "./commands/install";
import { registerGenerate } from "./commands/generate";
import { registerDesign } from "./commands/design";

// build.mjs 用 esbuild define 把 package.json 的 version 注进来 —— 单一来源,
// 避免这里再硬编码一份然后漂移。tsx 直跑源码时没有 define,回落到 "dev"。
const PKG_VERSION = process.env.PLAIN_CLI_VERSION ?? "dev";

// boot:把保存的 config 提升到 env,后续 setupLlmEnv() 自动选 backend
applyConfigToEnv();

const program = new Command();

program
  .name("plain")
  .description(
    "Plain — the artifact layer for AI work. Generate, edit, and share living artifacts (deck / doc / dashboard).",
  )
  .version(PKG_VERSION)
  .option("--json", "Emit machine-readable JSON on stdout (progress still on stderr)")
  .hook("preAction", (thisCmd) => {
    if (thisCmd.opts().json) setOutputMode("json");
  });

registerGenerate(program);
registerTemplates(program);
registerDesign(program);
registerDeck(program);
registerDoc(program);
registerSheet(program);
registerExport(program);
registerMcp(program);
registerInstall(program);
registerLogin(program);
registerWorkspace(program);
registerShare(program);
registerProject(program);
registerAttach(program);
registerImport(program);

program.parseAsync(process.argv).catch((e: unknown) => {
  process.stderr.write(`✗ ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
