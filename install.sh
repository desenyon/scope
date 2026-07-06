#!/usr/bin/env bash
# scope installer — installs every tool and dependency needed to run scope
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# ── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'
CYAN='\033[0;36m'; DIM='\033[2m'; BOLD='\033[1m'; RESET='\033[0m'

info()  { echo -e "${CYAN}${BOLD}  ▸${RESET} $*"; }
ok()    { echo -e "${GREEN}${BOLD}  ✓${RESET} $*"; }
warn()  { echo -e "${YELLOW}${BOLD}  !${RESET} $*"; }
die()   { echo -e "${RED}${BOLD}  ✗${RESET} $*"; exit 1; }

echo ""
echo -e "${CYAN}${BOLD}  ╔══════════════════════════════════════╗${RESET}"
echo -e "${CYAN}${BOLD}  ║         SCOPE — Installer            ║${RESET}"
echo -e "${CYAN}${BOLD}  ╚══════════════════════════════════════╝${RESET}"
echo -e "${DIM}  Installs Bun, tokei, fd, ripgrep, and links the CLI.${RESET}"
echo ""

# ── Helpers ─────────────────────────────────────────────────────────────────

has() { command -v "$1" &>/dev/null; }

version_of() {
  local cmd=$1
  has "$cmd" && $cmd --version 2>/dev/null | head -1 || echo "not found"
}

ensure_path() {
  local dir=$1
  [[ -d "$dir" ]] || return 0
  case ":$PATH:" in
    *":$dir:"*) ;;
    *) export PATH="$dir:$PATH" ;;
  esac
}

persist_path_line() {
  local line=$1
  local profile
  for profile in "$HOME/.zshrc" "$HOME/.bashrc" "$HOME/.bash_profile"; do
    if [[ -f "$profile" ]] && ! grep -qF "$line" "$profile" 2>/dev/null; then
      echo "" >> "$profile"
      echo "# scope installer" >> "$profile"
      echo "$line" >> "$profile"
      ok "Added to $(basename "$profile"): $line"
    fi
  done
}

# Standard PATH additions
ensure_path "$HOME/.bun/bin"
ensure_path "/opt/homebrew/bin"
ensure_path "/usr/local/bin"
ensure_path "$HOME/.cargo/bin"
export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"

# ── Prerequisites ───────────────────────────────────────────────────────────

info "Checking prerequisites..."
has curl  || die "curl is required. Install curl and re-run."
has git   || warn "git not found — git stats in scope will be unavailable."
has python3 || warn "python3 not found — QA script may not work."
ok "curl available"

# ── Homebrew (macOS / Linux) ─────────────────────────────────────────────────

