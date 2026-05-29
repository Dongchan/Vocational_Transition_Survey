/**
 * app.js
 *
 * 한국 직업교육훈련 정책사 — 법령 흐름 시각화의 메인 렌더링·인터랙션 모듈.
 * 외부 라이브러리 의존성 0. ES Module. Vanilla DOM (createElementNS) 사용.
 *
 * 책임 범위:
 *   1) 시간축(1945~2026) 좌표 변환 헬퍼
 *   2) 카테고리 그룹 → 제정연도순 트랙 정렬
 *   3) 법령 트랙 막대 렌더
 *   4) 법령 마디(milestone) 도형 렌더 (제정 ●, 개정 ▲, 폐지·분기 ◆)
 *   5) 정책 이벤트 마커 ★ 렌더 (29건)
 *   6) 관계 엣지 베지어 곡선 렌더 (15건)
 *   7) 호버 툴팁 / 클릭 사이드 패널 / ESC 닫기 인터랙션
 *   8) 사이드 패널 콘텐츠 (객관 정보만, 신뢰성 원칙 §6 준수)
 *   9) 카테고리·관계 유형 필터 (체크박스 change)
 *   10) 점수 표기 1~5 척도 고정
 *
 * 신뢰성 원칙(vts-project-context §6) 준수:
 *   - interpretation 필드 미사용
 *   - "### 의미 견해 초안", "## 분석 제안" 텍스트 미노출
 *   - policy_events[].file (디버그용) 미노출
 */

import {
  loadAllData,
  getLawById,
  eventsByLawId,
  indexRelations,
} from "./data-loader.js?v=20260520b";
import { setupExportButtons } from "./export.js?v=20260529g";

/* ============================================================
 * 1. 상수 및 헬퍼
 * ============================================================ */

const SVG_NS = "http://www.w3.org/2000/svg";

// 이벤트 라벨 폭 정밀 측정용 Canvas 2D 컨텍스트 (모듈 1회 생성).
// 휴리스틱 추정 대신 measureText 로 실제 픽셀 폭을 얻어 레인 패킹 겹침을 0으로 만든다.
// .event-label 폰트와 동일 문자열을 측정 직전 지정.
const _mctx = document.createElement("canvas").getContext("2d");
const EVENT_LABEL_FONT = '13px "Noto Sans KR", "Malgun Gothic", sans-serif';

/**
 * 이벤트 라벨 텍스트의 실제 렌더 폭(px). 폰트 로드 후(main의 document.fonts.ready) 호출해야 정확.
 */
function measureLabelWidth(text) {
  _mctx.font = EVENT_LABEL_FONT;
  return _mctx.measureText(String(text)).width;
}

const TIME_START = 1955;  // 프레임 시작. 이전(교육법 1949)은 좌측 경계로 클램프하고 축에 "◁ 1949" 표식.
const TIME_END = 2026;
const LEFT_LABEL_W = 300;
const RIGHT_PAD = 100;

// 좌측 라벨 두 줄 분할 임계 글자 수 (한글 15px 폰트, 영역 폭 ~276px)
const LABEL_WRAP_THRESHOLD = 18;
// 두 줄 표기 시 자연스러운 분할점 우선순위 (앞에 있을수록 우선).
// 1행 끝에 포함되는 접속어. 매칭 시 head가 너무 길어지면(>= threshold) 거부하고 공백 fallback 사용.
const LABEL_BREAK_HINTS = [
  " 및 ",
  " 또는 ",
];

// 전체 SVG 폭 — 1645px 뷰포트에서도 가로 스크롤이 명확히 발동하도록 확대
const SVG_WIDTH = 1900;

// 트랙 레이아웃 상수
const HEADER_ROW_H = 30;     // 카테고리 헤더 행 높이
const LAW_ROW_H = 40;        // 법령 트랙 행 높이
const GROUP_GAP = 28;        // 카테고리 그룹 사이 여백 (회전 라벨이 위 카테고리로 솟는 충돌 완화)
const TOP_AXIS_H = 60;       // 상단 시간축 영역 높이
const BAR_HEIGHT = 16;       // 트랙 막대 높이

// 수평 이벤트 라벨 + 리더라인 레인 패킹 상수
const LABEL_GAP = 6;         // 가로 박스 좌우 여유 (겹침 판정 마진)
const LANE_H = 24;           // 레인 1단 피치. 실측 라벨 박스 높이 19px(13px 폰트 + line-box leading) + 분리 여백 5px. QA 게이트: 인접 레인 세로 침범 0.
const LANE_TOP_PAD = 4;      // 트랙 위 reserved 영역 상단 추가 여백
const LEADER_MIN = 4;        // 마커 ★ 정수리 ~ 최하단 라벨 사이 최소 리더 길이
const STAR_TOP_OFFSET = 23;  // 마커 중심(cy) → ★ 정수리: 14px 띄움 + 외접 r9 = 23
const LABEL_BASELINE_PAD = 3; // 레인 하단선 ~ 텍스트 baseline 보정

// 카테고리 순서 (사용자 확정)
const CATEGORY_ORDER = [
  "중등직업교육",
  "직업훈련",
  "고등 및 평생직업교육",
  "진로교육",
  "직무능력 및 자격체계",
];

// 카테고리 한글 → CSS 변수 키 매핑
const CATEGORY_KEY = {
  "중등직업교육": "secondary-voc",
  "직업훈련": "vocational-training",
  "고등 및 평생직업교육": "higher-lifelong",
  "진로교육": "career",
  "직무능력 및 자격체계": "qualification",
};

// 관계 유형 한글 라벨
const RELATION_LABEL = {
  succession: "계승",
  basis: "기반",
  reference: "연관",
  branch: "분기",
};

/**
 * 연도(소수 포함 가능) → SVG x 좌표
 */
function yearToX(year, width) {
  // 시간축 시작 이전 연도(교육법 1949 등)·소수 연도는 좌측 경계로 클램프
  if (year < TIME_START) year = TIME_START;
  const usableW = width - LEFT_LABEL_W - RIGHT_PAD;
  return LEFT_LABEL_W + ((year - TIME_START) / (TIME_END - TIME_START)) * usableW;
}

/**
 * 날짜 문자열("YYYY-MM-DD" 또는 "YYYY-MM" 또는 "YYYY") → SVG x 좌표
 */
function dateToX(dateStr, width) {
  if (!dateStr) return yearToX(TIME_END, width);
  const s = String(dateStr).trim();
  const parts = s.split("-");
  const y = parseInt(parts[0], 10);
  if (Number.isNaN(y)) return yearToX(TIME_END, width);
  const m = parts[1] ? parseInt(parts[1], 10) - 1 : 0;
  const d = parts[2] ? parseInt(parts[2], 10) - 1 : 0;
  const decimalYear = y + (m * 30 + d) / 365;
  return yearToX(decimalYear, width);
}

/**
 * SVG 요소 생성 헬퍼
 */
function el(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined) continue;
    node.setAttribute(k, String(v));
  }
  return node;
}

/**
 * 이벤트 식별자(파일명)에서 .md 확장자 제거. 표시용 라벨에만 사용.
 * 데이터 키(EVENT_LAW_MAP·RELATIONS의 from/to)는 .md 유지.
 */
function stripMd(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/\.md$/, "");
}

/**
 * 텍스트를 안전하게 escape (사이드 패널 HTML 주입용)
 */
function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 좌측 법령명 라벨 자동 두 줄 분할.
 * 입력 문자열 길이가 threshold 이하면 [문자열] 단일 배열 반환.
 * 초과 시 LABEL_BREAK_HINTS 우선 순으로 분할점 탐색, 실패 시 공백, 그것도 실패 시 절반 지점.
 * @returns {string[]} 1~2개 라인
 */
function wrapLabel(name, threshold) {
  const s = String(name || "");
  if (s.length <= threshold) return [s];

  // 1) 우선순위 분할 토큰 탐색 (앞에서부터). head가 너무 길지 않을 때만 채택.
  for (const tok of LABEL_BREAK_HINTS) {
    const i = s.indexOf(tok);
    if (i > 0 && i + tok.length < s.length) {
      // " 및 " 같은 토큰은 1행 끝에 포함 (앞부분 + 토큰)
      const head = s.slice(0, i + tok.length).trimEnd();
      const tail = s.slice(i + tok.length).trimStart();
      if (
        head.length > 0 &&
        tail.length > 0 &&
        head.length <= threshold &&
        tail.length <= threshold
      ) {
        return [head, tail];
      }
    }
  }

  // 2) 공백 기준 분할 — 중앙에 가장 가까운 공백
  const mid = Math.floor(s.length / 2);
  let bestSpace = -1;
  let bestDist = Infinity;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === " ") {
      const dist = Math.abs(i - mid);
      if (dist < bestDist) {
        bestDist = dist;
        bestSpace = i;
      }
    }
  }
  if (bestSpace > 0 && bestSpace < s.length - 1) {
    return [s.slice(0, bestSpace), s.slice(bestSpace + 1)];
  }

  // 3) Fallback: 절반 지점
  return [s.slice(0, mid), s.slice(mid)];
}

/**
 * 정삼각형 polygon points (한 변 size)
 */
function trianglePoints(cx, cy, size) {
  const h = (size * Math.sqrt(3)) / 2;
  return `${cx},${cy - (h * 2) / 3} ${cx - size / 2},${cy + h / 3} ${cx + size / 2},${cy + h / 3}`;
}

/**
 * 마름모 polygon points (대각선 size)
 */
function diamondPoints(cx, cy, size) {
  return `${cx},${cy - size / 2} ${cx + size / 2},${cy} ${cx},${cy + size / 2} ${cx - size / 2},${cy}`;
}

/**
 * 5각별 polygon points (외접원 반지름 outerR)
 */
