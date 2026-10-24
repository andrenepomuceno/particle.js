#!/usr/bin/env bash
# Runs a heavy command (browser tests, benchmarks) on at most 70% of the CPU cores, the budget
# the user set for WSL. Only the wrapped command and its children are limited.
# Usage: scripts/cpu-limit.sh <command> [args...]
set -euo pipefail
percent=70
(( $# > 0 )) || { echo "usage: scripts/cpu-limit.sh <command> [args...]" >&2; exit 2; }
# --all: plain nproc reports the caller's affinity, which may already be restricted.
cores=$(nproc --all)
allowed=$(( cores * percent / 100 ))
(( allowed >= 1 )) || allowed=1
exec taskset -c "0-$((allowed - 1))" "$@"
