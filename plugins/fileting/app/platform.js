// 맥과 윈도우에서 다르게 해야 하는 일을 여기에 모아뒀어요.
// 폴더 위치 찾기 · 휴지통 보내기/꺼내기 · 파일 열기 · 브라우저 열기 · claude 명령 찾기
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const os = require("os");
const { execFile, spawn } = require("child_process");

const HOME = os.homedir();
const IS_WIN = process.platform === "win32";
const IS_MAC = process.platform === "darwin";

async function exists(p) {
  try { await fsp.lstat(p); return true; } catch { return false; }
}
async function freePath(p) {
  const { dir, name, ext } = path.parse(p);
  for (let i = 1; ; i++) {
    const candidate = i === 1 ? p : path.join(dir, `${name} (${i})${ext}`);
    if (!(await exists(candidate))) return candidate;
  }
}
// 주소에서 사이트 이름만 꺼내요 (주소 안의 토큰 같은 건 밖으로 안 나가게)
function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
}
function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 1e6, windowsHide: true, ...opts }, (err, stdout, stderr) =>
      err ? reject(Object.assign(err, { stdout, stderr })) : resolve(stdout)
    );
  });
}

// ============================== 맥 ==============================
const TRASH_DIR = path.join(HOME, ".Trash");

const mac = {
  name: "mac",
  explorer: "Finder",

  async roots() {
    return {
      downloads: path.join(HOME, "Downloads"),
      desktop: path.join(HOME, "Desktop"),
      documents: path.join(HOME, "Documents"),
    };
  },

  skip(name) {
    return name.startsWith(".");
  },

  blockedHint(label) {
    return `맥이 ${label} 폴더를 막고 있어요. 시스템 설정 → 개인정보 보호 및 보안 → 파일 및 폴더에서, 파일팅을 켠 앱(Claude 또는 터미널)의 '${label} 폴더'를 켜주세요.`;
  },

  canTrash() {
    return fs.existsSync("/usr/bin/trash");
  },

  // 맥에 기본으로 있는 trash 명령(macOS 15+). 어디로 옮겼는지 알려줘서 되돌리기가 돼요.
  async trash(abs) {
    let out;
    try {
      out = await run("/usr/bin/trash", ["-v", "-s", abs]);
    } catch (err) {
      out = (err.stdout || "") + (err.stderr || "");
      if (!/to "/.test(out)) throw new Error((err.stderr || err.message).trim());
    }
    const m = /to "(.+)"\s*$/m.exec(out);
    if (m && m[1].startsWith(TRASH_DIR + path.sep)) return m[1];
    throw new Error("휴지통 위치를 알 수 없어요");
  },

  isTrashed(p) {
    return path.resolve(p).startsWith(TRASH_DIR + path.sep);
  },

  async restore(trashed, original) {
    const dest = await freePath(original);
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    await fsp.rename(trashed, dest);
    return dest;
  },

  open(abs, reveal) {
    return run("/usr/bin/open", reveal ? ["-R", abs] : [abs]);
  },

  // 맥이 파일마다 적어두는 정보(Spotlight): 어디서 받았는지, 언제 받았는지, 마지막으로 언제 열었는지
  async details(abs) {
    const xml = await run("/usr/bin/mdls", [
      "-plist", "-",
      "-name", "kMDItemWhereFroms", "-name", "kMDItemLastUsedDate",
      "-name", "kMDItemDateAdded", "-name", "kMDItemKind",
      abs,
    ], { timeout: 5000 }).catch(() => "");
    const unescape = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    const date = (key) => {
      const m = new RegExp("<key>" + key + "</key>\\s*<date>([^<]+)</date>").exec(xml);
      return m ? Date.parse(m[1]) : null;
    };
    const froms = /<key>kMDItemWhereFroms<\/key>\s*<array>([\s\S]*?)<\/array>/.exec(xml);
    const urls = froms ? [...froms[1].matchAll(/<string>([^<]*)<\/string>/g)].map((m) => unescape(m[1])) : [];
    const kind = /<key>kMDItemKind<\/key>\s*<string>([^<]*)<\/string>/.exec(xml);
    return {
      hosts: [...new Set(urls.map(hostOf).filter(Boolean))],
      added: date("kMDItemDateAdded"),
      lastUsed: date("kMDItemLastUsedDate"),
      lastUsedKnown: !!xml, // 맥은 기록이 없으면 "받은 뒤 안 열었다"는 뜻이에요
      kind: kind ? unescape(kind[1]) : null,
    };
  },

  openBrowser(url) {
    // 작은 창(Document Picture-in-Picture)은 크롬에서만 돼서 크롬을 먼저 시도해요
    execFile("open", ["-a", "Google Chrome", url], (err) => {
      if (err) execFile("open", [url]);
    });
  },

  claudePaths() {
    return [
      path.join(HOME, ".local/bin/claude"),
      "/opt/homebrew/bin/claude",
      "/usr/local/bin/claude",
      path.join(HOME, ".claude/local/claude"),
    ];
  },

  codexPaths() {
    return [
      "/opt/homebrew/bin/codex",
      "/usr/local/bin/codex",
      path.join(HOME, ".local/bin/codex"),
      path.join(HOME, ".npm-global/bin/codex"),
    ];
  },
};

// ============================== 윈도우 ==============================
// 휴지통·폴더 위치는 PowerShell로 처리해요. 경로는 따옴표 문제를 피하려고 환경변수로 넘겨요.
function ps(script, env = {}) {
  const full = "[Console]::OutputEncoding=[Text.Encoding]::UTF8;$ErrorActionPreference='Stop';" + script;
  return run("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", full], {
    env: { ...process.env, ...env },
    timeout: 30000,
  }).then((s) => s.trim());
}