function starPoints(cx, cy, outerR) {
  const innerR = outerR * 0.5;
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

/* ============================================================
 * 1.5 이벤트 라벨 레인 패킹 (수평 라벨 + 리더라인)
 * ============================================================ */

/**
 * 이벤트가 귀속되는 트랙 키 산출. renderEvents 의 마커 배치 귀속과 동일 규칙:
 *   - law_ids[0] 가 트랙으로 해결되면 그 법령 트랙 → key = law_ids[0]
 *   - law_ids 비었거나 law_ids[0] 미해결 시 카테고리 orphan 행 → key = "orphan:<category>"
 * @param {ev} ev
 * @param {Set<string>} [lawIdSet]  존재하는 법령 트랙 id 집합. 주면 law_ids[0] 해결 여부 확인.
 * @returns {string|null} 트랙 키. 카테고리 결손 등으로 귀속 불가 시 null.
 */
function eventTrackKey(ev, lawIdSet) {
  if (!ev) return null;
  if (Array.isArray(ev.law_ids) && ev.law_ids.length > 0) {
    const first = ev.law_ids[0];
    // lawIdSet 미제공이면 그대로 신뢰. 제공 시 미해결이면 orphan 으로 fallback(renderEvents 와 동일).
    if (!lawIdSet || lawIdSet.has(first)) return first;
  }
  if (ev.category) return `orphan:${ev.category}`;
  return null;
}

/**
 * 트랙별 그리디 레인 패킹.
 *
 * short_label 있는 이벤트만 대상. 각 라벨의 가로 박스를 cx 중앙 정렬 기준으로
 * [cx - w/2 - GAP, cx + w/2 + GAP] 로 잡고, 같은 트랙 안에서 가장 낮은(트랙에 가까운)
 * 레인부터 가로로 겹치지 않는 첫 레인에 배치한다. 레인 인덱스는 0,1,2… 위로 적층.
 *
 * Y 좌표 불요 — cx·폭만으로 계산 가능하므로 buildTrackLayout 의 headroom 산정에
 * 사전 주입할 수 있다.
 *
 * @returns {{
 *   laneByEventIndex: Map<number, number>,   // 이벤트 원본 인덱스 → 레인 인덱스
 *   laneCountByTrackKey: Map<string, number> // 트랙 키 → 레인 수(maxLane+1)
 * }}
 */
function computeLabelLanes(events, width, lawIdSet) {
  const laneByEventIndex = new Map();
  const laneCountByTrackKey = new Map();

  // 트랙 키별 라벨 박스 수집 (원본 인덱스 보존)
  const byTrack = new Map(); // key → [{ idx, cx, w }]
  events.forEach((ev, idx) => {
    if (!ev || !ev.short_label) return;
    const key = eventTrackKey(ev, lawIdSet);
    if (!key) {
      console.warn(`[app] event[${idx}] 라벨 트랙 귀속 실패, 라벨 스킵 title="${ev.title}"`);
      return;
    }
    const dateStr = ev.date ? String(ev.date) : String(ev.year || "");
    const cx = dateToX(dateStr, width);
    const w = measureLabelWidth(ev.short_label);
    if (!byTrack.has(key)) byTrack.set(key, []);
    byTrack.get(key).push({ idx, cx, w });
  });

  for (const [key, boxes] of byTrack.entries()) {
    boxes.sort((a, b) => a.cx - b.cx);
    // lanes[i] = 해당 레인에 배치된 박스들의 [left, right] 배열
    const lanes = [];
    let maxLane = -1;
    for (const box of boxes) {
      const left = box.cx - box.w / 2 - LABEL_GAP;
      const right = box.cx + box.w / 2 + LABEL_GAP;
      let placed = -1;
      for (let i = 0; i < lanes.length; i++) {
        // 이 레인의 기존 박스들과 가로로 겹치지 않으면 배치
        const conflict = lanes[i].some((b) => left < b.right && right > b.left);
        if (!conflict) {
          lanes[i].push({ left, right });
          placed = i;
          break;
        }
      }
      if (placed === -1) {
        lanes.push([{ left, right }]);
        placed = lanes.length - 1;
      }
      laneByEventIndex.set(box.idx, placed);
      if (placed > maxLane) maxLane = placed;
    }
    laneCountByTrackKey.set(key, maxLane + 1);
  }

  return { laneByEventIndex, laneCountByTrackKey };
}

/* ============================================================
 * 2. 트랙 레이아웃 (카테고리 그룹 → 제정연도순)
 * ============================================================ */

/**
 * @param {Array} laws
 * @param {Array} events
 * @param {{ labelsOn?: boolean, lanes?: { laneCountByTrackKey: Map<string, number> } }} [opts]
 *   labelsOn=true 면 각 law/orphan 행 위에 그 행의 라벨 레인 수만큼 reserved 여유를 추가해
 *   수평 라벨이 항상 자기 트랙 바로 위 영역에만 들어가게 한다. false(기본)면 컴팩트.
 * @returns {{
 *   rows: Array<{ kind: 'header'|'law'|'orphan', y: number, category?: string, law?: object }>,
 *   trackYByLawId: Map<string, number>,
 *   totalHeight: number,
 *   orphanRows: Array<{ category: string, y: number }>,
 *   eventCoordsByFile: Map<string, {x:number,y:number}>
 * }}
 */
function buildTrackLayout(laws, events, opts = {}) {
  const labelsOn = opts.labelsOn === true;
  const laneCountByTrackKey =
    (opts.lanes && opts.lanes.laneCountByTrackKey) || new Map();

  // 라벨 ON 시 해당 트랙 키의 레인 수만큼 위쪽 reserved 여유(px) 산정.
  function headroomFor(key) {
    if (!labelsOn) return 0;
    const lanes = laneCountByTrackKey.get(key) || 0;
    if (lanes <= 0) return 0;
    return lanes * LANE_H + LANE_TOP_PAD;
  }

  const rows = [];
  let y = TOP_AXIS_H;

  // 카테고리별 미연결(law_ids 빈) 이벤트가 있는지 사전 계산
  const orphanCats = new Set();
  for (const ev of events) {
    if (!ev || !Array.isArray(ev.law_ids) || ev.law_ids.length === 0) {
      if (ev && ev.category) orphanCats.add(ev.category);
    }
  }

  const trackYByLawId = new Map();
  const orphanRows = [];

  for (const cat of CATEGORY_ORDER) {
    // 카테고리 헤더 행
    rows.push({
      kind: "header",
      category: cat,
      y: y + HEADER_ROW_H / 2,
      yTop: y,
      yBottom: y + HEADER_ROW_H,
    });
    y += HEADER_ROW_H;

    // 카테고리 내 법령 (제정연도 → 한글명 순)
    const inCat = laws
      .filter((l) => l && l.category === cat)
      .sort((a, b) => {
        const ya = a.enacted_year ?? 0;
        const yb = b.enacted_year ?? 0;
        if (ya !== yb) return ya - yb;
        return (a.name_kr || "").localeCompare(b.name_kr || "", "ko");
      });

    for (const law of inCat) {
      // 라벨 ON 시 이 트랙의 레인 수만큼 위쪽 여유 확보 후 행 배치
      y += headroomFor(law.id);
      const yCenter = y + LAW_ROW_H / 2;
      rows.push({
        kind: "law",
        law,
        y: yCenter,
        yTop: y,
        yBottom: y + LAW_ROW_H,
      });
      trackYByLawId.set(law.id, yCenter);
      y += LAW_ROW_H;
    }

    // 미연결 이벤트가 있는 카테고리는 별도 행 추가 (작은 행)
    if (orphanCats.has(cat)) {
      y += headroomFor(`orphan:${cat}`);
      const yCenter = y + LAW_ROW_H / 2;
      rows.push({
        kind: "orphan",
        category: cat,
        y: yCenter,
        yTop: y,
        yBottom: y + LAW_ROW_H,
      });
      orphanRows.push({ category: cat, y: yCenter });
      y += LAW_ROW_H;
    }

    y += GROUP_GAP;
  }

  const totalHeight = y + 20;
  // 이벤트 ★ 좌표 사전 저장소 — renderEvents가 채움, renderEdges가 RELATIONS의 event 측 좌표로 사용
  const eventCoordsByFile = new Map();
  return { rows, trackYByLawId, totalHeight, orphanRows, eventCoordsByFile };
}

/* ============================================================
 * 2.5 행 교대 배경 (zebra) — SVG 최하단 레이어
 * ============================================================ */

/**
 * 법령·orphan 행마다 옅은 교대 배경을 깐다.
 * - 격자선·트랙 막대보다 아래(svg.firstChild 앞)에 삽입되어야 가림이 없음.
 * - 카테고리 헤더 행에서 홀짝 카운터를 리셋(그룹 단위로 줄무늬 시작).
 * - 헤더 행에는 zebra 미적용(헤더 자체 #F5F5F5 유지).
 * - CSS 의존 없이 인라인 fill 속성만 사용.
 */
function renderZebra(svg, layout) {
  const g = el("g", { class: "zebra-layer" });
  let parity = 0; // 카테고리 그룹 내 행 홀짝 카운터
  for (const row of layout.rows) {
    if (row.kind === "header") {
      parity = 0; // 그룹 진입 시 리셋
      continue;
    }
    // law·orphan 행만 교대 배경 적용
    const fill = parity % 2 === 0 ? "#FFFFFF" : "#F7F7F7";
    const rect = el("rect", {
      x: 0,
      y: row.yTop,
      width: SVG_WIDTH,
      height: LAW_ROW_H,
      fill,
    });
    g.appendChild(rect);
    parity += 1;
  }
  // 최하단 레이어로 삽입 (격자·막대보다 아래)
  svg.insertBefore(g, svg.firstChild);
}

/* ============================================================
 * 3. 시간축 (10년 grid + 5년 보조)
 * ============================================================ */

function renderTimeAxis(svg, width, totalHeight, clampFromYear) {
  const g = el("g", { class: "time-axis" });

  // 눈금 격자는 5의 배수 그리드(1950·1955·1960…)에 고정. TIME_START가 5의 배수가 아니어도
  // 10년 라벨(1960·1970…)이 정상 표기되도록 그리드 시작을 ceil(TIME_START/5)*5 로 둠.
  const gridStart = Math.ceil(TIME_START / 5) * 5;
  for (let year = gridStart; year <= TIME_END; year += 5) {
    const x = yearToX(year, width);
    const isDecade = year % 10 === 0;
    const line = el("line", {
      x1: x,
      x2: x,
      y1: TOP_AXIS_H - 10,
      y2: totalHeight - 10,
      stroke: isDecade ? "#CCCCCC" : "#EEEEEE",
      "stroke-width": 1,
    });
    g.appendChild(line);

    // 10년 라벨 표기. 단 시작 라벨(TIME_START)과 너무 붙는 경우(<3년)는 생략해 겹침 방지.
    if (isDecade && (year - TIME_START) >= 3) {
      const label = el("text", {
        x: x,
        y: TOP_AXIS_H - 16,
        "text-anchor": "middle",
        "font-size": 13,
        fill: "#555555",
      });
      label.textContent = String(year);
      g.appendChild(label);
    }
  }

  // 우측 끝점(TIME_END) 라벨 — 5년·10년 격자에 안 잡히는 현재 시점 연도 명시
  if (TIME_END % 10 !== 0) {
    const xEnd = yearToX(TIME_END, width);
    const endLabel = el("text", {
      x: xEnd,
      y: TOP_AXIS_H - 16,
      "text-anchor": "middle",
      "font-size": 13,
      fill: "#555555",
    });
    endLabel.textContent = String(TIME_END);
    g.appendChild(endLabel);
  }

  // 좌측 시작점 라벨. 최초 모법이 프레임 시작(TIME_START)보다 이르면(clampFromYear),
  // "◁ {연도}" 형태로 프레임 밖에서 이어짐을 표시한다(예: 교육법 1949 → "◁ 1949").
  // ◁ 삼각형은 폰트 서브셋에 없는 글리프라 SVG polygon 으로 그려 폰트 비의존. 숫자는 텍스트.
  // 클램프 대상이 없으면 시작 연도 숫자만(10년 격자에 안 잡히는 경우) 표기.
  {
    const xStart = yearToX(TIME_START, width);
    const ly = TOP_AXIS_H - 16;
    if (clampFromYear != null && clampFromYear < TIME_START) {
      // 왼쪽을 가리키는 삼각형(◁) — 경계에서 좌측(프레임 밖)으로 이어짐을 표시
      const tri = el("polygon", {
        points: `${xStart},${ly - 4} ${xStart + 7},${ly - 8} ${xStart + 7},${ly}`,
        fill: "#555555",
      });
      g.appendChild(tri);
      const lab = el("text", {
        x: xStart + 11,
        y: ly,
        "text-anchor": "start",
        "font-size": 13,
        fill: "#555555",
      });
      lab.textContent = String(clampFromYear);
      g.appendChild(lab);
    } else if (TIME_START % 10 !== 0) {
      const startLabel = el("text", {
        x: xStart + 3,
        y: ly,
        "text-anchor": "start",
        "font-size": 13,
        fill: "#555555",
      });
      startLabel.textContent = String(TIME_START);
      g.appendChild(startLabel);
    }
  }

  // 좌측 라벨 영역과 본문 사이 구분선
  const sep = el("line", {
    x1: LEFT_LABEL_W,
    x2: LEFT_LABEL_W,
    y1: TOP_AXIS_H - 10,
    y2: totalHeight - 10,
    stroke: "#BBBBBB",
    "stroke-width": 1.2,
  });
  g.appendChild(sep);

  // 상단 가로 구분선
  const topSep = el("line", {
    x1: 0,
    x2: width,
    y1: TOP_AXIS_H - 10,
    y2: TOP_AXIS_H - 10,
    stroke: "#BBBBBB",
    "stroke-width": 1,
  });
  g.appendChild(topSep);

  svg.appendChild(g);
}

/* ============================================================
 * 4. 좌측 라벨 (카테고리 헤더 + 법령명)
 * ============================================================ */

function renderLeftLabels(svg, layout) {
  const g = el("g", { class: "left-labels" });

  for (const row of layout.rows) {
    if (row.kind === "header") {
      // 카테고리 헤더 행: 배경 + 텍스트
      const bg = el("rect", {
        x: 0,
        y: row.yTop,
        width: SVG_WIDTH,
        height: HEADER_ROW_H,
        fill: "#F5F5F5",
        "data-category": row.category,
        class: "category-header-bg",
      });
      g.appendChild(bg);

      const swatch = el("rect", {
        x: 10,
        y: row.y - 7,
        width: 14,
        height: 14,
        rx: 3,
        fill: `var(--cat-${CATEGORY_KEY[row.category]})`,
      });
      g.appendChild(swatch);

      const t = el("text", {
        x: 30,
        y: row.y + 5,
        "font-size": 15,
        "font-weight": 700,
        fill: "#1A1A1A",
        "data-category": row.category,
        class: "category-header-text",
      });
      t.textContent = row.category;
      g.appendChild(t);
    } else if (row.kind === "law") {
      const fullName = row.law.name_kr || row.law.id;
      const aliasFirst = Array.isArray(row.law.aliases) && row.law.aliases.length > 0
        ? row.law.aliases[0]
        : null;
      const labelX = 16;
      const t = el("text", {
        x: labelX,
        y: row.y,
        "font-size": 15,
        fill: "#1A1A1A",
        "data-law-id": row.law.id,
        "data-category": row.law.category,
        class: "law-label",
      });
      const lines = wrapLabel(fullName, LABEL_WRAP_THRESHOLD);
      if (lines.length === 1) {
        const tspan = document.createElementNS(SVG_NS, "tspan");
        tspan.setAttribute("x", String(labelX));
        tspan.setAttribute("dy", "0");
        tspan.textContent = lines[0];
        t.appendChild(tspan);
      } else {
        // 두 줄: text의 y를 트랙 중심 위로 약 7px 올리고, 두 tspan 중심을 트랙 중심 기준 대칭 배치.
        // dominant-baseline: middle 가정. 1행 중심 ~ row.y - 9px, 2행 중심 ~ row.y + 9px (간격 1.2em ≈ 18px).
        t.setAttribute("y", String(row.y - 9));
        const tspan1 = document.createElementNS(SVG_NS, "tspan");
        tspan1.setAttribute("x", String(labelX));
        tspan1.setAttribute("dy", "0");
        tspan1.textContent = lines[0];
        const tspan2 = document.createElementNS(SVG_NS, "tspan");
        tspan2.setAttribute("x", String(labelX));
        tspan2.setAttribute("dy", "1.2em");
        tspan2.textContent = lines[1];
        t.appendChild(tspan1);
        t.appendChild(tspan2);
      }
      const title = el("title");
      title.textContent = aliasFirst ? `${fullName} (구명·통칭: ${aliasFirst})` : fullName;
      t.appendChild(title);
      g.appendChild(t);
    } else if (row.kind === "orphan") {
      const t = el("text", {
        x: 16,
        y: row.y + 5,
        "font-size": 14,
        "font-style": "italic",
        fill: "#777777",
        "data-category": row.category,
        class: "orphan-label",
      });
      t.textContent = "(미연결 정책 이벤트)";
      g.appendChild(t);
    }
  }

  svg.appendChild(g);
}

/* ============================================================
 * 5. 법령 트랙 막대
 * ============================================================ */

function renderTracks(svg, layout, width, ctx) {
  const g = el("g", { class: "tracks-layer" });

  for (const row of layout.rows) {
    if (row.kind !== "law") continue;
    const law = row.law;
    const x1 = dateToX(law.enacted, width);
    const x2 = law.abolished ? dateToX(law.abolished, width) : yearToX(TIME_END, width);
    const w = Math.max(2, x2 - x1);

    const rect = el("rect", {
      x: x1,
      y: row.y - BAR_HEIGHT / 2,
      width: w,
      height: BAR_HEIGHT,
      rx: 4,
      fill: `var(--cat-${CATEGORY_KEY[law.category]})`,
      "data-law-id": law.id,
      "data-category": law.category,
      class: "track-bar",
      tabindex: 0,
    });
    const title = el("title");
    const endLabel = law.abolished ? law.abolished.split("-")[0] : "현행";
    title.textContent = `${law.name_kr} (${law.enacted_year}~${endLabel})`;
    rect.appendChild(title);

    rect.addEventListener("mouseenter", (e) => showLawTooltip(law, e));
    rect.addEventListener("mousemove", (e) => moveTooltip(e));
    rect.addEventListener("mouseleave", hideTooltip);
    rect.addEventListener("click", () => openLawPanel(law, ctx));
    rect.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openLawPanel(law, ctx);
      }
    });

    g.appendChild(rect);
  }

  svg.appendChild(g);
}

