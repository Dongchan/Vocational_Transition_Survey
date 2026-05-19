---
title: 한국 직업교육훈련 정책사 법령 흐름 웹페이지 — 작업 계획서
created: 2026-05-18
status: phase_A_completed
target_deploy: GitHub Pages
---

# 한국 직업교육훈련 정책사 법령 흐름 웹페이지 — 작업 계획서

## 1. 작업 배경 및 목적

본 작업은 한국 직업교육훈련 정책의 변천을 **법령 단위 시간축**으로 재구성하여, 정책-법령-제도/사업의 연동 구조를 단일 화면에서 조망 가능하도록 만드는 정적 웹페이지 제작을 목적으로 함. 기존 `Vocational_Transition_Survey` 프로젝트의 29개 정책 이벤트 자료(Phase 2 완료)를 법령 중심 시각화에 재활용하되, 단순 나열이 아닌 법령 간 **제정·개정·분기·기반 관계**를 시각적으로 표현함.

작업 원칙은 `Law_map_workflow.md`에 명시된 4가지 — (a) 가독성(폰트 15px 이상), (b) Korean Law MCP를 통한 신뢰성 확보, (c) 라이트 모드 단일 테마, (d) GitHub URL 배포 — 를 준수함. 모든 작업 산출물은 `Voc_edu_history/` 하위에 한정함.

## 2. 사용자 합의 사항

| 결정 항목 | 채택안 |
|---|---|
| 법령 범위 | Events/ 29건 `key_documents`에 등장하는 직업교육훈련 모법 10~15개 (+분기·기반 관계로 직접 연결된 법령) |
| 시각화 형태 | 가로 타임라인 + 법령별 트랙 + 분기/계승 점선 화살표 |
| 기술 스택 | Vanilla HTML/CSS/SVG + JS (외부 라이브러리 의존성 0, 데이터는 JSON 분리) |
| Events 연계 | 법령 트랙 위에 정책 이벤트 마커 추가, 클릭 시 Events MD의 객관적 정보(연도·정부·카테고리·개요)만 사이드 패널에 노출. LLM이 작성한 해석·견해(Phase 2 분석 제안)는 미노출 |

## 3. 시각화 사양

### 3.1 노드(트랙)

- 각 법령은 **가로 막대** 1개로 표현
- 막대 시작점 = 제정일, 끝점 = 폐지일(없으면 현재 = 2026)
- 막대 색상은 카테고리별 구분 (중등직업교육·직업훈련·고등 및 평생직업교육·진로교육·직무능력 및 자격체계)

### 3.2 마디 (Milestone)

| 기호 | 종류 | 의미 |
|---|---|---|
| ● | 제정 | 법령 최초 제정 시점 |
| ▲ | 주요 개정 | 전부개정 또는 핵심 일부개정 |
| ◆ | 분기/폐지 | 법령이 분할되거나 폐지된 시점 |
| ★ | 정책 이벤트 | Events/ 29건 중 해당 법령 연관 정책 이벤트 |

### 3.3 엣지 (Edge, 트랙 간 연결)

| 유형 | 정의 | 시각 표현 |
|---|---|---|
| 분기 (branch) | 한 법령이 둘 이상으로 분리 | 색상 A, 점선 |
| 계승 (succession) | 구법 폐지 후 신법 시행 | 색상 B, 점선 |
| 기반 (basis) | 모법-자법 관계 또는 직접적 영향 | 색상 C, 점선 |
| 연관 (reference) | 수평적 상호참조 | 색상 D, 점선 |

### 3.4 인터랙션

- **호버**: 마디·막대 위에 마우스 진입 시 툴팁 표시 (법령명·시점·요약)
- **클릭**: 우측 사이드 패널 펼침 — 법령 메타·개정 사유·정책 이벤트 요약 표시
- **필터**: 카테고리 및 관계 유형(분기/계승/기반/연관) 토글 가능

### 3.5 가독성 요구사항