const win = {
  name: "windows",
  explorer: "탐색기",

  // 데스크탑·문서는 OneDrive로 옮겨져 있는 경우가 많아서, 윈도우가 알려주는 진짜 위치를 써요
  async roots() {
    const fallback = {
      downloads: path.join(HOME, "Downloads"),
      desktop: path.join(HOME, "Desktop"),
      documents: path.join(HOME, "Documents"),
    };
    try {
      const out = await ps(
        "$k='HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders';" +
          "$d=(Get-ItemProperty -Path $k).'{374DE290-123F-4565-9164-39C4925E467B}';" +
          "@{downloads=[Environment]::ExpandEnvironmentVariables([string]$d);" +
          "desktop=[Environment]::GetFolderPath('Desktop');" +
          "documents=[Environment]::GetFolderPath('MyDocuments')} | ConvertTo-Json -Compress"
      );
      const found = JSON.parse(out);
      for (const k of Object.keys(fallback)) if (found[k]) fallback[k] = found[k];
    } catch {}
    return fallback;
  },

  skip(name) {
    const n = name.toLowerCase();
    return name.startsWith(".") || name.startsWith("~$") || n === "desktop.ini" || n === "thumbs.db";
  },

  blockedHint(label) {
    return `${label} 폴더를 읽지 못했어요. OneDrive 폴더라면 OneDrive가 켜져 있는지 확인해주세요.`;
  },

  canTrash() {
    return true;
  },

  // 휴지통으로 보낸 뒤, 휴지통 안에서 그 파일의 진짜 위치($R...)를 찾아서 돌려줘요 (되돌리기용)
  async trash(abs) {
    const out = await ps(
      "Add-Type -AssemblyName Microsoft.VisualBasic;" +
        "$p=$env:FT_PATH;" +
        "if(Test-Path -LiteralPath $p -PathType Container){[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($p,'OnlyErrorDialogs','SendToRecycleBin')}" +
        "else{[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($p,'OnlyErrorDialogs','SendToRecycleBin')};" +
        "$dir=[IO.Path]::GetDirectoryName($p);$name=[IO.Path]::GetFileName($p);" +
        "$base=[IO.Path]::GetFileNameWithoutExtension($p);$ext=[IO.Path]::GetExtension($p);" +
        "$rb=(New-Object -ComObject Shell.Application).NameSpace(10);" +
        "$hit=$rb.Items() | Where-Object {" +
        "  $_.ExtendedProperty('System.Recycle.DeletedFrom') -eq $dir -and" +
        "  [IO.Path]::GetExtension($_.Path) -eq $ext -and ($_.Name -eq $name -or $_.Name -eq $base)" +
        "} | Sort-Object { $_.ExtendedProperty('System.Recycle.DateDeleted') } -Descending | Select-Object -First 1;" +
        "if($hit){$hit.Path}",
      { FT_PATH: abs }
    ).catch((err) => {
      throw new Error("휴지통으로 보내지 못했어요. 파일이 열려 있거나, 윈도우 보안(랜섬웨어 보호)이 막았을 수 있어요.");
    });
    if (await exists(abs)) throw new Error("휴지통으로 보내지 못했어요");
    return out || null; // 못 찾으면 버리기는 됐지만 되돌리기는 안 돼요
  },

  isTrashed(p) {
    return /\\\$Recycle\.Bin\\/i.test(p);
  },

  // 원래 자리가 비어 있으면 윈도우의 "복원"을 그대로 쓰고, 같은 이름이 생겼으면 옆에 (2)를 붙여서 꺼내요
  async restore(trashed, original) {
    const dest = (await exists(original)) ? await freePath(original) : original;
    await ps(
      "$rb=(New-Object -ComObject Shell.Application).NameSpace(10);" +
        "$it=$rb.Items() | Where-Object { $_.Path -eq $env:FT_TRASHED } | Select-Object -First 1;" +
        "if(-not $it){ throw 'not found' }" +
        "if($env:FT_DEST -eq $env:FT_ORIGINAL){ $it.InvokeVerb('undelete') }" +
        "else {" +
        "  Move-Item -LiteralPath $env:FT_TRASHED -Destination $env:FT_DEST;" +
        "  $info=[IO.Path]::Combine([IO.Path]::GetDirectoryName($env:FT_TRASHED), '$I' + [IO.Path]::GetFileName($env:FT_TRASHED).Substring(2));" +
        "  Remove-Item -LiteralPath $info -ErrorAction SilentlyContinue" +
        "}",
      { FT_TRASHED: trashed, FT_DEST: dest, FT_ORIGINAL: original }
    );
    for (let i = 0; i < 20 && !(await exists(dest)); i++) await new Promise((r) => setTimeout(r, 100));
    if (!(await exists(dest))) throw new Error("not restored");
    return dest;
  },

  // 탐색기는 성공해도 종료 코드 1을 줄 때가 있어서 오류는 무시해요
  open(abs, reveal) {
    return new Promise((resolve) => {
      const arg = reveal ? `/select,"${abs}"` : `"${abs}"`;
      execFile("explorer.exe", [arg], { windowsVerbatimArguments: true, windowsHide: true }, () => resolve());
    });
  },

  // 인터넷에서 받은 파일에 붙는 Zone.Identifier 꼬리표에서 받은 곳을 읽어요
  async details(abs) {
    let zone = "";
    try { zone = await fsp.readFile(abs + ":Zone.Identifier", "utf8"); } catch {}
    const get = (k) => (new RegExp("^" + k + "=(.+)", "m").exec(zone) || [])[1];
    let added = null;
    try { added = (await fsp.stat(abs)).birthtimeMs || null; } catch {}
    return {
      hosts: [...new Set([get("ReferrerUrl"), get("HostUrl")].map((u) => u && hostOf(u.trim())).filter(Boolean))],
      added,
      lastUsed: null,
      lastUsedKnown: false, // 윈도우는 "마지막으로 연 날"을 믿을 만하게 기록하지 않아요
      kind: null,
    };
  },

  openBrowser(url) {
    const candidates = [
      process.env.ProgramFiles && path.join(process.env.ProgramFiles, "Google/Chrome/Application/chrome.exe"),
      process.env["ProgramFiles(x86)"] && path.join(process.env["ProgramFiles(x86)"], "Google/Chrome/Application/chrome.exe"),
      process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe"),
    ].filter(Boolean);
    const chrome = candidates.find((p) => fs.existsSync(p));
    if (chrome) return spawn(chrome, [url], { detached: true, stdio: "ignore" }).unref();
    execFile("cmd.exe", ["/c", "start", '""', url], { windowsVerbatimArguments: true, windowsHide: true });
  },

  claudePaths() {
    return [
      path.join(HOME, ".local/bin/claude.exe"),
      process.env.APPDATA && path.join(process.env.APPDATA, "npm/claude.cmd"),
      process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Programs/claude/claude.exe"),
    ].filter(Boolean);
  },

  codexPaths() {
    return [
      process.env.APPDATA && path.join(process.env.APPDATA, "npm/codex.cmd"),
      path.join(HOME, ".local/bin/codex.exe"),
    ].filter(Boolean);
  },
};

