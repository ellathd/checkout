#!/bin/sh
# Claude Code를 켤 때 Checkout 서버를 켜요 (맥, 윈도우 Git Bash 공통)
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# 상태 폴더는 항상 ~/.checkout 하나로 고정해요 (Claude Code 버전마다 플러그인 전용 폴더를 주기도, 안 주기도 해서 서버와 훅이 엇갈리지 않게)
DATA="${CHECKOUT_DATA:-$HOME/.checkout}"
PORT=5180

# Node.js가 없으면 설치 안내만 하고 넘어가요 (Claude Code 작업은 막지 않아요)
if ! command -v node >/dev/null 2>&1; then
  echo '{"systemMessage":"Checkout을 쓰려면 Node.js가 필요해요. /checkout:setup 을 입력하면 설치를 도와드려요."}'
  exit 0
fi

node "$ROOT/scripts/start-server.js" "$DATA" "$PORT" >/dev/null 2>&1
exit 0
