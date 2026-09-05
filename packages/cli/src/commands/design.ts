/**
 * plain design — 管理"我的设计系统"。
 *
 * 核心命令是 `plain design import <url>`:从一个真实网站(通常是用户自己
 * 公司的官网)抽出品牌配色 / 字体 / 圆角,变成一套 Plain 设计系统。
 * 之后 `plain deck generate` 不带 --template 就默认用它 —— 生成的每份
 * 文档自带公司品牌,而不是长得像 AI 模板。
 *
 * 抽取用 dembrandt(MIT · https://github.com/dembrandt/dembrandt):
 * Playwright 渲染页面 + 读 computed style。
 *
 * ⚠ 为什么抽取在 CLI 而不在服务端:它要一个真浏览器。Plain 生产跑在
 * Cloudflare Workers 上,起不了 Playwright。而 CLI 就在用户机器上,
 * 浏览器本来就有 —— 让抽取发生在有浏览器的那一侧,服务端只收结果。
 *
 * dembrandt 不打进 Plain 的依赖:用 npx 按需拉起(首次要下 ~90MB 浏览器)。
 * 它是可选工具,不该让每个装 plain 的人都付这个代价。
 */
import { spawn } from "node:child_process";
import { Command } from "commander";
import { emit, getOutputMode, fail } from "../output";
import { gatewayFetch } from "../gateway-client";

type Extract = Record<string, unknown>;

/** 跑 `npx dembrandt <url> --json-only`,拿回抽取 JSON */
async function runDembrandt(url: string, opts: { dark?: boolean; slow?: boolean }): Promise<Extract> {
  const args = ["-y", "dembrandt@latest", url, "--json-only"];
  if (opts.dark) args.push("--dark-mode");
  if (opts.slow) args.push("--slow");

  return await new Promise<Extract>((resolve, reject) => {
    const child = spawn("npx", args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d: Buffer) => (out += d.toString()));
    // dembrandt 的进度写 stderr —— 透传给用户看,别静默等 30 秒
    child.stderr.on("data", (d: Buffer) => {
      const s = d.toString();
      err += s;
      if (getOutputMode() !== "json") process.stderr.write(s);
    });
    child.on("error", (e) =>
      reject(new Error(`failed to run npx: ${e.message}. Is Node/npm on PATH?`)),
    );
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`dembrandt exited ${code}${err ? `:\n${err.trim()}` : ""}`));
        return;
      }
      // --json-only 仍可能在 JSON 前后带一行摘要 → 取第一个 { 到最后一个 }
      const a = out.indexOf("{");
      const b = out.lastIndexOf("}");
      if (a < 0 || b <= a) {
        reject(new Error("dembrandt produced no JSON output"));
        return;
      }
      try {
        resolve(JSON.parse(out.slice(a, b + 1)) as Extract);
      } catch (e) {
        reject(new Error(`could not parse dembrandt JSON: ${e instanceof Error ? e.message : e}`));
      }
    });
  });
}

