# Codex cross-device handoff

Updated: 2026-08-14

## Purpose

This branch is a checkpoint of the working tree from the original computer so
the same project can be continued in Codex on another computer.

## Repository and branch

- Repository: `https://github.com/dgkim0127/noblesse.git`
- Working branch: `codex/workspace-sync-20260814`
- Snapshot commit: `783530c8e6c729146b8d52b5d1be09976ec113de`
- GitHub account with write access: `dgkim0127`

This checkpoint branch is intentionally separate from `main`. Its history came
from the older `codex/member-catalog-v1` line and it has a very large difference
from the current production branch. Do not merge it into `main`, create a PR to
`main`, deploy, or run database migrations without an explicit integration
review and user approval.

## First setup on another Windows computer

Use Node.js 22 because `functions/package.json` requires Node 22.

```powershell
gh auth login
git clone --branch codex/workspace-sync-20260814 https://github.com/dgkim0127/noblesse.git
Set-Location noblesse
npm.cmd install
Push-Location functions
npm.cmd install
Pop-Location
npm.cmd run dev
```

Open the cloned `noblesse` folder as the workspace in Codex. Codex reads the
root `AGENTS.md` automatically; that file contains the project identity,
terminology, product constraints, routes, and validation requirements.

## Detailed conversation handoff

The original Codex task transcripts are not copied into this repository.
Instead, the durable decisions, evidence, branches, unfinished work, and safe
restart order from the Noblesse-related tasks are organized here:

- `docs/codex-handoff/README.md` - master task index and B-computer startup
- `docs/codex-handoff/01_NOBLESSE_WEB_AND_READINESS.md` - website, readiness,
  inquiry-list history, and production cautions
- `docs/codex-handoff/02_ONLINE_QUOTE_AND_PORS_INTEGRATION.md` - Noblesse/PORS
  online quote contract, implementation state, blockers, and restart checks
- `docs/codex-handoff/03_CATALOG_PRICING_AND_PRODUCT_QA.md` - catalog price
  display, locale currency work, and product-detail QA
- `docs/codex-handoff/04_SEPARATE_PORS_AND_PROCUREMENT.md` - boundaries for the
  separate PORS and Flutter procurement projects
- `docs/codex-handoff/05_PORS_APP_HANDOFF.md` - restored B-computer PORS paths,
  live GitHub branches/PR state, APK history, validation, and contract conflicts
- `docs/codex-handoff/06_PROCUREMENT_APP_HANDOFF.md` - latest procurement app
  behavior, Firebase/demo status, and the source-transfer blocker

These documents contain no passwords, API keys, session cookies, or private
tokens. Historical `D:\...` locations refer to the original computer and are
not evidence that the same folders exist on the new computer.

The PORS source has also been restored on the B computer at
`C:\Users\MINE\Documents\Codex\pors`, with the latest unmerged quote branch in
`C:\Users\MINE\Documents\Codex\pors-online-quote-workspace`. The Flutter
procurement source has not been restored because no corresponding GitHub
repository or B-computer folder was found as of 2026-08-14.

## First prompt for Codex

```text
Read AGENTS.md, CODEX_HANDOFF.md, and docs/codex-handoff/README.md completely.
Then read only the task document selected from that index. Confirm the workspace
root, current branch, git status, latest remote state, and whether any historical
D:\ workspace named in the task document actually exists on this computer.
Work only on codex/workspace-sync-20260814 unless I explicitly request a new
branch or a separate clean checkout. Do not merge main, deploy, run migrations,
or add payment/direct-purchase features. First give me an evidence-based status
and blocker report, then wait for me to choose which task to continue.
```

## Daily cross-device workflow

Before editing:

```powershell
git status --short --branch
git pull --ff-only
```

After validating a focused change:

```powershell
git add <files-you-changed>
git commit -m "short description"
git push
```

Do not edit the same files on both computers at the same time. Push from one
computer and pull on the other before continuing.

## Validation baseline

The following checks passed before the initial checkpoint was pushed:

- root `npm.cmd install`
- root `npm.cmd run lint`
- root `npm.cmd run build`
- root Vite development server returned HTTP 200
- Functions `npm.cmd install`
- Functions `npm.cmd run lint`
- Functions tests: 6 passed, 0 failed

Known warnings:

- root dependency audit: 8 findings (2 moderate, 5 high, 1 critical)
- Functions dependency audit: 11 findings (9 moderate, 1 high, 1 critical)
- the original computer used Node 24 and received an engine warning from the
  Functions package, which requires Node 22

Do not run `npm audit fix --force` automatically. Review dependency upgrades as
a separate task because forced fixes may introduce breaking changes.