/* ============================================================
 * 6. 마디 도형 (milestone)
 * ============================================================ */

function renderMilestones(svg, layout, width, ctx) {
  const g = el("g", { class: "milestones-layer" });

  for (const row of layout.rows) {
    if (row.kind !== "law") continue;
    const law = row.law;
    const milestones = Array.isArray(law.milestones) ? law.milestones : [];

    milestones.forEach((m, idx) => {
      if (!m || !m.date) {
        console.warn(`[app] law=${law.id} milestone[${idx}] date 누락, 스킵`);
        return;
      }
      const cx = dateToX(m.date, width);
      const cy = row.y;

      let shape;
      const type = m.type || "";
      if (type === "enacted") {
        shape = el("circle", {
          cx,
          cy,
          r: 8,
          fill: `var(--cat-${CATEGORY_KEY[law.category]})`,
          stroke: "#1A1A1A",
          "stroke-width": 1.2,
        });
      } else if (type === "major_amended" || type === "renamed" || type === "revised") {
        shape = el("polygon", {
          points: trianglePoints(cx, cy, 16),
          fill: `var(--cat-${CATEGORY_KEY[law.category]})`,
          stroke: "#1A1A1A",
          "stroke-width": 1.2,
        });
      } else if (type === "abolished" || type === "branched") {
        shape = el("polygon", {
          points: diamondPoints(cx, cy, 16),
          fill: "#FFFFFF",
          stroke: `var(--cat-${CATEGORY_KEY[law.category]})`,
          "stroke-width": 2,
        });
      } else {
        // 알 수 없는 타입 → 작은 원으로 fallback
        shape = el("circle", {
          cx,
          cy,
          r: 6,
          fill: `var(--cat-${CATEGORY_KEY[law.category]})`,
          stroke: "#1A1A1A",
          "stroke-width": 1,
        });
      }

      shape.setAttribute("class", "milestone");
      shape.setAttribute("data-law-id", law.id);
      shape.setAttribute("data-milestone-index", String(idx));
      shape.setAttribute("data-category", law.category);
      shape.setAttribute("tabindex", "0");

      const title = el("title");
      title.textContent = `${m.date} · ${m.label || type}`;
      shape.appendChild(title);

      shape.addEventListener("mouseenter", (e) => showMilestoneTooltip(law, m, e));
      shape.addEventListener("mousemove", (e) => moveTooltip(e));
      shape.addEventListener("mouseleave", hideTooltip);
      shape.addEventListener("click", (e) => {
        e.stopPropagation();
        openMilestonePanel(law, m, idx, ctx);
      });
      shape.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openMilestonePanel(law, m, idx, ctx);
        }
      });

      g.appendChild(shape);
    });
  }

  svg.appendChild(g);
}

