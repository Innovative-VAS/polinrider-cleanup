# PolinRider Org Cleanup Tool

Scans every repo in a GitHub org for PolinRider malware, removes payloads,
and opens a PR per infected repo — all inside an isolated Docker container.

## What it does

For each repo in your org:

1. **Clones** the default branch (shallow, `--depth=1`, git hooks disabled)
2. **Scans in-process** — reads files as inert text/bytes and pattern-matches known PolinRider signatures. It **never executes** the files it scans (see [Runtime hardening](#runtime-hardening)). Detection is *content-confirmed*: a repo is marked infected only when a real signature matches.
3. **Surgically remediates** infected repos — removing only what is confirmed malicious and preserving legitimate code, tasks, fonts, and configs:
   - **Strips** the appended obfuscated payload (original + rotated variants) from any `.js/.ts/.mjs` file (config files, `App.js`, `vite.config.js`, …), keeping everything before the payload byte-for-byte
   - **Removes the entire `.vscode` directory** when any task/launch entry is malicious — `curl … | bash`, `runOn: folderOpen` auto-runs, C2 hosts, or running an interpreter against a font/asset (e.g. `node ./public/fonts/x.woff2`)
   - **Removes the entire fonts directory** (e.g. `public/fonts`) when it contains a carrier font that is unreferenced *and* doesn't look like a real font
   - **Deletes** `temp_auto_push.bat`, `temp_interactive_push.bat`, `config.bat`, `branch_structure.json`
   - **Fixes** `.gitignore` (removes all injected lines — `config.bat`, `temp_*.bat`, `branch_structure.json` — re-adds `.env*` patterns) and untracks committed `.env` files
   - **Flags for manual review** (never auto-edits): impostor npm dependencies, fetch-and-exec lifecycle scripts, and unknown-but-obfuscated appended code
4. **Opens a PR** on a new branch with a precise summary of every change — your branch protection rules apply, nothing merges automatically

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose v2)
- A GitHub **Personal Access Token (classic)** with these scopes:
  - `repo` (full)
  - `read:org`

---

## Setup

### 1. Clone this tool

```bash
git clone <this-repo>
cd polinrider-cleanup
```

### 2. Create your `.env` file (never committed)

```bash
cp .env.example .env
```

Edit `.env`:

```env
GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
GH_ORG=your-org-name      # an organization…
# GH_USER=your-username   # …OR a personal account (set exactly one)
DRY_RUN=false
```

> **DRY_RUN=true** will scan and remediate locally but skip pushing and PR creation.
> Use this first to verify it does what you expect.

### 3. Build the container

```bash
docker compose build
```

---

## Running

### Dry run first (recommended)

```bash
DRY_RUN=true docker compose run --rm polinrider-cleanup
```

Check the output — it will show every infected file and what would be removed,
without touching GitHub.

### Live run

```bash
docker compose run --rm polinrider-cleanup
```

The tool will print a summary at the end listing every PR URL opened.

---

## Security design

| Concern | Mitigation |
|---|---|
| Executing scanned malware | Files read as inert text/bytes; no `require`/`eval`/`exec` of targets; codegen disabled; subprocess allowlist (see below) |
| Token exposure | Passed via env var only, never baked into image; injected only for `gh` |
| Host disk access | Repos cloned to `tmpfs` (RAM only, wiped on exit) |
| Root in container | Non-root user `scanner` (UID 1001) |
| Container capabilities | All Linux caps dropped (`cap_drop: ALL`) |
| Writable fs | Root fs read-only; only `/workspace` and `/tmp` writable via tmpfs |
| Resource abuse | CPU and memory limits set in `docker-compose.yml` |

---

## Runtime hardening

The scanner only ever **reads** target files as text/bytes — reading a file never
executes it. On top of that architectural guarantee, the tool is hardened in
layers so the obfuscated payload cannot run even by accident:

- **Subprocess allowlist** — only `git` and `gh` may be spawned, with an
  allowlisted set of subcommands. `node`, `npm`, `npx`, `bash`, `sh`, `deno`,
  `python`, etc. are rejected, so a `node -e` / `bash -c` style payload can never
  be launched. Git runs with hooks disabled (`core.hooksPath`), system/global
  config ignored, and `--no-verify`.
- **Code generation disabled** — the launcher (`bin/polinrider.js`) starts Node
  with `--disallow-code-generation-from-strings`, so `eval()` and `new Function()`
  throw.
- **In-code guards** — `src/safety.js` (imported first) also neutralizes `eval`,
  the `Function` family, `require('node:vm')`, and `process.binding`, as a
  fallback when the flag isn't present.
- **No install scripts** — `.npmrc` sets `ignore-scripts=true`; the tool never
  runs `npm install` or a build in a target repo.
- **Container** — non-root, all Linux capabilities dropped, read-only root fs.

> The Node permission model (`--permission`) is intentionally not used: the tool
> must spawn `git`/`gh`, which would require `--allow-child-process` (Node warns
> this invalidates the model), so it adds little over the layers above.

Run the tests, including a hardened pass that runs every test with codegen disabled:

```bash
npm test
npm run test:hardened
```

---

## Options

| Env var | Default | Description |
|---|---|---|
| `GH_TOKEN` | required | GitHub PAT |
| `GH_ORG` | required\* | Organization name. Scans every repo in the org. |
| `GH_USER` | required\* | Personal username. Scans every repo you own (`affiliation=owner`). |
| `GH_REPO` | _(all repos)_ | Scope to specific repo(s), comma-separated. Each is `name` (account owner prefixed) or `owner/name`. Skips the account-wide listing — use it to pilot one repo first. |
| `DRY_RUN` | `false` | Skip push and PR |
| `AUTO_MERGE` | `false` | Auto-merge each cleanup PR after opening it. Respects branch protection (blocked PRs stay open and are reported). |
| `MERGE_METHOD` | `squash` | Merge method when `AUTO_MERGE=true`: `squash`, `merge`, or `rebase`. |
| `REPORTS_DIR` | `reports` | Where JSON + Markdown run reports are written. Set empty to disable. |
| `WORKSPACE` | `/workspace` | Where repos are cloned |
| `BRANCH_PREFIX` | `fix/polinrider-cleanup` | PR branch name prefix |

\* Set **exactly one** of `GH_ORG` or `GH_USER` — not both, not neither.

### Auto-merge

With `AUTO_MERGE=true`, after each PR is opened the tool runs `gh pr merge --<method> --delete-branch`. It **respects branch protection** — a repo that requires reviews or passing checks is left open and listed in the summary (and report) as "auto-merge blocked"; nothing is bypassed. The token must have merge rights on the repo.

### Reports

Every run writes `polinrider-<timestamp>.json` + `.md` (and `latest.json` / `latest.md`) to `REPORTS_DIR` (the mounted `./reports` volume in Docker). The files are rewritten after each repo, so you get a durable, auditable trace — including each repo's findings, what was removed/cleaned, the PR link, and merge status — instead of relying on scrollback. The Markdown includes a clickable **Repository | Pull request | Status** table.

---

## PR branch protection

Because your org has branch protection enforced, the tool:

- Creates a **new branch** per repo (never pushes to `main` or `master` directly)
- Opens a PR for review — a human merges it
- PR body explains exactly what was changed and why

---

## After merging PRs

1. Notify affected developers to check their machines for the initial dropper
2. Rotate any secrets that may have been exposed via committed `.env` files
3. Check npm global packages: `npm list -g --depth=0`
4. Check VS Code extensions for anything unfamiliar
5. Revoke and regenerate any PATs for accounts whose machines were compromised

---

## File structure

```
polinrider-remover/
├── Dockerfile
├── docker-compose.yml
├── package.json / .npmrc
├── bin/
│   └── polinrider.js     # hardened launcher (applies V8 flags, then runs src/index.js)
├── src/
│   ├── index.js          # orchestrator: list org repos → clone → scan → remediate → PR
│   ├── safety.js         # runtime guards (eval/Function/vm/process.binding) — imported first
│   ├── safe-exec.js      # subprocess allowlist (git/gh only, hooks disabled)
│   ├── signatures.js     # IOC catalog (payload variants, C2 hosts, font magic, impostor deps)
│   ├── scanner.js        # content-confirmed detection → Findings report
│   ├── remediator.js     # surgical removal driven by Findings
│   ├── jsonc.js          # tolerant JSONC parser + array splicer (no eval)
│   ├── fonts.js          # font magic-byte + reference analysis
│   ├── walk.js           # symlink-safe file walker
│   └── report.js         # console + Markdown PR-body rendering
└── test/                 # node:test specs + fixtures
```