install_brew() {
  if has brew; then ok "Homebrew $(brew --version | head -1)"; return 0; fi
  info "Installing Homebrew..."
  NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  if [[ -f /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
    persist_path_line 'eval "$(/opt/homebrew/bin/brew shellenv)"'
  elif [[ -f /usr/local/bin/brew ]]; then
    eval "$(/usr/local/bin/brew shellenv)"
    persist_path_line 'eval "$(/usr/local/bin/brew shellenv)"'
  fi
  has brew || die "Homebrew installation failed."
  ok "Homebrew installed"
}

# ── Bun ─────────────────────────────────────────────────────────────────────

install_bun() {
  if has bun; then
    ok "bun $(bun --version)"
    return 0
  fi

  info "Installing Bun..."
  if has brew; then
    brew install oven-sh/bun/bun 2>/dev/null && { ok "bun installed via Homebrew"; return 0; }
  fi

  curl -fsSL https://bun.sh/install | bash
  ensure_path "$HOME/.bun/bin"
  persist_path_line 'export BUN_INSTALL="$HOME/.bun"'
  persist_path_line 'export PATH="$BUN_INSTALL/bin:$PATH"'

  has bun || die "Bun installation failed. Add ~/.bun/bin to PATH and re-run."
  ok "bun $(bun --version)"
}

# ── Generic tool installer ───────────────────────────────────────────────────

install_tool() {
  local name=$1       # human name
  local cmd=$2        # binary to check
  shift 2
  local install_fns=("$@")

  if has "$cmd"; then
    ok "$name — $(version_of "$cmd")"
    return 0
  fi

  info "Installing $name..."
  for fn in "${install_fns[@]}"; do
    if $fn; then
      if has "$cmd"; then
        ok "$name installed — $(version_of "$cmd")"
        return 0
      fi
    fi
  done

  warn "$name could not be installed automatically — scope will use a slower fallback"
  return 1
}

# Brew helpers
_brew_tokei()  { has brew && brew install tokei; }
_brew_fd()     { has brew && brew install fd; }
_brew_rg()     { has brew && brew install ripgrep; }
_brew_jq()     { has brew && brew install jq; }

# apt helpers
_apt_update()  { sudo apt-get update -qq 2>/dev/null; }
_apt_tokei()   { _apt_update && sudo apt-get install -y tokei 2>/dev/null; }
_apt_fd()      {
  _apt_update && sudo apt-get install -y fd-find 2>/dev/null
  # Ubuntu names the binary fdfind — create fd symlink if needed
  if has fdfind && ! has fd; then
    sudo ln -sf "$(command -v fdfind)" /usr/local/bin/fd 2>/dev/null \
      || mkdir -p "$HOME/.local/bin" && ln -sf "$(command -v fdfind)" "$HOME/.local/bin/fd"
    ensure_path "$HOME/.local/bin"
  fi
}
_apt_rg()      { _apt_update && sudo apt-get install -y ripgrep 2>/dev/null; }
_apt_jq()      { _apt_update && sudo apt-get install -y jq 2>/dev/null; }

# pacman helpers
_pacman_tokei() { sudo pacman -S --noconfirm tokei 2>/dev/null; }
_pacman_fd()    { sudo pacman -S --noconfirm fd 2>/dev/null; }
_pacman_rg()    { sudo pacman -S --noconfirm ripgrep 2>/dev/null; }
_pacman_jq()    { sudo pacman -S --noconfirm jq 2>/dev/null; }

# dnf helpers
_dnf_tokei()   { sudo dnf install -y tokei 2>/dev/null; }
_dnf_fd()      { sudo dnf install -y fd-find 2>/dev/null; has fdfind && ! has fd && sudo ln -sf "$(command -v fdfind)" /usr/local/bin/fd 2>/dev/null; }
_dnf_rg()      { sudo dnf install -y ripgrep 2>/dev/null; }
_dnf_jq()      { sudo dnf install -y jq 2>/dev/null; }

# cargo fallback (slower but universal)
_cargo_tokei() { has cargo && cargo install tokei --locked 2>/dev/null; }
_cargo_fd()    { has cargo && cargo install fd-find --locked 2>/dev/null; }
_cargo_rg()    { has cargo && cargo install ripgrep --locked 2>/dev/null; }

# ── Platform dispatch ─────────────────────────────────────────────────────────

info "Detecting platform: $OSTYPE"
echo ""

if [[ "$OSTYPE" == darwin* ]]; then
  install_brew
  install_bun
  install_tool "tokei"    tokei _brew_tokei _cargo_tokei  || true
  install_tool "fd"       fd    _brew_fd    _cargo_fd       || true
  install_tool "ripgrep"  rg    _brew_rg    _cargo_rg       || true
  install_tool "jq"       jq    _brew_jq                      || true

elif [[ "$OSTYPE" == linux-gnu* ]] || [[ "$OSTYPE" == linux* ]]; then
  install_bun
  if has apt-get; then
    install_tool "tokei"    tokei _apt_tokei   _brew_tokei _cargo_tokei || true
    install_tool "fd"       fd    _apt_fd      _brew_fd    _cargo_fd    || true
    install_tool "ripgrep"  rg    _apt_rg      _brew_rg    _cargo_rg    || true
    install_tool "jq"       jq    _apt_jq      _brew_jq                  || true
  elif has pacman; then
    install_tool "tokei"    tokei _pacman_tokei _brew_tokei _cargo_tokei || true
    install_tool "fd"       fd    _pacman_fd    _brew_fd    _cargo_fd    || true
    install_tool "ripgrep"  rg    _pacman_rg    _brew_rg    _cargo_rg    || true
    install_tool "jq"       jq    _pacman_jq    _brew_jq                  || true
  elif has dnf; then
    install_tool "tokei"    tokei _dnf_tokei   _brew_tokei _cargo_tokei || true
    install_tool "fd"       fd    _dnf_fd      _brew_fd    _cargo_fd    || true
    install_tool "ripgrep"  rg    _dnf_rg      _brew_rg    _cargo_rg    || true
    install_tool "jq"       jq    _dnf_jq      _brew_jq                  || true
  elif has brew; then
    install_tool "tokei"    tokei _brew_tokei  _cargo_tokei || true
    install_tool "fd"       fd    _brew_fd     _cargo_fd    || true
    install_tool "ripgrep"  rg    _brew_rg     _cargo_rg    || true
    install_tool "jq"       jq    _brew_jq                     || true
  else
    warn "No supported package manager found — trying cargo fallbacks..."
    install_tool "tokei"    tokei _cargo_tokei || true
    install_tool "fd"       fd    _cargo_fd    || true
    install_tool "ripgrep"  rg    _cargo_rg    || true
  fi

else
  warn "Unsupported OS ($OSTYPE) — installing Bun only; install tokei, fd, rg manually."
  install_bun
fi

# Final PATH refresh
ensure_path "$HOME/.bun/bin"
ensure_path "$HOME/.cargo/bin"
ensure_path "/opt/homebrew/bin"
ensure_path "/usr/local/bin"
ensure_path "$HOME/.local/bin"

has bun || die "bun is not on PATH. Restart your terminal or run: export PATH=\"\$HOME/.bun/bin:\$PATH\""

# ── Project dependencies ──────────────────────────────────────────────────────

echo ""
info "Installing scope project dependencies..."
if [[ -f "$ROOT/bun.lock" ]] || [[ -f "$ROOT/bun.lockb" ]]; then
  bun install --frozen-lockfile 2>/dev/null || bun install
else
  bun install
fi
ok "Project dependencies installed"

# ── Link CLI globally ─────────────────────────────────────────────────────────

info "Linking scope CLI globally..."
if bun link 2>/dev/null; then
  ok "scope is available as a global command"
else
  # Fallback: symlink into ~/.local/bin
  mkdir -p "$HOME/.local/bin"
  cat > "$HOME/.local/bin/scope" <<WRAPPER
#!/usr/bin/env bash
exec "$HOME/.bun/bin/bun" run "$ROOT/src/index.ts" "\$@"
WRAPPER
  chmod +x "$HOME/.local/bin/scope"
  ensure_path "$HOME/.local/bin"
  persist_path_line 'export PATH="$HOME/.local/bin:$PATH"'
  ok "scope linked via ~/.local/bin/scope"
fi

# ── Verification ──────────────────────────────────────────────────────────────

echo ""
info "Verifying installation..."
VERIFY=$(bun run "$ROOT/src/index.ts" json "$ROOT" -q 2>/dev/null || echo "")

if [[ -n "$VERIFY" ]]; then
  DURATION=$(echo "$VERIFY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('durationMs','?'))" 2>/dev/null || echo "?")
  LOC_ENGINE=$(echo "$VERIFY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('locEngine','?'))" 2>/dev/null || echo "?")
  LIST_ENGINE=$(echo "$VERIFY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('listEngine','?'))" 2>/dev/null || echo "?")
  ok "scope runs correctly (${DURATION}ms · loc:${LOC_ENGINE} · files:${LIST_ENGINE})"
else
  warn "Could not verify — try: scope ."
fi

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}${BOLD}  ┌─────────────────────────────────────────┐${RESET}"
echo -e "${GREEN}${BOLD}  │  Installation complete!                 │${RESET}"
echo -e "${GREEN}${BOLD}  └─────────────────────────────────────────┘${RESET}"
echo ""
printf "  ${DIM}%-12s${RESET} %s\n" "bun"      "$(has bun    && echo "✓ $(bun --version)"    || echo "✗ missing")"
printf "  ${DIM}%-12s${RESET} %s\n" "tokei"    "$(has tokei  && echo "✓ $(tokei --version 2>&1 | head -1)" || echo "✗ missing (slower LOC)")"
printf "  ${DIM}%-12s${RESET} %s\n" "fd"       "$(has fd     && echo "✓ $(fd --version 2>&1 | head -1)"    || echo "✗ missing (slower scan)")"
printf "  ${DIM}%-12s${RESET} %s\n" "ripgrep"  "$(has rg     && echo "✓ $(rg --version 2>&1 | head -1)"    || echo "✗ missing (slower scan)")"
printf "  ${DIM}%-12s${RESET} %s\n" "scope"    "$(has scope  && echo "✓ ready" || echo "✓ via bun run")"
echo ""
echo -e "  Run ${CYAN}${BOLD}scope${RESET} in any project to see lines of code, frameworks, and dependencies."
echo -e "  ${DIM}Example: scope ~/projects/my-app${RESET}"
echo ""