/* ============================================================
 * 7. 정책 이벤트 마커 (★)
 * ============================================================ */

/**
 * @param {boolean} labelsOn  true 면 수평 라벨 + 리더라인을 함께 렌더(레이아웃에 여유 확보됨).
 *                            false 면 마커 ★ 만 렌더(컴팩트).
 * @param {Map<number, number>} laneByEventIndex  computeLabelLanes 결과(이벤트 idx → 레인)
 */
function renderEvents(svg, events, layout, width, ctx, labelsOn, laneByEventIndex) {
  const g = el("g", { class: "events-layer" });
  // 라벨+리더 별도 그룹: events-layer 뒤(최상위)에 append.
  const labelG = el("g", { class: "event-labels" });
  const orphanYByCat = new Map();
  for (const o of layout.orphanRows) orphanYByCat.set(o.category, o.y);

  // 수평 라벨 사양 수집 → 마커 루프 후 일괄 배치(리더라인 포함)
  const labelSpecs = []; // { cx, cy, text, lane }

  events.forEach((ev, idx) => {
    if (!ev) return;
    let cy;
    let lawIdForLink = null;
    if (Array.isArray(ev.law_ids) && ev.law_ids.length > 0) {
      lawIdForLink = ev.law_ids[0];
      cy = layout.trackYByLawId.get(lawIdForLink);
      if (cy === undefined) {
        console.warn(`[app] event[${idx}] law_id="${lawIdForLink}" 트랙 미존재, 카테고리 orphan 행으로 fallback`);
        cy = orphanYByCat.get(ev.category);
      }
    } else {
      cy = orphanYByCat.get(ev.category);
    }
    if (cy === undefined) {
      console.warn(`[app] event[${idx}] 배치 위치 없음, 스킵 title="${ev.title}"`);
      return;
    }

    const dateStr = ev.date ? String(ev.date) : String(ev.year || "");
    const cx = dateToX(dateStr, width);

    // 별 모양 (외접원 반지름 9px) - 마커는 트랙 막대 위에 살짝 띄워 배치
    const star = el("polygon", {
      points: starPoints(cx, cy - 14, 9),
      fill: `var(--cat-${CATEGORY_KEY[ev.category]})`,
      stroke: "#FFFFFF",
      "stroke-width": 1.5,
      class: "event-marker",
      tabindex: 0,
    });
    star.setAttribute("data-event-index", String(idx));
    star.setAttribute("data-category", ev.category);
    if (lawIdForLink) star.setAttribute("data-law-id", lawIdForLink);
    if (ev.file) star.setAttribute("data-event-file", ev.file);

    // 별 중심 좌표를 layout에 등록 — RELATIONS(event 측) 엣지가 끌어다 씀
    if (ev.file && layout.eventCoordsByFile) {
      layout.eventCoordsByFile.set(ev.file, { x: cx, y: cy - 14 });
    }

    const title = el("title");
    title.textContent = `${dateStr} · ${ev.title}`;
    star.appendChild(title);

    star.addEventListener("mouseenter", (e) => showEventTooltip(ev, e));
    star.addEventListener("mousemove", (e) => moveTooltip(e));
    star.addEventListener("mouseleave", hideTooltip);
    star.addEventListener("click", (e) => {
      e.stopPropagation();
      openEventPanel(ev, ctx);
    });
    star.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openEventPanel(ev, ctx);
      }
    });

    g.appendChild(star);

    // 라벨 사양 수집 (라벨 ON 일 때만 배치)
    if (labelsOn && ev.short_label) {
      const lane = laneByEventIndex ? laneByEventIndex.get(idx) : undefined;
      if (lane === undefined) {
        console.warn(`[app] event[${idx}] 레인 미산정, 라벨 스킵 title="${ev.title}"`);
      } else {
        // 마커 정수리(cy - STAR_TOP_OFFSET) 기준으로 라벨 배치
        labelSpecs.push({ cx, cy, text: String(ev.short_label), lane });
      }
    }
  });

  // 라벨 ON 일 때만 수평 라벨 + 리더라인 렌더
  if (labelsOn) {
    placeEventLabels(labelG, labelSpecs);
  }

  svg.appendChild(g);
  svg.appendChild(labelG);
}

/**
 * 수평 이벤트 라벨 + 리더라인 렌더.
 *
 * 각 라벨은 computeLabelLanes 가 산정한 레인 인덱스에 따라 마커 ★ 정수리 위로 적층된다.
 * 레인 인덱스가 클수록 트랙에서 멀어진다(위로 쌓임). 같은 레인 내 라벨은 가로로 겹치지
 * 않음이 패킹 단계에서 보장되고, 레인 피치 LANE_H=24px 가 실측 라벨 박스 높이(19px)보다
 * 5px 크므로 인접 레인끼리 세로로도 분리됨(QA 게이트: 교차쌍 0).
 *
 *   starTop      = cy - STAR_TOP_OFFSET           (마커 ★ 정수리)
 *   labelBottomY = starTop - LEADER_MIN - lane*LANE_H  (해당 레인 라벨 박스 하단선)
 *   baseline     = labelBottomY - LABEL_BASELINE_PAD   (text baseline)
 *   리더라인     = (cx, starTop) → (cx, labelBottomY)  수직선, 라벨보다 먼저 append(아래 깔림)
 *
 * 캔버스 좌/우 경계를 넘는 라벨은 x 를 [8, SVG_WIDTH-8] 안으로 클램프하고 text-anchor 를
 * start/end 로 전환(리더는 마커 cx 유지). 흰 halo(paint-order:stroke)로 막대·zebra 위 가독성 확보.
 */
function placeEventLabels(labelG, specs) {
  if (!Array.isArray(specs) || specs.length === 0) return;

  for (const sp of specs) {
    const starTop = sp.cy - STAR_TOP_OFFSET;
    const labelBottomY = starTop - LEADER_MIN - sp.lane * LANE_H;
    const baselineY = labelBottomY - LABEL_BASELINE_PAD;

    // 리더라인 (마커 정수리 → 라벨 박스 하단). 레인 0(마커 바로 위) 라벨은 토막선이
    // 점처럼 보여 일관성을 해치므로 생략하고, 떨어뜨려 적층된 레인 1 이상 라벨에만
    // 연결선을 그린다. 라벨보다 먼저 append → 아래 깔림.
    if (sp.lane > 0) {
      const leader = el("line", {
        x1: sp.cx,
        y1: starTop,
        x2: sp.cx,
        y2: labelBottomY,
        stroke: "#9AA0A6",
        "stroke-width": 1,
        "pointer-events": "none",
        class: "event-leader",
      });
      labelG.appendChild(leader);
    }

    // 경계 클램프: 중앙 정렬 기준 라벨 박스가 좌/우 여백을 넘으면 x·anchor 조정
    const w = measureLabelWidth(sp.text);
    let labelX = sp.cx;
    let anchor = "middle";
    const halfW = w / 2;
    const MARGIN = 8;
    if (sp.cx - halfW < MARGIN) {
      labelX = MARGIN;
      anchor = "start";
    } else if (sp.cx + halfW > SVG_WIDTH - MARGIN) {
      labelX = SVG_WIDTH - MARGIN;
      anchor = "end";
    }

    const lbl = el("text", {
      x: labelX,
      y: baselineY,
      class: "event-label",
      "text-anchor": anchor,
      // 흰 halo — 막대·zebra·격자 위에서 텍스트 분리. paint-order:stroke 로 외곽선 먼저 그림.
      style: "paint-order:stroke;stroke:#FFFFFF;stroke-width:3;stroke-linejoin:round",
    });
    lbl.textContent = sp.text;
    labelG.appendChild(lbl);
  }
}

/* ============================================================
 * 8. 관계 엣지 (베지어)
 * ============================================================ */

/**
 * 관계 유형별 xFrom·xTo 계산
 *
 * - succession: from.abolished → to.enacted (없으면 rel.year)
 * - basis:      rel.year 시점이 from 범위 내면 rel.year, 아니면 from.abolished → to.enacted
 * - branch:     from.abolished → to.enacted (없으면 rel.year)
 * - reference:  rel.year ↔ rel.year (수직 곡선)
 *
 * 모든 fallback은 rel.year. fromLaw·toLaw 결손 시 호출자 검증.
 */
/**
 * 이벤트 ↔ 법령 엣지에서 law 측 단일 x 좌표 산출.
 * rel.year가 law 시행 범위(enacted~abolished) 내면 rel.year 시점, 아니면 enacted.
 */
function pickLawSideX(rel, law, width) {
  const ry = parseInt(String(rel.year || ""), 10);
  if (!law) return Number.isNaN(ry) ? undefined : yearToX(ry, width);
  const enactedY = law.enacted_year || null;
  const abolishedY = law.abolished ? parseInt(String(law.abolished).split("-")[0], 10) : null;
  if (!Number.isNaN(ry) && enactedY !== null
      && ry >= enactedY && (abolishedY === null || ry <= abolishedY)) {
    return yearToX(ry, width);
  }
  return law.enacted ? dateToX(law.enacted, width) : undefined;
}

