# scope

Instantly understand any codebase — languages, size, frameworks, dependencies, routes, database, git history, health score, and more.

```bash
curl -fsSL https://raw.githubusercontent.com/desenyon/scope/main/install.sh | bash
```

Then:

```bash
scope                    # current directory
scope ~/projects/my-app  # any path
```

## What it's for

**Onboarding.** You cloned a repo and need the lay of the land before touching code. `scope` gives you a full picture in one command — what language it's in, what framework it uses, how big it is, whether it has tests, CI, and a README.

**Due diligence.** Auditing a dependency, evaluating an acquisition target, or reviewing a contractor's deliverable. Export a markdown report for your records.

**Automation.** JSON output pipes into scripts, CI, or dashboards.

```bash
scope json . | jq '.totalCode, .frameworks[].name, .health.score'
scope export -o REPORT.md
```

## Commands

| Command | What it does |
|---------|-------------|
| `scope [path]` | Full report in the terminal |
| `scope json [path]` | JSON for scripting (`jq`, CI, etc.) |
| `scope export [path]` | Markdown report (`-o file.md` to save) |
| `scope -q` | Suppress spinner |
| `scope -h` | Help |

## What you get

**Code** — lines per language, primary language %, repo size, largest files, TODO/FIXME counts

**Stack** — frameworks (60+ detected), dependencies with versions, runtime versions, package managers

**Structure** — routes (API, pages, components), architecture patterns (App Router, MVC, monorepo layout), top-level directories

**Database** — detected systems (Postgres, Redis, etc.), ORMs, migration folders

**Git** — branch, commits, contributors, repo age, last commit, dirty state

**Ops** — Docker, CI/CD, Kubernetes, Terraform, docker-compose services

**Quality** — test files and frameworks, linters, formatters, TypeScript strict mode

**Health score** — 0–100 based on README, license, lockfile, CI, tests, contributing guide, changelog, and more

**Security** — lockfiles, env files, secret pattern warnings

## JSON fields (for scripting)

```bash
scope json . | jq '{
  name: .identity.name,
  code: .totalCode,
  lang: .codebase.primaryLanguage,
  frameworks: [.frameworks[].name],
  deps: .dependencyCount,
  health: .health.score,
  tests: .testing.testFiles,
  age_days: .git.repoAgeDays
}'
```

Key top-level fields: `totalCode`, `languages`, `frameworks`, `dependencies`, `git`, `devops`, `testing`, `health`, `codebase`, `database`, `routes`, `architecture`, `scripts`, `security`, `durationMs`.

## Use cases

**Compare two projects:**
```bash
scope json ./project-a | jq .totalCode
scope json ./project-b | jq .totalCode
```

**CI health check** — fail if no tests or lockfile:
```bash
scope json . | jq -e '.testing.testFiles > 0 and .security.hasLockfile'
```

**Onboarding doc** — generate and commit:
```bash
scope export -o docs/PROJECT_SCOPE.md
```

## Requirements

- macOS or Linux
- `git` and `curl` (for install)
- [Bun](https://bun.sh) is installed automatically if missing

## Development

```bash
git clone https://github.com/desenyon/scope.git
cd scope
bun install
bun run scope .
bun run qa        # benchmark
```

## License

MIT
