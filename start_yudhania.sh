#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
if [ -z "${OPENAI_API_KEY:-}" ]; then
  read -rsp "OPENAI_API_KEY: " OPENAI_API_KEY
  echo
  export OPENAI_API_KEY
fi
node server.js &
PID=$!
trap 'kill $PID 2>/dev/null || true' EXIT
sleep 1
if command -v open >/dev/null 2>&1; then open http://127.0.0.1:8787
elif command -v xdg-open >/dev/null 2>&1; then xdg-open http://127.0.0.1:8787
fi
wait $PID