function computeEdgeXEndpoints(rel, fromLaw, toLaw, width) {
  const relYearX = yearToX(parseInt(String(rel.year || ""), 10) || TIME_START, width);
  const fromEnactedX = fromLaw && fromLaw.enacted ? dateToX(fromLaw.enacted, width) : null;
  const fromAbolishedX = fromLaw && fromLaw.abolished ? dateToX(fromLaw.abolished, width) : null;
  const toEnactedX = toLaw && toLaw.enacted ? dateToX(toLaw.enacted, width) : null;

  let xFrom;
  let xTo;

  switch (rel.type) {
    case "succession":
    case "branch": {
      xFrom = (fromAbolishedX !== null) ? fromAbolishedX : relYearX;
      xTo = (toEnactedX !== null) ? toEnactedX : relYearX;
      break;
    }
    case "basis": {
      // rel.year 가 from 법령 시행 범위(enacted~abolished or 현재) 안인지 판정
      const ry = parseInt(String(rel.year || ""), 10);
      const fromEnactedY = fromLaw && fromLaw.enacted_year ? fromLaw.enacted_year : null;
      const fromAbolishedY = fromLaw && fromLaw.abolished ? parseInt(String(fromLaw.abolished).split("-")[0], 10) : null;
      const inRange =
        !Number.isNaN(ry) &&
        fromEnactedY !== null &&
        ry >= fromEnactedY &&
        (fromAbolishedY === null || ry <= fromAbolishedY);
      if (inRange) {
        xFrom = relYearX;
      } else if (fromAbolishedX !== null) {
        xFrom = fromAbolishedX;
      } else if (fromEnactedX !== null) {
        xFrom = fromEnactedX;
      } else {
        xFrom = relYearX;
      }
      xTo = (toEnactedX !== null) ? toEnactedX : relYearX;
      break;
    }
    case "reference":
    default: {
      xFrom = relYearX;
      xTo = relYearX;
      break;
    }
  }

  return { xFrom, xTo };
}

/**
 * 방향성 엣지의 끝점을 to 트랙 ● 마디 정수리 부근(12시~1시 방향)으로 산출.
 *
 * 좌표계: SVG y축은 아래로 증가. 마디 중심 (xTo, yTo), 반지름 r.
 *   - 12시 방향   = (xTo, yTo - r)
 *   - 1시 방향(30°) ≈ (xTo + r·sin30°, yTo - r·cos30°)
 *   - 11시 방향   ≈ (xTo - r·sin30°, yTo - r·cos30°)
 *
 * dxSign(좌→우 화살표면 +1, 우→좌면 -1)에 따라 좌우 대칭 처리.
 * 마디 반지름은 enacted ● 도형 기준 MILESTONE_ENACTED_R(=8).
 *
 * TODO(user-input): 아래 본체를 5~10라인으로 작성.
 *   - α: 정수리에서 옆으로 기운 각도(라디안). 0=정수리(12시), Math.PI/6=1시/11시.
 *   - 반환 { xEnd, yEnd } 가 마디 경계선 위에 있어야 함.
 *   - dxSign 부호에 맞춰 1시(좌→우) 또는 11시(우→좌)로 진입하도록 x를 좌우로 흔들 것.
 *
 * 호출부: renderEdges 내부. 결과 (xEnd, yEnd)는 베지어 끝점과 endMarker circle 양쪽에 쓰임.
 */
const MILESTONE_ENACTED_R = 8;
/**
 * @param {number} xTo  to 마디 중심 x
 * @param {number} yTo  to 마디 중심 y
 * @param {number} dxSign  좌→우 진입 +1 / 우→좌 -1
 * @param {number} [k=0]  같은 (to|dxSign) 그룹 내 순번 (0-based)
 * @param {number} [n=1]  그룹 총 개수
 *
 * n<=1이면 단일 화살표 → 기존 60° 진입 유지.
 * n>1이면 화살촉을 부채꼴로 분산해 수렴 마디(예: 1997)에서 화살촉 겹침 해소.
 *
 * @param {number} [entrySign]  끝점을 마디 어느 쪽에 둘지. +1=우측(2시), -1=좌측(10·11시).
 *   미지정(null)이면 dxSign(진행 방향 쪽=먼쪽)을 사용. 소스가 마디와 거의 같은 높이에서 수평
 *   접근하는 경우만 호출부에서 -dxSign(근측)을 넘겨 마디를 지나치지 않고 가까운 쪽으로 진입.
 */
function computeArrowEndPoint(xTo, yTo, dxSign, k = 0, n = 1, entrySign = null) {
  // === USER FILL START ===
  const r = MILESTONE_ENACTED_R;
  let alpha;
  if (n <= 1) {
    alpha = Math.PI / 3; // 60° — 2시(좌→우) / 10시(우→좌) 방향
  } else {
    const center = (Math.PI * 2) / 9; // 40°
    const step = Math.min((Math.PI * 13) / 180, (Math.PI * 60) / 180 / (n - 1)); // 13° 또는 균등 분할
    alpha = center + (k - (n - 1) / 2) * step;
    // [10°, 70°] 클램프
    const lo = Math.PI / 18;       // 10°
    const hi = (Math.PI * 7) / 18; // 70°
    if (alpha < lo) alpha = lo;
    if (alpha > hi) alpha = hi;
  }
  const sinA = Math.sin(alpha);
  const cosA = Math.cos(alpha);
  const s = (entrySign === null) ? dxSign : entrySign; // 진입 측(±1) — 기본은 진행 방향(먼쪽)
  const xEnd = xTo + s * r * sinA;
  const yEnd = yTo - r * cosA;
  // 화살촉이 마디 원 중심을 향하도록 진입 방향(= 끝점→중심) 단위 벡터도 함께 반환.
  // c2 = xEnd - V·nx, yEnd - V·ny 형태로 쓰면 path 마지막 접선이 마디 표면 접선과 수직.
  const nx = -s * sinA;
  const ny = cosA;
  return { xEnd, yEnd, nx, ny };
  // === USER FILL END ===
}

/**
 * SVG <defs>에 관계 유형별 화살표 마커와 시점 마커 정의 추가.
 * 한 번만 호출.
 */
function ensureEdgeDefs(svg) {
  if (svg.querySelector("defs.edge-defs")) return;
  const defs = el("defs", { class: "edge-defs" });

  // 화살표 마커 정의 — succession·basis·branch 3종. reference는 양 끝 동그라미(아래 마커별 처리)
  const arrowTypes = [
    { type: "succession", color: "var(--edge-succession)" },
    { type: "basis", color: "var(--edge-basis)" },
    { type: "branch", color: "var(--edge-branch)" },
  ];
  for (const a of arrowTypes) {
    const marker = el("marker", {
      id: `arrow-${a.type}`,
      viewBox: "0 0 10 10",
      refX: "9",
      refY: "5",
      markerWidth: "14",
      markerHeight: "14",
      orient: "auto-start-reverse",
      markerUnits: "userSpaceOnUse",
    });
    const path = el("path", {
      d: "M 0 0 L 10 5 L 0 10 z",
      fill: a.color,
    });
    marker.appendChild(path);
    defs.appendChild(marker);
  }

  svg.appendChild(defs);
}

