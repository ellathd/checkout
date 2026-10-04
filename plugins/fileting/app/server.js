// 파일팅 서버
// 크롬은 다운로드·데스크탑 폴더를 직접 못 열게 막아서, 파일 읽기와 휴지통 보내기는 이 서버가 대신해요.
// 내 컴퓨터(127.0.0.1)에서만 열리고, 이 서버가 준 페이지만 쓸 수 있도록 토큰으로 잠가둬요.
const http = require("http");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { platform, exists, runClaude } = require("./platform");

const PORT = 5190;
const APP = "fileting";
// 잠금 열쇠(토큰)는 파일에 저장해서, 서버를 다시 켜도 이미 열려 있던 창이 계속 동작하게 해요
function loadToken() {
  const dir = path.join(os.homedir(), ".fileting");
  const file = path.join(dir, "token");
  try {
    const saved = fs.readFileSync(file, "utf8").trim();
    if (/^[0-9a-f]{32}$/.test(saved)) return saved;
  } catch {}
  const token = crypto.randomBytes(16).toString("hex");
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, token, { mode: 0o600 });
  } catch {}
  return token;
}
const TOKEN = loadToken();

// 폴더 위치는 컴퓨터마다 달라서 서버를 켤 때 채워요 (윈도우는 OneDrive로 옮겨진 경우도 있어요)
const ROOTS = {
  downloads: { name: "다운로드", dir: "" },
  desktop: { name: "데스크탑", dir: "" },
  documents: { name: "문서", dir: "" },
};
async function loadRoots() {
  // 테스트할 때는 진짜 폴더 대신 연습용 폴더만 보여줘요: node server.js --test-root <폴더>
  const testRoot = process.argv.indexOf("--test-root");
  if (testRoot > -1) {
    for (const k of Object.keys(ROOTS)) delete ROOTS[k];
    ROOTS.downloads = { name: "연습용", dir: path.resolve(process.argv[testRoot + 1]) };
    return;
  }
  const dirs = await platform.roots();
  for (const k of Object.keys(ROOTS)) ROOTS[k].dir = dirs[k];
}
const FAKE_AI = process.argv.includes("--fake-ai"); // 테스트용: 진짜 AI 대신 가짜 답을 줘요
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "Library"]);
const MAX_FILES = 3000;
const MAX_DEPTH = 5;

// ---------- 보조 ----------
function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 1e5) req.destroy();
    });
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); } catch (e) { reject(e); }
    });
  });
}
// 고른 폴더 바깥으로 나가는 경로(../ 같은 것)는 막아요
function resolveInRoot(rootId, rel) {
  const root = ROOTS[rootId];
  if (!root || typeof rel !== "string") return null;
  const abs = path.resolve(root.dir, rel);
  if (!abs.startsWith(root.dir + path.sep)) return null;
  return abs;
}

// ---------- 폴더 훑기 ----------
async function scan(rootDir) {
  const out = [];
  async function walk(dir, depth) {
    let entries;
    try { entries = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (out.length >= MAX_FILES) return;
      if (platform.skip(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name) || e.name.endsWith(".app") || depth >= MAX_DEPTH) continue;
        await walk(full, depth + 1);
      } else if (e.isFile()) {
        try {
          const st = await fsp.stat(full);
          out.push({ name: e.name, rel: path.relative(rootDir, full), size: st.size, mtime: st.mtimeMs });
        } catch {}
      }
    }
  }
  await walk(rootDir, 0);
  return out;
}

// ---------- AI 설명 ----------
// 사용자 컴퓨터의 claude 명령을 불러서, 사용자 본인의 Claude 구독으로 설명을 받아요.
// 파일 내용은 절대 보내지 않고 이름·크기·날짜만 보내요.
const AI_PROMPT = `너는 컴퓨터의 다운로드·데스크탑 폴더 정리를 돕는다.
사용자가 준 파일들은 이름만으로 종류를 알기 어려운 파일이다. 파일 내용은 볼 수 없고 이름, 크기, 마지막 수정 시기만 안다.
각 파일이 무엇일 가능성이 높은지 추측해서, 버릴지 정하는 데 도움이 되는 설명을 한국어 해요체 한두 문장으로 써라.
확실하지 않으면 "~인 것 같아요"처럼 추측임을 드러내라. 개인 문서일 수 있으면 열어보라고 권해라.
반드시 JSON 배열만 출력하고 다른 말은 하지 마라:
[{"id":"받은 id 그대로","icon":"이모지 1개","tag":"짧은 종류 이름(8자 이내)","verdict":"trash 또는 check 또는 keep","text":"설명(80자 이내)"}]

파일 목록:
`;

