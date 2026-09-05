/**
 * plain share —— CLI 创建 / 列表 / 撤销分享链接。
 *
 * 跟 Web 端 "Share" 按钮功能对等(snapshot / live / password / expiresDays)。
 * 通过 V27-L 新增的 Bearer auth 走 /api/share · 不需要 cookie session。
 *
 * 心智:
 *   plain share <docId>                    最快路径 · snapshot 模式 · 出 URL
 *   plain share <docId> --mode live        live 模式 · 实时同步源
 *   plain share <docId> --password XXXX    加密
 *   plain share <docId> --expires-days 7   7 天后过期
 *   plain share ls                         列出当前用户所有 share
 *   plain share rm <shareId>               撤销
 */
import { Command } from "commander";
import { emit, fail, progress, getOutputMode } from "../output";
import { apiKey, gatewayBase } from "../gateway-client";

type CreateResp = {
  id: string;
  slug?: string;
  mode: "snapshot" | "live";
  url: string;
  protect?: unknown;
};

type ListResp = {
  shares: Array<{
    id: string;
    kind: string;
    title: string;
    mode: "snapshot" | "live";
    created_at: string;
    expires_at: string | null;
    views: number;
    url?: string;
  }>;
};

/** 解出 origin(inplain.app)· 跟 gateway base 同 host */
function originFromGatewayBase(): string {
  const base = gatewayBase();
  try {
    const u = new URL(base);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "https://inplain.app";
  }
}

