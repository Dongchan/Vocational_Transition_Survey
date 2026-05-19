---
name: vts-qa-checklist
description: "Vocational_Transition_Survey 법령 시각화 웹페이지의 QA 체크리스트. Playwright MCP로 점진적 검증 수행. qa-validator는 검증 시작 전 반드시 이 스킬을 읽을 것."
---

# vts-qa-checklist

법령 시각화 웹페이지의 검증 체크리스트와 수행 방법. qa-validator가 사용한다.

전제: `vts-project-context` 스킬을 읽어 신뢰성 원칙·노출 자료 원칙을 숙지했다는 가정.

## 1. 검증 모드 (점진적)

| 모드 | 시점 | 검증 항목 |
|---|---|---|
| **partial** | scaffold-engineer 완료 직후 | 정적 골격 (§2.1~§2.3) |
| **full** | viz-engineer 완료 후 | 전체 (§2 전부) |
| **regression** | 수정 PR 후 | 영향 범위만 |

## 2. 체크리스트

### 2.1 파일·구조 (모드: partial, full)
- [ ] `Voc_edu_history/index.html` 존재
- [ ] `Voc_edu_history/css/style.css` 존재
- [ ] `Voc_edu_history/js/data-loader.js` 존재
- [ ] `Voc_edu_history/js/app.js` 존재 (full 모드만)
- [ ] 외부 CDN import 0건 (`<link>`·`<script src=>` 의 origin 모두 상대 경로)
- [ ] 절대 경로(`/`로 시작) 0건

검증 방법:
```bash
# 파일 존재
ls Voc_edu_history/{index.html,css/style.css,js/data-loader.js,js/app.js}
# 외부 도메인 import 검색
grep -E "https?://" Voc_edu_history/{index.html,css/style.css,js/*.js}
# 절대 경로 검색 (data-, fetch 등)
grep -nE "(src|href|fetch)\\(?\\s*['\"]/" Voc_edu_history/{index.html,js/*.js}
```

### 2.2 라이트 모드 단일 테마 (모드: partial, full)
- [ ] CSS에 `prefers-color-scheme` 분기 0건
- [ ] CSS·JS에 `.dark`, `[data-theme=`, `dark-mode` 등 다크 모드 흔적 0건

검증:
```bash
grep -nE "prefers-color-scheme|\\.dark|data-theme|dark-mode" Voc_edu_history/css/style.css Voc_edu_history/js/*.js
```

### 2.3 폰트·접근성 (모드: partial, full)
- [ ] CSS 본문 폰트 15px 이상 (`body`, `p`, `li`, `td` 등)
- [ ] 헤더 18~24px
- [ ] 마디 도형 클릭 영역 최소 16px (도형 크기 또는 SVG `<circle r>`·`<polygon>` 크기 검사)
- [ ] 트랙·마디·이벤트에 `<title>` 자식 또는 `aria-label` 부여

검증(Playwright):
```js
// 본문 폰트
const bodyFs = await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
assert(bodyFs >= 15, `body font-size ${bodyFs}px < 15px`);
// 모든 .law-track 의 <title> 존재
const missingTitles = await page.evaluate(() => {
  const tracks = document.querySelectorAll('.law-track');
  return Array.from(tracks).filter(t => !t.querySelector('title')).length;
});
assert(missingTitles === 0, `${missingTitles} tracks missing <title>`);
```

### 2.4 데이터 ↔ DOM 무결성 (모드: full)
- [ ] `laws.json` 18개 → `.law-track` 18개 렌더
- [ ] `relations.json` 15개 → `.relation-edge` 15개 렌더
- [ ] `policy_events.json` 29개 → `.event-marker` 29개 렌더

검증:
```js
const counts = await page.evaluate(() => ({
  tracks: document.querySelectorAll('.law-track').length,
  edges: document.querySelectorAll('.relation-edge').length,
  events: document.querySelectorAll('.event-marker').length,
}));
assert(counts.tracks === 18, `tracks ${counts.tracks} ≠ 18`);
assert(counts.edges === 15, `edges ${counts.edges} ≠ 15`);
assert(counts.events === 29, `events ${counts.events} ≠ 29`);
```

### 2.5 트랙 정렬 규칙 (모드: full)
- [ ] 트랙이 카테고리 그룹별로 묶여 있음 (DOM 순서가 카테고리 순서대로)
- [ ] 각 카테고리 내에서 `enacted_year` 오름차순

검증:
```js
const order = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('.law-track')).map(t => ({
    id: t.dataset.lawId,
    cat: t.dataset.category,
    year: parseInt(t.dataset.enactedYear, 10)
  }));
});
// 카테고리 그룹이 깨지지 않는지, 그룹 안에서 연도가 오름차순인지 검사
```

