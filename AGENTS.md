# AGENTS.md

Course project directory ("Sistem Laporan" / Report System). No application code exists yet — no source, no package.json at root, no git repo initialized. Do not assume a stack or search for entrypoints that don't exist.

## Project state
- Stub project: only skill-management scaffolding is present.
- New app code should be scaffolded at the repo root (no framework chosen yet).

## Skills
- Installed project-local skills live in `.agents/skills/` (also mirrored under `.opencode/skills/`).
- `skills-lock.json` at the root tracks installed skill sources/versions.
- Skills are installed/managed with `npx skills add <source> --skill <name>` (add `--yes --global` for global installs); `npx skills` updates the lockfile.

## .opencode/
- Contains OpenCode config: `package.json` (single `@opencode-ai/plugin` dep) and `.gitignore` (node_modules, lockfiles).
- `node_modules/` and lockfiles inside `.opencode/` are intentionally git-ignored; don't commit them.

## Git
- Not a git repo yet. If the user asks to commit, run `git init` at the root first.

---

# Agent Guidelines

*Covers how agents should work in this repo. Project-specific setup, structure, and test commands should be layered in separately (e.g. via `opencode /init`).*

## Communication Style
- Keep responses concise and directly to the point — no filler, no restating the request.
- Use bullet points or numbered steps for anything with more than one part.
- State assumptions explicitly instead of guessing silently.

## Planning (Plan Agent)
- Always ask clarifying questions before starting. Never assume design, tech stack, or feature scope.
- Stay in the `plan` agent for this phase — it can't edit files or run destructive commands, so planning stays separate from doing.
- Delegate research instead of reading everything yourself: `@explore` for this codebase, `@scout` for external libraries and dependencies. Keeps this session's context clean.
- Before presenting a plan, pass it to `@general` for a second opinion — ask it to flag gaps, risks, or missed edge cases — and fold that feedback in.

## Changes (Build Agent)
- Switch to the `build` agent to implement.
- For multi-file or large features, split the work and delegate each piece to a `@general` subagent. The primary session coordinates, integrates, and reviews rather than writing every line itself.
- Small, single-file fixes can be applied directly — delegating trivial edits just adds round-trip overhead.

## Model & Quality
- `build` and `plan` get the strongest available model — this is where architecture and logic decisions happen.
- Narrow, low-risk subagents (docs, formatting, lookups) get a cheaper model, set explicitly per agent in `opencode.json`. A subagent with no model of its own inherits whatever model called it — usually the expensive one — so this has to be configured, not just requested here.
- Before calling a feature done, always run: `npm run lint`, `npm run typecheck`, `next build` (match these to whatever scripts your package.json actually has).

## UI Design
- Strictly follow the design system in `design.md`.
- List `design.md` under `"instructions"` in `opencode.json` so it's always loaded into context, instead of relying on the agent to remember to open it.

