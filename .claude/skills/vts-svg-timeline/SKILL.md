---
name: vts-svg-timeline
description: "Vocational_Transition_Survey 법령 시각화 웹페이지의 SVG 타임라인 렌더링 패턴(시간축 스케일, 트랙 막대, 마디 도형, 베지어 엣지, 호버/클릭/필터). viz-engineer가 app.js 작성 전 반드시 읽을 것."
---

# vts-svg-timeline

법령 시각화 웹페이지의 SVG 렌더링·인터랙션 구현 패턴. viz-engineer는 app.js 작성 전 반드시 이 문서를 읽는다.

전제: `vts-project-context` 스킬을 먼저 읽고 데이터 스키마·색상 팔레트·신뢰성 원칙을 숙지했다는 가정.

## 1. SVG 좌표계와 시간축 스케일

### 1.1 좌표 변환
- x: 1960년 → 0, 2026년 → `width`. 선형 보간.
- 권장 캔버스: 전체 width 1400~1800px, 좌측 라벨 영역 240px, 우측 여백 40px.

```js
const TIME_START = 1960;
const TIME_END = 2026;
const LEFT_LABEL_W = 240;
const RIGHT_PAD = 40;

function yearToX(year, width) {
  const usableW = width - LEFT_LABEL_W - RIGHT_PAD;
  return LEFT_LABEL_W + ((year - TIME_START) / (TIME_END - TIME_START)) * usableW;
}

function dateToX(dateStr, width) {
  // "1963-09-19" 또는 "1996" 모두 처리
  const parts = dateStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parts[1] ? parseInt(parts[1], 10) - 1 : 0;
  const d = parts[2] ? parseInt(parts[2], 10) - 1 : 0;
  const decimalYear = y + (m * 30 + d) / 365;
  return yearToX(decimalYear, width);
}
```

### 1.2 시간축 눈금
- 10년 단위 굵은 그리드 라인 + 5년 단위 보조 라인 + 년 라벨
- 라벨 폰트 15px, `text-anchor="middle"`

### 1.3 트랙 행 높이
- 트랙당 행 높이 44~52px (마디 도형이 18~20px이므로 상하 여백 충분히)
- 트랙 막대 자체 높이 14~18px (중앙선 배치)
- 카테고리 그룹 사이에 16px 여백 + 카테고리 라벨 헤더 행

## 2. 트랙 정렬 (사용자 확정 규칙)

카테고리 그룹 → 그룹 내 제정연도순. 의사 코드:

```js
const CATEGORY_ORDER = [
  "중등직업교육",
  "직업훈련",
  "고등 및 평생직업교육",
  "진로교육",
  "직무능력 및 자격체계"
];

function buildTrackLayout(laws) {
  const rows = [];
  for (const cat of CATEGORY_ORDER) {
    rows.push({ kind: "header", category: cat });
    const inCat = laws
      .filter(l => l.category === cat)
      .sort((a, b) => (a.enacted_year - b.enacted_year) || a.name_kr.localeCompare(b.name_kr, 'ko'));
    for (const law of inCat) rows.push({ kind: "law", law });
  }
  return rows;
}
```

각 row에 y 좌표를 부여(헤더 행 28px, 법령 행 48px 등).

## 3. 법령 트랙 막대 렌더

```js
function renderTrack(svg, law, yCenter, width) {
  const x1 = dateToX(law.enacted, width);
  const x2 = law.abolished ? dateToX(law.abolished, width) : yearToX(TIME_END, width);
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', x1);
  rect.setAttribute('y', yCenter - 8);
  rect.setAttribute('width', Math.max(2, x2 - x1));
  rect.setAttribute('height', 16);
  rect.setAttribute('rx', 4);
  rect.setAttribute('fill', `var(--cat-${categoryKey(law.category)})`);
  rect.setAttribute('data-law-id', law.id);
  rect.classList.add('law-track');
  // ARIA/타이틀
  const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
  title.textContent = `${law.name_kr} (${law.enacted_year}~${law.abolished ? law.abolished.split('-')[0] : '현행'})`;
  rect.appendChild(title);
  svg.appendChild(rect);
}
```

카테고리 한글 → CSS 변수 키 매핑 헬퍼:
```js
function categoryKey(cat) {
  return {
    "중등직업교육": "secondary-voc",
    "직업훈련": "vocational-training",
    "고등 및 평생직업교육": "higher-lifelong",
    "진로교육": "career",
    "직무능력 및 자격체계": "qualification"
  }[cat];
}
```

## 4. 마디 도형

`milestone.type` → 도형 매핑:
- `enacted` → `●` `<circle r="8">`
- `major_amended`, `renamed`, `revised` → `▲` `<polygon>` (정삼각형, 한 변 16px)
- `abolished`, `branched` → `◆` `<polygon>` (마름모, 대각선 16px)

도형 헬퍼 (정삼각형·마름모는 점좌표 계산):
```js
function trianglePoints(cx, cy, size) {
  const h = size * Math.sqrt(3) / 2;
  return `${cx},${cy - h*2/3} ${cx - size/2},${cy + h/3} ${cx + size/2},${cy + h/3}`;
}

function diamondPoints(cx, cy, size) {
  return `${cx},${cy - size/2} ${cx + size/2},${cy} ${cx},${cy + size/2} ${cx - size/2},${cy}`;
}

function starPoints(cx, cy, outerR) {
  const innerR = outerR * 0.5;
  const points = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    points.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return points.join(' ');
}
```

