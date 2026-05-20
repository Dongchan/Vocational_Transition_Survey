/**
 * data-loader.js
 *
 * 한국 직업교육훈련 정책사 — 법령 흐름 시각화의 데이터 로더.
 * 외부 의존성 0. ES Module.
 *
 * 책임 범위:
 *   1) data/laws.json, data/relations.json, data/policy_events.json 비동기 로드
 *   2) 기본 스키마 검증 (필수 필드 존재·타입). 누락 시 console.error
 *   3) viz가 자주 쓸 인덱싱 헬퍼 제공 (getLawById, eventsByLawId)
 *
 * 데이터 자체는 수정하지 않음 (build_data.py가 단일 출처).
 */

const DATA_BASE = "./data";

const LAW_REQUIRED_FIELDS = ["id", "name_kr", "enacted", "category"];
const RELATION_REQUIRED_FIELDS = ["from", "to", "type"];
const EVENT_REQUIRED_FIELDS = ["year", "title", "category"];

const ALLOWED_CATEGORIES = [
  "중등직업교육",
  "직업훈련",
  "고등 및 평생직업교육",
  "진로교육",
  "직무능력 및 자격체계",
];

const ALLOWED_RELATION_TYPES = ["succession", "basis", "reference", "branch"];

/**
 * 단일 JSON 파일을 fetch 하고 배열인지 확인한다.
 *
 * @param {string} relativePath  ./data/foo.json 형식의 상대 경로
 * @returns {Promise<Array>}     파싱된 배열
 */
async function fetchJsonArray(relativePath) {
  let response;
  try {
    response = await fetch(relativePath, { cache: "no-store" });
  } catch (err) {
    console.error(`[data-loader] fetch 실패: ${relativePath}`, err);
    throw err;
  }

  if (!response.ok) {
    const msg = `[data-loader] HTTP ${response.status}: ${relativePath}`;
    console.error(msg);
    throw new Error(msg);
  }

  let parsed;
  try {
    parsed = await response.json();
  } catch (err) {
    console.error(`[data-loader] JSON 파싱 실패: ${relativePath}`, err);
    throw err;
  }

  if (!Array.isArray(parsed)) {
    const msg = `[data-loader] 배열 아님: ${relativePath} (typeof=${typeof parsed})`;
    console.error(msg);
    throw new Error(msg);
  }

  return parsed;
}

/**
 * 객체에 필수 필드가 존재하고 비어있지 않은지 확인한다.
 * `enacted: null` 같이 명시적 null 인 경우는 누락으로 보지 않는다(폐지 법령 등 의도된 null 허용).
 * 단, undefined / 빈 문자열은 누락으로 본다.
 *
 * @param {object} obj
 * @param {string[]} requiredFields
 * @returns {string[]} 누락된 필드명 배열 (비어있으면 OK)
 */
function findMissingFields(obj, requiredFields) {
  const missing = [];
  for (const field of requiredFields) {
    const val = obj[field];
    if (val === undefined) {
      missing.push(field);
    } else if (typeof val === "string" && val.trim() === "") {
      missing.push(field);
    }
  }
  return missing;
}

/**
 * laws 배열 스키마 검증.
 *
 * @param {Array} laws
 * @returns {number} 검증 통과 항목 수
 */
function validateLaws(laws) {
  let okCount = 0;
  const seenIds = new Set();

  laws.forEach((law, idx) => {
    const ref = `laws[${idx}] id=${law && law.id ? law.id : "(no id)"}`;

    if (!law || typeof law !== "object") {
      console.error(`[data-loader] ${ref}: 객체 아님`);
      return;
    }

    const missing = findMissingFields(law, LAW_REQUIRED_FIELDS);
    if (missing.length > 0) {
      console.error(`[data-loader] ${ref}: 필수 필드 누락 [${missing.join(", ")}]`);
      return;
    }

    if (seenIds.has(law.id)) {
      console.error(`[data-loader] ${ref}: id 중복`);
      return;
    }
    seenIds.add(law.id);

    if (!ALLOWED_CATEGORIES.includes(law.category)) {
      console.error(
        `[data-loader] ${ref}: 카테고리 비허용 값 "${law.category}". 허용=[${ALLOWED_CATEGORIES.join(" | ")}]`
      );
      return;
    }

    if (law.milestones !== undefined && !Array.isArray(law.milestones)) {
      console.error(`[data-loader] ${ref}: milestones 가 배열 아님`);
      return;
    }

    okCount += 1;
  });

  return okCount;
}

