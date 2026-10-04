#!/usr/bin/env node
// npx fileting 으로 파일팅을 켜요.
// 서버를 켜고 크롬에서 열어줘요. 이미 켜져 있으면 크롬만 열어요.
//   --no-open   크롬은 열지 않고 서버만 켜요
//   --detach    서버를 뒤에서 켜두고 바로 끝나요 (플러그인이 켤 때). 기록은 ~/.fileting/server.log
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { start, PORT, APP, platform } = require("../server.js");

const URL = `http://localhost:${PORT}`;
const shouldOpen = !process.argv.includes("--no-open");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function openBrowser() {
  if (!shouldOpen) return;
  // 작은 창(Document Picture-in-Picture)은 크롬에서만 돼서 크롬을 먼저 시도해요
  platform.openBrowser(URL);
}

async function alreadyRunning() {
  try {
    const res = await fetch(`${URL}/health`);
    return (await res.json()).app === APP;
  } catch {
    return false;
  }
}

async function main() {
  if (!platform) {
    console.log("파일팅은 아직 맥과 윈도우에서만 돼요. 🙏");
    process.exit(1);
  }
  if (!platform.canTrash()) {
    console.log("⚠️  이 맥에는 휴지통 명령(/usr/bin/trash)이 없어요. macOS 15 이상에서 버리기가 돼요.");
  }

  if (process.argv.includes("--detach")) return detach();

  try {
    await start();
  } catch (err) {
    if (err.code === "EADDRINUSE" && (await alreadyRunning())) {
      console.log(`파일팅이 이미 켜져 있어요: ${URL}`);
      openBrowser();
      return;
    }
    if (err.code === "EADDRINUSE") {
      console.log(`${PORT}번 포트를 다른 프로그램이 쓰고 있어서 파일팅을 켤 수 없어요.`);
      process.exit(1);
    }
    throw err;
  }

  console.log(`💛 파일팅이 켜졌어요: ${URL}`);
  console.log("   끄려면 Ctrl+C를 누르세요.");
  openBrowser();
}

// 서버를 따로 떼어서 켜두고, 켜질 때까지 기다렸다가 크롬을 열어요
async function detach() {
  if (await alreadyRunning()) {
    console.log(`파일팅이 이미 켜져 있어요: ${URL}`);
    return openBrowser();
  }
  const dir = path.join(os.homedir(), ".fileting");
  fs.mkdirSync(dir, { recursive: true });
  const logFile = path.join(dir, "server.log");
  const log = fs.openSync(logFile, "a");
  spawn(process.execPath, [__filename, "--no-open"], {
    detached: true,
    stdio: ["ignore", log, log],
    windowsHide: true,
  }).unref();

  // 윈도우는 폴더 위치를 찾느라 조금 더 걸릴 수 있어서 넉넉히 10초까지 기다려요
  for (let i = 0; i < 50; i++) {
    await wait(200);
    if (await alreadyRunning()) {
      console.log(`💛 파일팅이 켜졌어요: ${URL}`);
      return openBrowser();
    }
  }
  console.log(`파일팅을 켜지 못했어요. 기록을 확인해주세요: ${logFile}`);
  process.exit(1);
}

main();