## 5. 정책 이벤트 마커 (`★`)

각 이벤트는 `law_ids[]` 첫 항목의 트랙 위에 배치(여러 법령 매핑 시 첫 번째). `law_ids[]`가 빈 경우 별도 "이벤트 전용 행"을 카테고리별로 추가하거나 최상단 별도 트랙 행에 배치.

```js
for (const ev of events) {
  const lawId = ev.law_ids[0];
  if (!lawId) continue; // 또는 별도 trackOrphan 행에 배치
  const yCenter = trackYByLawId.get(lawId);
  const cx = dateToX(ev.date, width);
  const star = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  star.setAttribute('points', starPoints(cx, yCenter, 9));
  star.setAttribute('fill', `var(--cat-${categoryKey(ev.category)})`);
  star.setAttribute('stroke', '#fff');
  star.setAttribute('stroke-width', '1.5');
  star.classList.add('event-marker');
  star.dataset.eventIndex = String(eventIndex);
  svg.appendChild(star);
}
```

## 6. 관계 엣지 (베지어 곡선)

`from` 법령의 마지막 마디 위치 → `to` 법령의 첫 마디 위치를 연결.

```js
function renderEdge(svg, fromXY, toXY, type) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const dx = toXY.x - fromXY.x;
  const c1x = fromXY.x + dx * 0.3;
  const c2x = fromXY.x + dx * 0.7;
  const d = `M ${fromXY.x} ${fromXY.y} C ${c1x} ${fromXY.y}, ${c2x} ${toXY.y}, ${toXY.x} ${toXY.y}`;
  path.setAttribute('d', d);
  path.setAttribute('stroke', `var(--edge-${type})`);
  path.setAttribute('stroke-width', '1.5');
  path.setAttribute('stroke-dasharray', '6 4');
  path.setAttribute('fill', 'none');
  path.classList.add('relation-edge', `relation-${type}`);
  // 화살표 마커는 선택 (svg <defs><marker>)
  svg.appendChild(path);
}
```

엣지 시작점: `from` 법령의 `enacted` 또는 관계 `year` 시점의 트랙 막대 위. 끝점: `to` 법령의 `enacted` 또는 `year` 시점.

## 7. 인터랙션

### 7.1 호버 툴팁
- 마우스 진입 시 `<div id="tooltip">`을 절대 위치로 표시
- 트랙 막대 hover: 법령명 + 기간
- 마디 hover: milestone label + date
- 이벤트 마커 hover: 이벤트 title + year

```js
const tooltip = document.getElementById('tooltip');
function showTooltip(html, x, y) {
  tooltip.innerHTML = html;
  tooltip.style.left = (x + 12) + 'px';
  tooltip.style.top = (y + 12) + 'px';
  tooltip.style.display = 'block';
}
function hideTooltip() { tooltip.style.display = 'none'; }
```

### 7.2 클릭 → 사이드 패널
- 트랙 막대 클릭: 법령 상세
- 마디 클릭: 해당 milestone + 소속 법령 상세
- 이벤트 마커 클릭: 이벤트 상세 (객관 정보만 — `summary`까지. `interpretation` 없음)
- 사이드 패널 `<aside id="side-panel">`에 innerHTML 렌더

**사이드 패널 콘텐츠 예시 (법령)**:
```html
<h2>국가기술자격법</h2>
<p class="meta">제정 1973-12-31 · 카테고리 직무능력 및 자격체계 · 법령 ID 001234</p>
<h3>마디</h3>
<ul>
  <li>1973-12-31 — 국가기술자격법 제정 (법률 제2672호)</li>
  <li>...</li>
</ul>
<p class="source">출처: MCP search_law(2026-05-18)</p>
```

**사이드 패널 콘텐츠 예시 (정책 이벤트)**:
```html
<h2>국가기술자격제도 도입과 국가기술자격체제의 형성</h2>
<p class="meta">1973-12-31 · 박정희 정부 · 카테고리 직무능력 및 자격체계</p>
<dl>
  <dt>전환 정도</dt><dd>4 / 5</dd>
  <dt>정책 영향력</dt><dd>5 / 5</dd>
</dl>
<h3>개요</h3>
<p>「국가기술자격법」 제정은 ...</p>
```

LLM 해석·견해 텍스트 일체 미노출. (관련: `vts-project-context` §6)

### 7.3 필터 토글
- 카테고리 5개 + 관계 유형 4개 체크박스
- 토글 시 `.law-track[data-category="..."]`, `.event-marker[data-category="..."]`, `.relation-edge.relation-{type}` 요소의 `display`를 none/block 전환

## 8. 접근성

- 모든 trackable 요소에 `<title>` 자식 (스크린리더용 기본 라벨)
- `tabindex="0"` 으로 키보드 포커스 가능하게
- 마디 도형은 클릭 영역 최소 16px (이미 위 §3·§4에서 보장됨)

## 9. 성능 메모

데이터가 작아(법령 18·엣지 15·이벤트 29) 가상화 불필요. DocumentFragment에 한 번에 append 정도면 충분.

## 10. 안티 패턴 (피할 것)

- D3.js·Chart.js 등 외부 라이브러리 import (사양 위반)
- `innerHTML`으로 SVG 문자열 통째로 주입 (XSS 우려·디버깅 어려움). `createElementNS` 사용
- 절대 좌표 하드코딩 — 반드시 width 기반 계산
- 사이드 패널·툴팁에 LLM 해석문 노출
- `console.log` 다수 잔존 (배포 코드 정리)
