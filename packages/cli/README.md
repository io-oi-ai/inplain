# @inplain/cli

Generate presentations, reports, and dashboards from the command line — or hand
the whole thing to an AI agent over MCP.

```bash
npm install -g @inplain/cli
export ANTHROPIC_API_KEY=sk-...
plain generate "Q3 board update" --as deck -o out.html
```

Part of [Plain](https://github.com/io-oi-ai/inplain) — an office suite whose
source files are plain text, so agents can read and edit them.

## MCP server

The main reason to install this. One command wires Plain into your AI tools:

```bash
plain install              # Claude Code, Cursor, VS Code — idempotent
plain install --dry-run    # see what it would write first
```

It also installs a Plain agent skill to `~/.claude/skills/plain/`.

To configure by hand, add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "plain": { "command": "plain", "args": ["mcp"] }
  }
}
```

**Tools:** `generate_artifact`, `edit_artifact`, `export` — plus per-form
variants (`generate_deck`, `edit_doc`, …) kept for compatibility, and offline
Office exporters (`export_deck_pptx`, `export_doc_docx`, `export_sheet_xlsx`).

`generate_artifact` and `edit_artifact` publish the result and return a
shareable URL along with the source. Pass `share: false` for source only.

## Model backend

Pick either. **Your own key:**

```bash
export ANTHROPIC_API_KEY=sk-...
# or OPENAI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY / MOONSHOT_API_KEY / DEEPSEEK_API_KEY
```

Tokens bill to your provider account and nothing routes through Plain's
servers. For a fully offline setup:

```bash
export OLLAMA_BASE_URL=http://localhost:11434
```

**Or a hosted account:**

```bash
plain login     # browser flow — connects to the hosted service at inplain.app
```

Per-role overrides if you want different models for routing vs generation:
`ROUTER_PROVIDER`, `ROUTER_MODEL`, `GENERATOR_PROVIDER`, `GENERATOR_MODEL`,
`EDITOR_PROVIDER`, `EDITOR_MODEL`.

## Commands

Works offline, no account:

```bash
plain generate <intent> --as deck|doc|sheet   # one sentence → artifact
plain export <file> --to html                 # render to self-contained HTML
plain export <file> --to pptx|docx|xlsx       # Office fallback — Marp-style (v1) source only
plain deck|doc|sheet edit <f> --patch '<RFC6902 ops>'   # deterministic, no LLM
plain templates                               # list templates
plain install                                 # configure MCP clients
plain mcp                                     # run the MCP server
plain config                                  # show resolved configuration
```

Needs `plain login` — these talk to Plain Cloud:

```bash
plain ls | push | pull | rm      # workspace sync
plain share create|ls|rm|edit    # share links
plain project ...                # projects
plain attach ...                 # project assets
plain import <file.pptx|docx|xlsx>   # Office → Plain DSL (server-side)
plain whoami
```

Add `--json` to any command for machine-readable output on stdout (progress
stays on stderr, so it pipes cleanly).

## Pipe mode

Everything reads stdin and writes stdout, so steps chain:

```bash
plain generate "three-sentence product intro" --as deck \
  | plain deck edit /dev/stdin --instruction "add a cover slide" -o /dev/stdout \
  | plain export /dev/stdin --to html -o intro.html
```

## Configuration

`~/.config/plain/config.json` (mode 0600):

```json
{
  "apiKey": "plain_pk_...",
  "gatewayUrl": "https://inplain.app/api/gateway/v1"
}
```

Environment variables always win over the file: `PLAIN_API_KEY`,
`PLAIN_GATEWAY_URL`, `PLAIN_AGENT_ID`.

Point `gatewayUrl` at your own deployment to use a self-hosted Plain instance.

## Tests

```bash
pnpm cli:smoke   # 11 checks, no LLM calls (run from the repo root)
```

Covers `--help`, `config`, deterministic patch editing, HTML and PPTX export,
and a live MCP server over JSON-RPC (`tools/list` + `export_deck_pptx`).

## License

[MIT](./LICENSE)
