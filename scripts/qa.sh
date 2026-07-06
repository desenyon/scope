#!/usr/bin/env bash
# QA benchmark — run scope against multiple targets and report timings
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCOPE="bun run $ROOT/src/index.ts"
PASS=0
FAIL=0

green() { echo -e "\033[32m$*\033[0m"; }
red()   { echo -e "\033[31m$*\033[0m"; }
bold()  { echo -e "\033[1m$*\033[0m"; }

run_test() {
  local name=$1
  local path=$2
  local max_ms=${3:-5000}

  if [[ ! -d "$path" ]]; then
    echo "  SKIP $name (path not found)"
    return
  fi

  local start end ms
  start=$(python3 -c "import time; print(int(time.time()*1000))" 2>/dev/null || date +%s000)
  local out
  out=$($SCOPE json "$path" -q 2>/dev/null) || { red "  FAIL $name — command error"; ((FAIL++)); return; }
  end=$(python3 -c "import time; print(int(time.time()*1000))" 2>/dev/null || date +%s000)
  ms=$((end - start))

  local code langs engine list_eng
  code=$(echo "$out" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('totalCode',0))" 2>/dev/null || echo 0)
  langs=$(echo "$out" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('languages',[])))" 2>/dev/null || echo 0)
  engine=$(echo "$out" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('locEngine','?'))" 2>/dev/null || echo "?")
  list_eng=$(echo "$out" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('listEngine','?'))" 2>/dev/null || echo "?")
  reported=$(echo "$out" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('durationMs',0))" 2>/dev/null || echo 0)

  if [[ "$code" -gt 0 ]] && [[ "$langs" -gt 0 ]]; then
    green "  PASS $name — ${reported}ms (wall ${ms}ms) · $code LOC · $langs langs · loc:$engine files:$list_eng"
    ((PASS++))
  else
    red "  FAIL $name — no LOC data"
    ((FAIL++))
  fi

  if [[ "$reported" -gt "$max_ms" ]]; then
    red "  WARN $name — exceeded ${max_ms}ms budget (${reported}ms)"
  fi
}

bold "Scope QA Benchmark"
echo ""

run_test "self"        "$ROOT"           500
run_test "home cursor" "$HOME/.cursor"   3000

echo ""
bold "Results: $PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
