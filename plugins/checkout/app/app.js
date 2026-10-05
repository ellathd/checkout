// Checkout 1.1 (cat.exe 디자인) 화면 로직
const issue = window.ISSUE;
const mag = document.getElementById("mag");
const view = document.getElementById("view");

// 화면 상태: 목차("cover") 또는 기사 읽는 중("reader")
const state = { view: "cover", article: 0, card: 0 };

// ---------- 읽은 기사 기억하기 (브라우저에 저장) ----------
const readKey = `loading-mag-read-${issue.no}`;
function loadRead() {
  try { return JSON.parse(localStorage.getItem(readKey)) || []; } catch { return []; }
}
function markRead(id) {
  const read = loadRead();
  if (read.includes(id)) return;
  read.push(id);
  try { localStorage.setItem(readKey, JSON.stringify(read)); } catch {}
}

// ---------- 화면 그리기 ----------
function render() {
  view.innerHTML = state.view === "cover" ? coverHTML() : readerHTML();
}

// 체크무늬 그리기: [바탕색, 굵은 줄, 가는 줄, 포인트 줄] 색으로 가로·세로 줄을 겹쳐요
const DEFAULT_PLAID = ["#6e1f2e", "#1b1b1a", "#d46a7a", "#f2f2f2"];
function plaid(colors, size) {
  const [base, a, b = a, c = b] = colors;
  const at = (r) => Math.round(size * r) + "px";
  const layer = (dir) => `repeating-linear-gradient(${dir}, ${a}aa 0 ${at(0.35)}, transparent ${at(0.35)} ${at(0.6)}, ${b}cc ${at(0.6)} ${at(0.68)}, transparent ${at(0.68)} ${at(0.85)}, ${c}88 ${at(0.85)} ${at(0.9)}, transparent ${at(0.9)} ${at(1)})`;
  return `background-color:${base};background-image:${layer("90deg")},${layer("0deg")}`;
}

// ---------- 1.1 디자인 조각들 ----------

// 픽셀 턱시도 고양이 (k 검정, w 흰색, y 눈, p 코, . 빈칸)
const CAT_PIXELS = [
  ".k..........k.",
  ".kk........kk.",
  ".kkk......kkk.",
  ".kkkkkkkkkkkk.",
  "kkkkkkkkkkkkkk",
  "kkyykkkkkkyykk",
  "kkykkkkkkkykkk",
  "kkkkkwwwwkkkkk",
  "kkkkwwppwwkkkk",
  ".kkkwwwwwwkkk.",
  "..kkkwwwwkkk..",
];
const CAT_COLORS = { k: "#1d1d1f", w: "#f6f6f2", y: "#c8d860", p: "#e89aa8" };          // 턱시도
const GINGER_COLORS = { k: "#f0a35e", w: "#fff1df", y: "#7fc96b", p: "#f29aa6" };      // 치즈 고양이
// 회색 고등어 고양이 (멍한 표정, 작업 중이면 이마에 로딩 표시)
// g 회색, d 줄무늬, l 밝은 주둥이, e 귀 안쪽, y 눈, k 눈동자, w 반짝임, p 코, m 입
const TABBY_PIXELS = [
  ".g............g.",
  ".gg..........gg.",
  ".gegg......ggeg.",
  ".geggggggggggeg.",
  "gggdgdgddgdgdggg",
  "ggggdggddggdgggg",
  "ggyyyyggggyyyygg",
  "gyykkwyggykkwyyg",
  "gyykkkyggykkkyyg",
  "ggyyyyggggyyyygg",
  "gggggllppllggggg",
  "ggggllllllllgggg",
  "gggglllmmlllgggg",
  ".gggllllllllggg.",
];
const TABBY_COLORS = { g: "#9b968d", d: "#5d5952", l: "#ddd8ce", e: "#e3b3ab", y: "#c3c06a", k: "#141414", w: "#ffffff", p: "#d4918a", m: "#7a3d3d" };

