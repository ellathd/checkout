// Checkout 서버를 뒤에서 켜두기 (맥·윈도우·리눅스 공통)
// 이미 켜져 있으면 아무것도 안 해요.
// 사용법: node start-server.js <상태 파일 폴더> <포트>
const http = require("http");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const DATA = process.argv[2];
const PORT = Number(process.argv[3]) || 5180;
fs.mkdirSync(DATA, { recursive: true });

const req = http.get({ host: "127.0.0.1", port: PORT, path: "/api/ping", timeout: 800 }, (res) => {
  let body = "";
  res.on("data", (c) => (body += c));
  res.on("end", () => { if (!body.includes("checkout")) start(); });
});
req.on("timeout", () => req.destroy());
req.on("error", start);

let started = false;
function start() {
  if (started) return;
  started = true;
  const log = fs.openSync(path.join(DATA, "server.log"), "a");
  // detached + unref: 이 스크립트(훅)가 끝나도 서버는 계속 살아 있어요
  const child = spawn(process.execPath, [path.join(__dirname, "..", "app", "server.js"), DATA, String(PORT)], {
    detached: true,
    stdio: ["ignore", log, log],
    windowsHide: true,
  });
  child.unref();
}
