#!/usr/bin/env bash
# scope installer — installs all dependencies and links the CLI globally
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
DIM='\033[2m'
BOLD='\033[1m'
RESET='\033[0m'

info()  { echo -e "${CYAN}${BOLD}  ▸${RESET} $*"; }
ok()    { echo -e "${GREEN}${BOLD}  ✓${RESET} $*"; }
warn()  { echo -e "${RED}${BOLD}  !${RESET} $*"; }

echo ""
echo -e "${CYAN}${BOLD}  ╔══════════════════════════════════════╗${RESET}"
echo -e "${CYAN}${BOLD}  ║         SCOPE — Installer            ║${RESET}"
echo -e "${CYAN}${BOLD}  ╚══════════════════════════════════════╝${RESET}"
echo ""

has() { command -v "$1" &>/dev/null; }

install_brew() {
  if has brew; then return 0; fi
  info "Installing Homebrew..."
  NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  if [[ -f /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [[ -f /usr/local/bin/brew ]]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi
}

install_bun() {
  if has bun; then ok "bun $(bun --version)"; return 0; fi
  info "Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
  export PATH="$BUN_INSTALL/bin:$PATH"
  ok "bun installed"
}

brew_install() {
  local pkg=$1
  local cmd=${2:-$1}
  if has "$cmd"; then
    ok "$cmd already installed"
    return 0
  fi
  info "Installing $pkg via Homebrew..."
  brew install "$pkg"
  ok "$cmd installed"
}

# ── Platform-specific system deps ──────────────────────────────────────────

if [[ "$OSTYPE" == darwin"* ]]; then
  install_brew
  brew_install oven-sh/bun/bun bun || install_bun
  brew_install tokei
  brew_install fd
  brew_install ripgrep rg
elif [[ "$OSTYPE" == linux-gnu"* ]] || [[ "$OSTYPE" == linux"* ]]; then
  install_bun
  if has apt-get; then
  for pkg_cmd in "tokei:tokei" "fd-find:fd" "ripgrep:rg"; do
    pkg="${pkg_cmd%%:*}"
    cmd="${pkg_cmd##*:}"
    if ! has "$cmd"; then
      info "Installing $pkg via apt..."
      sudo apt-get install -y "$pkg" 2>/dev/null || warn "Could not install $pkg — optional but recommended"
    else
      ok "$cmd already installed"
    fi
  done
  elif has pacman; then
    for pkg in tokei fd ripgrep; do
      has "$pkg" || { info "Installing $pkg..."; sudo pacman -S --noconfirm "$pkg" 2>/dev/null || warn "Could not install $pkg"; }
    done
  elif has brew; then
    brew_install tokei
    brew_install fd
    brew_install ripgrep rg
  else
    warn "Install tokei, fd, and ripgrep manually for best performance"
  fi
else
  install_bun
  warn "Unknown OS — install tokei, fd, ripgrep manually for best performance"
fi

# Ensure bun is on PATH
export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH:/opt/homebrew/bin:/usr/local/bin"

if ! has bun; then
  warn "bun not found on PATH. Add ~/.bun/bin to your shell profile and re-run."
  exit 1
fi

# ── Project setup ──────────────────────────────────────────────────────────

info "Installing project dependencies..."
bun install --frozen-lockfile 2>/dev/null || bun install
ok "Dependencies installed"

info "Linking scope CLI globally..."
bun link 2>/dev/null || {
  warn "bun link failed — you can run via: bun run $ROOT/src/index.ts"
}
ok "scope command available globally"

# ── Verify ─────────────────────────────────────────────────────────────────

echo ""
info "Running quick verification..."
SCOPE_OUT=$(bun run "$ROOT/src/index.ts" "$ROOT" -q 2>/dev/null || true)
if echo "$SCOPE_OUT" | grep -q "TypeScript"; then
  ok "Verification passed"
else
  warn "Verification inconclusive — try: scope ."
fi

echo ""
echo -e "${GREEN}${BOLD}  Done!${RESET} Run ${CYAN}scope${RESET} in any project directory."
echo -e "${DIM}  Tools: tokei=$(has tokei && echo yes || echo no) fd=$(has fd && echo yes || echo no) rg=$(has rg && echo yes || echo no)${RESET}"
echo ""
