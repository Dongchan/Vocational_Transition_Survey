---
name: vts-law-viz-builder
description: "Vocational_Transition_Survey 법령 시각화 웹페이지(Voc_edu_history/)를 만들거나 갱신할 때 반드시 사용. SVG 타임라인·트랙·마디·엣지·사이드 패널·필터를 vanilla HTML/CSS/SVG/JS로 구축하는 3-에이전트 파이프라인(scaffold-engineer → viz-engineer → qa-validator)을 가동. 트리거: '법령 시각화 만들기', '법령 시각화 페이지 빌드', 'Voc_edu_history 웹페이지', 'Phase D 진행', '시각화 수정', '시각화 재실행', '시각화 보완', '사이드 패널 수정', '필터 추가', '트랙 정렬 변경', '색상 변경', 'app.js 업데이트', '스타일 보완'. 처음 빌드뿐 아니라 후속 수정·재실행·부분 갱신 요청 시에도 본 오케스트레이터를 사용할 것."
---

# vts-law-viz-builder

Vocational_Transition_Survey 법령 시각화 웹페이지 빌드 오케스트레이터. 3-agent 파이프라인 팀을 가동해 산출물을 생성한다.

## Phase 0: 컨텍스트 확인 (필수, 매 실행 시작)

워크플로우 시작 시 다음을 먼저 확인하고 실행 모드를 결정한다.

1. `Voc_edu_history/data/{laws,relations,policy_events}.json` 3종이 존재하는지 확인 — 없으면 즉시 중단(데이터 트랙 미완료 상태). 오케스트레이터는 데이터를 만들지 않음.
2. `Voc_edu_history/{index.html, css/style.css, js/data-loader.js, js/app.js}` 존재 여부에 따라 실행 모드 결정:

| 상태 | 모드 | 설명 |
|---|---|---|
| 4개 파일 모두 미존재 | **initial** | 파이프라인 전 구간(scaffold → viz → qa) 실행 |
| 4개 파일 모두 존재 + 사용자가 부분 수정 요청 | **partial** | 영향받는 에이전트만 재호출 (예: 스타일만 → scaffold + qa, 인터랙션만 → viz + qa) |
| 4개 파일 모두 존재 + 사용자가 전면 재실행 명시 | **rebuild** | 기존을 `_workspace_prev/`로 이동 후 initial 실행 |
| 일부만 존재 | **resume** | 누락된 단계부터 이어서 실행 |

3. `_workspace_prev/` 가 있으면 사용자에게 한 번 안내: "이전 산출물이 보존돼 있음. 비교 후 정리하려면 별도 지시."

## Phase 1: 사양 확인

다음을 읽어 작업 사양을 확정한다:
- `Voc_edu_history/Plan_History_analysis.md` 섹션 3·4·6
- `.claude/skills/vts-project-context/SKILL.md` (공유 컨텍스트)
- `WorkingHistory.md` 최상단 컨텍스트 블록

## Phase 2: 팀 구성

**실행 모드: 에이전트 팀** (3명 파이프라인)

`TeamCreate`로 다음 팀을 구성한다:
- team_name: `vts-law-viz`
- members: `scaffold-engineer`, `viz-engineer`, `qa-validator`

각 멤버는 빌트인 `general-purpose` 타입을 사용한다(에이전트 정의 파일이 행동 규약을 담당). `Agent` 호출 시 `model: "opus"` 명시.

## Phase 3: 작업 할당 (TaskCreate)

initial/rebuild 모드의 작업 시퀀스:

| ID | 담당 | 작업 | 의존 |
|---|---|---|---|
| T1 | scaffold-engineer | index.html + css/style.css + js/data-loader.js 작성 | — |
| T2 | viz-engineer | js/app.js 작성 (SVG 렌더·인터랙션·필터) | T1 |
| T3 | qa-validator | partial QA (T1 완료 직후) | T1 |
| T4 | qa-validator | full QA (T2 완료 후) | T2 |
| T5 | qa-validator | FAIL 항목별 수정 요청 SendMessage | T4 |

partial 모드는 영향받는 ID만 활성화. T5에서 FAIL이 나오면 해당 에이전트가 수정 후 T4 재실행 (최대 2회 재시도, 그 이상은 오케스트레이터에 보고).

