---
name: open
description: Checkout(AI 기다리는 동안 읽는 개발자 신문)을 크롬에서 연다. "체크아웃 열어줘", "Checkout 켜줘", "/checkout:open" 같은 요청에 사용.
---

# Checkout 열기

1. Node.js가 있는지 확인한다: `node --version`. 없으면 이 스킬을 멈추고 `/checkout:setup` 스킬의 순서를 따른다.

2. Checkout 서버를 켠다 (이미 켜져 있으면 아무 일도 안 한다):

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/start-server.sh"
```

3. 크롬에서 연다. 작은 창(Document Picture-in-Picture)은 크롬에서만 되므로 크롬을 우선한다.
   - 맥: `open -a "Google Chrome" "http://localhost:5180"` (크롬이 없어서 실패하면 `open "http://localhost:5180"`)
   - 윈도우: `cmd.exe //c start chrome "http://localhost:5180"` (실패하면 `cmd.exe //c start "" "http://localhost:5180"`)

4. 사용자에게 한 줄로 안내한다: **"작은 창으로 띄우기"**를 누르면 다른 앱 위에 떠 있고, Claude 작업이 끝나면 알려준다고. 크롬이 아닌 브라우저로 열렸다면 크롬으로 열어야 작은 창이 된다고 덧붙인다.
