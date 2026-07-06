# scope

<p align="center">
  <img src="https://img.shields.io/badge/runtime-Bun-f9f1e1?style=for-the-badge&logo=bun" alt="Bun" />
  <img src="https://img.shields.io/badge/speed-<500ms-00d4aa?style=for-the-badge" alt="Speed" />
  <img src="https://img.shields.io/badge/license-MIT-8b5cf6?style=for-the-badge" alt="MIT" />
</p>

<p align="center">
  <strong>One command to understand any codebase.</strong><br/>
  Run <code>scope</code> in any project to instantly see lines of code, languages,<br/>
  frameworks, dependencies, git info, and more — in a beautiful terminal report.
</p>

<p align="center">
  <a href="#install">Install</a> ·
  <a href="#usage">Usage</a> ·
  <a href="#what-it-detects">Features</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#performance">Performance</a>
</p>

---

## Why scope?

You clone a repo. Before you write a line of code, you need to know what you're looking at. **scope** answers that in seconds:

```
scope ~/projects/unknown-repo
```

```
  ╔════════════════════════════════════════════════════════════════╗
  ║  S C O P E                                                     ║
  ║  Project Intelligence                                          ║
  ╚════════════════════════════════════════════════════════════════╝

╭────────────────────────────────────────────────────╮
│ PROJECT                                            │
├────────────────────────────────────────────────────┤
│ Name        my-app                                 │
│ Version     v2.4.1                                 │
│ License     MIT                                    │
╰────────────────────────────────────────────────────╯

  42,891      51,203      312         8           47          6
  Code Lines  Total Lines Files       Languages   DependenciesFrameworks

  Analyzed in 89ms · loc: tokei · files: fd
```

## Install

One command installs everything — Bun, tokei, fd, ripgrep, and links the CLI globally:

```bash
git clone https://github.com/desenyon/scope.git
cd scope
./install.sh
```

That's it. Run `scope` anywhere.

<details>
<summary>Manual install</summary>

```bash
brew install oven-sh/bun/bun tokei fd ripgrep   # macOS
bun install
bun link
```

</details>

## Usage

```bash
scope                     # analyze current directory
scope ~/projects/my-app   # analyze any path
scope export -o REPORT.md # export full markdown report
scope json | jq '.totalCode'  # machine-readable JSON
scope -q                  # quiet mode (no spinner)
```

### Commands

| Command | Description |
|---------|-------------|
| `scope [path]` | Full terminal report (default) |
| `scope export [path]` | Markdown export (`-o file.md`) |
| `scope json [path]` | JSON output for scripting |
| `scope -h` | Help |

## What it detects

### Code metrics
- Lines of code per language (code, comments, blanks)
- File counts and language distribution with bar charts
- Largest files, extension breakdown, directory depth

### Stack & dependencies
- **60+ frameworks** — Next.js, React, Vue, Django, FastAPI, Electron, Prisma, Tailwind, LangChain, and more
- **Dependencies** with versions across npm, cargo, pip, go modules, Ruby gems
- **Runtime versions** from `.nvmrc`, `engines`, `go.mod`, `Cargo.toml`, `.python-version`
- **Package managers** — bun, pnpm, yarn, npm, poetry, uv, cargo

### Project metadata
- Name, version, description, license, authors
- Monorepo detection (workspaces, turborepo, nx, lerna, pnpm)

### Git
- Branch, remote, commit count, contributors, last commit, dirty state

### DevOps & infrastructure
- Docker, Docker Compose, Kubernetes, Terraform, Makefile
- CI/CD: GitHub Actions, GitLab CI, CircleCI, Jenkins, Vercel, Netlify, Fly.io, Render

### Quality & security
- ESLint, Prettier, Biome, TypeScript strict mode
- Test frameworks (Jest, Vitest, pytest, Playwright, Cypress) and test file count
- Lockfile presence, `.env` files, secret pattern scanning

### Documentation
- README size, `docs/` folder file count

## Architecture

scope is built for **one filesystem pass** and **maximum parallelism**:

```
┌─────────────────────────────────────────────────────────────┐
│  Phase 1 (parallel)                                         │
│  ┌──────────┐ ┌───────────┐ ┌─────┐ ┌───────┐ ┌──────────┐ │
│  │ fd/rg/   │ │ Manifest  │ │ Git │ │ tokei │ │ Tool     │ │
│  │ native   │ │ preload   │ │     │ │ (LOC) │ │ detect   │ │
│  │ index    │ │ (50 files)│ │     │ │       │ │          │ │
│  └────┬─────┘ └─────┬─────┘ └──┬──┘ └───┬───┘ └──────────┘ │
│       │             │          │        │                   │
│  Phase 2 (parallel)│          │        │                   │
│       ├─────────────┴──────────┴────────┘                   │
│       │  structure · security · (native LOC fallback)       │
│       │                                                     │
│  Phase 3 (sync, instant)                                  │
│       │  frameworks · deps · devops · testing · quality     │
└───────┴─────────────────────────────────────────────────────┘
```

| Layer | Tool | Purpose |
|-------|------|---------|
| File listing | **fd** → **ripgrep** → native | Single index, no redundant walks |
| LOC counting | **tokei** → native | Industry-standard speed + accuracy |
| Runtime | **Bun** | Fast startup, parallel I/O |
| Manifests | Parallel preload | 50 known files read once |

## Performance

Benchmarks on Apple Silicon (M-series):

| Project | Files | Time | Engines |
|---------|------:|-----:|---------|
| scope (self) | 20 | **~10ms** | native/native |
| Medium app | 500 | **~50ms** | tokei/fd |
| Large monorepo | 5,000+ | **~150ms** | tokei/fd |

Install the recommended tools for best performance:

```bash
brew install tokei fd ripgrep
```

Run the QA benchmark:

```bash
bun run qa
```

## Export example

```bash
scope export -o SCOPE.md
```

Produces a full markdown report with tables for languages, frameworks, dependencies, git, DevOps, testing, security, and structure — ready for PRs, onboarding docs, or wiki pages.

## Tech stack

- [Bun](https://bun.sh) — runtime
- [tokei](https://github.com/XAMPPRocky/tokei) — LOC counting
- [fd](https://github.com/sharkdp/fd) — fast file listing
- [ripgrep](https://github.com/BurntSushi/ripgrep) — file listing fallback

## License

MIT