const platform = IS_WIN ? win : IS_MAC ? mac : null;

// 정해진 위치에 없으면 PATH(터미널이 명령을 찾는 폴더 목록)에서도 찾아봐요
async function findCommand(name, candidates) {
  for (const c of candidates) if (await exists(c)) return c;
  const exts = IS_WIN ? [".cmd", ".exe", ""] : [""];
  for (const dir of (process.env.PATH || "").split(path.delimiter)) {
    for (const ext of exts) {
      const full = path.join(dir, name + ext);
      if (dir && (await exists(full))) return full;
    }
  }
  return null;
}

// claude·codex 명령 실행: 질문은 표준입력으로 넘겨요 (윈도우 .cmd 파일도 따옴표 문제 없이 돌아가게)
function runCli(cmd, args, input, timeout) {
  const useShell = IS_WIN && /\.cmd$/i.test(cmd);
  const quote = (a) => (useShell && /[\s"]/.test(a) ? `"${a.replace(/"/g, '""')}"` : a);
  return new Promise((resolve, reject) => {
    const child = execFile(
      useShell ? `"${cmd}"` : cmd,
      args.map(quote),
      { cwd: os.tmpdir(), timeout, maxBuffer: 1e6, windowsHide: true, shell: useShell },
      (err, stdout) => (err && !stdout ? reject(err) : resolve(stdout))
    );
    child.stdin.end(input || "");
  });
}

module.exports = { platform, IS_WIN, IS_MAC, exists, runCli, findCommand };