export function registerDesign(program: Command): void {
  const design = program
    .command("design")
    .description("Manage your design systems (brand colors, fonts, radius)");

  design
    .command("import <url>")
    .description("Extract a design system from a website (e.g. your company homepage)")
    .option("--name <name>", "Name for the system (defaults to the site name)")
    .option("--dark", "Extract the site's dark mode instead of light")
    .option("--slow", "Use longer timeouts for slow-loading sites")
    .option("--default", "Set as the default system for new artifacts")
    .option("--dry-run", "Show the extracted tokens without saving")
    .action(
      async (
        url: string,
        opts: { name?: string; dark?: boolean; slow?: boolean; default?: boolean; dryRun?: boolean },
      ) => {
        const target = /^https?:\/\//i.test(url) ? url : `https://${url}`;

        if (getOutputMode() !== "json") {
          process.stderr.write(`→ Extracting design tokens from ${target}\n`);
          process.stderr.write(`  (first run downloads a headless browser, ~90MB)\n`);
        }

        let extract: Extract;
        try {
          extract = await runDembrandt(target, { dark: opts.dark, slow: opts.slow });
        } catch (e) {
          fail(e instanceof Error ? e.message : String(e));
          return;
        }

        // 映射 + WCAG 修复(纯函数 · 跟服务端共用同一份实现)
        const { tokensFromExtract } = await import("@/lib/v32/import-tokens");
        const { tokens, provenance, suggestedName } = tokensFromExtract(extract);
        const name = opts.name?.trim() || suggestedName;

        if (opts.dryRun) {
          if (getOutputMode() === "json") {
            emit({ name, tokens, provenance, sourceUrl: target, saved: false });
          } else {
            printTokens(name, target, tokens, provenance);
            process.stdout.write(`\nDry run — nothing saved. Drop --dry-run to save.\n`);
          }
          return;
        }

        let saved: { system: { id: string; name: string } };
        try {
          saved = await gatewayFetch({
            method: "POST",
            path: "design-systems",
            body: { name, tokens, sourceUrl: target, setDefault: opts.default },
          });
        } catch (e) {
          fail(e instanceof Error ? e.message : String(e));
          return;
        }

        if (getOutputMode() === "json") {
          emit({ ...saved, tokens, provenance, sourceUrl: target, saved: true });
          return;
        }
        printTokens(name, target, tokens, provenance);
        process.stdout.write(`\n✓ Saved as "${saved.system.name}" (${saved.system.id})\n`);
        process.stdout.write(
          opts.default
            ? `  It's now the default for new artifacts.\n`
            : `  Use it: plain deck generate --template custom:${saved.system.id} --intent "..."\n`,
        );
      },
    );

  design
    .command("list")
    .description("List your design systems")
    .action(async () => {
      let r: { systems: Array<{ id: string; name: string; isDefault?: boolean; sourceUrl?: string; tokens: { color: { accent: string }; scheme: string } }> };
      try {
        r = await gatewayFetch({ path: "design-systems" });
      } catch (e) {
        fail(e instanceof Error ? e.message : String(e));
        return;
      }
      if (getOutputMode() === "json") {
        emit(r);
        return;
      }
      if (!r.systems.length) {
        process.stdout.write(
          `No custom design systems yet.\n\nCreate one from your website:\n  plain design import yourcompany.com\n`,
        );
        return;
      }
      process.stdout.write(`Your design systems (${r.systems.length}):\n\n`);
      for (const s of r.systems) {
        const star = s.isDefault ? " ★ default" : "";
        process.stdout.write(
          `  custom:${s.id}  ${s.name}${star}\n` +
            `  ${" ".repeat(7 + s.id.length)}  ${s.tokens.color.accent} · ${s.tokens.scheme}` +
            `${s.sourceUrl ? ` · from ${s.sourceUrl}` : ""}\n\n`,
        );
      }
    });

  design
    .command("delete <id>")
    .description("Delete a design system (id without the custom: prefix)")
    .action(async (id: string) => {
      const clean = id.replace(/^custom:/, "");
      try {
        await gatewayFetch({
          method: "DELETE",
          path: `design-systems?id=${encodeURIComponent(clean)}`,
        });
      } catch (e) {
        fail(e instanceof Error ? e.message : String(e));
        return;
      }
      if (getOutputMode() === "json") emit({ ok: true, id: clean });
      else process.stdout.write(`✓ Deleted ${clean}\n`);
    });
}

/** 人类可读地打印一套 tokens,并标出哪些是实测的、哪些是我们补的 */
function printTokens(
  name: string,
  sourceUrl: string,
  tokens: { color: Record<string, string>; radius: string; gap: string; scheme: string; font: Record<string, string | undefined> },
  provenance: Record<string, string>,
): void {
  const tag = (k: string) =>
    provenance[k] === "measured" ? "" : provenance[k] === "repaired" ? "  (fixed for contrast)" : "  (derived)";
  process.stdout.write(`\n${name}  ·  ${sourceUrl}\n`);
  process.stdout.write(`${"─".repeat(52)}\n`);
  process.stdout.write(`  scheme   ${tokens.scheme}\n`);
  process.stdout.write(`  radius   ${tokens.radius}\n`);
  if (tokens.font.body) process.stdout.write(`  body     ${tokens.font.body}\n`);
  if (tokens.font.display) process.stdout.write(`  display  ${tokens.font.display}\n`);
  if (tokens.font.mono) process.stdout.write(`  mono     ${tokens.font.mono}\n`);
  process.stdout.write(`\n  colors\n`);
  for (const [k, v] of Object.entries(tokens.color)) {
    process.stdout.write(`    ${k.padEnd(13)} ${String(v).padEnd(34)}${tag(k)}\n`);
  }
}