function renderEdges(svg, relations, layout, width, ctx) {
  ensureEdgeDefs(svg);
  const g = el("g", { class: "edges-layer" });

  // 사전 패스: 동일 to 마디에 같은 방향(dxSign)으로 진입하는 방향성(law→law) 엣지를
  // 그룹화해 각 엣지의 그룹 내 순번 k와 그룹 총개수 n을 산출.
  // 화살촉 진입각을 부채꼴로 분산(computeArrowEndPoint)해 수렴 마디(예: 1997) 겹침 해소.
  // 키: `${rel.to}|${dxSign}`. dxSign 계산은 메인 루프 로직(computeEdgeXEndpoints) 재사용.
  const fanGroups = new Map(); // key → [idx, ...]
  relations.forEach((rel, idx) => {
    if (!rel) return;
    const fromKind = rel.from_kind || "law";
    const toKind = rel.to_kind || "law";
    const directional = rel.type === "succession" || rel.type === "basis" || rel.type === "branch";
    if (!directional || fromKind !== "law" || toKind !== "law") return;
    const fromLaw = ctx.lawsById.get(rel.from);
    const toLaw = ctx.lawsById.get(rel.to);
    const ep = computeEdgeXEndpoints(rel, fromLaw, toLaw, width);
    if (ep.xFrom === undefined || ep.xTo === undefined) return;
    const dxSign = (ep.xTo - ep.xFrom) >= 0 ? 1 : -1;
    const key = `${rel.to}|${dxSign}`;
    if (!fanGroups.has(key)) fanGroups.set(key, []);
    fanGroups.get(key).push(idx);
  });
  // 엣지 idx → { k, n } 조회표
  const fanByIdx = new Map();
  for (const arr of fanGroups.values()) {
    const n = arr.length;
    arr.forEach((edgeIdx, k) => fanByIdx.set(edgeIdx, { k, n }));
  }

  relations.forEach((rel, idx) => {
    if (!rel) return;

    // RELATIONS 모델: from_kind/to_kind 기본값 "law" — 이벤트 ↔ 법령 엣지 지원
    const fromKind = rel.from_kind || "law";
    const toKind = rel.to_kind || "law";

    // 좌표 산출 — law는 트랙 행 y + (succession/basis/branch 시점) x, event는 별표 (x, y) 단일 지점
    let xFrom, yFrom, xTo, yTo;
    const fromLaw = (fromKind === "law") ? ctx.lawsById.get(rel.from) : null;
    const toLaw = (toKind === "law") ? ctx.lawsById.get(rel.to) : null;
    // 방향성(화살촉) 엣지 — 끝점이 to 법령의 enacted ● 마디에 꽂힘. 좌표 산출 단계에서 이미 필요.
    const directional = rel.type === "succession" || rel.type === "basis" || rel.type === "branch";

    if (fromKind === "law" && toKind === "law") {
      yFrom = layout.trackYByLawId.get(rel.from);
      yTo = layout.trackYByLawId.get(rel.to);
      const ep = computeEdgeXEndpoints(rel, fromLaw, toLaw, width);
      xFrom = ep.xFrom;
      xTo = ep.xTo;
    } else {
      // event 측 — 별표 좌표 직접 사용. law 측 — 트랙 y + rel.year(또는 enacted) 시점 x
      if (fromKind === "event") {
        const ec = layout.eventCoordsByFile.get(rel.from);
        if (!ec) { console.warn(`[app] relation[${idx}] event 좌표 미존재 from=${rel.from}`); return; }
        xFrom = ec.x;
        yFrom = ec.y;
      } else {
        yFrom = layout.trackYByLawId.get(rel.from);
        xFrom = pickLawSideX(rel, fromLaw, width);
      }
      if (toKind === "event") {
        const ec = layout.eventCoordsByFile.get(rel.to);
        if (!ec) { console.warn(`[app] relation[${idx}] event 좌표 미존재 to=${rel.to}`); return; }
        xTo = ec.x;
        yTo = ec.y;
      } else {
        yTo = layout.trackYByLawId.get(rel.to);
        // 방향성 화살촉은 to 법령의 enacted ● 마디 중심에 꽂혀야 축이 원 중심을 통과(접선과 수직).
        // pickLawSideX 의 yearToX(rel.year) 는 연초 기준이라 연중·연말 시행 법령의 ●(dateToX(enacted))와
        // 어긋남 → law→law 경로(computeEdgeXEndpoints 의 toEnactedX)와 동일하게 dateToX(enacted)로 정렬.
        xTo = (directional && toLaw && toLaw.enacted)
          ? dateToX(toLaw.enacted, width)
          : pickLawSideX(rel, toLaw, width);
      }
    }

    if (yFrom === undefined || yTo === undefined || xFrom === undefined || xTo === undefined) {
      console.warn(`[app] relation[${idx}] 좌표 미존재 from=${rel.from}(${fromKind}) to=${rel.to}(${toKind})`);
      return;
    }

    // 방향성 엣지(succession·basis·branch)의 끝점은 to 트랙 ● 마디 정수리 부근(12시~1시)으로 진입.
    // computeArrowEndPoint로 마디 경계선 위 좌표를 받아 c2 제어점을 끝점 바로 위로 끌어올려
    // 마지막 접선이 거의 수직이 되도록 함 — 화살촉이 마디 위쪽에서 아래로 꽂힘.
    // reference는 무방향이라 양 끝 원 유지·수평 진입 그대로. (directional 은 위에서 정의됨)
    const dxRaw = xTo - xFrom;
    const dxSign = dxRaw >= 0 ? 1 : -1;

    let xEnd = xTo;
    let yEnd = yTo;
    let nx = 0; // 끝점→마디 중심 방향 (단위벡터). law 측 to에만 의미
    let ny = 0;
    // 끝점 진입 로직은 to가 law(마디 ●)일 때만 — event(★) 끝점은 별 중심 그대로 사용
    if (directional && toKind === "law") {
      const fan = fanByIdx.get(idx) || { k: 0, n: 1 };
      // 소스가 마디와 거의 같은 높이(한 행 미만, |Δy|<24)에서 수평 접근하면 먼쪽(2시) 진입은
      // 마디를 지나쳐 위로 감았다 들어와 어색함 → 근측(-dxSign, 10·11시)으로 진입.
      // law→law 는 항상 한 행 이상 떨어져(|Δy|≥40) 영향 없고, 수직 낙차 큰 이벤트 엣지도 제외됨.
      const entrySign = (Math.abs(yTo - yFrom) < 24) ? -dxSign : null;
      const ep = computeArrowEndPoint(xTo, yTo, dxSign, fan.k, fan.n, entrySign);
      xEnd = ep.xEnd;
      yEnd = ep.yEnd;
      nx = ep.nx;
      ny = ep.ny;
    }

    // 베지어 제어점:
    //   - directional + to=law: c2가 끝점에서 마디 중심 반대 방향(법선)으로 V만큼 — 화살촉 축이 원 중심 통과
    //   - directional + to=event: 별 도형이라 위에서 진입 (c2 = (xEnd, yEnd - V))
    //   - reference(수평 동일 시점): 짧은 거리면 y차 기반 곡률, 길면 1/3·2/3
    const dx = xEnd - xFrom;
    const dy = yEnd - yFrom;
    const absDx = Math.abs(dx);
    let c1x;
    let c1y;
    let c2x;
    let c2y;
    if (directional && toKind === "law") {
      const V = Math.max(40, Math.abs(dy) * 0.4);
      c1x = xFrom + dx * 0.5;
      c1y = yFrom;
      c2x = xEnd - nx * V;
      c2y = yEnd - ny * V;
    } else if (directional && toKind === "event") {
      const V = Math.max(40, Math.abs(dy) * 0.4);
      c1x = xFrom + dx * 0.5;
      c1y = yFrom;
      c2x = xEnd;
      c2y = yEnd - V;
    } else if (absDx < 20) {
      const bend = Math.max(40, Math.abs(dy) * 0.3);
      c1x = xFrom + bend;
      c1y = yFrom;
      c2x = xEnd + bend;
      c2y = yEnd;
    } else {
      c1x = xFrom + dx * 0.4;
      c1y = yFrom;
      c2x = xFrom + dx * 0.6;
      c2y = yEnd;
    }
    const d = `M ${xFrom} ${yFrom} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${xEnd} ${yEnd}`;

    // 그룹 컨테이너 (필터 .edge 셀렉터 호환)
    const group = el("g", {
      class: `edge edge-${rel.type}`,
      "data-relation-type": rel.type,
      "data-from": rel.from,
      "data-to": rel.to,
      "data-relation-index": String(idx),
      tabindex: "0",
      role: "img",
    });

    // 보이지 않는 두꺼운 hit area path (마우스/포커스 타깃)
    const hitPath = el("path", {
      d,
      class: "edge-hit",
    });

    // 흰 halo path — 시각 선 바로 아래(문서순서상 먼저 append) 동일 d 실선으로 깔아
    // 동색 막대·짙은 마디 위 통과 시 선이 묻히는 현상 해소.
    // marker-end 절대 미지정(흰 화살촉 중복 방지), dasharray 미지정(실선),
    // halo width = 유형별 색선폭 + 1.6 (succession/basis 3.4, branch 4.0, reference 3.4).
    const HALO_WIDTH = {
      succession: 3.4,
      basis: 3.4,
      branch: 4.0,
      reference: 3.4,
    };
    const haloPath = el("path", {
      d,
      class: "edge-halo",
      fill: "none",
      stroke: "#FFFFFF",
      "stroke-width": HALO_WIDTH[rel.type] || 3.4,
      "stroke-linejoin": "round",
      "pointer-events": "none",
    });

    // 시각용 점선 path — type별 화살표 마커 (reference 제외)
    const lineAttrs = { d, class: "edge-line" };
    if (rel.type !== "reference") {
      lineAttrs["marker-end"] = `url(#arrow-${rel.type})`;
    }
    const linePath = el("path", lineAttrs);

    // 시작·끝 시점 마커 — 시작점·끝점 분리 클래스.
    // 방향성 엣지(succession·basis·branch): 끝점 원은 CSS로 숨김(화살표 머리로 끝 표현),
    // 시작점은 작은 원으로 시점 강조. 무방향(reference): 양 끝 모두 원 노출(범례와 일치).
    const startR = (rel.type === "reference") ? 3.5 : 2.8;
    const endR = (rel.type === "reference") ? 3.5 : 3.5; // 방향성 끝점은 CSS로 숨김
    const startMarker = el("circle", {
      cx: xFrom,
      cy: yFrom,
      r: startR,
      class: `edge-endpoint edge-endpoint-start edge-endpoint-${rel.type}`,
    });
    const endMarker = el("circle", {
      cx: xEnd,
      cy: yEnd,
      r: endR,
      class: `edge-endpoint edge-endpoint-end edge-endpoint-${rel.type}`,
    });

    const title = el("title");
    title.textContent = `${RELATION_LABEL[rel.type] || rel.type} (${rel.year}) ${fromLaw ? fromLaw.name_kr : stripMd(rel.from)} → ${toLaw ? toLaw.name_kr : stripMd(rel.to)}`;
    group.appendChild(title);
    group.appendChild(hitPath);
    group.appendChild(haloPath);
    group.appendChild(linePath);
    group.appendChild(startMarker);
    group.appendChild(endMarker);

    group.addEventListener("mouseenter", (e) => showEdgeTooltip(rel, ctx, e));
    group.addEventListener("mousemove", (e) => moveTooltip(e));
    group.addEventListener("mouseleave", hideTooltip);
    group.addEventListener("click", (e) => {
      e.stopPropagation();
      openEdgePanel(rel, ctx);
    });
    group.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openEdgePanel(rel, ctx);
      }
    });

    g.appendChild(group);
  });

  svg.appendChild(g);
}

/* ============================================================
 * 9. 툴팁
 * ============================================================ */

let tooltipEl = null;

function ensureTooltip() {
  if (!tooltipEl) tooltipEl = document.getElementById("tooltip");
  return tooltipEl;
}

function showTooltipHtml(html, evt) {
  const tip = ensureTooltip();
  if (!tip) return;
  tip.innerHTML = html;
  tip.hidden = false;
  tip.removeAttribute("aria-hidden");
  moveTooltip(evt);
}

function moveTooltip(evt) {
  const tip = ensureTooltip();
  if (!tip || tip.hidden) return;
  const offset = 14;
  const tipW = tip.offsetWidth || 240;
  const tipH = tip.offsetHeight || 60;
  let x = evt.pageX + offset;
  let y = evt.pageY + offset;
  const vw = document.documentElement.clientWidth + window.scrollX;
  const vh = document.documentElement.clientHeight + window.scrollY;
  if (x + tipW > vw - 8) x = evt.pageX - tipW - offset;
  if (y + tipH > vh - 8) y = evt.pageY - tipH - offset;
  tip.style.left = `${Math.max(4, x)}px`;
  tip.style.top = `${Math.max(4, y)}px`;
}

function hideTooltip() {
  const tip = ensureTooltip();
  if (!tip) return;
  tip.hidden = true;
  tip.setAttribute("aria-hidden", "true");
}

function showLawTooltip(law, evt) {
  const endLabel = law.abolished ? law.abolished.split("-")[0] : "현행";
  const html =
    `<strong>${escapeHtml(law.name_kr)}</strong>` +
    `<div class="tooltip-meta">제정 ${escapeHtml(law.enacted)} · ${escapeHtml(endLabel)} · ${escapeHtml(law.category)}</div>`;
  showTooltipHtml(html, evt);
}