## Phase 4: 데이터 전달

- **파일 기반**: 모든 산출물은 `Voc_edu_history/` 하위에 직접 작성. 중간 산출물은 별도 디렉토리 불요(파일 수가 적음).
- **메시지 기반(SendMessage)**: 핸드오프 시 다음 정보를 주고받음:
  - scaffold → viz: hook 요소 ID 목록, CSS 변수명, data-loader 사용법
  - viz → qa: 구현 범위, 알려진 한계
  - qa → scaffold/viz: FAIL 항목별 구체 수정 요청
- **태스크 기반(TaskUpdate)**: 각 에이전트가 자신의 task 진행 상황 갱신

## Phase 5: 에러 핸들링

| 에러 | 처리 |
|---|---|
| 데이터 스키마 미스매치 | scaffold-engineer 보고 → 오케스트레이터가 사용자에게 알림. `build_data.py` 재빌드 필요할 수 있음 (오케스트레이터 범위 밖) |
| viz-engineer가 hook 요소 누락 발견 | viz가 scaffold에 SendMessage로 추가 요청. scaffold가 추가 후 viz 재개 |
| Playwright 호출 실패 | qa가 1회 재시도. 재실패면 정적 grep 검증으로 가능 항목만 진행 (보고서에 한계 명시) |
| QA FAIL | qa가 해당 에이전트에 수정 요청. 최대 2회 재시도. 그 이상은 사용자에게 에스컬레이션 |
| **신뢰성 원칙(LLM 해석 노출) 위반** | 즉시 블로커. 다른 통과 무관 — 사용자에게 보고 |

## Phase 6: 완료 보고

전 단계 완료 후 오케스트레이터가 사용자에게 다음을 보고:
1. 생성/수정 파일 목록
2. QA 보고서 요약(PASS/FAIL 카운트, 블로커 유무)
3. `WorkingHistory.md`에 추가할 작업 이력 초안(사용자 승인 후 추가)
4. 알려진 한계·향후 개선 후보

## Phase 7: 정리

- 사용한 팀은 `TeamDelete`로 정리 (세션당 한 팀만 활성화 가능 — 다음 작업 위해 정리)
- `_workspace_prev/` 정리 여부는 사용자 결정 대기

## 테스트 시나리오

### 정상 흐름
1. 사용자: "법령 시각화 페이지를 빌드해줘"
2. 오케스트레이터 → Phase 0: 4개 파일 모두 미존재 → initial 모드
3. T1 (scaffold) 실행 → 3개 파일 생성 → SendMessage to viz
4. T3 (partial QA) 실행 → 통과
5. T2 (viz) 실행 → app.js 생성 → SendMessage to qa
6. T4 (full QA) 실행 → 18·15·29 카운트 일치, 신뢰성 원칙 통과
7. 사용자에게 완료 보고

### 에러 흐름 (LLM 해석 노출 위반)
1. viz-engineer가 실수로 `event.interpretation` 노출
2. qa-validator가 §2.7 검사에서 발견 → 블로커 FAIL
3. qa-validator가 viz-engineer에 SendMessage: "app.js:XX의 `ev.interpretation` 참조 제거 필요"
4. viz-engineer 수정 → qa-validator 재검증
5. 통과 시 사용자에게 보고. 미통과 시 오케스트레이터가 사용자 에스컬레이션

### 후속 수정 흐름
1. 사용자: "트랙 색상을 조정해줘"
2. 오케스트레이터 → Phase 0: 4개 파일 모두 존재 → partial 모드 (style.css만 수정 영향)
3. T1' (scaffold-engineer)만 재호출 → style.css 수정
4. T3' (qa partial) → 통과
5. 보고

## 변경 시 영향 범위 (오케스트레이터 자체 진화 시)

본 오케스트레이터를 수정할 때:
- 에이전트 추가/제거 → Phase 2·3 동시 갱신
- 데이터 전달 방식 변경 → Phase 4 + 각 에이전트의 "팀 통신 프로토콜" 섹션 동시 갱신
- 신규 검증 항목 추가 → `vts-qa-checklist` 스킬 갱신, Phase 3의 T4 정의 변경 검토
