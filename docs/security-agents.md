# Security agents for Claude Code: options

Researched on 18 November 2026. **Not decided and nothing installed yet.** Pick one or more options below, then install them (see "How to install").

## Options

### 1. Claude Security (official Anthropic plugin): recommended

- Adds a `/claude-security` command that scans the whole repository or a set of changes (branch, PR or commit) and drafts fixes as `patches/F<n>.patch`. Patches are never applied automatically.
- Several agents work in turn: they map the code, build a threat model, hunt for vulnerabilities, and verify each finding a second time.
- Fits this project's riskiest parts: RLS policies and roles, `requireStaff()`, booking holds, the admin 2FA in `src/proxy.ts`, and the forms.
- Install: `/plugin install claude-security@claude-plugins-official` (the dialog asks for a scope).
- Works on Windows. No extra API key. Each scan counts toward normal usage and can use a lot of tokens; leave Claude Code open until it finishes.
- Change scans only cover committed changes. Large repos are best scanned one area at a time. Results vary between runs.
- **Blocker on this PC:** it needs `python3` on PATH, and `python3` here is the Microsoft Store stub. `python` (3.12) and `py` (3.13) work. Fix: Windows Settings → Apps → Advanced app settings → App execution aliases → turn off `python3`, or point `python3` at the real Python.

### 2. Security Guidance (official Anthropic plugin)

- Runs automatically through hooks; there is no command.
  - On every file edit: a local pattern check (e.g. `dangerouslySetInnerHTML`, `eval(`, `.innerHTML =`, edits in `.github/workflows/`). No model call.
  - At the end of every turn: a background Claude review of the git diff.
  - On every `git commit` / `git push` Claude runs: a deeper review that reads surrounding code.
- Never blocks anything; findings are feedback to Claude only.
- On first run it creates a venv in `~/.claude/security/` and installs the Claude Agent SDK. The automatic reviews add model usage (Opus by default).
- The docs don't list Windows as supported, although it does try `py -3`.
- Install: `/plugin install security-guidance@claude-plugins-official`. Scope: user, or project via `enabledPlugins` in `.claude/settings.json`.
- Can be switched off with `SECURITY_GUIDANCE_DISABLE=1` (or per check: `ENABLE_PATTERN_RULES=0`, `ENABLE_STOP_REVIEW=0`, `ENABLE_COMMIT_REVIEW=0`).

### 3. Claude Code Security Review GitHub Action (official, MIT)

- Reviews each pull request on GitHub and posts findings as comments.
- Needs a Claude API key as a repository secret (billed separately) and `pull-requests: write` permission.
- Its README warns it is not hardened against prompt injection: use it only on trusted PRs.
- The built-in `/security-review` command already does a similar check locally at no extra cost.

### 4. Community subagents: not recommended

- VoltAgent `security-auditor` / `penetration-tester` (plugin `voltagent-qa-sec`), and `pentest-ai-agents`.
- Third-party files. A Snyk audit (May 2026) rated the VoltAgent collection medium risk for indirect prompt injection.
- `pentest-ai-agents` is aimed at live penetration testing, not code review.
- Only consider these after reading their agent files.

## Suggestion

1. Fix the `python3` alias, then install **Claude Security** at project scope and run a full scan.
2. Optionally add **Security Guidance** for checks while coding; it adds usage on every turn.
3. Skip the GitHub Action for now (`/security-review` covers it locally) and skip the community agents.

## How to install

`/plugin install` must be typed in a Claude Code session; Claude can't run it. If the marketplace isn't found: `/plugin marketplace add anthropics/claude-plugins-official`. If the plugin isn't found: `/plugin marketplace update claude-plugins-official`. After installing, run `/reload-plugins`.

When an option is installed, mark it here and add its command to the table in `CLAUDE.md`.

## Sources

- [Claude Security docs](https://code.claude.com/docs/en/claude-security)
- [Security Guidance docs](https://code.claude.com/docs/en/security-guidance)
- [anthropics/claude-code-security-review](https://github.com/anthropics/claude-code-security-review)
- [VoltAgent awesome-claude-code-subagents (qa-sec)](https://claudemarketplaces.com/plugins/voltagent-awesome-claude-code-subagents/voltagent-qa-sec)
- [pentest-ai-agents](https://0xsteph.github.io/pentest-ai)
- [Claude Security plugin overview](https://smartscope.blog/en/blog/claude-security-plugin-multi-agent-scan/)
- [Security agent (community)](https://claudedirectory.org/plugins/security-agent)
