import { Command } from "commander";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomBytes } from "node:crypto";
import { progress, emit, getOutputMode } from "../output";
import { configPath, loadConfig, saveConfig } from "../config";

// 裸域(非 www):BETTER_AUTH_URL=https://inplain.app,session cookie 是 host-only,
// 只在裸域有效。www 子域 cookie 不共享 → cli-auth 会判定未登录。CLI 必须用裸域,
// 才能复用用户已有的网页登录态(已登录 → 直接授权,不用重登)。
const DEFAULT_WEB_BASE = "https://inplain.app";
const PORT_RANGE_START = 34567;
const PORT_RANGE_END = 34577;
const TIMEOUT_MS = 15 * 60 * 1000; // 15 分钟内必须完成,否则放弃(留足查邮箱+登录+授权时间)

export function registerLogin(program: Command): void {
  program
    .command("login")
    .description(
      "Authorize Plain CLI via your browser (local callback flow). " +
        "Opens https://inplain.app/account/cli-auth, you click 'Authorize CLI', " +
        "we receive the API key on a localhost callback and save it to config.",
    )
    .option(
      "--api-key <key>",
      "Skip browser flow, paste a key directly (advanced; CI use).",
    )
    .option("--gateway-url <url>", "Override default gateway URL")
    .option("--agent-id <id>", "Default agent identifier (for per-agent metering)")
    .option(
      "--web-base <url>",
      `Override the web URL for the auth page. Default: ${DEFAULT_WEB_BASE}`,
    )
    .action(async (opts) => {
      // 直传 key 模式 — CI / 自动化场景
      if (opts.apiKey) {
        const cfg = loadConfig();
        cfg.apiKey = opts.apiKey;
        if (opts.gatewayUrl) cfg.gatewayUrl = opts.gatewayUrl;
        if (opts.agentId) cfg.defaultAgentId = opts.agentId;
        saveConfig(cfg);
        progress(`✓ saved to ${configPath()}`);
        return;
      }

      // 重登提示 — 已经有 key 时确认是否覆盖
      const existing = loadConfig();
      if (existing.apiKey) {
        const masked =
          existing.apiKey.length > 12
            ? existing.apiKey.slice(0, 12) + "…" + existing.apiKey.slice(-4)
            : existing.apiKey;
        progress(`You're already logged in (${masked}).`);
        progress(`Authorizing again will replace the existing key.`);
      }

      // 浏览器 callback 流
      try {
        const result = await browserAuthFlow({
          webBase: opts.webBase ?? DEFAULT_WEB_BASE,
        });
        const cfg = loadConfig();
        cfg.apiKey = result.key;
        cfg.apiKeyExpiresAt = result.expiresAt ?? null;
        if (opts.gatewayUrl) cfg.gatewayUrl = opts.gatewayUrl;
        if (opts.agentId) cfg.defaultAgentId = opts.agentId;
        saveConfig(cfg);
        if (result.email) {
          progress(`✓ Logged in as ${result.email}`);
        }
        // V27-M · 显示过期时间 · 让用户知道下一次重 login 的截止日期
        if (result.expiresAt) {
          const d = new Date(result.expiresAt);
          const days = Math.round((d.getTime() - Date.now()) / 86_400_000);
          progress(`  token valid for ${days} days (expires ${d.toISOString().slice(0, 10)})`);
        }
        progress(`  config saved to ${configPath()}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        process.stderr.write(`✗ login failed: ${msg}\n`);
        process.stderr.write(
          `  Fallback: plain login --api-key <PAT>  (manually paste a key from /account)\n`,
        );
        process.exit(1);
      }
    });

  program
    .command("config")
    .description("Show resolved Plain CLI config (file + env merged)")
    .action(async () => {
      const cfg = loadConfig();
      const resolved: Record<string, string | null> = {
        configFile: configPath(),
        apiKey: process.env.PLAIN_API_KEY ?? cfg.apiKey ?? null,
        // V27-M · 显示 token 过期 · null/missing = 永久(老 key)
        apiKeyExpiresAt: cfg.apiKeyExpiresAt ?? null,
        gatewayUrl:
          process.env.PLAIN_GATEWAY_URL ??
          cfg.gatewayUrl ??
          "https://inplain.app/api/gateway/v1",
        defaultAgentId:
          process.env.PLAIN_AGENT_ID ?? cfg.defaultAgentId ?? "default",
      };
      // 屏蔽 api key 大部分字符
      if (resolved.apiKey && resolved.apiKey.length > 8) {
        resolved.apiKey =
          resolved.apiKey.slice(0, 4) + "…" + resolved.apiKey.slice(-4);
      }
      // V27-M · token 过期状态提示
      let expiryNote = "";
      if (cfg.apiKeyExpiresAt) {
        const exp = new Date(cfg.apiKeyExpiresAt).getTime();
        const now = Date.now();
        const days = Math.round((exp - now) / 86_400_000);
        if (exp < now) {
          expiryNote = "  ⚠  token EXPIRED · run `plain login` to renew";
        } else if (days <= 3) {
          expiryNote = `  ⚠  token expires in ${days} day(s) · run \`plain login\` to renew`;
        } else {
          expiryNote = `  token valid for ${days} more days`;
        }
      } else if (resolved.apiKey) {
        // 老 key(无 expires)· 提示一下安全顾虑
        expiryNote =
          "  ℹ legacy permanent token · run `plain login` to upgrade to a 7-day rotating token";
      }
      if (getOutputMode() === "json") {
        emit({ ...resolved, expiryNote: expiryNote.trim() || null });
      } else {
        for (const [k, v] of Object.entries(resolved)) {
          process.stdout.write(`${k.padEnd(18)} ${v ?? "(unset)"}\n`);
        }
        if (expiryNote) process.stdout.write(`${expiryNote}\n`);
      }
    });

  program
    .command("logout")
    .description("Remove saved API key (config file is left in place)")
    .action(async () => {
      const cfg = loadConfig();
      delete cfg.apiKey;
      saveConfig(cfg);
      progress("✓ api key removed");
    });

  // V27-N · plain whoami · 显示当前账号 + dev 豁免状态
  program
    .command("whoami")
    .description("Show the user account behind the current API key")
    .action(async () => {
      const cfg = loadConfig();
      const apiKey = process.env.PLAIN_API_KEY ?? cfg.apiKey;
      if (!apiKey) {
        progress("not logged in. Run `plain login` first.");
        process.exit(1);
      }
      const base = (
        process.env.PLAIN_GATEWAY_URL ??
        cfg.gatewayUrl ??
        "https://inplain.app/api/gateway/v1"
      ).replace(/\/api\/gateway\/v1\/?$/, "");
      const r = await fetch(`${base}/api/me`, {
        headers: { authorization: `Bearer ${apiKey}` },
      }).catch((e) => {
        progress(`✗ network error: ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
      });
      if (!r.ok) {
        progress(`✗ ${r.status} ${await r.text().catch(() => "")}`);
        process.exit(1);
      }
      const j = (await r.json()) as {
        id: string;
        email: string;
        name: string | null;
        isDev: boolean;
      };
      if (getOutputMode() === "json") {
        emit(j);
      } else {
        process.stdout.write(`user.id   ${j.id}\n`);
        process.stdout.write(`email     ${j.email}\n`);
        if (j.name) process.stdout.write(`name      ${j.name}\n`);
        process.stdout.write(`status    ${j.isDev ? "dev (permanent token)" : "user (7-day rotating token)"}\n`);
      }
    });
}

// ─────────────────────────────────────────────────────────────
// Browser local-callback flow
// ─────────────────────────────────────────────────────────────

type FlowResult = { key: string; email?: string; userId?: string; expiresAt?: string };

/**
 * 起 localhost server 监听 PORT_RANGE_START 起的第一个空闲端口,打开浏览器到
 * <webBase>/account/cli-auth?callback=http://127.0.0.1:<port>/cb&state=<random>
 *
 * 用户点 "Authorize CLI" → 网页 redirect 到 callback 带 ?key=...&state=...
 * 我们核对 state 后取 key,resolve promise,关闭 server。
 */
async function browserAuthFlow(opts: { webBase: string }): Promise<FlowResult> {
  const state = randomBytes(16).toString("hex");
  const { server, port } = await listenOnAnyPort(
    PORT_RANGE_START,
    PORT_RANGE_END,
  );
  const callback = `http://127.0.0.1:${port}/cb`;
  const authUrl =
    `${opts.webBase.replace(/\/+$/, "")}/account/cli-auth` +
    `?callback=${encodeURIComponent(callback)}` +
    `&state=${encodeURIComponent(state)}`;

  progress("Opening browser to authorize…");
  progress(`  ${authUrl}`);
  void openInBrowser(authUrl);

  // 终端"等待中"状态:原地刷新的 spinner(只在 human 模式 + TTY 下显示)。
  // 收到 callback / 超时 / 出错时清除,换成最终结果行。
  const spinnerOn = getOutputMode() === "human" && process.stderr.isTTY;
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let frameIdx = 0;
  let spinnerTimer: ReturnType<typeof setInterval> | null = null;
  if (spinnerOn) {
    spinnerTimer = setInterval(() => {
      frameIdx = (frameIdx + 1) % frames.length;
      process.stderr.write(`\r${frames[frameIdx]} Waiting for authorization…  `);
    }, 80);
  }
  function clearSpinner() {
    if (spinnerTimer) {
      clearInterval(spinnerTimer);
      spinnerTimer = null;
      process.stderr.write("\r\x1b[2K"); // 回到行首 + 清整行
    }
  }

  return await new Promise<FlowResult>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("timed out waiting for browser callback (15 min)"));
    }, TIMEOUT_MS);

    function cleanup() {
      clearTimeout(timer);
      clearSpinner();
      server.close();
    }

    server.on("request", (req: IncomingMessage, res: ServerResponse) => {
      const u = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
      if (u.pathname !== "/cb") {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      const gotKey = u.searchParams.get("key") ?? "";
      const gotState = u.searchParams.get("state") ?? "";
      const gotEmail = u.searchParams.get("email") ?? undefined;
      const gotUserId = u.searchParams.get("userId") ?? undefined;
      // V27-M · /account/cli-auth 应该回传 expiresAt(ISO)·
      // 老 web 没传 → undefined → CLI 不显示"x days remaining"提示
      const gotExpiresAt = u.searchParams.get("expiresAt") ?? undefined;
      if (!gotKey) {
        res.writeHead(400, { "content-type": "text/html; charset=utf-8" });
        res.end(callbackHtml({ ok: false, msg: "missing key" }));
        cleanup();
        reject(new Error("callback missing ?key="));
        return;
      }
      if (gotState !== state) {
        res.writeHead(400, { "content-type": "text/html; charset=utf-8" });
        res.end(callbackHtml({ ok: false, msg: "state mismatch" }));
        cleanup();
        reject(new Error("state mismatch — possible CSRF"));
        return;
      }
      // 成功 — 给浏览器一个精致回执页(品牌色 + 3 秒倒计时自动关闭)
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(callbackHtml({ ok: true, msg: "", email: gotEmail }));
      cleanup();
      resolve({ key: gotKey, email: gotEmail, userId: gotUserId, expiresAt: gotExpiresAt });
    });
  });
}

async function listenOnAnyPort(
  start: number,
  end: number,
): Promise<{ server: ReturnType<typeof createServer>; port: number }> {
  for (let port = start; port <= end; port++) {
    try {
      // 测试这个端口能不能 bind
      const server = createServer();
      const ok = await new Promise<boolean>((resolve) => {
        server.once("error", () => resolve(false));
        server.listen(port, "127.0.0.1", () => resolve(true));
      });
      if (ok) return { server, port };
      // 失败,关掉再试下一个
      server.close();
    } catch {
      // 继续
    }
  }
  throw new Error(
    `no free port in ${start}-${end}. Close other CLI sessions and retry.`,
  );
}

function openInBrowser(url: string): Promise<void> {
  // 跨平台 open: macOS = open, Windows = start, Linux = xdg-open
  const platform = process.platform;
  const cmd =
    platform === "darwin"
      ? "open"
      : platform === "win32"
        ? "cmd"
        : "xdg-open";
  const args = platform === "win32" ? ["/c", "start", "", url] : [url];
  return new Promise((resolve) => {
    try {
      // 不阻塞 — fire and forget,失败也无所谓(用户能从 stdout 看 URL 自己点)
      import("node:child_process").then(({ spawn }) => {
        const child = spawn(cmd, args, { stdio: "ignore", detached: true });
        child.on("error", () => resolve());
        child.unref();
        resolve();
      });
    } catch {
      resolve();
    }
  });
}

function callbackHtml({
  ok,
  msg,
  email,
}: {
  ok: boolean;
  msg: string;
  email?: string;
}): string {
  // 精致回执页:品牌色 + O+红方块 glyph + 3 秒倒计时自动关闭(tab)
  // 用户主动关也行,不强制
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Plain CLI · Authorized</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root {
    --paper:#faf9f6; --ink:#1a1a1a; --red:#c8102e; --mute:#6b6b6b; --rule:#e8e6e0;
    --card:#fff; --stroke:#1a1a1a; --shadow:rgba(26,26,26,0.18);
  }
  /* 跟随系统暗色 */
  @media (prefers-color-scheme: dark) {
    :root {
      --paper:#0e0e10; --ink:#f2f1ee; --red:#ff5a47; --mute:#9a9a9a; --rule:#2a2a2e;
      --card:#18181b; --stroke:#f2f1ee; --shadow:rgba(0,0,0,0.5);
    }
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", ui-sans-serif, system-ui, sans-serif;
    background: var(--paper); color: var(--ink);
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    padding: 24px;
  }
  .card {
    max-width: 440px; width: 100%;
    background: var(--card); border-radius: 10px;
    border: 1px solid var(--rule);
    padding: 32px 28px; text-align: center;
    box-shadow: 0 16px 40px -16px var(--shadow);
  }
  .glyph { display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; }
  .glyph svg { display: block; }
  .check {
    display: inline-flex; align-items: center; justify-content: center;
    width: 36px; height: 36px; border-radius: 50%;
    background: var(--red); color: #fff;
    margin-bottom: 16px;
  }
  h1 {
    font-family: "Newsreader", Georgia, "Times New Roman", serif;
    font-size: 28px; margin: 0 0 8px; font-weight: 500;
    letter-spacing: -0.01em;
  }
  .sub { font-size: 14px; color: var(--mute); margin: 0; line-height: 1.55; }
  .email {
    margin-top: 18px; padding: 10px 14px;
    border: 1px solid var(--rule); border-radius: 6px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13px; color: var(--ink);
    display: inline-block;
  }
  .hint {
    margin-top: 24px; padding-top: 16px;
    border-top: 1px solid var(--rule);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase;
    color: var(--mute);
  }
  .countdown { color: var(--red); }
  .fail h1 { color: var(--ink); }
  .fail .check { background: var(--ink); }
</style></head>
<body><div class="card ${ok ? "" : "fail"}">
  ${ok
      ? `<div class="glyph"><svg width="36" height="36" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="11.5" fill="none" stroke="var(--stroke)" stroke-width="2.5"/>
            <rect x="12.25" y="12.25" width="7.5" height="7.5" fill="var(--red)"/>
         </svg></div>
         <h1>You're in.</h1>
         <p class="sub">Plain CLI is authorized. You can return to your terminal.</p>
         ${email ? `<div class="email">${escapeHtml(email)}</div>` : ""}
         <div class="hint">closing in <span id="cd" class="countdown">3</span>s · or close this tab</div>
         <script>
           let n = 3;
           const cd = document.getElementById("cd");
           const tick = setInterval(() => {
             n--;
             if (cd) cd.textContent = String(n);
             if (n <= 0) { clearInterval(tick); window.close(); }
           }, 1000);
         </script>`
      : `<div class="check">!</div>
         <h1>Authorization failed</h1>
         <p class="sub">${escapeHtml(msg || "Unknown error. Try plain login again.")}</p>
         <div class="hint">close this tab and retry</div>`
    }
</div></body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