function showMilestoneTooltip(law, m, evt) {
  const html =
    `<strong>${escapeHtml(m.label || m.type)}</strong>` +
    `<div class="tooltip-meta">${escapeHtml(m.date)} · ${escapeHtml(law.name_kr)}</div>` +
    (m.law_number ? `<div class="tooltip-meta">${escapeHtml(m.law_number)}</div>` : "");
  showTooltipHtml(html, evt);
}

function showEventTooltip(ev, evt) {
  const dateStr = ev.date || String(ev.year || "");
  const html =
    `<strong>${escapeHtml(ev.title)}</strong>` +
    `<div class="tooltip-meta">${escapeHtml(dateStr)} · ${escapeHtml(ev.government || "")} · ${escapeHtml(ev.category)}</div>`;
  showTooltipHtml(html, evt);
}

/**
 * 관계 엣지의 시작·끝 시점 사실을 type별 의미에 맞춰 객관 데이터로 조립.
 * 모든 시점 텍스트는 laws.json의 enacted·abolished와 relations.json의 year 만 사용.
 * LLM 해석 없음.
 *
 * @returns {{fromText: string, toText: string, arrow: string}}
 */
function describeEdgeEndpoints(rel, fromLaw, toLaw) {
  const fromName = fromLaw ? fromLaw.name_kr : stripMd(rel.from);
  const toName = toLaw ? toLaw.name_kr : stripMd(rel.to);
  const yr = String(rel.year || "");
  let fromText;
  let toText;
  let arrow = "→";
  switch (rel.type) {
    case "succession":
      // from 폐지 → to 제정
      fromText = `${fromName} 폐지 ${fromLaw && fromLaw.abolished ? fromLaw.abolished : yr}`;
      toText = `${toName} 제정 ${toLaw && toLaw.enacted ? toLaw.enacted : yr}`;
      break;
    case "branch":
      // from 폐지 → to 제정 (분할)
      fromText = `${fromName} 폐지 ${fromLaw && fromLaw.abolished ? fromLaw.abolished : yr}`;
      toText = `${toName} 제정 ${toLaw && toLaw.enacted ? toLaw.enacted : yr}`;
      break;
    case "basis": {
      // rel.year 시점이 from 시행 범위 내이면 rel.year 시점, 아니면 from.abolished
      const ry = parseInt(yr, 10);
      const fromEY = fromLaw && fromLaw.enacted_year ? fromLaw.enacted_year : null;
      const fromAY = fromLaw && fromLaw.abolished ? parseInt(String(fromLaw.abolished).split("-")[0], 10) : null;
      const inRange = !Number.isNaN(ry) && fromEY !== null && ry >= fromEY && (fromAY === null || ry <= fromAY);
      if (inRange) {
        fromText = `${fromName} ${yr} 시점`;
      } else if (fromLaw && fromLaw.abolished) {
        fromText = `${fromName} 폐지 ${fromLaw.abolished}`;
      } else if (fromLaw && fromLaw.enacted) {
        fromText = `${fromName} 제정 ${fromLaw.enacted}`;
      } else {
        fromText = `${fromName} ${yr}`;
      }
      toText = `${toName} 제정 ${toLaw && toLaw.enacted ? toLaw.enacted : yr}`;
      break;
    }
    case "reference":
    default:
      // 양 법령 수평 참조 — 무방향
      fromText = `${fromName} (${yr} 시점)`;
      toText = `${toName} (${yr} 시점)`;
      arrow = "↔";
      break;
  }
  return { fromText, toText, arrow };
}

function showEdgeTooltip(rel, ctx, evt) {
  const fromLaw = ctx.lawsById.get(rel.from);
  const toLaw = ctx.lawsById.get(rel.to);
  const label = RELATION_LABEL[rel.type] || rel.type;
  const { fromText, toText, arrow } = describeEdgeEndpoints(rel, fromLaw, toLaw);
  const html =
    `<strong>${escapeHtml(label)} (${escapeHtml(String(rel.year))})</strong>` +
    `<div class="tooltip-meta">${escapeHtml(fromText)} ${escapeHtml(arrow)} ${escapeHtml(toText)}</div>`;
  showTooltipHtml(html, evt);
}

/* ============================================================
 * 10. 사이드 패널 (신뢰성 원칙 §6 준수 — 객관 정보만)
 * ============================================================ */

let panelEl = null;
let panelTitleEl = null;
let panelContentEl = null;
let panelCloseEl = null;

function ensurePanel() {
  if (!panelEl) {
    panelEl = document.getElementById("side-panel");
    panelTitleEl = document.getElementById("side-panel-title");
    panelContentEl = document.getElementById("side-panel-content");
    panelCloseEl = document.getElementById("side-panel-close");
  }
}

function openPanel(titleText, contentHtml) {
  ensurePanel();
  if (!panelEl) return;
  panelTitleEl.textContent = titleText;
  panelContentEl.innerHTML = contentHtml;
  panelEl.hidden = false;
  panelEl.setAttribute("aria-hidden", "false");
}

function closePanel() {
  ensurePanel();
  if (!panelEl) return;
  panelEl.hidden = true;
  panelEl.setAttribute("aria-hidden", "true");
}

function renderLawContent(law, ctx) {
  const aliases = Array.isArray(law.aliases) && law.aliases.length > 0
    ? law.aliases.map(escapeHtml).join(", ")
    : null;
  const endLabel = law.abolished ? `폐지 ${escapeHtml(law.abolished)}` : "현행";
  const verifiedNote = law.verified
    ? "Korean Law MCP 검증"
    : "폐지 법령 — Events MD 출처 기록";

  const milestones = Array.isArray(law.milestones) ? law.milestones : [];
  const milestonesHtml = milestones.length === 0
    ? `<p class="empty">기록된 마디 없음.</p>`
    : `<ul>${milestones.map((m) => {
        const ln = m.law_number ? ` (${escapeHtml(m.law_number)})` : "";
        return `<li>${escapeHtml(m.date)} — ${escapeHtml(m.label || m.type || "")}${ln}</li>`;
      }).join("")}</ul>`;

  // 연결된 정책 이벤트 (객관적 사실 표시)
  const linkedEvents = ctx.eventsByLaw.get(law.id) || [];
  const eventsHtml = linkedEvents.length === 0
    ? ""
    : `<h3>연결된 정책 이벤트</h3><ul>${linkedEvents
        .map((ev) => `<li>${escapeHtml(ev.date || String(ev.year))} — ${escapeHtml(ev.title)}</li>`)
        .join("")}</ul>`;

  return (
    `<p class="meta">제정 ${escapeHtml(law.enacted)} · ${endLabel} · ${escapeHtml(law.category)}</p>` +
    (aliases ? `<p class="aliases">구명·통칭: ${aliases}</p>` : "") +
    `<dl>` +
      `<dt>법령 ID</dt><dd>${escapeHtml(law.law_id || "미부여")}</dd>` +
      `<dt>마스터 ID</dt><dd>${escapeHtml(law.mst || "미부여")}</dd>` +
      `<dt>검증</dt><dd>${escapeHtml(verifiedNote)}</dd>` +
    `</dl>` +
    `<h3>마디</h3>` + milestonesHtml +
    eventsHtml +
    (law.source_note ? `<p class="source">출처: ${escapeHtml(law.source_note)}</p>` : "")
  );
}

function openLawPanel(law, ctx) {
  openPanel(law.name_kr, renderLawContent(law, ctx));
}

function openMilestonePanel(law, m, idx, ctx) {
  // 마디 클릭은 소속 법령 상세를 보여주는 흐름. 상단에 마디 안내 한 줄 추가
  const ln = m.law_number ? ` · ${escapeHtml(m.law_number)}` : "";
  const head =
    `<p class="meta" style="background:#F5F5F5;padding:6px 8px;border-radius:4px;">` +
    `선택 마디: ${escapeHtml(m.date)} — ${escapeHtml(m.label || m.type || "")}${ln}` +
    `</p>`;
  openPanel(law.name_kr, head + renderLawContent(law, ctx));
}

function openEventPanel(ev, ctx) {
  const dateStr = ev.date || String(ev.year || "");
  // 신뢰성: file 필드 노출 금지, interpretation 필드 없음(미사용)
  const linkedLawsHtml = (Array.isArray(ev.law_ids) && ev.law_ids.length > 0)
    ? `<h3>연결된 법령</h3><ul>${ev.law_ids
        .map((id) => {
          const l = ctx.lawsById.get(id);
          return `<li>${escapeHtml(l ? l.name_kr : id)}</li>`;
        })
        .join("")}</ul>`
    : `<h3>연결된 법령</h3><p class="empty">없음 (정책 이벤트 단독).</p>`;

  // 공개용(_deploy) 데이터에는 direction_shift·impact 필드가 없음 → dl 블록 생략
  const scoresHtml =
    (ev.direction_shift !== undefined && ev.impact !== undefined)
      ? `<dl>` +
          `<dt>전환 정도</dt><dd>${escapeHtml(String(ev.direction_shift))} / 5</dd>` +
          `<dt>정책 영향력</dt><dd>${escapeHtml(String(ev.impact))} / 5</dd>` +
        `</dl>`
      : "";

  const html =
    `<p class="meta">${escapeHtml(dateStr)} · ${escapeHtml(ev.government || "")} · ${escapeHtml(ev.category)}</p>` +
    scoresHtml +
    `<h3>개요</h3>` +
    `<p>${escapeHtml(ev.summary || "")}</p>` +
    linkedLawsHtml;

  openPanel(ev.title, html);
}

function openEdgePanel(rel, ctx) {
  const fromLaw = ctx.lawsById.get(rel.from);
  const toLaw = ctx.lawsById.get(rel.to);
  const label = RELATION_LABEL[rel.type] || rel.type;
  const { fromText, toText, arrow } = describeEdgeEndpoints(rel, fromLaw, toLaw);
  const title = `관계: ${fromLaw ? fromLaw.name_kr : stripMd(rel.from)} ${arrow} ${toLaw ? toLaw.name_kr : stripMd(rel.to)}`;
  const html =
    `<p class="meta">${escapeHtml(String(rel.year))} · 유형 ${escapeHtml(label)}</p>` +
    `<dl>` +
      `<dt>시작 시점</dt><dd>${escapeHtml(fromText)}</dd>` +
      `<dt>끝 시점</dt><dd>${escapeHtml(toText)}</dd>` +
    `</dl>` +
    (rel.note ? `<p>${escapeHtml(rel.note)}</p>` : "");
  openPanel(title, html);
}