/** 走 /api/* 直 route(非 gateway)· 用 Bearer plain_pk_*  */
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
  const r = await fetch(url, {
    method: init.method ?? "GET",
    headers,
    body,
  });
  if (!r.ok) {
    let msg = `share api ${r.status}`;
    try {
      const j = (await r.json()) as { error?: string };
      if (j.error) msg = `${msg}: ${j.error}`;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return (await r.json()) as T;
}

type CloudDoc = {
  id: string;
  kind: "deck" | "doc" | "sheet";
  title: string;
  source: string;
};

async function fetchDoc(docId: string): Promise<CloudDoc> {
  const base = gatewayBase().replace(/\/+$/, "");
  const url = `${base}/workspace/documents/${encodeURIComponent(docId)}`;
  const r = await fetch(url, {
    headers: { authorization: `Bearer ${apiKey()}` },
  });
  if (!r.ok) {
    let msg = `gateway ${r.status}`;
    try {
      const j = (await r.json()) as { error?: string | { message?: string } };
      if (typeof j.error === "string") msg = `${msg}: ${j.error}`;
      else if (j.error && typeof j.error === "object" && j.error.message) msg = `${msg}: ${j.error.message}`;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  const j = (await r.json()) as { doc: CloudDoc };
  return j.doc;
}

export function registerShare(program: Command): void {
  const share = program
    .command("share")
    .description("Create / list / revoke share links");

  // plain share <docId> · 默认 snapshot
  share
    .command("create", { isDefault: true })
    .description("Create a public share link for an existing cloud doc")
    .argument("<docId>", "Cloud doc id (use `plain ls` to find)")
    .option("--mode <mode>", "'snapshot' (frozen) or 'live' (always latest)", "snapshot")
    .option("--password <pwd>", "Require viewer password (optional)")
    .option("--allowed-emails <list>", "Comma-separated email allow-list")
    .option("--expires-days <n>", "Auto-expire after N days", parseInt)
    .option("--role <role>", "Default viewer role: 'viewer' (default) or 'editor'", "viewer")
    .option("--copy", "Also copy the URL to the clipboard")
    .option("--open", "Also open the URL in browser after creating")
    .action(async (docId, opts) => {
      const mode = opts.mode === "live" ? "live" : "snapshot";
      const role = opts.role === "editor" ? "editor" : "viewer";

      progress(`fetching doc ${docId}…`);
      const doc = await fetchDoc(docId).catch((e) =>
        fail(String(e instanceof Error ? e.message : e)),
      );

      const body: Record<string, unknown> = {
        docId,
        kind: doc.kind,
        title: doc.title,
        source: doc.source,
        mode,
        defaultRole: role,
      };
      if (opts.password) body.password = opts.password;
      if (opts.allowedEmails) {
        body.allowedEmails = String(opts.allowedEmails)
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
      }
      if (typeof opts.expiresDays === "number") body.expiresDays = opts.expiresDays;

      const r = await apiFetch<CreateResp>("/api/share", {
        method: "POST",
        body,
      }).catch((e) => fail(String(e instanceof Error ? e.message : e)));

      if (getOutputMode() === "json") {
        emit(r);
        return;
      }
      progress(`✓ created share ${r.id}  (${r.mode}${opts.password ? " · password" : ""})`);
      // stdout 只打 URL · 方便管道 / 复制
      process.stdout.write(`${r.url}\n`);
      // V27-O · --copy 写剪贴板
      if (opts.copy) {
        const ok = await writeClipboard(r.url);
        progress(ok ? "✓ copied to clipboard" : "✗ clipboard write failed");
      }
      // V27-O · --open 开浏览器
      if (opts.open) {
        await openUrl(r.url);
        progress("→ opened in browser");
      }
    });

  // plain share ls
  share
    .command("ls")
    .description("List all your share links")
    .action(async () => {
      const r = await apiFetch<ListResp>("/api/share/list", { method: "GET" }).catch((e) =>
        fail(String(e instanceof Error ? e.message : e)),
      );
      if (getOutputMode() === "json") {
        emit(r);
        return;
      }
      if (!r.shares || r.shares.length === 0) {
        process.stdout.write("(no shares yet)\n");
        return;
      }
      for (const s of r.shares) {
        const exp = s.expires_at ? ` · expires ${s.expires_at.slice(0, 10)}` : "";
        process.stdout.write(
          `${s.id.slice(0, 12).padEnd(13)} ${s.kind.padEnd(5)} ${s.mode.padEnd(8)} views=${s.views}${exp}  ${truncate(s.title, 40)}\n`,
        );
        if (s.url) process.stdout.write(`  ${s.url}\n`);
      }
    });

  // plain share rm <shareId>
  share
    .command("rm")
    .description("Revoke a share link")
    .argument("<id>", "Share id (12-char nanoid)")
    .action(async (id) => {
      await apiFetch(`/api/share/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }).catch((e) => fail(String(e instanceof Error ? e.message : e)));
      if (getOutputMode() === "json") {
        emit({ ok: true, id });
      } else {
        progress(`✓ revoked ${id}`);
      }
    });

  // V27-S · plain share edit <id> · 改密码 / 邀请用户 / 过期 / mode
  share
    .command("edit")
    .description("Edit an existing share's permissions or expiry")
    .argument("<id>", "Share id (12-char nanoid)")
    .option("--password <pwd>", "Set password ('' = clear · keep current = don't pass)")
    .option("--allowed-emails <list>", "Comma-separated emails ('' = clear)")
    .option("--mode <mode>", "'snapshot' or 'live'")
    .option("--role <role>", "Default role: 'viewer' or 'editor'")
    .option("--expires-days <n>", "Re-set expiration N days from now · use 'never' for permanent", (v) => v)
    .action(async (id, opts) => {
      const body: Record<string, unknown> = {};
      if ("password" in opts) {
        body.password = opts.password ?? "";
      }
      if ("allowedEmails" in opts && opts.allowedEmails !== undefined) {
        const raw = String(opts.allowedEmails);
        body.allowedEmails =
          raw === ""
            ? []
            : raw
                .split(",")
                .map((s) => s.trim().toLowerCase())
                .filter(Boolean);
      }
      if (opts.mode) body.mode = opts.mode;
      if (opts.role) body.defaultRole = opts.role;
      if (opts.expiresDays !== undefined) {
        if (opts.expiresDays === "never") body.expiresDays = null;
        else {
          const n = Number(opts.expiresDays);
          if (!Number.isFinite(n) || n < 0) fail("--expires-days must be a number or 'never'");
          body.expiresDays = n;
        }
      }
      if (Object.keys(body).length === 0) {
        fail("nothing to update · pass at least one of --password / --allowed-emails / --mode / --role / --expires-days");
      }
      await apiFetch(`/api/share/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body,
      }).catch((e) => fail(String(e instanceof Error ? e.message : e)));
      if (getOutputMode() === "json") {
        emit({ ok: true, id, applied: body });
      } else {
        progress(`✓ updated ${id}`);
      }
    });
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

/**
 * V27-O · 跨平台写剪贴板 · 不引外部依赖。
 * mac → pbcopy · linux → xclip / xsel · windows → clip
 */
async function writeClipboard(text: string): Promise<boolean> {
  const platform = process.platform;
  const candidates: Array<{ cmd: string; args: string[] }> =
    platform === "darwin"
      ? [{ cmd: "pbcopy", args: [] }]
      : platform === "win32"
        ? [{ cmd: "clip", args: [] }]
        : [
            { cmd: "xclip", args: ["-selection", "clipboard"] },
            { cmd: "xsel", args: ["--clipboard", "--input"] },
            { cmd: "wl-copy", args: [] },
          ];
  const { spawn } = await import("node:child_process");
  for (const c of candidates) {
    try {
      const ok = await new Promise<boolean>((resolve) => {
        const child = spawn(c.cmd, c.args, { stdio: ["pipe", "ignore", "ignore"] });
        child.on("error", () => resolve(false));
        child.on("exit", (code) => resolve(code === 0));
        child.stdin.end(text);
      });
      if (ok) return true;
    } catch {
      // try next
    }
  }
  return false;
}

/**
 * V27-O · 跨平台 open url · macOS = open · linux = xdg-open · win = start
 */
async function openUrl(url: string): Promise<void> {
  const platform = process.platform;
  const { spawn } = await import("node:child_process");
  const cmd =
    platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
  const args = platform === "win32" ? ["/c", "start", "", url] : [url];
  try {
    const child = spawn(cmd, args, { stdio: "ignore", detached: true });
    child.on("error", () => void 0);
    child.unref();
  } catch {
    // ignore
  }
}
