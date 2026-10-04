# Checkout `$ checkout▍`

AI 기다리는 동안 읽는 개발자 신문 — Claude Code 플러그인.

Claude Code에 일을 시켜두고 다른 창에서 딴짓하고 있으면, 작업이 끝나는 순간 작은 창(`cat.exe`)이 **"claude 작업이 끝났어요 [OK]"** 하고 알려줘요. OK를 누르면 Claude로 바로 돌아가요. 기다리는 동안 읽을 짧은 개발자 신문도 들어 있어요.

## 필요한 것

- **Claude Code** (데스크톱 앱 또는 터미널)
- **크롬** — 다른 앱 위에 떠 있는 작은 창은 크롬에서만 돼요
- **Node.js** — 없으면 설치 후 `/checkout:setup`이 설치를 도와줘요
- 지금은 **맥**에서 확인됐어요. 윈도우는 테스트 중이에요.

## 설치 (한 줄)

터미널에 이 한 줄을 붙여넣어요.

```bash
claude plugin marketplace add ellathd/checkout && claude plugin install checkout@checkout-market
```

터미널에서 `claude` 명령이 안 되면(데스크톱 앱만 쓰는 경우), Claude Code 대화창에 두 줄을 차례로 입력해도 돼요.

```
/plugin marketplace add ellathd/checkout
```

```
/plugin install checkout@checkout-market
```

설치한 뒤 **새 세션**을 열면 Checkout 서버가 자동으로 켜져요.

### VS Code 확장이나 터미널(CLI)에서 쓴다면

- 위 한 줄 설치를 터미널에서 하면 돼요. 한 번 설치하면 VS Code 확장에서도 같이 적용돼요.
- 작업이 끝나고 **OK**를 누르면 Claude를 실행한 앱(VS Code, 터미널, iTerm 등)이 앞으로 나와요. 윈도우에서는 VS Code와 Claude 앱만 앞으로 가져올 수 있고, 터미널은 알림만 닫혀요.

## 쓰는 법

1. Claude Code에서 `/checkout:open` 을 입력해요. (또는 크롬에서 `http://localhost:5180`)
2. **작은 창으로 띄우기**를 눌러요.
3. Claude에게 일을 시키고 다른 창으로 가 있어요.
4. 작업 중엔 `Calculating…` 진행 막대가, 끝나면 `cat.exe` 대화상자가 떠요. **OK**를 누르면 Claude로 돌아가요.

창 위쪽 `_` 버튼을 누르면 상태만 보여주는 **미니 모드**가 돼요. `□`를 누르면 다시 매거진으로 커져요.

## 같이 들어 있는 플러그인: 파일팅

AI가 일하는 동안 다운로드 폴더 파일이랑 소개팅해요. 작은 창에서 파일을 한 장씩 보고 버릴지 남길지 정해요.

```
claude plugin install fileting@checkout-market
```

설치한 뒤 `/fileting:open` 을 입력해요.

## 업데이트

```
/plugin marketplace update checkout-market
```

## 안 될 때

- 작은 창에 "서버 연결이 끊겼어요"가 뜨면: Claude Code 새 세션을 열거나 `/checkout:open`을 입력해요.
- Node.js가 없다는 메시지가 뜨면: `/checkout:setup`
