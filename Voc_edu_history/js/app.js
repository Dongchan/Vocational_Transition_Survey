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
import { setupExportButtons } from "./export.js?v=20260520h";

/* ============================================================
 * 1. 상수 및 헬퍼
 * ============================================================ */

const SVG_NS = "http://www.w3.org/2000/svg";

const TIME_START = 1945;
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
const LAW_ROW_H = 48;        // 법령 트랙 행 높이
const GROUP_GAP = 16;        // 카테고리 그룹 사이 여백
const TOP_AXIS_H = 60;       // 상단 시간축 영역 높이
const BAR_HEIGHT = 16;       // 트랙 막대 높이

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
 * 2. 트랙 레이아웃 (카테고리 그룹 → 제정연도순)
 * ============================================================ */

/**
 * @returns {{
 *   rows: Array<{ kind: 'header'|'law', y: number, category?: string, law?: object }>,
 *   trackYByLawId: Map<string, number>,
 *   totalHeight: number,
 *   orphanRows: Array<{ category: string, y: number }>
 * }}
 */
function buildTrackLayout(laws, events) {
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
 * 3. 시간축 (10년 grid + 5년 보조)
 * ============================================================ */

function renderTimeAxis(svg, width, totalHeight) {
  const g = el("g", { class: "time-axis" });

  for (let year = TIME_START; year <= TIME_END; year += 5) {
    const x = yearToX(year, width);
    const isDecade = year % 10 === 0;
    const line = el("line", {
      x1: x,
      x2: x,
      y1: TOP_AXIS_H - 10,
      y2: totalHeight - 10,
      stroke: isDecade ? "#CCCCCC" : "#EEEEEE",
      "stroke-width": isDecade ? 1 : 1,
    });
    g.appendChild(line);

    if (isDecade) {
      const label = el("text", {
        x: x,
        y: TOP_AXIS_H - 16,
        "text-anchor": "middle",
        "font-size": 15,
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
      "font-size": 15,
      fill: "#555555",
    });
    endLabel.textContent = String(TIME_END);
    g.appendChild(endLabel);
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
      opacity: 0.85,
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

function renderEvents(svg, events, layout, width, ctx) {
  const g = el("g", { class: "events-layer" });
  // 라벨 별도 그룹: SVG data-event-labels 속성으로 CSS 가시성 토글.
  // 내보내기(PNG/SVG) 시 export.js 가 클론에 data-event-labels="on" 강제.
  const labelG = el("g", { class: "event-labels" });
  const orphanYByCat = new Map();
  for (const o of layout.orphanRows) orphanYByCat.set(o.category, o.y);

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

    // 라벨: 마커 위 10px, -30° 회전 (우상단 방향, 위로 솟는 높이를 시간축 침범 회피 수준으로 억제)
    if (ev.short_label) {
      const lblX = cx;
      const lblY = cy - 14 - 10;
      const lbl = el("text", {
        x: lblX,
        y: lblY,
        class: "event-label",
        "text-anchor": "start",
        transform: `rotate(-30 ${lblX} ${lblY})`,
      });
      lbl.textContent = ev.short_label;
      labelG.appendChild(lbl);
    }
  });

  svg.appendChild(g);
  svg.appendChild(labelG);
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
function computeArrowEndPoint(xTo, yTo, dxSign) {
  // === USER FILL START ===
  const r = MILESTONE_ENACTED_R;
  const alpha = Math.PI / 3; // 60° — 2시(좌→우) / 10시(우→좌) 방향
  const sinA = Math.sin(alpha);
  const cosA = Math.cos(alpha);
  const xEnd = xTo + dxSign * r * sinA;
  const yEnd = yTo - r * cosA;
  // 화살촉이 마디 원 중심을 향하도록 진입 방향(= 끝점→중심) 단위 벡터도 함께 반환.
  // c2 = xEnd - V·nx, yEnd - V·ny 형태로 쓰면 path 마지막 접선이 마디 표면 접선과 수직.
  const nx = -dxSign * sinA;
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

  relations.forEach((rel, idx) => {
    if (!rel) return;

    // RELATIONS 모델: from_kind/to_kind 기본값 "law" — 이벤트 ↔ 법령 엣지 지원
    const fromKind = rel.from_kind || "law";
    const toKind = rel.to_kind || "law";

    // 좌표 산출 — law는 트랙 행 y + (succession/basis/branch 시점) x, event는 별표 (x, y) 단일 지점
    let xFrom, yFrom, xTo, yTo;
    const fromLaw = (fromKind === "law") ? ctx.lawsById.get(rel.from) : null;
    const toLaw = (toKind === "law") ? ctx.lawsById.get(rel.to) : null;

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
        xTo = pickLawSideX(rel, toLaw, width);
      }
    }

    if (yFrom === undefined || yTo === undefined || xFrom === undefined || xTo === undefined) {
      console.warn(`[app] relation[${idx}] 좌표 미존재 from=${rel.from}(${fromKind}) to=${rel.to}(${toKind})`);
      return;
    }

    // 방향성 엣지(succession·basis·branch)의 끝점은 to 트랙 ● 마디 정수리 부근(12시~1시)으로 진입.
    // computeArrowEndPoint로 마디 경계선 위 좌표를 받아 c2 제어점을 끝점 바로 위로 끌어올려
    // 마지막 접선이 거의 수직이 되도록 함 — 화살촉이 마디 위쪽에서 아래로 꽂힘.
    // reference는 무방향이라 양 끝 원 유지·수평 진입 그대로.
    const directional = rel.type === "succession" || rel.type === "basis" || rel.type === "branch";
    const dxRaw = xTo - xFrom;
    const dxSign = dxRaw >= 0 ? 1 : -1;

    let xEnd = xTo;
    let yEnd = yTo;
    let nx = 0; // 끝점→마디 중심 방향 (단위벡터). law 측 to에만 의미
    let ny = 0;
    // 끝점 진입 로직은 to가 law(마디 ●)일 때만 — event(★) 끝점은 별 중심 그대로 사용
    if (directional && toKind === "law") {
      const ep = computeArrowEndPoint(xTo, yTo, dxSign);
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

function setupFilters(svg, layout, ctx) {
  const catBoxes = document.querySelectorAll(".filter-category");
  const relBoxes = document.querySelectorAll(".filter-relation");

  const state = {
    activeCategories: new Set(CATEGORY_ORDER),
    activeRelations: new Set(["succession", "basis", "reference", "branch"]),
  };

  function applyFilters() {
    // 트랙·마디·이벤트 마커: 카테고리 기준
    const allCatNodes = svg.querySelectorAll("[data-category]");
    allCatNodes.forEach((node) => {
      const cat = node.getAttribute("data-category");
      if (state.activeCategories.has(cat)) {
        node.style.display = "";
      } else {
        node.style.display = "none";
      }
    });

    // 좌측 법령 라벨은 data-law-id 만 있는 경우(라벨 텍스트 자체에 data-category 있음)이미 위에서 처리됨

    // 엣지: 관계 유형 + from·to 양쪽 카테고리 모두 활성일 때만 표시
    const edges = svg.querySelectorAll(".edge");
    edges.forEach((edge) => {
      const type = edge.getAttribute("data-relation-type");
      const fromId = edge.getAttribute("data-from");
      const toId = edge.getAttribute("data-to");
      const fromLaw = ctx.lawsById.get(fromId);
      const toLaw = ctx.lawsById.get(toId);
      const typeOk = state.activeRelations.has(type);
      const catOk = fromLaw && toLaw
        && state.activeCategories.has(fromLaw.category)
        && state.activeCategories.has(toLaw.category);
      edge.style.display = (typeOk && catOk) ? "" : "none";
    });
  }

  catBoxes.forEach((box) => {
    box.addEventListener("change", () => {
      const cat = box.getAttribute("data-category");
      if (box.checked) state.activeCategories.add(cat);
      else state.activeCategories.delete(cat);
      applyFilters();
    });
  });

  relBoxes.forEach((box) => {
    box.addEventListener("change", () => {
      const type = box.getAttribute("data-relation");
      if (box.checked) state.activeRelations.add(type);
      else state.activeRelations.delete(type);
      applyFilters();
    });
  });
}

/* ============================================================
 * 12. 메인 부트스트랩
 * ============================================================ */

async function main() {
  const svg = document.getElementById("timeline-svg");
  if (!svg) {
    console.error("[app] #timeline-svg 요소 없음");
    return;
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
    relationIndex: indexRelations(relations),
  };

  // 트랙 레이아웃 계산
  const layout = buildTrackLayout(laws, events);

  // SVG 캔버스 크기 설정
  svg.setAttribute("width", String(SVG_WIDTH));
  svg.setAttribute("height", String(layout.totalHeight));
  svg.setAttribute("viewBox", `0 0 ${SVG_WIDTH} ${layout.totalHeight}`);
  // 이벤트 라벨 토글 디폴트 OFF (탐색 시 깔끔). 내보내기 시 export.js 가 강제 ON.
  svg.setAttribute("data-event-labels", "off");

  // 기존 자식 제거 (재호출 안전)
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  // 렌더 순서: 시간축 → 좌측 라벨 → 트랙 → 마디 → 이벤트 → 엣지 (최상위)
  // 엣지를 마지막에 그려 화살표가 마디 도형(●▲◆)·이벤트 마커(★)에 가려지지 않도록 함.
  // back-off 처리로 끝점이 마디 직전에서 멈추므로 마디 도형 자체는 가독성 유지.
  renderTimeAxis(svg, SVG_WIDTH, layout.totalHeight);
  renderLeftLabels(svg, layout);
  renderTracks(svg, layout, SVG_WIDTH, ctx);
  renderMilestones(svg, layout, SVG_WIDTH, ctx);
  renderEvents(svg, events, layout, SVG_WIDTH, ctx);
  renderEdges(svg, relations, layout, SVG_WIDTH, ctx);

  // 필터 셋업
  setupFilters(svg, layout, ctx);

  // 내보내기 버튼(헤더의 #export-svg / #export-png) 핸들러 바인딩.
  // 렌더 완료 후 호출해야 width/height·자식 트리가 확정된 상태에서 캡처됨.
  setupExportButtons(svg, { dpi: 300 });

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

  console.info(
    `[app] 렌더 완료: laws ${laws.length}, relations ${relations.length}, events ${events.length}, ` +
    `tracks ${layout.trackYByLawId.size}, orphanRows ${layout.orphanRows.length}, ` +
    `canvas ${SVG_WIDTH}x${layout.totalHeight}`
  );
}

main();
