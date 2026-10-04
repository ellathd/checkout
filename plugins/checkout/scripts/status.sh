#!/bin/sh
# Claude Code 훅이 부르는 스크립트: Checkout 창이 읽을 상태 파일을 남겨요
# 사용법: status.sh working | done | waiting
# 상태 폴더는 항상 ~/.checkout 하나로 고정해요 (Claude Code 버전마다 플러그인 전용 폴더를 주기도, 안 주기도 해서 서버와 훅이 엇갈리지 않게)
DATA="${CHECKOUT_DATA:-$HOME/.checkout}"
mkdir -p "$DATA"
STATE="$1"
AT="$(date +%s)000"

# "OK"를 눌렀을 때 돌아갈 앱을 기억해요
#  - 맥: Claude Code를 실행한 앱 표시 (예: com.microsoft.VSCode, com.apple.Terminal, com.anthropic.claudefordesktop)
#  - 어디서 실행됐는지 (예: claude-desktop, claude-vscode, cli)
# 따옴표 같은 특수문자는 빼고 기록해요
APP="$(printf '%s' "${__CFBundleIdentifier:-}" | tr -cd 'A-Za-z0-9.-')"
ENTRY="$(printf '%s' "${CLAUDE_CODE_ENTRYPOINT:-}" | tr -cd 'A-Za-z0-9._-')"
TERM_APP="$(printf '%s' "${TERM_PROGRAM:-}" | tr -cd 'A-Za-z0-9._-')"

printf '{"state":"%s","at":%s,"app":"%s","entry":"%s","term":"%s"}\n' "$STATE" "$AT" "$APP" "$ENTRY" "$TERM_APP" > "$DATA/status.json.tmp" && mv "$DATA/status.json.tmp" "$DATA/status.json"
exit 0