async function findClaude() {
  for (const p of platform.claudePaths()) if (await exists(p)) return p;
  return null;
}

const SETTINGS_FILE = path.join(os.tmpdir(), "fileting-claude-settings.json");
fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ disableAllHooks: true }));

let aiStatus = null; // { engine, ready, hint }
async function checkAI() {
  if (FAKE_AI) return (aiStatus = { engine: "claude", ready: true });
  if (aiStatus?.ready) return aiStatus;
  const claude = await findClaude();
  if (!claude) return (aiStatus = { engine: null, ready: false, hint: "AI 설명을 쓰려면 Claude Code가 필요해요." });
  try {
    const out = JSON.parse(await runClaude(claude, ["auth", "status"], "", 10000));
    if (out.loggedIn) return (aiStatus = { engine: "claude", ready: true, cmd: claude });
  } catch {}
  return (aiStatus = { engine: "claude", ready: false, hint: "터미널에서 claude 를 실행해 로그인하면 AI 설명이 켜져요." });
}

// 한 번에 하나씩만 물어봐요 (사용자 사용량을 아끼려고)
let aiQueue = Promise.resolve();
function explain(files) {
  const job = aiQueue.then(() => askClaude(files));
  aiQueue = job.catch(() => {});
  return job;
}
async function askClaude(files) {
  if (FAKE_AI) {
    await new Promise((r) => setTimeout(r, 1500));
    return files.map((f) => ({ id: f.id, icon: "🧪", tag: "가짜 AI", verdict: "check", text: `${f.name}은(는) 테스트용 가짜 설명이에요.` }));
  }
  const status = await checkAI();
  if (!status.ready) throw new Error(status.hint);
  const list = files.map((f) => ({ id: f.id, name: f.name, size: f.size, age: f.age }));
  // 지시문과 파일 목록은 표준입력으로 넘기고, 명령줄에는 단순한 값만 둬요 (윈도우 따옴표 문제 방지)
  const out = await runClaude(status.cmd, [
    "-p",
    "--model", "haiku",
    "--system-prompt", "Follow the user instructions exactly.",
    "--output-format", "json",
    "--tools", "",
    "--no-session-persistence",
    "--disable-slash-commands",
    "--strict-mcp-config",
    // 사용자 훅(작업 끝 알림 등)이 이 질문 때문에 울리지 않게 꺼요
    "--settings", SETTINGS_FILE,
  ], AI_PROMPT + JSON.stringify(list), 120000);
  const result = JSON.parse(out);
  if (result.is_error) {
    aiStatus = null; // 로그인이 풀렸을 수 있으니 다음에 다시 확인해요
    throw new Error(result.result || "AI가 답하지 못했어요");
  }
  const text = String(result.result || "");
  const arr = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1));
  const ids = new Set(files.map((f) => f.id));
  return arr
    .filter((a) => a && ids.has(a.id))
    .map((a) => ({
      id: a.id,
      icon: String(a.icon || "🤖").slice(0, 4),
      tag: String(a.tag || "AI 추측").slice(0, 12),
      verdict: ["trash", "check", "keep"].includes(a.verdict) ? a.verdict : "check",
      text: String(a.text || "").slice(0, 160),
    }));
}

// ---------- 요청 처리 ----------
const PAGE = path.join(__dirname, "index.html");

