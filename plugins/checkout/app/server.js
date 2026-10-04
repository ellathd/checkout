// Checkout 로컬 서버 (플러그인용)
// - 매거진 화면 파일을 보여줘요
// - 훅이 남긴 상태 파일(status.json)을 보여줘요
// - "돌아가요"를 누르면 맥에게 Claude 앱을 앞으로 가져오라고 시켜요
// 내 컴퓨터(127.0.0.1)에서만 접속돼요.
// 사용법: node server.js <상태 파일 폴더> <포트>
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const APP = __dirname;
const DATA = process.argv[2] || path.join(require("os").homedir(), ".checkout");
const PORT = Number(process.argv[3]) || 5180;
// "OK"를 누르면 작업하던 앱으로 돌아가요
// 훅이 status.json에 남긴 정보(app, entry, term)로 어느 앱인지 골라요
function returnCommand() {
  let st = {};
  try { st = JSON.parse(fs.readFileSync(path.join(DATA, "status.json"), "utf8")); } catch {}
  const app = /^[A-Za-z0-9.-]+$/.test(st.app || "") ? st.app : "";
  const where = `${st.entry || ""} ${st.term || ""}`.toLowerCase();
  const isVSCode = where.includes("vscode");
  const isDesktop = where.includes("desktop");

  if (process.platform === "darwin") {
    if (app) return ["open", ["-b", app]];                         // 맥: 실행한 앱 그대로 (VS Code, 터미널, Claude 앱…)
    if (isVSCode) return ["open", ["-b", "com.microsoft.VSCode"]];
    return ["open", ["-a", "Claude"]];
  }
  if (process.platform === "win32") {
    if (isVSCode) return ["cmd", ["/c", "start", "", "vscode://"]];   // 윈도우 VS Code
    if (isDesktop) return ["cmd", ["/c", "start", "", "claude://"]];  // 윈도우 Claude 앱
    return null;                                                     // 터미널은 앞으로 가져올 방법이 없어요 (알림만 닫혀요)
  }
  return isDesktop ? ["xdg-open", ["claude://"]] : null;
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".png": "image/png",
};

function send(res, file) {
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");

  // 서버가 Checkout인지 확인용
  if (url.pathname === "/api/ping") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("checkout");
    return;
  }

  // 돌아가요: Claude 앱 열기 (OS마다 방법이 달라요)
  if (url.pathname === "/api/return" && req.method === "POST") {
    const command = returnCommand();
    if (!command) { res.writeHead(204); res.end(); return; }
    const [cmd, args] = command;
    execFile(cmd, args, { windowsHide: true }, (err) => {
      res.writeHead(err ? 500 : 204);
      res.end();
    });
    return;
  }

  // 상태 파일은 플러그인 저장 공간에서
  if (url.pathname === "/status.json") {
    send(res, path.join(DATA, "status.json"));
    return;
  }

  // 오늘의 호: 저장 공간에 새 호가 있으면 그걸, 없으면 플러그인에 들어 있는 호를
  if (url.pathname === "/data/issue.js") {
    const custom = path.join(DATA, "issue.js");
    send(res, fs.existsSync(custom) ? custom : path.join(APP, "data", "issue.js"));
    return;
  }

  // 나머지는 화면 파일
  let file = path.normalize(path.join(APP, decodeURIComponent(url.pathname)));
  if (!file.startsWith(APP)) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (url.pathname.endsWith("/")) file = path.join(file, "index.html");
  send(res, file);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Checkout: http://localhost:${PORT}`);
});