/* ============================================================
 * 11. 필터 (카테고리·관계 유형)
 * ============================================================ */

// 필터 상태(모듈 변수). 체크박스에서 파생되며, 재렌더가 필터를 깨지 않도록
// render() 끝에서 새 노드에 applyFilters 로 재적용한다.
const filterState = {
  activeCategories: new Set(CATEGORY_ORDER),
  activeRelations: new Set(["succession", "basis", "reference", "branch"]),
};

/**
 * 현재 filterState 를 svg 의 현재 노드 집합에 적용(show/hide).
 * 매 render() 끝에서도 호출되어 새로 생성된 노드에 필터가 반영되게 한다.
 */
function applyFilters(svg, ctx) {
  // 트랙·마디·이벤트 마커: 카테고리 기준
  const allCatNodes = svg.querySelectorAll("[data-category]");
  allCatNodes.forEach((node) => {
    const cat = node.getAttribute("data-category");
    node.style.display = filterState.activeCategories.has(cat) ? "" : "none";
  });

  // 엣지: 관계 유형 + from·to 양쪽 카테고리 모두 활성일 때만 표시.
  //
  // 엔드포인트 id 는 law id(예: "higher_education_act") 또는 event file
  // (예: "1995_531교육개혁.md") 둘 다 가능. lawsById 만으로 해석하면
  // event 측이 undefined → 모든 event↔law 엣지가 숨겨진다(531교육개혁 화살표 소실 버그).
  //
  // 엔드포인트 id 의 카테고리를 law·event 양쪽에서 해석. law 우선 조회 →
  // 없으면 event 조회 → 둘 다 없으면 null(그 엣지는 catOk=false 로 숨김).
  const endpointCategory = (id) => {
    const law = ctx.lawsById.get(id);
    if (law) return law.category;
    const ev = ctx.eventsByFile.get(id);
    if (ev) return ev.category;
    return null;
  };

  const edges = svg.querySelectorAll(".edge");
  edges.forEach((edge) => {
    const type = edge.getAttribute("data-relation-type");
    const fromCat = endpointCategory(edge.getAttribute("data-from"));
    const toCat = endpointCategory(edge.getAttribute("data-to"));
    const typeOk = filterState.activeRelations.has(type);
    // 규칙: 양끝 카테고리가 모두 존재하고 둘 다 활성일 때만 표시.
    const catOk = !!fromCat && !!toCat
      && filterState.activeCategories.has(fromCat)
      && filterState.activeCategories.has(toCat);
    edge.style.display = (typeOk && catOk) ? "" : "none";
  });
}

/**
 * 체크박스 change 바인딩(main 에서 1회). 토글 시 filterState 갱신 후 applyFilters.
 * 재렌더와 독립 — svg 노드는 매번 교체되므로 바인딩 시점의 svg 참조가 아니라
 * 호출 시점의 현재 svg(getSvg())·ctx 를 사용한다.
 */
function bindFilterControls(getSvg, ctx) {
  const catBoxes = document.querySelectorAll(".filter-category");
  const relBoxes = document.querySelectorAll(".filter-relation");

  catBoxes.forEach((box) => {
    box.addEventListener("change", () => {
      const cat = box.getAttribute("data-category");
      if (box.checked) filterState.activeCategories.add(cat);
      else filterState.activeCategories.delete(cat);
      applyFilters(getSvg(), ctx);
    });
  });

  relBoxes.forEach((box) => {
    box.addEventListener("change", () => {
      const type = box.getAttribute("data-relation");
      if (box.checked) filterState.activeRelations.add(type);
      else filterState.activeRelations.delete(type);
      applyFilters(getSvg(), ctx);
    });
  });
}

/* ============================================================
 * 12. 메인 부트스트랩
 * ============================================================ */

// 라벨 ON/OFF 현재 상태(모듈 변수) — 토글·export restore 가 참조.
let currentLabelsOn = false;

async function main() {
  const svg = document.getElementById("timeline-svg");
  if (!svg) {
    console.error("[app] #timeline-svg 요소 없음");
    return;
  }

  // 폰트 로드 완료 후 측정·렌더해야 measureText 폭이 정확. (라벨 레인 패킹 정밀도 직결)
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (_) { /* 폰트 API 미지원 환경에서도 진행 */ }
  }

  // 공개용(_deploy) 모드 감지: <body data-mode="deploy"> 면 _deploy 데이터 로드
  const isDeploy = document.body.dataset.mode === "deploy";

  let data;
  try {
    data = await loadAllData({ deploy: isDeploy });
  } catch (err) {
    console.error("[app] 데이터 로드 실패", err);
    return;
  }

  const { laws, relations, events } = data;

  // 컨텍스트 객체 (각 렌더 함수에 전달)
  const ctx = {
    laws,
    relations,
    events,
    lawsById: new Map(laws.map((l) => [l.id, l])),
    eventsByLaw: eventsByLawId(events),
    // 엣지의 data-from/data-to 는 law id 또는 event file 둘 다 올 수 있음.
    // 필터에서 event 엔드포인트의 category 를 해석하려면 file→event 조회가 필요.
    eventsByFile: new Map(events.map((e) => [e.file, e])),
    relationIndex: indexRelations(relations),
  };

  // 라벨 레인 패킹은 Y 좌표 불요(cx·폭만 사용) → 1회 산정해 레이아웃·렌더 양쪽에 주입.
  // lawsById 키를 넘겨 law_ids[0] 미해결 시 orphan 키로 fallback(renderEvents 와 귀속 일치).
  const lanes = computeLabelLanes(events, SVG_WIDTH, ctx.lawsById);

  /**
   * 전체 렌더 파이프라인. labelsOn 에 따라 레이아웃 여유·라벨/리더 생성 여부가 달라진다.
   * svg 자식 전부 제거 → 레이아웃 재계산 → 모든 레이어 재생성 → 현재 필터 재적용.
   * 토글·export 캡처가 동일 경로로 일관되게 동작.
   */
  function render(labelsOn) {
    currentLabelsOn = labelsOn;

    const layout = buildTrackLayout(laws, events, { labelsOn, lanes });

    // SVG 캔버스 크기 갱신 (라벨 ON 시 totalHeight 증가)
    svg.setAttribute("width", String(SVG_WIDTH));
    svg.setAttribute("height", String(layout.totalHeight));
    svg.setAttribute("viewBox", `0 0 ${SVG_WIDTH} ${layout.totalHeight}`);
    // data-event-labels 속성은 상태 표식용으로 동기화(CSS display 의존 아님 — 라벨은 OFF면 미생성)
    svg.setAttribute("data-event-labels", labelsOn ? "on" : "off");

    // 기존 자식 제거 (재렌더 안전)
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // 렌더 순서: zebra(최하단) → 시간축 → 좌측 라벨 → 트랙 → 마디 → 이벤트(+라벨/리더) → 엣지 (최상위)
    renderZebra(svg, layout);
    const minEnacted = Math.min(...laws.map((l) => l.enacted_year).filter((y) => typeof y === "number"));
    const clampFromYear = Number.isFinite(minEnacted) && minEnacted < TIME_START ? minEnacted : null;
    renderTimeAxis(svg, SVG_WIDTH, layout.totalHeight, clampFromYear);
    renderLeftLabels(svg, layout);
    renderTracks(svg, layout, SVG_WIDTH, ctx);
    renderMilestones(svg, layout, SVG_WIDTH, ctx);
    renderEvents(svg, events, layout, SVG_WIDTH, ctx, labelsOn, lanes.laneByEventIndex);
    renderEdges(svg, relations, layout, SVG_WIDTH, ctx);

    // 새 노드에 현재 필터 상태 재적용 (재렌더가 필터를 깨지 않게)
    applyFilters(svg, ctx);

    console.info(
      `[app] 렌더 완료(labels=${labelsOn ? "on" : "off"}): laws ${laws.length}, ` +
      `relations ${relations.length}, events ${events.length}, ` +
      `tracks ${layout.trackYByLawId.size}, orphanRows ${layout.orphanRows.length}, ` +
      `canvas ${SVG_WIDTH}x${layout.totalHeight}`
    );
  }

  // 필터 체크박스 바인딩(1회) — 현재 svg·ctx 를 호출 시점에 참조.
  bindFilterControls(() => svg, ctx);

  // 이벤트명 라벨 토글 버튼 — 클릭 시 ON/OFF 뒤집어 재렌더 + aria-pressed 동기화.
  const labelBtn = document.getElementById("toggle-event-labels");
  if (labelBtn) {
    labelBtn.addEventListener("click", () => {
      const next = !currentLabelsOn;
      render(next);
      labelBtn.setAttribute("aria-pressed", String(next));
    });
  }

  // 내보내기 버튼 핸들러 바인딩. export 는 반드시 ON 레이아웃을 캡처해야 하므로
  // prepare 에서 ON 으로 재렌더(캡처 직전), restore 에서 캡처 전 상태로 복원.
  // prepare 가 currentLabelsOn 을 덮어쓰므로 진입 시점 상태를 별도 변수에 보관.
  let preExportLabelsOn = false;
  setupExportButtons(svg, {
    dpi: 300,
    prepare: () => {
      preExportLabelsOn = currentLabelsOn;
      render(true);
    },
    restore: () => {
      render(preExportLabelsOn);
      if (labelBtn) labelBtn.setAttribute("aria-pressed", String(preExportLabelsOn));
    },
  });

  // 사이드 패널 닫기 (버튼 + ESC)
  ensurePanel();
  if (panelCloseEl) {
    panelCloseEl.addEventListener("click", closePanel);
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closePanel();
      hideTooltip();
    }
  });

  // 초기 렌더: 라벨 OFF(컴팩트). 버튼 aria-pressed 도 동기화.
  render(false);
  if (labelBtn) labelBtn.setAttribute("aria-pressed", "false");
}

main();
