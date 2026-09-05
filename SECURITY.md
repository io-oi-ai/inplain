# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Email **security@inplain.app** with:

- What the issue is and where in the code it lives
- Steps to reproduce, or a proof of concept
- What an attacker could do with it

You'll get an acknowledgement within 3 business days and an assessment within
7 days. If the report is valid we'll keep you updated through the fix, and
credit you in the release notes unless you'd rather stay anonymous.

## Scope

In scope: this repository, the published `@inplain/cli` npm package, and the
MCP server it ships.

Out of scope: findings that require a compromised machine, physical access, or
social engineering; missing hardening headers with no demonstrated impact; and
denial of service through sheer request volume.

## Running Plain yourself

A self-hosted deployment holds your own credentials. Two things worth knowing:

- **LLM credentials.** With BYOK (`ANTHROPIC_API_KEY` and friends), prompts go
  directly from your deployment to that provider. Nothing routes through
  inplain.app. With Ollama, nothing leaves your machine at all.
- **Share links are public by default.** A snapshot share is reachable by
  anyone with the URL. Password and email-allowlist options exist — use them
  for anything non-public.
