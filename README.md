# PolinRider Org Cleanup Tool

Scans every repo in a GitHub org for PolinRider malware, removes payloads,
and opens a PR per infected repo — all inside an isolated Docker container.

> Want to scan a **single repo inside CI** instead of sweeping a whole org?
> Use the [**GitHub Action**](#use-as-a-github-action) — it reuses the same
> detection engine to fail a check, auto-clean, or open a cleanup PR.

## Contents

- [What it does](#what-it-does)
- [Use as a GitHub Action](#use-as-a-github-action)
  - [Modes](#modes)
  - [Enforce it (block infected merges)](#enforce-it-block-infected-merges)
  - [Permissions](#permissions)
  - [Reporting](#reporting)
  - [Excluding known-legit files](#excluding-known-legit-files-and-scanning-the-scanner)
  - [Inputs](#inputs)
  - [Notes & limits](#notes--limits)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Running](#running)
- [Security design](#security-design)
- [Runtime hardening](#runtime-hardening)
- [Options](#options)
- [PR branch protection](#pr-branch-protection)
- [After merging PRs](#after-merging-prs)
- [File structure](#file-structure)

## What it does

For each repo in your org:

1. **Clones** the default branch (shallow, `--depth=1`, git hooks disabled)
2. **Scans in-process** — reads files as inert text/bytes and pattern-matches known PolinRider signatures. It **never executes** the files it scans (see [Runtime hardening](#runtime-hardening)). Detection is *content-confirmed*: a repo is marked infected only when a real signature matches.
3. **Surgically remediates** infected repos — removing only what is confirmed malicious and preserving legitimate code, tasks, fonts, and configs:
   - **Strips** the appended obfuscated payload (original + rotated variants) from any `.js/.ts/.mjs` file (config files, `App.js`, `vite.config.js`, …), keeping everything before the payload byte-for-byte
   - **Removes the entire `.vscode` directory** when any task/launch entry is malicious — `curl … | bash`, `runOn: folderOpen` auto-runs, C2 hosts, or running an interpreter against a font/asset (e.g. `node ./public/fonts/x.woff2`)
   - **Removes font carriers strategically.** A font is a *confirmed carrier* only when it is unreferenced, fails structural font validation (no valid magic / table directory — real fonts, including commercial `.otf` files with embedded license URLs and binary blobs, are trusted), *and* contains an appended code payload. When a carrier is found, the scanner removes the carrier plus the whole Font-Awesome-named disguise set (`fa-brands/solid/regular-…`) and its `README.md`, while **preserving clean, non-`fa-` fonts in the same directory** (only the leaf `fonts/` dir is removed if nothing clean remains). `fa-`-named fonts with **no** payload are flagged `suspicious` for manual review — never auto-removed.
   - **Deletes** `temp_auto_push.bat`, `temp_interactive_push.bat`, `config.bat`, `branch_structure.json`
   - **Fixes** `.gitignore` (removes all injected lines — `config.bat`, `temp_*.bat`, `branch_structure.json` — re-adds `.env*` patterns) and untracks committed `.env` files
   - **Flags for manual review** (never auto-edits): impostor npm dependencies, fetch-and-exec lifecycle scripts, and unknown-but-obfuscated appended code
4. **Opens a PR** on a new branch with a precise summary of every change — your branch protection rules apply, nothing merges automatically

---

## Use as a GitHub Action

The same engine is published as a reusable Action that scans the repository being
built — no clone, no org token. Drop it into any workflow:

```yaml
# .github/workflows/malware-scan.yml
name: PolinRider scan
on: [pull_request]
permissions:
  contents: read
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Innovative-VAS/polinrider-cleanup@v1
        with:
          mode: check   # check | fix | pr
```

### Modes

| `mode` | What it does | Typical trigger |
|---|---|---|
| `check` *(default)* | Scan only. Exits non-zero when malware is found so a **required status check** blocks the merge. No token needed. | `pull_request` |
| `fix` | Surgically cleans the working tree. With `commit: true` it also commits + pushes the fix back to the branch (push events only). | `push` |
| `pr` | Cleans on a new branch and opens a cleanup PR (optionally auto-merged). Works where commit-back can't push (fork PRs, protected branches). | `schedule` / `workflow_dispatch` |

Ready-to-copy workflows live in [`examples/`](examples/).

### Enforce it (block infected merges)

`check` exits `1` on a confirmed infection. To turn that into a merge gate, add the
job as a **required status check**: repo → Settings → Branches (or Rulesets) →
require the `scan` job to pass. PRs then can't merge while malware is detected.

### Permissions

Grant the least your mode needs:

| Mode / feature | Required `permissions:` |
|---|---|
| `check` (no PR comment) | `contents: read` |
| PR comment (any mode) | `pull-requests: write` |
| `fix` + `commit: true` | `contents: write` |
| `pr` | `contents: write` + `pull-requests: write` |
| `sarif-file` upload | `security-events: write` |

### Reporting

Every run writes a Markdown report to the **job summary**, emits inline
**annotations** on the PR diff for each finding, and — on `pull_request` events with
`comment-on-pr: true` (default) — posts the report as a **PR comment** (needs
`pull-requests: write`; skipped with a warning otherwise). Set `sarif-file` to also
emit a SARIF report for the **Security** tab:

```yaml
      - uses: Innovative-VAS/polinrider-cleanup@v1
        with:
          mode: check
          sarif-file: polinrider.sarif
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: polinrider.sarif
```

### Excluding known-legit files (and scanning the scanner)

Some repos legitimately contain content that looks like a payload — security
tooling, malware test fixtures, vendored bundles. Use `exclude` to skip those
paths so real infections elsewhere still fail the check:

```yaml
      - uses: Innovative-VAS/polinrider-cleanup@v1
        with:
          mode: check
          exclude: |
            test/fixtures/**
            vendor/**
```

This is how this repo scans **itself** in CI: it excludes only its signature
catalog, payload fixtures, and built bundle (`src/signatures.js`, `test/**`,
`dist/**`) — everything else (real source, configs, `bin/`) is scanned for real,
so an actual infection here would fail the build. Keep the exclude list as tight
as possible; anything excluded is a blind spot.

### Inputs

| Input | Default | Description |
|---|---|---|
| `mode` | `check` | `check` · `fix` · `pr` |
| `path` | `.` | Directory to scan (relative to the workspace) |
| `exclude` | *(none)* | Comma/newline-separated paths or globs to skip, e.g. `test/**, vendor/**` |
| `token` | `${{ github.token }}` | Token for `pr` mode, `fix`+`commit`, and PR comments |
| `fail-on` | `infected` | Severity that fails the job: `infected` · `suspicious` · `never` |
| `commit` | `false` | `fix` mode: commit + push the cleanup back (push events) |
| `comment-on-pr` | `true` | Post the report as a PR comment on `pull_request` events |
| `sarif-file` | *(off)* | Write a SARIF report to this path |
| `dry-run` | `false` | Plan changes without writing/pushing |
| `auto-merge` | `false` | `pr` mode: auto-merge (respects branch protection) |
| `merge-method` | `squash` | `squash` · `merge` · `rebase` |
| `branch-prefix` | `fix/polinrider-cleanup` | `pr` mode branch prefix |

Several inputs also read a legacy **env var** as a fallback (`DRY_RUN`,
`AUTO_MERGE`, `MERGE_METHOD`, `BRANCH_PREFIX`, `POLINRIDER_EXCLUDE`, `SARIF_FILE`),
so you can set them in a workflow/job `env:` block instead of `with:` — handy for
sharing config across steps. An explicit `with:` value always wins. For a custom
token use `with: token:` (it defaults to `${{ github.token }}`):

```yaml
jobs:
  scan:
    runs-on: ubuntu-latest
    env:
      AUTO_MERGE: "true"
      MERGE_METHOD: rebase
    steps:
      - uses: actions/checkout@v4
      - uses: Innovative-VAS/polinrider-cleanup@v1
        with:
          mode: pr
          token: ${{ secrets.GITHUB_TOKEN }}
```

**Outputs:** `severity`, `infected`, `findings-count`, `changed`, `remediated`,
`pr-url`, `sarif-file`.

### Notes & limits

- **Pin for security.** `@v1` tracks the latest v1.x; pin a full SHA
  (`@<commit-sha>`) if you want immutability.
- **`fix` + `commit` is push-event only.** On `pull_request` it's skipped (detached
  HEAD; fork PRs can't be pushed) — use `mode: pr` there. Commit-back uses the
  default `GITHUB_TOKEN`, whose pushes don't retrigger workflows (no loop).
- Only **content-confirmed** infections fail by default; impostor deps and
  fetch-and-exec scripts are flagged for manual review and (in `fix`/`pr`) still
  fail the check since they can't be auto-removed.

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
├── action.yml            # GitHub Action metadata (uses dist/ci.mjs)
├── dist/
│   └── ci.mjs            # bundled Action entrypoint (built from src/ci.js — committed)
├── examples/             # ready-to-copy consumer workflows (check / fix / pr)
├── scripts/
│   └── build-action.mjs  # esbuild bundler for the Action
├── bin/
│   └── polinrider.js     # hardened launcher (applies V8 flags, then runs src/index.js)
├── src/
│   ├── index.js          # org-sweep orchestrator: list org repos → clone → scan → remediate → PR
│   ├── ci.js             # GitHub Action frontend: scan the checked-out repo → check/fix/pr
│   ├── safety.js         # runtime guards (eval/Function/vm/process.binding) — imported first
│   ├── safe-exec.js      # subprocess allowlist (git/gh only, hooks disabled)
│   ├── signatures.js     # IOC catalog (payload variants, C2 hosts, font magic, impostor deps)
│   ├── scanner.js        # content-confirmed detection → Findings report
│   ├── exclude.js        # glob matcher for the scan `exclude` option
│   ├── remediator.js     # surgical removal driven by Findings
│   ├── sarif.js          # Findings → SARIF 2.1.0 (for code-scanning upload)
│   ├── jsonc.js          # tolerant JSONC parser + array splicer (no eval)
│   ├── fonts.js          # structural font validation + reference analysis
│   ├── walk.js           # symlink-safe file walker
│   └── report.js         # console + Markdown PR-body rendering
└── test/                 # node:test specs + fixtures
```

> **Two frontends, one engine.** `src/index.js` (org sweep, Docker) and `src/ci.js`
> (GitHub Action) both drive the same `scanner.js` + `remediator.js` + signatures —
> detection logic is defined once.