- 본문 폰트 최소 15px, 헤더는 18~24px
- 라이트 모드 단일 테마 (배경 #FAFAFA 또는 흰색 계열)
- 색맹 친화 팔레트 적용
- 마디 도형의 크기는 16px 이상으로 클릭 가능 영역 확보

## 4. 폴더 구조 (최종 산출 형태)

```
Vocational_Transition_Survey/
├── .gitignore                       ← Events/, Screenshot/ 등록 (완료)
├── Law_map_workflow.md              (기존)
├── Plan_Summary.md                  (기존)
├── WorkingHistory.md                (기존, 작업 이력 추가)
└── Voc_edu_history/                 ← 신규
    ├── Plan_History_analysis.md     ← 본 파일
    ├── index.html
    ├── css/
    │   └── style.css
    ├── js/
    │   ├── app.js
    │   └── data-loader.js
    ├── data/
    │   ├── laws.json
    │   ├── relations.json
    │   └── policy_events.json
    └── README.md
```

## 5. Phase별 작업 계획

### Phase A. 폴더·gitignore 인프라 (완료)

1. `Voc_edu_history/` 신규 생성, 하위 `css/`·`js/`·`data/` 디렉토리 구성
2. 프로젝트 루트 `.gitignore` 신규 작성: Events/, Screenshot/ 및 일반적 부산물 등록
3. 본 계획서(`Plan_History_analysis.md`) 작성

### Phase B. 법령 메타데이터 수집·정규화

1. Events/ 29건 frontmatter의 `key_documents` 필드 일괄 수집 → 등장 법령 후보 목록 도출
2. 후보별 Korean Law MCP 호출:
   - `search_law`: 정식 법령명·법령ID 확인
   - `get_law_text`: 제정일·시행일·폐지 여부·전부개정/일부개정 이력 추출
   - `chain_amendment_track`: 개정 이력 체계화
   - `chain_law_system`: 모법-자법 관계 파악
   - `impact_map`: 영향 관계 매핑
3. 추정 금지 원칙: MCP가 확인하지 못한 관계는 데이터에서 제외하거나 `verified: false` 플래그 부여
4. 산출물: `data/laws.json`·`data/relations.json`·`data/policy_events.json`

#### 예상 1차 법령 후보 (MCP 검증 후 확정)

| 카테고리 | 법령 후보 |
|---|---|
| 직업훈련 | 직업훈련법(1967) → 직업훈련기본법(1976) → 근로자직업훈련촉진법(1997) → 근로자직업능력개발법 → 국민평생직업능력개발법(2021), 사업내직업훈련법(1974), 고용보험법(1995) |
| 중등직업교육 | 산업교육진흥법(1963) → 산업교육진흥 및 산학연협력촉진에 관한 법률 |
| 고등 및 평생직업교육 | 고등교육법(전문대학 조항), 평생교육법, 인적자원개발기본법(2002) |
| 진로교육 | 진로교육법(2015) |
| 직무능력 및 자격체계 | 국가기술자격법(1973 계열), 기능장려법(1989), 자격기본법(1997) |
| 거버넌스 | 국가교육위원회법(2021) |

### Phase C. 데이터 모델 설계

```jsonc
// laws.json (배열, 법령 정의)
{
  "id": "vocational_training_act",
  "name_kr": "직업훈련법",
  "name_full": "직업훈련에 관한 법률",
  "enacted": "1967-01-16",
  "abolished": "1976-12-31",
  "successor_id": "vocational_training_basic_act",
  "track_order": 2,
  "category": "직업훈련",
  "milestones": [
    { "date": "1967-01-16", "type": "enacted", "label": "제정" },
    { "date": "1974-12-26", "type": "amended", "label": "사업내직업훈련 의무제 신설" },
    { "date": "1976-12-31", "type": "abolished", "label": "직업훈련기본법으로 대체" }
  ],
  "source_mcp": "law_id_xxxxx",
  "verified": true
}

// relations.json (배열, 관계 엣지)
{
  "from": "vocational_training_act",
  "to": "vocational_training_basic_act",
  "type": "succession",
  "year": 1976,
  "note": "직업훈련법 폐지 후 직업훈련기본법 시행"
}

// policy_events.json (배열, Events/ 29건 요약본)
{
  "year": 1963,
  "title": "산업교육진흥법 제정과 국가주도 직업교육체제의 형성",
  "category": "중등직업교육",
  "law_id": "industrial_education_act",
  "direction_shift": 5,
  "impact": 5,
  "summary": "<Events MD ## 개요 첫 2문장 — 정책 사실 요약>",
  "event_file": "Events/1963_산업교육진흥법.md"
}
```

### Phase D. 웹페이지 구현 (harness 스킬 사용)

본 Phase는 `harness` 스킬을 통해 진행. 코드 작성·테스트·디버깅 사이클을 harness 환경 안에서 처리하고, 정적 자산만 최종 산출함.

- `index.html`: 헤더(제목·범례·필터), 메인 SVG 캔버스 컨테이너, 우측 사이드 패널, 푸터(자료 출처)
- `css/style.css`: 라이트 모드 팔레트, 최소 15px 폰트, 트랙·마디·엣지 스타일, 반응형 가로 스크롤
- `js/data-loader.js`: JSON 3종 비동기 로드 및 스키마 검증
- `js/app.js`:
  1. 시간축 스케일 함수 (1960~2026 → SVG x좌표 변환)
  2. 법령 트랙 `<rect>` 렌더링
  3. 마디 도형(`<circle>`·`<polygon>`) 배치
  4. 관계 엣지 `<path>` (베지어 곡선 + `stroke-dasharray` 점선)
  5. 호버·클릭 이벤트 핸들러 → 툴팁/사이드 패널 렌더
  6. 카테고리·관계 유형 필터 토글
- 정책 이벤트 마커(`★`) 클릭 시 사이드 패널에 Events MD의 **객관적 정보**(연도·날짜·정부·카테고리·개요 첫 2문장)만 표시. LLM이 작성한 해석·평가(`## 분석 제안`·`### 의미 견해 초안`)는 신뢰성 검증 자료가 아니므로 노출하지 않음. Events MD 원본은 빌드 시점에 `policy_events.json`으로 추출만 하고, 런타임에 Events/ 폴더를 참조하지 않음 (`.gitignore`와 일관)

### Phase E. 검증

1. 모든 마디·엣지에 `source_mcp` 또는 `verified: true` 표기 — MCP 미검증 0건
2. 로컬에서 `index.html`을 열어 다음 확인:
   - 본문 폰트 15px 이상
   - 라이트 모드 색상 적용
   - 1960~2026 전 범위 가로 스크롤 가능
   - 29개 정책 이벤트 마커 모두 표시 및 사이드 패널 동작
3. 색맹 시뮬레이터로 1회 패스
4. Korean Law MCP `verify_citations`로 법령 ID·시행일 재검증
5. 본 검증 체크리스트 일대일 대조

## 6. 검증 체크리스트

- [ ] `Voc_edu_history/` 폴더 외부에 작업 파일 생성 없음 (단, 루트 `.gitignore`는 예외)
- [ ] `.gitignore`에 Events/·Screenshot/ 등록 및 git status에서 미추적 확인
- [ ] `data/laws.json`의 모든 법령에 `enacted` 일자와 `source_mcp` 또는 `verified` 필드 존재
- [ ] `data/relations.json`의 모든 엣지가 `from`·`to`·`type`·`year` 필수 필드 보유
- [ ] `data/policy_events.json` 행 수 = 29 (Events/ 파일 수와 일치)
- [ ] `index.html` 본문 텍스트 최소 15px (DevTools 측정)
- [ ] 라이트 모드 단일 테마, 다크 모드 분기 없음
- [ ] 색맹 시뮬레이터 통과
- [ ] GitHub Pages 배포 호환 (절대 경로 사용 없음, 상대 경로만)
- [ ] Events/·Screenshot/ 원본 자료가 산출물에 포함되지 않음

## 7. 핵심 참조 자료

- 작업 원칙: `Law_map_workflow.md`
- 정책 이벤트 인덱스 및 카테고리: `Plan_Summary.md` 섹션 5·6
- 정책 이벤트 원본 메타: `Events/*.md` (29건)
- 법령 정보 출처: Korean Law MCP (`search_law`, `get_law_text`, `chain_amendment_track`, `chain_law_system`, `impact_map`, `verify_citations`)

## 8. 적용 작업 원칙

- **추정 금지**: 법령 메타데이터(제정일·폐지 여부·분기 관계)는 MCP 응답을 1차 근거로 함. MCP에서 확인되지 않은 항목은 시각화에서 제외 또는 `verified: false`로 별도 표기. (메모리: `feedback_verify-source-before-assumed-params`)
- **문체 원칙**: 사이드 패널·툴팁·README 등 사용자 노출 텍스트는 비유·관용구 금지, 명사형 종결. (메모리: `feedback_policy-analysis-style`)
- **LLM 견해 비노출**: Events/ MD의 `## 분석 제안`·`### 의미 견해 초안`은 LLM이 작성한 해석·평가로서 검증된 객관 정보가 아니므로 웹페이지 노출 자료에 포함하지 않음. 객관적 사실(연도·법령 번호·정부·카테고리·개요)만 노출.
- **공유 금지 자료**: Events/·Screenshot/ 폴더는 외부 공유 금지. 웹페이지 데이터에는 이로부터 추출한 요약본만 포함하며, 원본 MD·이미지는 산출물에 포함하지 않음.

## 9. 작업 진행 상태

| Phase | 상태 | 일자 |
|---|---|---|
| A. 인프라 구축 | completed | 2026-05-18 |
| B. 법령 메타데이터 수집 | completed | 2026-05-18 |
| C. 데이터 모델 작성 | completed | 2026-05-18 |
| D. 웹페이지 구현 (harness 스킬) | pending | — |
| E. 검증 | pending | — |

### Phase B·C 산출 요약

| 산출 파일 | 행수 | 비고 |
|---|---|---|
| `data/laws.json` | 18개 법령 | 13개 MCP 검증(`verified: true`), 5개 폐지 법령은 Events MD 출처 표기(`verified: false`) |
| `data/relations.json` | 15개 관계 엣지 | succession 5, basis 7, reference 3 |
| `data/policy_events.json` | 29개 이벤트 | 28개 이벤트가 1개 이상 법령에 연결, 3개(1995 5·31, 1999 진로정보센터, 2005·2008 마이스터고 등 일부)는 법령 직접 연결 없는 정책계획 사건 |

### MCP 미검증 법령 (verified: false) — 처리 근거

폐지로 법제처 현행 DB에 없는 법령은 Events MD `key_documents`에 명시된 법률 번호·공포일을 1차 출처로 사용. 추정 대신 `source_note` 필드에 출처 MD 파일명을 기재함. 향후 법제처 연혁 법령 검색으로 보강 가능:

- 직업훈련법(1967, 법률 제1880호) — 폐지 1976
- 직업훈련에 관한 특별조치법(1974, 법률 제2741호) — 폐지 1976
- 직업훈련기본법(1976, 법률 제2973호) — 폐지 1997
- 직업훈련촉진기금법(1976, 법률 제2974호) — 폐지 1995
- 한국직업훈련관리공단법(1981, 법률 제3506호) — MCP 현행 DB 미확인

### 빌드 재실행 방법

```
python D:\AI_Work\Claude\Vocational_Transition_Survey\Voc_edu_history\scripts\build_data.py
```

`scripts/build_data.py` 내 `LAW_REGISTRY`·`RELATIONS`·`EVENT_LAW_MAP` 상수가 단일 출처(SOURCE OF TRUTH). 법령 추가·관계 보완 시 이 상수만 수정하고 재실행.
