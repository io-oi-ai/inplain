---
name: plain
description: Use when the user wants to create, edit, or share a presentation (deck), report (doc), or data dashboard (sheet) as a shareable web artifact — via Plain (inplain.app). Turns one sentence into a living artifact delivered as a link, not a file.
---

# Plain — the artifact layer for AI work

Plain turns a natural-language intent into a **living artifact**: one structured source
rendered as a presentation (deck), a long-form report (doc), or a data dashboard (sheet).
Delivery is a **link** that always points to the current version — not a static file.

Use this skill when the user asks for slides / a deck / a PPT, a written report / doc,
or a data dashboard / sheet, and wants something they can share or keep editing.

## Prerequisites

The `plain` CLI must be installed and authorized:

```bash
pnpm dlx @inplain/cli login      # opens browser, authorizes the CLI under the user's account
plain --version                  # confirm it's on PATH (or use `pnpm dlx @inplain/cli`)
```

If `plain login` fails or the user has no account, stop and tell them to sign up at
https://inplain.app — do not attempt to work around auth.

## Generate an artifact

One command, pick the form with `--as`:

```bash
plain generate "Q3 growth review for investors" --as deck    # presentation
plain generate "market landscape research report" --as doc   # long-form report
plain generate "SaaS pricing comparison dashboard" --as sheet # data dashboard
```

- `--as` defaults to `deck`. Choose the form by what the user wants to communicate:
  numbers/comparison-heavy → often `sheet`; narrative/analysis → `doc`; pitch/walkthrough → `deck`.
- `--template <slug>` picks a design (run `plain templates` to list). Default is fine.
- `--from <file>` uses a local .md/.txt as the source (e.g. a spec → a deck).
- Output goes to stdout as a self-contained HTML file; use `-o out.html` to write it.
- `--content-out src.json` also writes the re-editable structured source.

The command prints a **检查 / validation** block to stderr if the generated artifact has
issues (empty fields, mismatched chart/table shapes, duplicate ids). Read it — if it shows
errors (`✗`), regenerate or refine the intent; warnings (`⚠`) are usually fine.

## Share it

Delivery is a link. In the workspace (inplain.app/app) the user clicks Share for a permanent
URL that always reflects the latest version — viewers can comment and ask the artifact's agent
questions. Export a file only when needed:

```bash
plain export deck.md --to html   # self-contained web page (recommended)
plain export deck.md --to pdf     # rendered from the web page (via web app)
```

Office (.pptx/.docx/.xlsx) is **import-only** in Plain — you can bring old files in as editable
artifacts, but Plain does not export Office. If a recipient needs a slide file, PDF opens in
PowerPoint / Keynote / WPS.

## Drive Plain from inside another agent (MCP)

`plain mcp` runs a stdio MCP server. Claude Code / Cursor / Codex auto-discover these tools:

- `generate_artifact { intent, form }` — create a new artifact (form: deck | doc | sheet)
- `edit_artifact { source, instruction, form }` — modify an existing one
- `export { source, form }` — get self-contained HTML

`generate_artifact` appends a `<!-- plain:validate ... -->` block to its output when the
artifact has issues — treat `✗` lines as things to fix before delivering.

## The artifact model (for editing precisely)

Under the hood an artifact is a `Document { meta, blocks[] }` — a unified block model
(cover / statement / prose / heading / metrics / cards / compare / chart / table / quadrant /
media / group / …). present vs report is just a render mode over the same blocks, so the same
source becomes a deck or a doc with zero regeneration. Full spec:
https://docs.inplain.app/ai/artifact-format

When editing, keep each block's `id` stable — edits are located by id. Never invent field
names outside the documented schema (unknown keys are dropped).

## Do / Don't

- **Do** map numbers → chart/metrics, grids → table, steps → sequence/cards.
- **Do** read the validation output and fix `✗` errors before telling the user it's done.
- **Don't** hand-write HTML — give Plain the intent; the template renders.
- **Don't** promise Office export; Plain delivers a link (or HTML/PDF).
- **Don't** work around a failed `plain login` — direct the user to authorize.