### 2.6 인터랙션 (모드: full)
- [ ] 트랙 막대 호버 시 툴팁 표시
- [ ] 마디 호버 시 툴팁 표시 (다른 내용)
- [ ] 트랙 막대 클릭 시 사이드 패널 펼침
- [ ] 마디 클릭 시 사이드 패널에 milestone 정보
- [ ] 이벤트 마커 클릭 시 사이드 패널에 이벤트 정보 (객관 사실)
- [ ] 사이드 패널 닫기 가능

검증 (각각 1회씩 시도):
```js
await page.hover('.law-track[data-law-id="industrial_education_act"]');
// 툴팁 visible 확인
await page.click('.law-track[data-law-id="industrial_education_act"]');
// 사이드 패널 visible 확인 + 콘텐츠 검사
```

### 2.7 신뢰성·노출 자료 (모드: full, 최우선)
- [ ] 사이드 패널·툴팁 어디에도 `interpretation` 필드 또는 "의미 견해" 텍스트 노출되지 않음
- [ ] `### 의미 견해 초안`·`## 분석 제안` 문구 어디에도 없음
- [ ] `policy_events[].file` 필드(원본 파일명) 노출 없음

검증:
```js
// app.js·data-loader.js 정적 grep
grep -nE "interpretation|의미 견해|분석 제안" Voc_edu_history/js/*.js
// 모든 이벤트 마커 클릭해 사이드 패널 콘텐츠 수집 후 금지 단어 검색
for (const marker of allMarkers) {
  await page.click(marker);
  const panelText = await page.locator('#side-panel').innerText();
  assert(!/(의미 견해|interpretation|분석 제안)/.test(panelText), `forbidden text in panel for ${marker}`);
}
```

본 항목은 한 번이라도 위반 시 즉시 **블로커 FAIL**. 다른 항목 통과 무관.

### 2.8 필터 (모드: full)
- [ ] 카테고리 5개 체크박스 + 관계 유형 4개 체크박스
- [ ] 카테고리 체크 해제 시 해당 카테고리 트랙·마커 hidden
- [ ] 관계 유형 체크 해제 시 해당 엣지 hidden
- [ ] 모두 체크 시 원상 복귀

### 2.9 콘솔 에러 (모드: full)
- [ ] 페이지 로드 후 console error 0건
- [ ] 모든 인터랙션 후 console error 0건

검증:
```js
const errors = await page.evaluate(() => window.__qaErrors || []);
// 또는 mcp__plugin_playwright_playwright__browser_console_messages 호출
```

### 2.10 점수 표기 (모드: full)
- [ ] 사이드 패널의 점수 표기가 `X / 5` 형식 (1~5 척도)
- [ ] `X / 7` 등 7점 척도 흔적 없음

검증:
```bash
grep -nE "/\\s*7" Voc_edu_history/js/app.js   # 7점 척도 흔적
```

## 3. 보고서 형식

```
[QA Report] mode=full, ts=2026-MM-DD HH:MM

PASS (n/m):
  - 2.1 파일·구조
  - 2.2 라이트 모드
  - ...

FAIL:
  - 2.7 신뢰성·노출 자료
    - 경로: app.js:142
    - 현상: `summary` 다음 줄에서 `interpretation` 필드 참조 발견
    - 수정 요청 대상: viz-engineer
    - 권장 조치: `if (ev.interpretation)` 블록 제거

BLOCKER: 1건 (2.7) → 전체 FAIL
```

## 4. Playwright 호출 가이드

페이지 로컬 서빙 필요. python으로 간단 HTTP 서버 띄운 후 검증:
```bash
# 백그라운드로 서버 띄우기 (Bash)
python -m http.server 8080 --directory D:/AI_Work/Claude/Vocational_Transition_Survey/Voc_edu_history
# 그 다음 Playwright
mcp__plugin_playwright_playwright__browser_navigate { url: "http://localhost:8080/" }
mcp__plugin_playwright_playwright__browser_evaluate { function: "() => ({...})" }
mcp__plugin_playwright_playwright__browser_console_messages { onlyErrors: true }
```

## 5. 실패 시 처리

- 단일 항목 FAIL: 해당 에이전트(scaffold/viz)에 SendMessage로 구체 수정 요청
- 블로커 FAIL (2.7): 오케스트레이터에 즉시 보고 + 해당 에이전트 회수 요청
- Playwright 호출 자체 실패: 정적 grep 검증으로 가능한 항목만 진행, 한계를 보고서에 명시