/**
 * relations 배열 스키마 검증.
 *
 * @param {Array} relations
 * @param {Set<string>} lawIdSet  laws 의 id 집합 (참조 무결성 확인용)
 * @returns {number} 검증 통과 항목 수
 */
function validateRelations(relations, lawIdSet, eventIdSet) {
  let okCount = 0;

  relations.forEach((rel, idx) => {
    const ref = `relations[${idx}]`;

    if (!rel || typeof rel !== "object") {
      console.error(`[data-loader] ${ref}: 객체 아님`);
      return;
    }

    const missing = findMissingFields(rel, RELATION_REQUIRED_FIELDS);
    if (missing.length > 0) {
      console.error(`[data-loader] ${ref}: 필수 필드 누락 [${missing.join(", ")}]`);
      return;
    }

    if (!ALLOWED_RELATION_TYPES.includes(rel.type)) {
      console.error(
        `[data-loader] ${ref}: type 비허용 값 "${rel.type}". 허용=[${ALLOWED_RELATION_TYPES.join(" | ")}]`
      );
      return;
    }

    // from_kind/to_kind 기본값 "law" — 이벤트 ↔ 법령 엣지 지원
    const fromKind = rel.from_kind || "law";
    const toKind = rel.to_kind || "law";
    const fromSet = fromKind === "law" ? lawIdSet : eventIdSet;
    const toSet = toKind === "law" ? lawIdSet : eventIdSet;
    if (!fromSet.has(rel.from)) {
      console.error(`[data-loader] ${ref}: from "${rel.from}" (kind=${fromKind}) 미존재`);
      return;
    }
    if (!toSet.has(rel.to)) {
      console.error(`[data-loader] ${ref}: to "${rel.to}" (kind=${toKind}) 미존재`);
      return;
    }

    okCount += 1;
  });

  return okCount;
}

/**
 * events 배열 스키마 검증.
 *
 * @param {Array} events
 * @param {Set<string>} lawIdSet
 * @returns {number} 검증 통과 항목 수
 */
function validateEvents(events, lawIdSet) {
  let okCount = 0;

  events.forEach((ev, idx) => {
    const ref = `events[${idx}] title=${ev && ev.title ? ev.title : "(no title)"}`;

    if (!ev || typeof ev !== "object") {
      console.error(`[data-loader] ${ref}: 객체 아님`);
      return;
    }

    const missing = findMissingFields(ev, EVENT_REQUIRED_FIELDS);
    if (missing.length > 0) {
      console.error(`[data-loader] ${ref}: 필수 필드 누락 [${missing.join(", ")}]`);
      return;
    }

    if (!ALLOWED_CATEGORIES.includes(ev.category)) {
      console.error(
        `[data-loader] ${ref}: 카테고리 비허용 값 "${ev.category}"`
      );
      return;
    }

    if (typeof ev.year !== "number" || ev.year < 1900 || ev.year > 2100) {
      console.error(`[data-loader] ${ref}: year 범위 이상 (${ev.year})`);
      return;
    }

    if (ev.law_ids !== undefined) {
      if (!Array.isArray(ev.law_ids)) {
        console.error(`[data-loader] ${ref}: law_ids 가 배열 아님`);
        return;
      }
      const unknown = ev.law_ids.filter((id) => !lawIdSet.has(id));
      if (unknown.length > 0) {
        console.error(
          `[data-loader] ${ref}: law_ids 중 laws 에 없는 id [${unknown.join(", ")}]`
        );
        // 참조 무결성 실패는 경고만, 통과 카운트는 증가시키지 않음
        return;
      }
    }

    // direction_shift / impact 범위 검증 (1~5 척도 확정)
    if (ev.direction_shift !== undefined) {
      const v = ev.direction_shift;
      if (typeof v !== "number" || v < 1 || v > 5) {
        console.error(`[data-loader] ${ref}: direction_shift 범위 이상 (${v}, 허용 1~5)`);
        return;
      }
    }
    if (ev.impact !== undefined) {
      const v = ev.impact;
      if (typeof v !== "number" || v < 1 || v > 5) {
        console.error(`[data-loader] ${ref}: impact 범위 이상 (${v}, 허용 1~5)`);
        return;
      }
    }

    okCount += 1;
  });

  return okCount;
}

