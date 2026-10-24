#!/usr/bin/env bash
# Pins a process tree to 70% of the CPU cores (WSL budget agreed with the user). Children
# inherit the affinity, so pinning the Claude Code process covers every later command/agent.
# Usage: scripts/cpu-limit.sh [root-pid]   (default: the nearest ancestor named "claude")
set -euo pipefail
percent=70
# --all: nproc alone reports the already-pinned affinity, which would shrink the budget each run.
cores=$(nproc --all)
allowed=$(( cores * percent / 100 ))
(( allowed >= 1 )) || { echo "cpu-limit: only $cores cores, cannot keep $percent%" >&2; exit 1; }
root=${1:-}
if [[ -z $root ]]; then
  pid=$$
  while [[ $pid -gt 1 ]]; do
    [[ $(ps -o comm= -p "$pid") == claude ]] && root=$pid
    pid=$(ps -o ppid= -p "$pid" | tr -d ' ')
  done
fi
[[ -n $root ]] || { echo "cpu-limit: no ancestor named 'claude'; pass a pid" >&2; exit 1; }
descendants() { echo "$1"; for child in $(ps -o pid= --ppid "$1"); do descendants "$child"; done; }
pinned=0
for p in $(descendants "$root"); do
  taskset -a -p -c "0-$((allowed - 1))" "$p" >/dev/null 2>&1 && pinned=$((pinned + 1))
done
echo "cpu-limit: pinned $pinned processes under $root to cores 0-$((allowed - 1)) of $cores ($percent%)"