function pixelCat(size = 28, colors = CAT_COLORS, pixels = CAT_PIXELS) {
  const w = pixels[0].length, h = pixels.length;
  let rects = "";
  pixels.forEach((row, y) => [...row].forEach((ch, x) => {
    if (colors[ch]) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${colors[ch]}"/>`;
  }));
  return `<svg class="pixel-cat" width="${size}" height="${Math.round(size * h / w)}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
}

// XP 창 제목 표시줄: _ 미니 모드 / □ 매거진 / × 작은 창 닫기
function titleBar(title) {
  return `<div class="xp-title">
    ${pixelCat(16)}<span class="xp-title-text">${title}</span>
    <span class="xp-btns">
      <button class="xp-btn" data-mini aria-label="미니 모드" title="미니 모드">_</button>
      <button class="xp-btn" data-expand aria-label="매거진" title="매거진">□</button>
      <button class="xp-btn close" data-close aria-label="닫기" title="닫기">×</button>
    </span>
  </div>`;
}

// 맥 로딩 표시 같은 12개 막대 스피너
function spinnerSVG() {
  let bars = "";
  for (let i = 0; i < 12; i++) {
    bars += `<rect x="11" y="1" width="2" height="6" rx="1" fill="#fff" opacity="${(0.25 + (i / 11) * 0.75).toFixed(2)}" transform="rotate(${i * 30} 12 12)"/>`;
  }
  return `<svg viewBox="0 0 24 24" width="100%" height="100%">${bars}</svg>`;
}

// 편집기 아래쪽을 빈 줄 번호로 채우기 (넘치는 줄은 잘려요)
function emptyLines(from, to) {
  let s = "";
  for (let n = from; n <= to; n++) s += `<span class="ln">${n}</span><span></span>`;
  return s;
}

// 맨 아래 상태 표시줄: AI 한 줄 (작업 중엔 그 자리에 Calculating… 막대가 겹쳐요)
function statusBar() {
  if (!issue.aiLine) return `<div class="xp-status"><span class="pane grow">checkout.exe</span></div>`;
  return `<a class="xp-status" href="${issue.aiLine.source.url}" target="_blank" rel="noopener"><span class="pane">AI 한 줄</span><span class="pane grow">${issue.aiLine.text}</span></a>`;
}

// 머리기사를 코드 한 줄처럼
function codeLine(title) {
  title = title.replace(/-/g, "\u2011");
  return `<span class="kw">const</span> <span class="var">오늘</span> = <span class="str">"${title}"</span>;`;
}

// 카드: **중요한 단어**만 크게
function keywords(text) {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong class="key">$1</strong>');
}

function coverHTML() {
  const read = loadRead();
  const total = issue.articles.length;
  const readCount = issue.articles.filter((a) => read.includes(a.id)).length;
  const [lead, ...rest] = issue.articles;
  const stamp = (a) => read.includes(a.id) ? `<span class="stamp">✓ 읽음</span>` : "";

  // 나머지 기사는 XP 그룹 상자로
  const cols = rest.map((a, i) => `
    <button class="group ${read.includes(a.id) ? "read" : ""}" data-open="${i + 1}">
      <span class="legend">${String(i + 2).padStart(2, "0")} · ${a.source.name}</span>
      <span class="group-ttl">${a.title}</span>
      <span class="xp-button small">읽기</span>
      ${stamp(a)}
    </button>`).join("");

  const done = readCount === total ? `<p class="done-note">오늘 호 완독! 다음 호는 내일 나와요.</p>` : "";

  return `
    <section class="cover">
      ${titleBar(`checkout.exe — ${issue.section || "AI WORLD"}`)}
      <div class="xp-menu"><span>#${String(issue.no).padStart(3, "0")}</span><span>${shortDate(issue.date)}</span><span class="menu-right">${readCount}/${total} 읽음</span></div>
      <div class="xp-body">
        <button class="editor ${read.includes(lead.id) ? "read" : ""}" data-open="0">
          <span class="ln">1</span><span class="cmt">// ${issue.section || "AI WORLD"} · 머리기사</span>
          <span class="ln">2</span><span class="code">${codeLine(lead.title)}</span>
          <span class="ln">3</span><span class="code"><span class="fn">open</span>(<span class="var">오늘</span>); <span class="cmt">// 읽기 →</span></span>
          ${emptyLines(4, 16)}
          <span class="editor-cat" aria-hidden="true">${pixelCat(84, TABBY_COLORS, TABBY_PIXELS)}<span class="cat-spin">${spinnerSVG()}</span></span>
          ${stamp(lead)}
        </button>

        <div class="cols">${cols}</div>
        ${done}

        ${issue.checkPick ? `<a class="check-pick" href="${issue.checkPick.url}" target="_blank" rel="noopener">
          <span class="cp-fabric" style="${plaid(issue.checkPick.plaid || issue.plaid || DEFAULT_PLAID, 16)}"></span>
          <span class="cp-body"><span class="cp-label">오늘의 체크 셔츠 · DAY ${issue.checkPick.day}</span><b>${issue.checkPick.brand}</b> ${issue.checkPick.name}</span>
          <span class="cp-go">↗</span>
        </a>` : ""}
      </div>
      ${statusBar()}
    </section>`;
}

// 마지막 카드 아래: 출처 + 연결 버튼 (따로 정한 cta가 없으면 원문 보기)
function ctaHTML(a) {
  const cta = a.cta || { label: "원문 보기", url: a.source.url };
  return `<div class="card-cta">
    <p class="src">출처: ${a.source.name}</p>
    <a class="xp-button cta" href="${cta.url}" target="_blank" rel="noopener">${cta.label} ↗</a>
  </div>`;
}

function readerHTML() {
  const a = issue.articles[state.article];
  // 첫 장은 제목 카드, 그 뒤로 요약 카드들
  const total = a.cards.length + 1;
  const isTitle = state.card === 0;
  const c = a.cards[state.card - 1];
  const isLast = state.card === total - 1;
  const hasNextArticle = state.article < issue.articles.length - 1;

  const body = isTitle
    ? `<div class="editor big">
         <span class="ln">1</span><span class="cmt">// 기사 ${state.article + 1}/${issue.articles.length} · ${a.source.name}</span>
         <span class="ln">2</span><span class="code">${codeLine(a.title)}</span>
       </div>
       <p class="hint">다음 ▶ 를 눌러 읽어요</p>`
    : `<fieldset class="card-box">
         <legend>${c.label}</legend>
         <p class="card-text">${keywords(c.text)}</p>
         ${c.plaid ? `<div class="fabric" style="${plaid(c.plaid, 56)}"></div>` : ""}
         ${c.swatches ? `<div class="swatches">${c.swatches.map((s) => `<span style="background:${s}"></span>`).join("")}</div>` : ""}
       </fieldset>
       ${isLast ? ctaHTML(a) : ""}`;

  let footBtn = `<button class="xp-button" data-next>다음 ▶</button>`;
  if (isLast) {
    footBtn = hasNextArticle
      ? `<button class="xp-button" data-next-article>다음 기사 ▶</button>`
      : `<button class="xp-button" data-back>1면으로</button>`;
  }

  return `
    <section class="reader">
      ${titleBar(`${a.title.slice(0, 14)}… .txt`)}
      <div class="xp-menu"><button class="menu-btn" data-back>◀ 1면</button><span class="menu-right">${state.card + 1} / ${total}</span></div>
      <div class="xp-body reader-body">
        <div class="card">${body}</div>
        <div class="reader-foot">
          <button class="xp-button" data-prev ${state.card === 0 ? "disabled" : ""}>◀ 이전</button>
          ${footBtn}
        </div>
      </div>
      ${statusBar()}
    </section>`;
}


function shortDate(iso) {
  const d = new Date(iso);
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return `${days[d.getDay()]}, ${d.getMonth() + 1}.${d.getDate()}`;
}


// ---------- 이동 ----------
function openArticle(i) {
  state.view = "reader";
  state.article = i;
  state.card = 0;
  render();
}
function nextCard() {
  const total = issue.articles[state.article].cards.length + 1;
  if (state.card < total - 1) state.card++;
  // 마지막 카드까지 보면 읽음 처리
  if (state.card === total - 1) markRead(issue.articles[state.article].id);
  render();
}
function prevCard() {
  if (state.card > 0) state.card--;
  render();
}
function backToCover() {
  state.view = "cover";
  render();
}

// 버튼 클릭 처리 (mag 상자 하나에서 한꺼번에 받아요)
mag.addEventListener("click", (e) => {
  const t = e.target.closest("button");
  if (!t) return;
  if (t.dataset.open !== undefined) openArticle(Number(t.dataset.open));
  else if ("next" in t.dataset) nextCard();
  else if ("prev" in t.dataset) prevCard();
  else if ("back" in t.dataset) backToCover();
  else if ("nextArticle" in t.dataset) openArticle(state.article + 1);
  else if ("mini" in t.dataset) setMode("mini");
  else if ("expand" in t.dataset) setMode("mag");
  else if ("close" in t.dataset && pipWin) pipWin.close();
});

// 키보드 ← → 로도 넘기기
function onKey(e) {
  if (state.view !== "reader") return;
  if (e.key === "ArrowRight") nextCard();
  if (e.key === "ArrowLeft") prevCard();
  if (e.key === "Escape") backToCover();
}
document.addEventListener("keydown", onKey);

// ---------- 작은 창(PiP)으로 띄우기 ----------
const pipBtn = document.getElementById("pip-btn");
const pipMsg = document.getElementById("pip-msg");
const stage = document.getElementById("stage");

pipBtn.addEventListener("click", async () => {
  if (!("documentPictureInPicture" in window)) {
    pipMsg.textContent = "이 브라우저는 작은 창을 지원하지 않아요. 최신 크롬에서 열어주세요.";
    return;
  }
  let pip;
  try {
    pip = await documentPictureInPicture.requestWindow({ width: 340, height: 520 });
  } catch {
    pipMsg.textContent = "작은 창을 열지 못했어요. 크롬 브라우저에서 직접 열어주세요.";
    return;
  }

  // 이 페이지의 스타일(글꼴 포함)을 작은 창에도 복사
  document.querySelectorAll('link[rel="stylesheet"], style').forEach((el) => {
    pip.document.head.appendChild(el.cloneNode(true));
  });
  pip.document.title = "Checkout";
  pip.document.body.className = "pip-body";
  pip.document.body.appendChild(mag);
  pipWin = pip;
  if (mode === "mini") resizePip();
  pip.addEventListener("resize", () => {
    const small = pip.innerHeight < 200;
    if (small && mode === "mag") setMode("mini", false);
    if (!small && mode === "mini") setMode("mag", false);
    // 최대 크기보다 커지면 되돌리기 (크롬이 막으면 화면 쪽에서 최대 크기로 고정돼요)
    const w = Math.min(pip.innerWidth, MAX_SIZE.width);
    const h = Math.min(pip.innerHeight, MAX_SIZE.height);
    if (w < pip.innerWidth || h < pip.innerHeight) {
      try { pip.resizeTo(w + (pip.outerWidth - pip.innerWidth), h + (pip.outerHeight - pip.innerHeight)); } catch {}
    }
  });
  pip.document.addEventListener("keydown", onKey);
  pipMsg.textContent = "작은 창에서 읽는 중이에요.";
  startPolling(pip);

  // 작은 창을 닫으면 원래 자리로 돌려놓기
  pip.addEventListener("pagehide", () => {
    startPolling(window);
    pipWin = null;
    stage.appendChild(mag);
    pipMsg.textContent = "";
  });
});

// ---------- 모드: 매거진(기사 읽기) / 미니(작업 상태만) ----------
let mode = "mag";
let pipWin = null;
const SIZES = { mag: { width: 340, height: 520 }, mini: { width: 300, height: 84 } };
const MAX_SIZE = { width: 340, height: 520 };   // 창은 매거진 기본 크기보다 크게 늘리지 않아요

function setMode(next, resize = true) {
  mode = next;
  mag.classList.toggle("mini", mode === "mini");
  renderMini();
  if (resize) resizePip();
}

function resizePip() {
  if (!pipWin) return;
  try { pipWin.resizeTo(SIZES[mode].width, SIZES[mode].height); } catch {}
}

// 미니 모드 화면: 지금 작업 상태 하나만
const miniEl = document.getElementById("mini");
let miniState = "idle";   // idle | working | done | waiting
let miniTook = "";

function renderMini() {
  const elapsed = workStart ? formatClock(Date.now() - workStart) : "";
  const text = {
    idle: "대기 중 · 일을 시켜보세요",
    working: `Calculating… ${elapsed}`,
    done: `작업 끝!${miniTook ? " · " + miniTook : ""}`,
    waiting: "확인이 필요해요",
  }[miniState];
  const action = miniState === "done" ? `<button class="xp-button small" data-ok>OK</button>`
    : miniState === "waiting" ? `<button class="xp-button small" data-ok>가보기</button>` : "";
  miniEl.className = `mini-view ${miniState}`;
  miniEl.innerHTML = `
    ${titleBar("checkout.exe")}
    <div class="mini-row">
      ${miniState === "working" ? `<span class="spinner" aria-hidden="true"></span>` : pixelCat(26)}
      <span class="mini-text">${text}</span>
      ${action}
    </div>
    ${miniState === "working" ? `<div class="xp-bar mini-bar"><i></i></div>` : ""}`;
}

function formatClock(ms) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

// ---------- Claude Code 작업 상태 (훅이 남긴 status.json 읽기) ----------
const statusEl = document.getElementById("status");
let lastAt = null;      // 마지막으로 본 상태의 시각
// 테스트할 땐 주소에 ?status=status-test 를 붙여서 진짜 상태 파일과 섞이지 않게 해요
const statusParam = new URLSearchParams(location.search).get("status") || "status";
const STATUS_FILE = /^[a-z0-9-]+$/.test(statusParam) ? statusParam : "status";
const QUIET_MS = 20000;      // 이보다 짧게 끝난 작업은
const AUTO_HIDE_MS = 5000;   // 알림을 이만큼만 보여주고 저절로 닫아요
let autoHide = null;

function clearDone() {
  if (miniState !== "done") return;
  miniState = "idle";
  statusEl.innerHTML = "";
  setTitle("");
  renderMini();
}
let workStart = null;   // 작업을 시작한 시각

function showStatus(s, isFirst) {
  if (s.state === "working") {
    workStart = s.at;
    miniState = "working";
    mag.classList.add("working");
    statusEl.innerHTML = `<div class="xp-progress"><span class="spinner" aria-hidden="true"></span><span class="calc">Calculating…</span><div class="xp-bar"><i></i></div></div>`;
    setTitle("⏳ 작업 중");
  } else if (s.state === "done") {
    mag.classList.remove("working");
    // 창을 막 연 순간의 지난 "끝남"은 보여주지 않아요
    if (isFirst) { statusEl.innerHTML = ""; return; }
    const isShort = workStart && s.at - workStart < QUIET_MS;
    const took = workStart ? formatTook(s.at - workStart) : "";
    miniState = "done";
    miniTook = took;
    statusEl.innerHTML = dialogHTML("cat.exe", "claude 작업이 끝났어요", took ? `걸린 시간 ${took}` : "돌아갈 시간이에요", "OK");
    setTitle("✓ 끝! 돌아가요");
    workStart = null;
    // 짧게 끝난 작업은 알림을 잠깐만 보여주고 저절로 닫아요
    if (autoHide) mag.ownerDocument.defaultView.clearTimeout(autoHide);
    if (isShort) autoHide = mag.ownerDocument.defaultView.setTimeout(clearDone, AUTO_HIDE_MS);
  } else if (s.state === "waiting") {
    mag.classList.remove("working");
    if (isFirst) return;
    miniState = "waiting";
    statusEl.innerHTML = dialogHTML("claude.exe", "claude가 확인을 기다려요", "허락이나 답이 필요해요", "가보기");
    setTitle("⏸ 확인 필요");
  }
}

// XP 대화상자 (OK를 누르면 Claude로 돌아가고, ×는 닫기만)
function dialogHTML(title, msg, sub, okLabel, goesBack = true) {
  return `<div class="dialog-wrap">
    <div class="dialog" role="alertdialog" aria-label="${msg}">
      <div class="xp-title"><span class="xp-title-text">${title}</span>
        <span class="xp-btns"><button class="xp-btn close" data-dismiss aria-label="닫기">×</button></span></div>
      <div class="dialog-body">${pixelCat(64)}<p class="dialog-msg">${msg}<span>${sub}</span></p></div>
      <div class="dialog-foot"><button class="xp-button" data-dismiss ${goesBack ? "data-return" : ""}>${okLabel}</button></div>
    </div>
  </div>`;
}

function formatTook(ms) {
  const sec = Math.max(1, Math.round(ms / 1000));
  return sec < 60 ? `${sec}초` : `${Math.floor(sec / 60)}분 ${sec % 60}초`;
}

function setTitle(prefix) {
  const t = prefix ? `${prefix} · Checkout` : "Checkout";
  document.title = t;
  if (window.documentPictureInPicture?.window) documentPictureInPicture.window.document.title = t;
}

let failCount = 0;      // 연속으로 서버에 못 닿은 횟수

async function pollStatus() {
  try {
    const res = await fetch(`${STATUS_FILE}.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return;
    const s = await res.json();
    if (failCount >= 3) statusEl.innerHTML = "";   // 다시 연결되면 경고 지우기
    failCount = 0;
    if (miniState === "working") renderMini();   // 작업 시간 올리기
    if (s.at === lastAt) return;
    const isFirst = lastAt === null;
    lastAt = s.at;
    showStatus(s, isFirst);
    renderMini();
  } catch {
    // 서버가 꺼져 있으면 알림을 받을 수 없다고 알려줘요
    failCount++;
    if (failCount === 3) {
      statusEl.innerHTML = dialogHTML("checkout.exe", "서버 연결이 끊겼어요", "작업 알림을 못 받아요", "닫기", false);
    }
  }
}