/**
 * 메인 진입점. JSON 3종을 병렬 로드하고 검증한 뒤 반환한다.
 *
 * @param {{ deploy?: boolean }} [options]
 *   deploy=true: 공개용 policy_events_deploy.json 로드 (direction_shift·impact 제거본).
 *   laws/relations 에는 점수가 없으므로 두 모드 모두 동일 파일 사용.
 * @returns {Promise<{ laws: Array, relations: Array, events: Array }>}
 */
export async function loadAllData(options = {}) {
  const deploy = options.deploy === true;
  const eventsPath = deploy
    ? `${DATA_BASE}/policy_events_deploy.json`
    : `${DATA_BASE}/policy_events.json`;

  const [laws, relations, events] = await Promise.all([
    fetchJsonArray(`${DATA_BASE}/laws.json`),
    fetchJsonArray(`${DATA_BASE}/relations.json`),
    fetchJsonArray(eventsPath),
  ]);

  const lawsOk = validateLaws(laws);
  const lawIdSet = new Set(laws.filter((l) => l && l.id).map((l) => l.id));
  const eventIdSet = new Set(events.filter((e) => e && e.file).map((e) => e.file));
  const relationsOk = validateRelations(relations, lawIdSet, eventIdSet);
  const eventsOk = validateEvents(events, lawIdSet);

  // 요약 로그 (검증 실패 항목은 위에서 개별 console.error 로 이미 출력됨)
  console.info(
    `[data-loader] 로드 완료: laws ${lawsOk}/${laws.length}, ` +
      `relations ${relationsOk}/${relations.length}, ` +
      `events ${eventsOk}/${events.length}`
  );

  return { laws, relations, events };
}

/**
 * id 로 단일 법령을 찾는다.
 *
 * @param {string} id
 * @param {Array} laws
 * @returns {object|undefined}
 */
export function getLawById(id, laws) {
  if (!Array.isArray(laws)) return undefined;
  return laws.find((law) => law && law.id === id);
}

/**
 * law id → 해당 법령에 연결된 events 배열 맵을 구축한다.
 * events[].law_ids 가 0~N 개이므로 1개 이벤트가 여러 법령 키에 등장할 수 있다.
 *
 * @param {Array} events
 * @returns {Map<string, Array>}
 */
export function eventsByLawId(events) {
  const map = new Map();
  if (!Array.isArray(events)) return map;

  for (const ev of events) {
    if (!ev || !Array.isArray(ev.law_ids)) continue;
    for (const lawId of ev.law_ids) {
      if (typeof lawId !== "string") continue;
      if (!map.has(lawId)) {
        map.set(lawId, []);
      }
      map.get(lawId).push(ev);
    }
  }

  return map;
}

/**
 * relations 를 from-law-id 기준 / to-law-id 기준으로 인덱싱한 두 맵을 반환한다.
 * viz 가 트랙별 관계 엣지를 빠르게 조회할 때 사용.
 *
 * @param {Array} relations
 * @returns {{ outgoing: Map<string, Array>, incoming: Map<string, Array> }}
 */
export function indexRelations(relations) {
  const outgoing = new Map();
  const incoming = new Map();
  if (!Array.isArray(relations)) return { outgoing, incoming };

  for (const rel of relations) {
    if (!rel || typeof rel !== "object") continue;
    if (typeof rel.from === "string") {
      if (!outgoing.has(rel.from)) outgoing.set(rel.from, []);
      outgoing.get(rel.from).push(rel);
    }
    if (typeof rel.to === "string") {
      if (!incoming.has(rel.to)) incoming.set(rel.to, []);
      incoming.get(rel.to).push(rel);
    }
  }

  return { outgoing, incoming };
}
