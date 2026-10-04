// 요일별 특집호 샘플 — 월요일 패션호
window.ISSUE = {
  no: 3,
  date: "2026-10-05",
  section: "FASHION WEEK",
  // 이번 호 체크무늬 색 [바탕, 굵은 줄, 가는 줄, 포인트 줄]
  plaid: ["#7a5236", "#3a2216", "#e6cf9e", "#6e1f2e"],
  // 1면 아래 "오늘의 AI 한 줄"
  aiLine: {
    text: "오픈AI, 알아서 일하는 에이전트 Dots 공개",
    source: { name: "TechCrunch", url: "https://techcrunch.com/2026/09/29/openai-launches-dots-its-bubbly-agentic-avatar/" }
  },
  // 매일 나가는 코너: 오늘의 체크 셔츠
  checkPick: {
    day: 1,
    brand: "유니클로",
    name: "플란넬 체크 셔츠 (긴팔·레귤러 칼라)",
    url: "https://www.uniqlo.com/kr/ko/products/E462401-000/00",
    comment: "품 넉넉하게 한 치수 크게 입으면 누구나 OK"
  },
  articles: [
    {
      id: "2026-10-05-1",
      title: "체크 셔츠, 드디어 유행이 너를 따라왔다",
      cta: { label: "가을 체크 셔츠 구경하기", url: "https://www.musinsa.com/search/goods?keyword=%EC%B2%B4%ED%81%AC%EC%85%94%EC%B8%A0" },
      short: "체크",
      source: { name: "얼루어 코리아", url: "https://www.allurekorea.com/2026/09/01/%EC%A7%91%EC%97%90-%EC%9E%88%EB%8A%94-%EC%B2%B4%ED%81%AC-%EB%A7%90%EA%B3%A0-%EC%98%AC%EA%B0%80%EC%9D%84%EC%97%90%EB%8A%94-%EC%9D%B4-%EC%B2%B4%ED%81%AC-%EC%85%94%EC%B8%A0%EA%B0%80-%EC%9C%A0" },
      cards: [
        { label: "무슨 일?", text: "올가을엔 쨍한 여름 체크 말고 브라운·카키·네이비·버건디 같은 **가을 체크** 셔츠가 뜬대요. 간격 넓은 타탄이나 버펄로 체크요.", plaid: ["#4a3220", "#6e1f2e", "#1f2a44", "#c9a46a"] },
        { label: "왜 중요해?", text: "단추 다 잠그고 바지에 넣던 그 셔츠, 흰 티 위에 **걸치기**만 해도 요즘 스타일이 된대요. 품은 넉넉한 게 좋아요." },
        { label: "한 줄 정리", text: "유행은 돌고 돌아 결국 **개발자**에게 왔다." }
      ]
    },
    {
      id: "2026-10-05-2",
      title: "후드티는 그대로, 색 하나만 더하기",
      short: "포인트 색",
      source: { name: "Rath & Co.", url: "https://www.rathandco.com/tastehunter/mens-fallwinter-2026-trend-report" },
      cards: [
        { label: "무슨 일?", text: "올 가을·겨울은 검정·회색·갈색 기본색에 **포인트 색** 하나를 얹는 게 흐름이에요. 핑크, 버건디, 머스터드, 코발트가 꼽혔어요.", swatches: ["#e8a3b5", "#7a1f33", "#d4a017", "#1f4fbf"] },
        { label: "왜 중요해?", text: "옷을 새로 다 살 필요 없어요. 늘 입는 회색 후드에 **양말이나 목도리** 하나만 바꿔도 달라 보여요." },
        { label: "한 줄 정리", text: "코드에 문법 강조 넣듯, 옷에도 **색 하나**만." }
      ]
    },
    {
      id: "2026-10-05-3",
      title: "올겨울 니트는 스키장 스타일로",
      short: "니트",
      source: { name: "보그 코리아", url: "https://www.vogue.co.kr/2026/09/08/2026-%EA%B0%80%EC%9D%84-%EA%B2%A8%EC%9A%B8-%EB%82%A8%EC%84%B1%EB%B3%B5-%ED%8A%B8%EB%A0%8C%EB%93%9C-12/" },
      cards: [
        { label: "무슨 일?", text: "이번 시즌 런웨이에 눈꽃·줄무늬가 들어간 **스키 스웨터**가 대거 올라왔어요." },
        { label: "왜 중요해?", text: "니트는 후드티만큼 편한데, 화상 회의 화면에선 훨씬 **신경 쓴 사람**처럼 보여요." },
        { label: "한 줄 정리", text: "편한 옷을 포기하지 않고도 **멋**낼 수 있다." }
      ]
    }
  ]
};