// 상태 확인은 "보이는 창"에서 돌려요. 숨은 탭은 크롬이 타이머를 느리게 돌려서 알림이 늦어져요
let pollTimer = null;
function startPolling(win) {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = win.setInterval(pollStatus, 1500);
}

// "OK"를 누르면 작업하던 앱(Claude 앱, VS Code, 터미널…)으로 돌아가요
// 로컬 서버(server.js)에게 부탁해요. 작은 창 안에서 앱 주소를 열면 크롬이 작은 창을 닫아버려서요
async function goBackToClaude() {
  try { await fetch("/api/return", { method: "POST" }); } catch {}
}

// 알림 띠를 누르면 닫기 (작업 끝·확인 필요 띠는 Claude 앱도 열기)
statusEl.addEventListener("click", (e) => {
  if (e.target.closest("[data-return]")) goBackToClaude();
  if (e.target.closest("[data-dismiss]")) {
    statusEl.innerHTML = "";
    setTitle("");
    if (miniState !== "working") { miniState = "idle"; renderMini(); }
  }
});

// 미니 화면에서 "작업 끝"을 누르면 확인한 걸로 치고 대기 상태로
miniEl.addEventListener("click", (e) => {
  if (!e.target.closest("[data-ok]")) return;
  if (miniState === "done" || miniState === "waiting") {
    goBackToClaude();
    miniState = "idle";
    statusEl.innerHTML = "";
    setTitle("");
    renderMini();
  }
});

renderMini();
pollStatus();
startPolling(window);

render();
