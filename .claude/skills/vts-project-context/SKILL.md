---
name: vts-project-context
description: "Vocational_Transition_Survey 법령 시각화 트랙의 공유 컨텍스트(데이터 스키마, 출력 사양, 색상 팔레트, 폰트·접근성 규칙, 신뢰성·노출 자료 원칙). scaffold-engineer·viz-engineer·qa-validator는 작업 시작 전 반드시 이 스킬을 먼저 읽을 것."
---

# vts-project-context

Vocational_Transition_Survey 법령 시각화 웹페이지를 만드는 모든 에이전트가 공유해야 하는 컨텍스트. 작업 시작 전에 반드시 이 문서를 읽고 후속 결정을 이 사양에 맞춘다.

## 1. 산출물 위치

```
Voc_edu_history/
├── index.html              ← scaffold-engineer
├── css/style.css           ← scaffold-engineer
├── js/data-loader.js       ← scaffold-engineer
├── js/app.js               ← viz-engineer
├── data/laws.json          ← 기 작성 (수정 금지, build_data.py가 단일 출처)
├── data/relations.json     ← 기 작성 (수정 금지)
├── data/policy_events.json ← 기 작성 (수정 금지)
└── scripts/build_data.py   ← 데이터 단일 출처(편집 금지, 본 트랙 범위 외)
```

## 2. 데이터 스키마 (실제 JSON 기반)

### 2.1 `data/laws.json` — 18개 법령

```jsonc
{
  "id": "industrial_education_act",            // 고유 ID, viz·relations 연결 키
  "name_kr": "산업교육진흥 및 산학연협력촉진에 관한 법률",
  "aliases": ["산업교육진흥법"],                  // 구명·통칭 (사이드 패널에 함께 표기)
  "enacted": "1963-09-19",                     // ISO 날짜
  "enacted_year": 1963,
  "abolished": null,                           // 폐지일 또는 null (= 현행)
  "category": "중등직업교육",                    // 5개 카테고리 중 하나
  "track_order": 1,                            // 카테고리 내 정렬용 (참고만, viz는 자체 정렬 가능)
  "mst": "267351",                             // 법제처 마스터 ID (검증된 경우)
  "law_id": "000865",                          // 법제처 법령ID (검증된 경우)
  "verified": true,                            // MCP 검증 여부 (false면 폐지 법령)
  "milestones": [
    { "date": "1963-09-19", "type": "enacted", "label": "산업교육진흥법 제정", "law_number": "법률 제1403호" },
    { "date": "1996", "type": "renamed", "label": "..." },
    { "date": "2003", "type": "renamed", "label": "..." }
  ],
  "source_note": "MCP search_law(2026-05-18): 현행 법령 mst=267351, 공포 20241220"
}
```

**milestone.type 값**: `enacted`, `major_amended`, `renamed`, `abolished` 등.
이 중 `enacted` → `●`, `major_amended`·`renamed` → `▲`, `abolished` → `◆` 로 매핑(viz-engineer 자유 재량). 정책 이벤트(`★`)는 별도 데이터 소스.

### 2.2 `data/relations.json` — 15개 관계 엣지

```jsonc
{
  "from": "vocational_training_act_1967",      // laws[].id
  "to": "vocational_training_special_act",     // laws[].id
  "type": "basis",                             // succession | basis | reference | branch
  "year": 1974,
  "note": "..."
}
```

### 2.3 `data/policy_events.json` — 29개 정책 이벤트

```jsonc
{
  "file": "1963_산업교육진흥법.md",              // 원본 파일명 (UI 노출 금지, 디버깅용)
  "year": 1963,
  "date": "1963-09-19",
  "title": "산업교육진흥법 제정과 국가주도 직업교육체제의 형성",
  "category": "중등직업교육",
  "government": "박정희 정부",
  "direction_shift": 5,                        // 1~5 (1: 연장, 5: 방향전환)
  "impact": 5,                                 // 1~5 (1: 매우제한, 5: 지대함)
  "law_ids": ["industrial_education_act"],     // 0~N개, 연결될 법령 트랙
  "summary": "..."                             // 객관적 정책 사실 요약 (노출 OK)
}
```

**점수 척도는 반드시 1–5**. 7점 척도는 잘못된 추정(과거 사고). 사이드 패널 표기는 "전환 정도: 4/5", "정책 영향력: 5/5" 형식.

## 3. 카테고리·색상 팔레트

5개 카테고리. 색맹 친화 팔레트(Okabe-Ito 기반)를 사용한다. CSS 변수로 정의해 viz-engineer가 재사용한다.

