#!/bin/sh
# Claude Code 훅이 부르는 스크립트: Checkout 창이 읽을 상태 파일을 남겨요
# 사용법: status.sh working | done | waiting
# 상태 폴더는 항상 ~/.checkout 하나로 고정해요 (Claude Code 버전마다 플러그인 전용 폴더를 주기도, 안 주기도 해서 서버와 훅이 엇갈리지 않게)
DATA="${CHECKOUT_DATA:-$HOME/.checkout}"
mkdir -p "$DATA"
STATE="$1"
AT="$(date +%s)000"
printf '{"state":"%s","at":%s}\n' "$STATE" "$AT" > "$DATA/status.json.tmp" && mv "$DATA/status.json.tmp" "$DATA/status.json"
exit 0
