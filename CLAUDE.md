# CLAUDE.md — Vocational Transition Survey

본 프로젝트는 두 작업 트랙이 병행 중. 새 세션 진입 시 다음 순서로 컨텍스트를 확보한다:
1. `WorkingHistory.md` 최상단 "다음 페이즈를 위한 컨텍스트" 블록
2. 해당 트랙의 계획서:
   - **설문 트랙** → `Plan_Summary.md`
   - **법령 시각화 트랙** → `Voc_edu_history/Plan_History_analysis.md`

## 하네스: 법령 시각화 웹페이지 빌드

**목표:** `Voc_edu_history/` 하위에 한국 직업교육훈련 정책사를 법령 중심으로 시각화하는 정적 웹페이지(SVG 타임라인 + 트랙 + 마디 + 엣지 + 사이드 패널 + 필터)를 vanilla HTML/CSS/SVG/JS로 구축.

**트리거:** Voc_edu_history 웹페이지 빌드·수정·재실행·부분 갱신·QA 요청 시 `vts-law-viz-builder` 스킬을 사용하라. 단순 데이터 조회·단순 코드 질문은 직접 응답 가능.

**구성:**
- 오케스트레이터: `.claude/skills/vts-law-viz-builder/SKILL.md`
- 공유 컨텍스트: `.claude/skills/vts-project-context/SKILL.md`
- 시각화 패턴: `.claude/skills/vts-svg-timeline/SKILL.md`
- 검증 체크리스트: `.claude/skills/vts-qa-checklist/SKILL.md`
- 에이전트: `.claude/agents/{scaffold-engineer,viz-engineer,qa-validator}.md`

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-05-18 | 초기 구성 (3-agent 파이프라인 + 4 skills + CLAUDE.md) | 전체 | Phase D 진입 |

## 두 트랙 공통 작업 원칙

- **점수 척도는 1–5** (설문 패널 `Screenshot/SurveyPannel.png` 명시). 7점 척도 흔적이 코드/문서에 남으면 안 됨.
- **LLM 해석·견해 비노출** — 외부 노출 산출물(웹페이지·보고서·배포 자료)에 LLM이 작성한 해석·평가(`### 의미 견해 초안`·`## 분석 제안`·`interpretation` 필드)를 포함하지 않음. 검증 가능한 객관 사실만 노출.
- **추정 금지** — 척도·단위·라벨·데이터 필드는 추정 말고 원본을 직접 확인.
- **데이터 단일 출처(SOURCE OF TRUTH)** — `Voc_edu_history/data/*.json`은 직접 편집 금지. `Voc_edu_history/scripts/build_data.py`의 `LAW_REGISTRY`·`RELATIONS`·`EVENT_LAW_MAP` 상수만 수정하고 재빌드.
- **공유 금지 자료** — `Events/`·`Screenshot/`는 `.gitignore` 등록되어 있음. 외부 배포 산출물에 포함하지 말 것.

## 한글 문체 원칙 (UI·문서 노출 텍스트)

- 비유·관용구 금지 ("트랙"·"호(arc)" 같은 메타포 표현 사용 금지)
- 명사형 종결 (예: "제정됨", "분기됨")
- 따옴표 격언으로 시작하지 않음

## 디렉토리 핵심

```
Vocational_Transition_Survey/
├── CLAUDE.md                       ← 본 파일
├── .gitignore                      (Events/·Screenshot/ 등록)
├── .claude/                        ← 하네스
│   ├── agents/
│   └── skills/
├── Law_map_workflow.md             (작업 원칙)
├── Plan_Summary.md                 (설문 트랙 가이드)
├── WorkingHistory.md               (작업 이력)
├── Screenshot/                     (gitignored)
├── Events/                         (gitignored)
└── Voc_edu_history/
    ├── Plan_History_analysis.md
    ├── data/{laws,relations,policy_events}.json
    ├── scripts/build_data.py
    ├── css/, js/, index.html       ← 본 하네스의 산출 대상
```
