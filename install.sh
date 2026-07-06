#!/usr/bin/env bash
# scope installer — works via: curl -fsSL https://raw.githubusercontent.com/desenyon/scope/main/install.sh | bash
set -euo pipefail

SCOPE_REPO="${SCOPE_REPO:-https://github.com/desenyon/scope.git}"
SCOPE_INSTALL_DIR="${SCOPE_INSTALL_DIR:-$HOME/.local/share/scope}"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; RED='\033[0;31m'; DIM='\033[2m'; BOLD='\033[1m'; RESET='\033[0m'
ok()   { echo -e "${GREEN}${BOLD}  ✓${RESET} $*"; }
info() { echo -e "${CYAN}${BOLD}  ▸${RESET} $*"; }
die()  { echo -e "${RED}${BOLD}  ✗${RESET} $*"; exit 1; }

has() { command -v "$1" &>/dev/null; }

ensure_path() {
  case ":$PATH:" in *":$1:"*) ;; *) export PATH="$1:$PATH" ;; esac
}

persist_path() {
  local line=$1
  for f in "$HOME/.zshrc" "$HOME/.bashrc"; do
    [[ -f "$f" ]] && ! grep -qF "$line" "$f" 2>/dev/null && echo -e "\n# scope\n$line" >> "$f"
  done
}

echo ""
echo -e "${CYAN}${BOLD}  Installing scope...${RESET}"
echo ""

# ── Get source ────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || echo "")"

if [[ -f "${SCRIPT_DIR}/src/index.ts" ]]; then
  ROOT="$SCRIPT_DIR"
else
  info "Downloading scope..."
  has git || die "git is required. Install git and re-run."
  if [[ -d "$SCOPE_INSTALL_DIR/.git" ]]; then
    git -C "$SCOPE_INSTALL_DIR" pull --ff-only 2>/dev/null || true
  else
    rm -rf "$SCOPE_INSTALL_DIR"
    git clone --depth 1 "$SCOPE_REPO" "$SCOPE_INSTALL_DIR"
  fi
  ROOT="$SCOPE_INSTALL_DIR"
fi

cd "$ROOT"

# ── Bun ───────────────────────────────────────────────────────────────────────

ensure_path "$HOME/.bun/bin"
ensure_path "/opt/homebrew/bin"
ensure_path "/usr/local/bin"

if ! has bun; then
  info "Installing Bun..."
  has curl || die "curl is required."
  curl -fsSL https://bun.sh/install | bash
  ensure_path "$HOME/.bun/bin"
  persist_path 'export PATH="$HOME/.bun/bin:$PATH"'
fi

has bun || die "bun not found. Restart your terminal and re-run."
ok "bun $(bun --version)"

# ── Speed tools (silent, best-effort) ─────────────────────────────────────────

install_optional() {
  has "$2" && return 0
  if has brew; then brew install "$1" &>/dev/null && return 0; fi
  if has apt-get; then
    sudo apt-get update -qq &>/dev/null
    sudo apt-get install -y "$1" &>/dev/null && return 0
  fi
  if has pacman; then sudo pacman -S --noconfirm "$1" &>/dev/null && return 0; fi
  return 1
}

install_optional tokei tokei || true
install_optional fd fd || true
install_optional ripgrep rg || true
# Ubuntu: fd-find binary is fdfind
if has fdfind && ! has fd; then
  mkdir -p "$HOME/.local/bin"
  ln -sf "$(command -v fdfind)" "$HOME/.local/bin/fd" 2>/dev/null || true
  ensure_path "$HOME/.local/bin"
fi

# ── Install scope ─────────────────────────────────────────────────────────────

info "Setting up scope..."
bun install --frozen-lockfile 2>/dev/null || bun install

# Global command
SCOPE_BIN="$HOME/.local/bin/scope"
mkdir -p "$HOME/.local/bin"
cat > "$SCOPE_BIN" <<EOF
#!/usr/bin/env bash
exec "$HOME/.bun/bin/bun" run "$ROOT/src/index.ts" "\$@"
EOF
chmod +x "$SCOPE_BIN"
ensure_path "$HOME/.local/bin"
persist_path 'export PATH="$HOME/.local/bin:$PATH"'

ok "scope installed to ~/.local/bin/scope"

# ── Verify ────────────────────────────────────────────────────────────────────

if bun run "$ROOT/src/index.ts" json "$ROOT" -q &>/dev/null; then
  ok "Ready to use"
else
  die "Installation failed verification. Try: scope ."
fi

echo ""
echo -e "  Run ${CYAN}${BOLD}scope${RESET} in any project directory."
echo -e "  ${DIM}scope ~/projects/my-app${RESET}"
echo ""