```css
:root {
  /* 카테고리 — 색맹 친화 (Okabe-Ito 변형) */
  --cat-secondary-voc: #E69F00;     /* 중등직업교육 — 주황 */
  --cat-vocational-training: #0072B2; /* 직업훈련 — 파랑 */
  --cat-higher-lifelong: #009E73;   /* 고등 및 평생직업교육 — 초록 */
  --cat-career: #CC79A7;            /* 진로교육 — 자홍 */
  --cat-qualification: #56B4E9;     /* 직무능력 및 자격체계 — 하늘 */

  /* 관계 엣지 — 카테고리와 명확히 구분되는 무채색·검정 계열 */
  --edge-succession: #000000;       /* 계승 — 검정 점선 */
  --edge-basis: #555555;            /* 기반 — 진회색 점선 */
  --edge-reference: #999999;        /* 연관 — 연회색 점선 */
  --edge-branch: #D55E00;           /* 분기 — 적주황 점선 (강조) */

  /* 배경·텍스트 */
  --bg-page: #FAFAFA;
  --bg-panel: #FFFFFF;
  --text-primary: #1A1A1A;
  --text-secondary: #555555;
  --border: #DDDDDD;
}
```

## 4. 트랙 정렬 규칙 (사용자 확정)

**카테고리 그룹 → 그룹 내 제정연도순**. 위에서 아래로 카테고리를 묶고, 같은 카테고리 안에서는 제정 연도 오래된 순으로 배치.

카테고리 표시 순서(상→하 권장, viz-engineer 재량으로 조정 가능):
1. 중등직업교육
2. 직업훈련
3. 고등 및 평생직업교육
4. 진로교육
5. 직무능력 및 자격체계

## 5. 시각 사양

### 5.1 폰트
- 본문 텍스트: 최소 15px. 표·버튼 라벨도 15px 이상
- 헤더(h1·h2): 18~24px
- 툴팁: 14px까지 허용 (작은 박스 공간 고려)

### 5.2 라이트 모드 단일 테마
- `prefers-color-scheme: dark` 분기 절대 금지
- `.dark`·`data-theme="dark"` 등 분기 변수도 만들지 않음
- 다크 모드 토글 UI도 없음

### 5.3 마디 도형
- `●` 제정: `<circle r="8">` (지름 16px, 클릭 가능 영역 보장)
- `▲` 주요개정: `<polygon>` (한 변 약 16px)
- `◆` 분기/폐지: `<polygon>` (마름모, 대각선 16px)
- `★` 정책이벤트: `<polygon>` 또는 `<path>` (5각별, 외접원 지름 18px). 강조 색 사용

### 5.4 엣지
- 베지어 곡선 `<path d="M ... C ...">`
- `stroke-dasharray: 6 4` (점선 통일)
- 유형별 색상은 CSS 변수 (위 §3)

## 6. 신뢰성·노출 자료 원칙 (절대 위반 금지)

### 노출 OK (객관적 사실)
- 법령: `name_kr`, `aliases`, `enacted`, `abolished`, `category`, `milestones`, `source_note`, `law_id`, `mst`, `verified` 표시
- 정책 이벤트: `year`, `date`, `title`, `category`, `government`, `direction_shift`, `impact`, `summary`
- 관계: `from`·`to` 법령명, `type` 한글 라벨, `year`, `note`

### 노출 금지 (LLM 작성 해석·견해)
- Events MD의 `## 분석 제안`, `### 의미 견해 초안` 텍스트 — **이미 `policy_events.json`에서 제거됨**
- `interpretation` 필드 — **이미 제거됨**
- 작업 중 새로 LLM 해석을 추가해 노출하는 것 일체 금지

### 노출 금지 (내부 디버그)
- `policy_events[].file` 필드 (디버그용)

이 원칙은 사용자가 명시한 신뢰성 요구사항이다. 한 번이라도 위반하면 QA가 즉시 FAIL.

## 7. GitHub Pages 배포 호환

- 모든 경로는 상대 경로 (`./data/laws.json`, `./css/style.css`)
- 절대 경로(`/data/...`) 금지
- 외부 CDN 의존성 0, 외부 라이브러리 0
- `<script type="module">` 사용 시 같은 origin 보장 (로컬 서버 또는 GitHub Pages 환경 전제)

## 8. 한글 문체 원칙 (UI 노출 텍스트)

- 비유·관용구 금지 (예: "트랙", "호(arc)" 같은 비유 표현 사용 금지)
- 명사형 종결 (예: "제정됨", "분기됨")
- 따옴표 격언으로 시작하지 않음
- 사이드 패널 안내·설명 텍스트도 본 규칙 적용

## 9. 변경 시 영향 범위

| 파일 변경 | 영향 |
|---|---|
| `data/*.json` 직접 수정 | **금지**. `scripts/build_data.py` 상수만 수정하고 재빌드 |
| `index.html`의 hook ID 변경 | viz-engineer의 querySelector 전부 영향. SendMessage 필수 |
| `style.css`의 CSS 변수명 변경 | viz-engineer의 색상 사용 부분 전부 영향. SendMessage 필수 |
| `app.js` 변경 | scaffold 영향 없음. qa-validator 재검증 필요 |

## 10. 참조

- 상세 사양: `Voc_edu_history/Plan_History_analysis.md`
- 작업 원칙(상위): `Law_map_workflow.md`
- 두 트랙 상태: `WorkingHistory.md` 최상단 컨텍스트 블록