async function handle(req, res) {
  // 다른 웹사이트가 주소를 바꿔치기해서 들어오는 것을 막아요
  const host = req.headers.host || "";
  if (host !== `localhost:${PORT}` && host !== `127.0.0.1:${PORT}`) return send(res, 403, { error: "forbidden" });

  const url = new URL(req.url, `http://${host}`);

  // 이미 켜져 있는 게 파일팅인지 확인하는 용도예요 (비밀 정보 없음)
  if (url.pathname === "/health") return send(res, 200, { app: APP });

  if (url.pathname === "/" && req.method === "GET") {
    const html = (await fsp.readFile(PAGE, "utf8")).replace("__TIDY_TOKEN__", TOKEN).replace("__PLATFORM__", platform.name);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    return res.end(html);
  }

  if (!url.pathname.startsWith("/api/")) return send(res, 404, { error: "not found" });
  if (req.headers["x-tidy-token"] !== TOKEN) return send(res, 403, { error: "forbidden" });

  if (url.pathname === "/api/roots") {
    return send(res, 200, Object.entries(ROOTS).map(([id, r]) => ({ id, name: r.name })));
  }

  if (url.pathname === "/api/scan") {
    const root = ROOTS[url.searchParams.get("root")];
    if (!root) return send(res, 400, { error: "모르는 폴더예요" });
    // 실제로 한 번 읽어봐야 맥이 "접근 허용할까요?"를 물어봐요 (access()로는 안 물어봐요)
    try {
      await fsp.readdir(root.dir);
    } catch {
      return send(res, 403, { error: platform.blockedHint(root.name) });
    }
    return send(res, 200, { files: await scan(root.dir) });
  }

  if (url.pathname === "/api/ai") {
    const { engine, ready, hint } = await checkAI();
    return send(res, 200, { engine, ready, hint });
  }

  if (req.method !== "POST") return send(res, 405, { error: "method" });
  const body = await readBody(req);

  if (url.pathname === "/api/trash") {
    const abs = resolveInRoot(body.root, body.rel);
    if (!abs || !(await exists(abs))) return send(res, 404, { error: "파일이 없어요" });
    try {
      return send(res, 200, { trashed: await platform.trash(abs) });
    } catch (e) {
      return send(res, 500, { error: e.message });
    }
  }

  // 열어보기: 기본 앱으로 열거나, Finder/탐색기에서 그 파일 위치를 보여줘요
  if (url.pathname === "/api/open") {
    const abs = resolveInRoot(body.root, body.rel);
    if (!abs || !(await exists(abs))) return send(res, 404, { error: "파일이 없어요" });
    try {
      await platform.open(abs, !!body.reveal);
      return send(res, 200, { ok: true });
    } catch {
      return send(res, 500, { error: "열지 못했어요" });
    }
  }

  if (url.pathname === "/api/details") {
    const abs = resolveInRoot(body.root, body.rel);
    if (!abs || !(await exists(abs))) return send(res, 404, { error: "파일이 없어요" });
    return send(res, 200, await platform.details(abs));
  }

  if (url.pathname === "/api/explain") {
    const files = Array.isArray(body.files) ? body.files.slice(0, 20) : [];
    if (!files.length) return send(res, 400, { error: "물어볼 파일이 없어요" });
    try {
      return send(res, 200, { results: await explain(files) });
    } catch (e) {
      return send(res, 503, { error: e.message });
    }
  }

  if (url.pathname === "/api/restore") {
    const abs = resolveInRoot(body.root, body.rel);
    const trashed = typeof body.trashed === "string" ? body.trashed : "";
    if (!abs || !trashed || !platform.isTrashed(trashed)) return send(res, 400, { error: "이 파일은 되돌릴 수 없어요" });
    try {
      const dest = await platform.restore(trashed, abs);
      return send(res, 200, { rel: path.relative(ROOTS[body.root].dir, dest), name: path.basename(dest) });
    } catch (e) {
      return send(res, 500, { error: "휴지통에서 꺼내지 못했어요. 이미 비웠을 수 있어요." });
    }
  }

  send(res, 404, { error: "not found" });
}

// 서버 켜기. 포트를 이미 누가 쓰고 있으면 실패로 알려줘요.
async function start() {
  if (!platform) throw new Error("파일팅은 아직 맥과 윈도우에서만 돼요.");
  await loadRoots();
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) =>
      handle(req, res).catch((e) => send(res, 500, { error: e.message }))
    );
    server.once("error", reject);
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

module.exports = { start, PORT, APP, platform };

// node server.js 로 바로 실행할 때
if (require.main === module) {
  start().then(() => console.log(`파일팅: http://localhost:${PORT}`));
}
