---
name: setup
description: Checkout 플러그인을 처음 쓸 때 필요한 Node.js를 확인하고, 없으면 사용자 허락을 받아 설치를 돕는다. "/checkout:setup", "체크아웃 설치", "Checkout이 안 켜져요" 같은 요청에 사용.
---

# Checkout 준비하기

Checkout은 작은 로컬 서버를 Node.js로 돌린다. 이 스킬은 Node.js를 준비하고 Checkout을 연다.

## 1. 이미 있는지 확인

`node --version`을 실행한다. 버전이 나오면(18 이상 권장) 3번으로 간다.

## 2. 없으면 설치 (반드시 먼저 물어본다)

사용자에게 "Checkout을 쓰려면 Node.js(무료 프로그램)가 필요해요. 설치할까요?"라고 묻고, **좋다고 하면** 운영체제에 맞게 설치한다.

- **맥**
  - `brew --version`이 되면: `brew install node`
  - Homebrew가 없으면: 직접 설치하지 말고 https://nodejs.org 에서 LTS 버전 설치 파일을 받아 실행하라고 안내한다.
- **윈도우**
  - `winget --version`이 되면: `winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements`
  - winget이 없으면: https://nodejs.org 에서 LTS 설치 파일을 받으라고 안내한다.

설치 후 `node --version`으로 확인한다. 윈도우에서 명령을 못 찾으면 Claude Code를 다시 시작해야 새로 설치한 Node.js가 잡힌다고 안내한다.

## 3. Checkout 열기

`/checkout:open` 스킬과 같은 순서로 서버를 켜고 크롬에서 연다.
