# Working History

## ⚡ 다음 페이즈를 위한 컨텍스트 (최상단 상시 갱신)

### 프로젝트 목표
한국 직업교육 정책 타임라인 설문(`Screenshot/SurveyPannel.png`, `SurveyPannel2.png`)의 각 정책 이벤트에 대해 (a) 정책 방향 전환 정도 1–5(1: 연장, 5: 방향전환), (b) 정책 영향력 1–5(1: 매우제한, 5: 지대함), (c) 의미 견해를 작성하기 위한 자료화·분석 작업. **척도는 1–5 (설문 패널 명시).**

### 현재 상태
- **[설문 트랙] Phase 1·2 완료, Phase 3(사용자 검토) 대기** — 29개 Events MD `status: analyzed`. 1–5 척도 기준 점수·견해 초안 채움. 사용자가 검토 후 `status: reviewed`로 갱신 예정.
- **[법령 시각화 트랙] Phase A·B·C·D 완료 + 후속 폴리시 진행 중** — 산출물: `Voc_edu_history/index.html`·`css/style.css`·`js/data-loader.js`·`js/app.js`. 데이터(2026-05-20 갱신): laws 20(13 verified+7 unverified, 1949 교육법·한국직업능력개발원법 추가)·relations 21(succession 4·basis 12·reference 3·branch 2, **이벤트→법령 4건만 잔존(1995 5·31 분기)**)·events 29(**미연결 0**, CareerNet·2005 산학협력은 이벤트 마커만). **RELATIONS 모델 확장**: from_kind/to_kind 옵셔널 필드("law"|"event"), 이벤트 파일명을 from/to에 사용 가능. 엣지 색·패턴 차별화, hit area 14px 확장, SVG 캔버스 1900x폭, 우측 패딩 100px 확보, 라벨 두 줄, 엣지 끝 화살표(markerWidth 14) 적용. **화살표 끝점은 마디 ● 정수리 2시(좌→우)·10시(우→좌) 방향 진입** (`computeArrowEndPoint`, α=60°, r=8). 이벤트(★) 끝점은 위에서 수직 진입. 시간축 1945~2026, 우측 끝 2026 라벨 명시. 이벤트 식별자(.md) 표시 시점에 `stripMd()`로 절단. data-loader fetch + script import에 cache-bust query (`?v=20260520b`). 로컬 HTTP 서버 8080 가동 중.
- **GitHub 공개 저장소** — https://github.com/Dongchan/Vocational_Transition_Survey (브랜치 main). 커밋: 98aa6f8(초기, 2026-05-19) · 3b67f91(화살표·1945·마이스터고, 2026-05-19). GitHub Pages 배포는 미설정.
- **하네스 구성 완료 (2026-05-18 10:11)** — `harness:harness` 스킬로 `.claude/agents/{scaffold-engineer,viz-engineer,qa-validator}.md` + `.claude/skills/{vts-project-context,vts-svg-timeline,vts-qa-checklist,vts-law-viz-builder}/SKILL.md` + 프로젝트 루트 `CLAUDE.md` 생성. 향후 수정·재실행은 `vts-law-viz-builder` 스킬 트리거로 동일 파이프라인 재가동 가능.
- **척도 수정 완료 (2026-05-18 08:18)** — 초기에 1–7 척도로 잘못 평가했던 것을 설문 패널 실제 척도(1–5)로 전면 재매핑. 단순 선형 매핑이 아닌 분포 보정 매핑(7→5, 6→4, 5→3, 4→2, 3→1) 적용.
- **LLM 해석 비노출 결정 (2026-05-18 09:51)** — `policy_events.json`에서 `interpretation`(의미 견해) 필드 제거. 외부 노출 자료에는 객관 사실만 포함. 본 원칙은 웹페이지 사이드 패널·툴팁에도 동일 적용되어 QA §2.7 통과로 확정. 메모리: `feedback_no-llm-opinion-in-trusted-output`.

### 두 작업 트랙의 관계

| 트랙 | 목적 | 출력 | 상태 |
|---|---|---|---|
| 설문 트랙 | 29건 정책 이벤트 점수·견해 작성 | Events/*.md + Plan_Summary.md | Phase 2 완료, Phase 3 대기 |
| 법령 시각화 트랙 | 법령 중심 정책사 흐름 웹페이지 | Voc_edu_history/data/*.json + index.html + css/style.css + js/{data-loader,app}.js | Phase A·B·C·D 완료, Phase E 대기 |

법령 시각화 트랙은 설문 트랙의 Events MD 메타데이터(`key_documents`·`year`·`category`·`date`·`government`·점수)와 Events MD의 `## 개요` 첫 2문장(Screenshot/*.txt 원본 정책 사실 서술)을 데이터 원천으로 재활용. Events MD의 `## 분석 제안`·`### 의미 견해 초안`은 LLM 작성 해석이므로 시각화 자료에서 제외. 두 트랙은 독립적으로 진행 가능.

### Phase 2 결과 요약 (1–5 척도, 최종)
- **5점 클러스터 (전환·영향력 모두 5, 3건)**: 1963 산업교육진흥법·1967 직업훈련법·1995 고용보험법. 박정희 산업화기와 김영삼 신경제기에 집중. 영역 신설형 단절.
- **4점 영향력 클러스터 (5건 영향력 5)**: 위 3건 + 1973 국가기술자격제도·1977 전문대학체제. 60년 이상 현재까지 단절 없는 작동.
- **4점 (전환 4 또는 영향력 4, 총 8건)**: 1973·1974·1977·1995 5·31·2008 마이스터고·2008 내일배움카드·2014 NCS교육과정·2014 일학습병행제. 한 시대 형성.
- **3점 (전환 3 또는 영향력 3, 7~8건)**: 1997·2002·2005·2006(영향력 4)·2011·2014 NCS자격연계·2014 특성화전문대학·2015(영향력 4)·2012(영향력 3).
- **2점 (8건)**: 1989·1999·2007·2012·2013·2018·2021 국민평생직능법·2021 국교위.
- **1점 (1~2건)**: 1998(전환 1)·2021 국교위(영향력 1)·2022(영향력 1).
- 분포: 전환 (5:3 / 4:8 / 3:8 / 2:9 / 1:1), 영향력 (5:5 / 4:8 / 3:7 / 2:7 / 1:2).

### Phase 3 진입 시 참고
1. 점수는 상대값이라 한 건 조정 시 인접 점수와의 거리를 함께 검토할 것. 특히 5점 클러스터(1963·1967·1995 고용보험)·4점 클러스터의 경계.
2. 견해 초안은 1~3문장의 "해석"에 무게를 둠 — 객관 사실 요약은 본문 ## 개요·## 의미에 이미 있음.
3. 인덱스 표(Plan_Summary.md 섹션 5)와 각 MD frontmatter는 한 쌍으로 움직여야 함. 한쪽만 바꾸면 검증 체크리스트(섹션 8)에서 어긋남.
4. **척도는 1–5** (Plan_Summary.md 섹션 6). 설문 패널 `Screenshot/SurveyPannel.png` 확인 결과 1(연장)~5(방향전환), 1(매우제한)~5(지대함)으로 명시되어 있음.

### 핵심 산출물 위치
```
Vocational_Transition_Survey/
├── .gitignore                ← Events/, Screenshot/ 등록 (공유 금지 원자료)
├── CLAUDE.md                 ← 하네스 포인터 + 두 트랙 진입 가이드 (2026-05-18 신규)
├── .claude/                  ← 법령 시각화 빌드 하네스 (2026-05-18 신규)
│   ├── agents/{scaffold-engineer,viz-engineer,qa-validator}.md
│   └── skills/{vts-project-context,vts-svg-timeline,vts-qa-checklist,vts-law-viz-builder}/SKILL.md
├── Law_map_workflow.md       ← 법령 시각화 트랙 작업 원칙
├── Plan_Summary.md           ← 설문 트랙 가이드 + 29건 인덱스 + 카테고리 분포 + 점수 척도
├── WorkingHistory.md         ← 본 파일
├── Screenshot/               ← 원자료 .txt 29개 + 패널 PNG 2개 (gitignored)
├── Events/                   ← 표준 MD 29개, 연도순 (gitignored)
└── Voc_edu_history/          ← 법령 시각화 트랙 산출물
    ├── Plan_History_analysis.md  ← Phase별 계획·진행·검증 체크리스트
    ├── data/                     ← laws.json·relations.json·policy_events.json
    ├── scripts/build_data.py     ← 데이터 단일 출처(SOURCE OF TRUTH)
    ├── index.html                ← scaffold-engineer 산출 (2026-05-18)
    ├── css/style.css             ← scaffold-engineer 산출
    ├── js/data-loader.js         ← scaffold-engineer 산출
    └── js/app.js                 ← viz-engineer 산출 (1235 라인, SVG·인터랙션·필터·RELATIONS 모델 확장)
```

### 법령 시각화 트랙 진입 시 참고 (Phase D 완료, Phase E 대비)
1. **하네스 가동 방식**: 추후 시각화 수정·재실행·부분 갱신은 `vts-law-viz-builder` 스킬을 트리거(예: "트랙 색상 조정", "필터 추가", "사이드 패널 수정"). Phase 0 컨텍스트 확인 단계에서 initial/partial/rebuild 모드를 자동 판별.
2. **데이터는 재빌드만**: 법령·관계 수정은 `Voc_edu_history/scripts/build_data.py`의 `LAW_REGISTRY`·`RELATIONS`·`EVENT_LAW_MAP` 상수만 고치고 `python ... build_data.py`로 재빌드. JSON을 직접 편집하지 말 것.
3. **노출 자료 원칙**: 사이드 패널·툴팁에는 객관 사실만. LLM이 작성한 해석·평가(`## 분석 제안`·`### 의미 견해 초안`·`interpretation` 필드) 절대 미포함. QA §2.7 블로커 항목. (메모리: `feedback_no-llm-opinion-in-trusted-output`)
4. **폰트 15px·라이트 모드·색맹 친화 (Okabe-Ito 변형 5색)** 사양 준수.
5. **로컬 검증**: `python -m http.server 8080 --directory Voc_edu_history` 후 `http://localhost:8080/`. file:// 직접 열기는 fetch CORS 차단으로 동작 안 함.

### 다음 세션 작업 후보
1. **이벤트→법령 엣지 시각 강도 폴리시** — 5·31 한 점에서 4개 법령으로 뻗는 보라 점선이 시각적으로 무거움. 옵션: (a) reference 강도로 낮춤(가는 선·옅은 색), (b) 사이드 패널 토글로 평소엔 숨김, (c) 이벤트→법령 전용 새 type 신설로 시각 분리
2. **cache-bust 영구 해법** — 매 세션 수동 `?v=날짜X` 갱신은 부담. build_data.py가 빌드 mtime을 index.html·app.js import에 자동 박는 방식 또는 Python 서버 대신 Cache-Control: no-store 헤더 보내는 서버 사용
3. GitHub Pages 배포 설정 — settings → pages → main 브랜치 root 또는 Voc_edu_history/ 지정. 단 ?v= cache-bust 쿼리도 잘 동작하므로 호환됨.
4. 동일 트랙·동일 연도 이벤트 마커 겹침(2014년 4건 등) 처리, 카테고리 헤더 클릭 핸들러 추가
5. (해결 완료 2026-05-20) ~~CareerNet·2005 산학협력 엣지 제거~~ · ~~표시 라벨 .md 절단~~ · ~~2026 끝점 라벨~~ → 작업 이력 참조
6. (해결 완료 2026-05-19) ~~엣지 끝 화살표 위치 조정~~ · ~~타임라인 1945 확장~~ · ~~마이스터고 매핑~~ · ~~미연결 0 달성~~ · ~~RELATIONS 모델 확장~~ → 작업 이력 참조

### 카테고리별 분포
| 카테고리 | 건수 |
|---|---|
| 중등직업교육 | 6 |
| 직업훈련 | 7 |
| 고등 및 평생직업교육 | 7 |
| 진로교육 | 4 |
| 직무능력 및 자격체계 | 5 |
| **합계** | **29** |

---

## 작업 이력 (최신순)

### 2026-05-20 — 이벤트 엣지 정리 + 표시 라벨 `.md` 절단 + 2026 라벨
- **RELATIONS 3건 제거**: 사용자 결정으로 다음 엣지를 이벤트 마커로만 두기로 함
  - `vocational_competency_dev_institute_act → 1999_진로정보센터_CareerNet.md` (basis 1999)
  - `1999_진로정보센터_CareerNet.md → career_education_act` (basis 2015)
  - `industrial_education_act → 2005_산학협력중등직업교육.md` (basis 2005)
  - relations 24→21. CareerNet·2005 산학협력은 ★ 마커만, 인입·인출 엣지 0건. EVENT_LAW_MAP 첫 law_id로 트랙 배치는 유지
- **표시 라벨 `.md` 절단**: `app.js`에 `stripMd(s)` 헬퍼 추가. 이벤트 식별자(`*.md`)가 노출되는 3 지점에 적용
  - 엣지 SVG `<title>` (스크린리더용)
  - 툴팁 `describeEdgeEndpoints` fromName/toName fallback
  - 사이드 패널 제목 `openEdgePanel` "관계: …"
  - 데이터 키(`EVENT_LAW_MAP`·`RELATIONS` from/to)는 `.md` 유지(Events 파일 매칭 무결성)
- **타임라인 우측 끝점 2026 라벨**: `renderTimeAxis` 루프(5년 단위·10년 라벨)가 2025에서 끝나 2020 다음이 비던 문제. 루프 후 `TIME_END % 10 !== 0` 가드로 2026 라벨 추가
- **cache-bust 토큰**: `?v=20260519c → 20260520a → 20260520b` (캐시된 구 JS 강제 무효화)
- 검증: `python scripts/build_data.py` Validation OK, relations.json 21 edges. CareerNet·2005 산학협력 문자열은 `policy_events.json`·`EVENT_LAW_MAP`(트랙 배치용)에만 잔존

### 2026-05-19 14:40 — RELATIONS 모델 확장(이벤트 ↔ 법령) + 미연결 3건 매핑 (미연결 3→0)
- 사용자 결정: 웹검색 조사 후 전부 매핑 + RELATIONS 모델 확장 진행
- **데이터 확장**:
  - WebSearch로 「한국직업능력개발원법」(법률 제5315호, 1997-03-27 제정, 국가법령정보센터 lsiSeq=2913) 실재 확인. 2021-05-18 「정부출연연구기관 등의 설립·운영 및 육성에 관한 법률」 일부개정(법률 제18189호)으로 한국직업능력연구원 명칭 변경
  - `LAW_REGISTRY`에 `vocational_competency_dev_institute_act` 추가 (진로교육 카테고리, verified: False, source_note 명시). 법령 19→20
  - `EVENT_LAW_MAP` 3건 매핑:
    - 1995 5·31 → ESEA + HEA + 자격기본법 + 평생교육법
    - 1999 CareerNet → KRIVET법 + 진로교육법
    - 2005 산학협력 → 산업교육진흥법
- **RELATIONS 모델 확장** (이벤트도 from/to에 올 수 있게):
  - `from_kind`/`to_kind` 옵셔널 필드(기본값 "law"). "event"이면 from/to 값을 이벤트 파일명(예: "1995_531교육개혁.md")으로 해석
  - `build_data.py` validate(): from_kind/to_kind 인식, EVENT_LAW_MAP keys로 이벤트 id 정합성 검증
  - `data-loader.js` validateRelations(): 시그니처에 eventIdSet 추가, kind별 분기
  - `app.js` buildTrackLayout 반환에 `eventCoordsByFile: Map` 추가, renderEvents가 이벤트 별 (cx, cy_star) 등록
  - `app.js` renderEdges: from_kind/to_kind 4 케이스 분기 처리. event 측은 별 좌표 직접 사용, law 측은 신규 `pickLawSideX(rel, law, width)` 헬퍼 (rel.year가 시행 범위면 그 시점, 아니면 enacted)
  - `app.js` 마디 정수리 진입 로직(`computeArrowEndPoint`)은 toKind === "law"일 때만 적용. event 끝점은 위에서 수직 진입(c2 = (xEnd, yEnd - V))
- **RELATIONS 7건 추가** (모두 basis):
  - 5·31 → ESEA, HEA, 자격기본법, 평생교육법 (4건)
  - KRIVET법 → CareerNet (1건)
  - CareerNet → 진로교육법 (1건)
  - 산업교육진흥법 → 2005 산학협력 (1건)
  - relations 17 → 24
- **검증**: 미연결 이벤트 **0건** (목표 달성). 24개 엣지 모두 렌더링, 이벤트↔법령 엣지 7건 정상, KRIVET법 ● (cx=1267, cy=972) 진로교육 카테고리 정상 위치. 콘솔 에러 0건. 스크린샷 `qa-orphans-zero.png`
- 캐시 이슈: data-loader.js validateRelations 시그니처 변경 시 캐시된 옛 버전이 새 데이터를 거부 → cache-bust query `?v=20260519a → b → c` 두 번 갱신 후 정상 로드

### 2026-05-19 14:05 — 미연결 4건 MCP 재검증 + 2008 마이스터고 매핑 추가 (미연결 4→3)
- 사용자 질의: 미연결 4건이 MCP로 확인해도 정말 매핑 불가인지
- Korean Law MCP 재검증:
  - **「한국직업능력개발원법」 / 「한국직업능력연구원법」 — 검색 결과 0건.** 1996 한국직업능력개발원(KRIVET)은 정부출연연구기관 출연 근거로 설치된 기관이고 단일 설치법이 존재하지 않음. Events MD `key_documents`의 「한국직업능력개발원법」 표기는 약식 표기/부정확. 단일 법령 매핑 불가
  - **「초·중등교육법 시행령」 mst=285453 확인.** 마이스터고는 이 시행령 제76조의3(산업수요맞춤형 고등학교)에 근거 → 모법 `elementary_secondary_education_act`에 매핑 가능
- 4건 처리 결정:
  | 이벤트 | 처리 |
  |---|---|
  | 1995 5·31 교육개혁 | 정책 문서(대통령자문위 방안). 법령 매핑 불가, 미연결 유지 |
  | 1999 진로정보센터 | 단일 설치법 없음. 미연결 유지 |
  | 2005 산학협력 중등직업교육 | 정책 문서(직업교육체제 혁신방안). 미연결 유지 |
  | **2008 마이스터고** | **시행령 근거 확인. `elementary_secondary_education_act` basis 매핑 추가** |
- 변경: `build_data.py` `EVENT_LAW_MAP["2008_마이스터고.md"]` → `["elementary_secondary_education_act"]`. 시행령 근거 주석 inline 추가
- 재빌드: laws 19 / relations 17 / events 29 그대로, validate OK
- Playwright 캐시 문제 발견·해결:
  - 페이지 reload·새 navigate에도 옛 SVG 렌더링 유지 (data-loader.js·policy_events.json 모두 캐시)
  - `data-loader.js` fetch에 `{ cache: "no-store" }` 추가
  - `index.html` script src + `app.js` data-loader import 양쪽에 `?v=20260519a` cache-bust query 추가
- 검증: 마이스터고 ★ data-law-id="elementary_secondary_education_act", cy=194.5 (초·중등교육법 트랙 행 위 15.5px), 미연결 카운트 4→3 (남은 idx 6·10·12). 스크린샷 `qa-meister-mapped.png`

### 2026-05-19 13:55 — 타임라인 시작 연도 1960 → 1945로 조정 (1949 교육법 노출)
- 사용자 지적: 1949 교육법 제정 시점이 화면 좌측 잘림으로 안 보임
- `Voc_edu_history/js/app.js`: `TIME_START = 1960 → 1945` (한 줄), 주석 헤더 함께 갱신
- 검증: 1949 교육법 ● cx=392 (좌측 라벨 영역 300px 우측 92px), 눈금 라벨 1950~2020 8개 10년 단위 정렬
- 1949 → 1997 분기 2건(→ 초·중등교육법, → 고등교육법) 시각 노출 확인. 스크린샷 `qa-timeline-1945.png`
- 데이터(`build_data.py`)에 이미 `education_act_1949` enacted=1949-12-31, abolished=1997-12-13으로 기록되어 있었음 — 표시 영역 부족이었던 것

### 2026-05-19 13:40 — 화살촉 축을 마디 원 법선과 일치 (접선 직각 진입)
- 사용자 추가 요청: 화살표 삼각형 꼭지점→밑변 선과 마디 접선이 수직이 되도록 = 화살촉이 마디 원 중심을 똑바로 가리키도록
- `computeArrowEndPoint` 반환에 끝점→중심 단위벡터 `nx, ny` 추가 (`nx = -dxSign·sinα`, `ny = cosα`)
- `renderEdges` c2 변경: `c2 = (xEnd - nx·V, yEnd - ny·V)` — 마지막 베지어 접선이 마디 표면 접선과 90°
- 진입 각도 α는 60°(2시) 유지. α가 무엇이든 화살촉이 원 중심을 통과
- Playwright 검증: 14건 모두 `tangentAngleDiffFromCenter` = 0.000° (path 마지막 접선과 끝점→중심 벡터 완전 일치). 스크린샷 `qa-arrow-normal.png`

### 2026-05-19 13:30 — 진입 각도 1시 → 2시로 조정
- 사용자 요청: α=15°(1시) → α=60°(2시)로 변경
- `computeArrowEndPoint` 상수만 `Math.PI/12` → `Math.PI/3` 교체
- 14건 모두 ±60° (좌→우 13건 +60°, 우→좌 1건 -60°), 마디 r=8 경계선 위. 스크린샷 `qa-arrow-2oclock.png`

### 2026-05-19 13:25 — 엣지 화살표 끝점을 마디 정수리(12시~1시) 진입으로 변경
- 사용자 요청 (이전 세션 후보): 현재 to 트랙 ● 마디 9시 방향(좌측 수평) 진입을 12시~1시 방향(정수리)으로 조정
- `Voc_edu_history/js/app.js` 수정:
  - 신규 `computeArrowEndPoint(xTo, yTo, dxSign)` 함수 + 상수 `MILESTONE_ENACTED_R = 8` 추가. α=15°, dxSign 부호로 좌→우는 1시(angleFromTop +15°), 우→좌는 11시(-15°) 대칭 진입
  - `renderEdges` 내부: 기존 `xToFinal = xTo - sign·10`(수평 back-off)을 `(xEnd, yEnd)` 쌍으로 교체. 끝점은 마디 r=8 경계선 위
  - 베지어 c2 제어점을 `(xEnd, yEnd - V)`로 끌어올림 (V = max(40, |dy|·0.4)). 마지막 접선이 거의 수직 → 화살촉이 마디 정수리에 위에서 아래로 꽂힘
  - c1은 시작점 수평 연장 `(xFrom + dx·0.5, yFrom)` 유지. reference 무방향은 기존 양 끝 원·수평 진입 그대로
  - `endMarker` circle도 `xEnd, yEnd` 사용 (방향성 엣지는 CSS로 숨김, 좌표 일치는 시점 마커 정합성용)
- Playwright DOM 검증:
  - 17개 엣지 중 방향성 14건 모두 distFromCenter = 8.00 (마디 경계선 정확)
  - angleFromTop 분포: +15° 13건, -15° 1건 (employment_insurance_act 1995, 좌측 마디로 진입)
  - 콘솔 에러 0건
- 스크린샷 `qa-arrow-top.png` 저장 — 곡선이 위에서 아래로 마디에 꽂히는 형태로 시각 확인
- 코드 작성 분담: 진입 각도 함수 본체(α 선택, sin·cos 좌표 계산)는 사용자가 직접 결정·작성 가능하도록 `=== USER FILL START/END ===` 마커로 분리 표기

### 2026-05-19 09:45 — git 초기화 + GitHub 공개 저장소 생성·push
- `git init` (브랜치 main), user.email=chan.tangentbeta@gmail.com, user.name=Dongchan
- `.gitignore` 보강: 기존(Events/·Screenshot/·*.log·node_modules·__pycache__) + 추가(`qa-*.png`·`.playwright-mcp/`)
- 21개 파일 첫 커밋 (commit 98aa6f8): `.claude/`(에이전트 3 + 스킬 4), `Voc_edu_history/`(코드 4 + 데이터 JSON 3 + Plan_History_analysis.md + build_data.py), 루트 문서 5종(CLAUDE.md·Law_map_workflow.md·Plan_Summary.md·WorkingHistory.md·.gitignore)
- gh CLI로 공개 저장소 신규 생성·push 완료: **https://github.com/Dongchan/Vocational_Transition_Survey**
- gh repo create의 description 인자 줄바꿈 포함 시 GraphQL 거부됨(`control characters not allowed`) — 단일 라인으로 재시도 후 성공
- GitHub Pages 배포는 별도 설정 필요 (settings → pages → main 브랜치 root 또는 Voc_edu_history/ 지정)

### 2026-05-19 09:38 — 엣지 화살표 가시성 확보
- 사용자 보고: 화살표가 안 보임
- 원인 3중 결합: (1) SVG 레이어 z-order에서 마디·이벤트 그룹이 엣지보다 늦게 그려져 화살표 위에 ●▲◆★ 덧그려짐, (2) 끝점 x가 to 트랙 ● 마디와 정확히 같은 위치, (3) 마커 크기 9px가 작음
- 처리:
  - render 메인 함수의 그룹 append 순서 변경: `timeAxis → tracks → milestones → events → edges`(최상위). 화살표가 마디·이벤트 위에 그려짐
  - 방향성 엣지(succession·basis·branch) 끝점에 back-off 10px 적용 — `xToFinal = xTo - sign · 10` (|dx|>4 케이스), 마디 ● 직전에서 화살표 종료
  - 마커 크기 9→14px, refX 8.5→9 (path 끝과 정렬). reference는 마커 미부착이라 영향 없음
- 검증: 17개 엣지 모두 시각 식별 OK. 적주황 분기 화살표 2건이 1997 교육법 → 초·중등교육법·고등교육법으로 명확히 노출

### 2026-05-19 09:32 — 엣지 끝점 시각 범례 일치
- 사용자 지적: 범례는 방향성 3종(succession/basis/branch)이 화살표·reference가 동그라미인데 실제 캔버스는 모두 양 끝 작은 원으로만 보임. 화살표가 동그라미에 묻힘.
- 처리: 방향성 엣지 14건은 끝점 `<circle>` 숨김(CSS `.edge-{type} .edge-endpoint-end { display:none }`) → `marker-end` 화살표만 노출. reference 3건은 양 끝 원 유지·marker-end 미적용. 화살표 마커 크기 7→9 확대, refX 9→8.5로 path 끝과 정렬.
- 결과: 범례 미니 SVG와 캔버스 시각 1:1 매칭. DOM 검증 `endpointsEndVisible: 3` (reference 3건만 끝점 노출).

### 2026-05-19 09:28 — 라벨 두 줄 + 엣지 시점 명료화
- 사용자 피드백 2건:
  1. 긴 법령명 라벨이 1960 타임라인 영역 침범
  2. 엣지 시작·끝점 의미 불분명, 분기와 기반 시각 구분 헷갈림
- viz-engineer partial 호출로 처리:
  - `LEFT_LABEL_W 240→300` 확대, 18자 임계 초과 법령명 3건 `<tspan>` 두 줄 분할 (산업교육진흥 및/산학연협력촉진에 관한 법률, 국가교육위원회 설치 및/운영에 관한 법률, 산업현장 일학습병행/지원에 관한 법률). " 및 " 토큰 우선·중앙 공백 폴백 규칙
  - SVG `<defs>` 에 `<marker>` 3종 (arrow-succession/basis/branch) 추가, marker-end 적용 — reference는 무방향이라 화살표 없이 양 끝 동그라미만 (양방향·수평참조 의미)
  - 엣지 시작·끝점에 r=3.5 시점 마커 (color matched, white stroke) — 트랙 막대 위 정확한 시점 시각화
  - 범례 보강: type별 기준 시점 설명(legend-detail). "계승: 폐지 → 신법 제정", "기반: 관계 발생 → 새 법령 제정", "연관: 관계 발생 시점에 양 법령 수평 참조 (무방향)", "분기: 폐지 → 분할된 신법 제정"
  - 툴팁: type별 시작·끝 사건·날짜 명시. 예 "계승 (1997): 직업훈련기본법 폐지 1997-12-24 → 국민 평생 직업능력 개발법 제정 1997-12-24"
  - 사이드 패널 엣지: `<dl>` 시작/끝 시점 dt·dd 추가
- 신뢰성 원칙 준수: 노출 시점 텍스트는 모두 `enacted`·`abolished`·`milestones`·`year`·`note` 등 객관 필드만 사용

### 2026-05-19 09:08 — 분기 관계 데이터 추가 (1997 교육법 분할)
- 사용자 지적: 데이터에 `branch` 타입이 0건. 분기되는 법령이 표현되지 않음
- Korean Law MCP 검증: 1949 교육법은 폐지 법령으로 법제처 현행 DB 미존재. 후신 법령(초·중등교육법 mst=279605·공포 1997-12-13, 고등교육법 mst=268513·공포 1997-12-13) 공포일 동시성으로 분할 검증. 폐지 법령 처리 방식(Plan_History_analysis.md §9)과 일관되게 `verified: false` + `source_note` 명시
- `Voc_edu_history/scripts/build_data.py` 수정:
  - `LAW_REGISTRY` 최상단에 `education_act_1949` 추가 (카테고리 "중등직업교육", track_order 0, abolished 1997-12-13)
  - `RELATIONS`에 `branch` 2건 추가: `education_act_1949 → elementary_secondary_education_act`, `education_act_1949 → higher_education_act` (모두 year 1997)
- 재빌드: `laws 18→19 (13 verified + 6 unverified)`, `relations 15→17 (succession 4·basis 8·reference 3·branch 2)`, `events 29 그대로`
- Playwright 자동 검증: 분기 엣지 2건 적주황 굵은 점선으로 정상 렌더, 교육법 트랙(1949~1997) 정상 표시, 콘솔 에러 0건(favicon 404 제외)

### 2026-05-19 08:50~09:05 — Phase D 후속 폴리시 (엣지·우측 잘림)
- 사용자 지적 3건:
  1. 점선 마우스오버 hit area가 너무 좁음
  2. 엣지 시작·끝점이 트랙과 시각적으로 어긋남
  3. 엣지 4종 시각 구분 어려움 + 우측 잘림
- `vts-law-viz-builder` 오케스트레이터 partial 모드, viz-engineer 2회 호출로 처리:
  - 엣지 구조 분리: `<g class="edge">` 그룹 안에 `<path class="edge-hit">`(transparent stroke 14px, hit zone) + `<path class="edge-line">`(시각 path 1.8px) → hit area 약 8배 확대, hover 시 1.8→2.6px 강조
  - 엣지 끝점 의미시점화: succession/branch는 `from.abolished → to.enacted`, basis는 `rel.year ∈ from 범위`면 rel.year, reference는 양쪽 모두 rel.year. 베지어 제어점도 수평거리 분기
  - SVG 캔버스: `SVG_WIDTH 1600 → 1900`, `RIGHT_PAD 40 → 100` (2026 시점 x=1800, 우측 여백 100px 확보)
  - 엣지 4종 색·패턴 차별화: succession 검정 실선, basis 보라(#5E3C99) 긴 점선(12 4), reference 회색 짧은 점선(2 4, 1.5px), branch 적주황 굵은 점선(8 4, 2.4px). 카테고리 5색과 충돌 회피
  - 범례 SVG 아이콘도 새 디자인 동기화
- 키보드 접근성: 엣지 그룹에 `tabindex=0` + Enter/Space로 패널 오픈

### 2026-05-18 10:25 — Phase D 완료: 법령 시각화 웹페이지 빌드 + 하네스 구축
- **하네스 신규 구축** (`harness:harness` 스킬 가동, 신규 구축 모드)
  - `.claude/agents/scaffold-engineer.md`·`viz-engineer.md`·`qa-validator.md` (3-agent 파이프라인)
  - `.claude/skills/vts-project-context/SKILL.md` (공유 컨텍스트: 데이터 스키마·Okabe-Ito 색상 팔레트·신뢰성 원칙·문체 규칙)
  - `.claude/skills/vts-svg-timeline/SKILL.md` (SVG 좌표계·트랙 정렬·마디·베지어 엣지·인터랙션 패턴)
  - `.claude/skills/vts-qa-checklist/SKILL.md` (Plan_History_analysis.md §6 검증 체크리스트 10항목 + Playwright 호출 가이드)
  - `.claude/skills/vts-law-viz-builder/SKILL.md` (오케스트레이터, Phase 0 컨텍스트 확인·5 Phase·후속 키워드 포함)
  - 프로젝트 루트 `CLAUDE.md` 신규 작성 (하네스 포인터 + 두 트랙 공통 작업 원칙 + 변경 이력)
- **사용자 디자인 결정**: 트랙 정렬 = 카테고리 그룹 → 그룹 내 제정연도순 (5개 카테고리 위→아래 묶음, AskUserQuestion으로 미리 본 ASCII 미리보기 비교 후 선택)
- **파이프라인 실행** (sub-agent 패턴, 파일 기반 핸드오프)
  - scaffold-engineer: `index.html`(8.6 KB) + `css/style.css`(10.0 KB) + `js/data-loader.js`(10.0 KB) 생성. 카테고리 한글↔CSS 변수 매핑, hook ID 목록 viz로 핸드오프
  - viz-engineer: `js/app.js`(31.2 KB, 971라인) 생성. 시간축 스케일·트랙 막대·●▲◆ 마디·★ 이벤트·베지어 엣지·호버/클릭/ESC·사이드 패널·카테고리·관계 필터 모두 구현. 미연결 이벤트 4건은 카테고리별 orphan 행에 자동 배치
  - qa-validator: Playwright MCP로 `http://localhost:8080/` 검증. 정적 grep + DOM 카운트(트랙 18/18, 엣지 15/15, 이벤트 29/29) + 사이드 패널 콘텐츠 전수 검사. **10/10 PASS, 블로커 0건**. 스크린샷 2장(`qa-full-page.png`·`qa-side-panel.png`) 저장
- **검증 통과**: 외부 라이브러리 0, 다크 모드 분기 0, 본문 폰트 15px+, 트랙 정렬 사양 일치, 신뢰성 §2.7 위반 0건, 점수 표기 "X / 5" 29회·"X / 7" 0회, 콘솔 에러 0건(favicon 404 1건은 시각화 무관)
- **알려진 한계**: 화살표 머리 미구현(엣지 방향은 점선 곡선 + 사이드 패널로 암시), 동일 트랙·동일 연도 이벤트 마커 겹침(2014년 4건 등), 좌측 라벨 22자 초과 시 `…` 잘림, 카테고리 헤더 클릭 핸들러 없음. Phase E 폴리시 후보
- **후속 가동 방식**: 향후 "트랙 색상 조정", "필터 추가", "사이드 패널 수정" 등 요청 시 `vts-law-viz-builder` 스킬 트리거되어 동일 파이프라인의 영향 받는 단계만 부분 재실행 (Phase 0 컨텍스트 확인 단계 자동 판별)

### 2026-05-18 09:51 — policy_events.json에서 LLM 해석(의미 견해) 필드 제거
- 사용자 지적: "의미 견해는 신뢰할 수 있는 정보일까? 말 그대로 견해인데, 이건 우선 삽입하지 말자."
- `policy_events.json`의 `interpretation` 필드 일괄 제거. `summary`(## 개요 첫 2문장 = 정책 사실 요약)는 유지.
- `build_data.py`의 `extract_interpretation` 함수·호출 제거.
- `Plan_History_analysis.md` 갱신: 사이드 패널 노출 자료에서 "의미 견해" 빼고 "객관적 정보(연도·정부·카테고리·개요)"만 노출하도록 표기. 작업 원칙 섹션에 "LLM 견해 비노출" 명시.
- 메모리 추가: `feedback_no-llm-opinion-in-trusted-output.md` — 외부 노출 산출물에 LLM 작성 해석·견해 미포함 원칙.
- 재빌드 결과 동일 (laws 18 / relations 15 / events 29). 파일 크기만 감소.

### 2026-05-18 09:43 — 법령 시각화 트랙 Phase B·C 완료: MCP 메타데이터 수집 및 데이터 JSON 빌드
- Events/ 29건 frontmatter 일괄 추출(연도·카테고리·정부·점수·의미 견해 초안 포함)
- Korean Law MCP `search_law` 호출 18회로 핵심 법령 검증:
  - 13개 verified: 산업교육진흥 및 산학연협력촉진에 관한 법률(전 산업교육진흥법), 초·중등교육법, 고등교육법, 평생교육법, 고용보험법, 국민 평생 직업능력 개발법(전 근로자직업훈련촉진법·근로자직업능력개발법), 산업현장 일학습병행 지원에 관한 법률, 국가기술자격법, 숙련기술장려법(전 기능장려법), 자격기본법, 진로교육법, 인적자원개발 기본법, 국가교육위원회 설치 및 운영에 관한 법률
  - 5개 unverified: 직업훈련법(1967)·직업훈련에 관한 특별조치법(1974)·직업훈련기본법(1976)·직업훈련촉진기금법(1976)·한국직업훈련관리공단법(1981) — 폐지로 MCP 현행 DB 미존재. Events MD key_documents의 법률 번호·공포일을 출처로 기록(`source_note` 필드, `verified: false`)
- 데이터 빌드 스크립트 `Voc_edu_history/scripts/build_data.py` 작성:
  - 단일 출처(SOURCE OF TRUTH): `LAW_REGISTRY` 18개 법령 + `RELATIONS` 15개 관계 + `EVENT_LAW_MAP` 29건 매핑 상수
  - Events MD에서 ## 개요 첫 2문장(summary)과 ### 의미 견해 초안(interpretation) 자동 추출
  - validate() 검사 통과 (관계 ID·track_order 정합성 OK)
- 산출:
  - `Voc_edu_history/data/laws.json` (18 laws, 14.6 KB)
  - `Voc_edu_history/data/relations.json` (15 edges, 3.5 KB)
  - `Voc_edu_history/data/policy_events.json` (29 events, 43.5 KB)
- 관계 분포: succession 5, basis 7, reference 3
- Phase D 진입 시 `harness` 스킬 사용 (사용자 지시 2026-05-18)

### 2026-05-18 09:24 — 법령 시각화 트랙 개시: Phase A 인프라 구축 및 계획서 작성
- 사용자 요청: `Law_map_workflow.md`를 참조해 한국 직업교육훈련 정책사 법령 흐름 웹페이지 계획 수립. 계획은 `Plan_History_analysis.md`로 작성.
- Plan mode에서 AskUserQuestion 1회로 4가지 핵심 결정 확정:
  - 법령 범위: Events/ 29건 연관 법령 (10~15개)
  - 시각화: 가로 타임라인 + 분기 점선 화살표
  - 기술 스택: Vanilla HTML/CSS/SVG + JS (외부 의존성 0)
  - Events 연계: 법령 트랙 위 정책 이벤트 마커 추가 + 사이드 패널에 분석 제안 일부 노출
- Phase A 완료:
  - `Voc_edu_history/` 폴더 및 하위 `css/`·`js/`·`data/` 생성
  - 프로젝트 루트 `.gitignore` 신규 작성 (Events/·Screenshot/ 등록)
  - `Voc_edu_history/Plan_History_analysis.md` 작성 (9개 섹션: 배경/합의사항/시각화 사양/폴더 구조/Phase별 계획/검증 체크리스트/참조 자료/작업 원칙/진행 상태)
- Plan mode 승인 파일: `C:\Users\krivet\.claude\plans\law-map-workflow-md-sorted-star.md`
- 다음 단계 (Phase B): Events/ 29건의 `key_documents`에서 법령 후보 추출 → Korean Law MCP(`search_law`·`get_law_text`·`chain_amendment_track`·`chain_law_system`)로 메타데이터 검증 → `data/laws.json`·`relations.json`·`policy_events.json` 생성.

### 2026-05-18 08:18 — 척도 오류 발견 및 1–5 척도 전면 재매핑
- 사용자가 `Screenshot/SurveyPannel.png` 실제 설문 패널을 보여주며 척도가 1–5임을 확인 요청. 직전 Phase 2 작업은 Plan_Summary.md 섹션 6에 잠정 정의된 1–7 척도(내가 추정한 임의값)를 그대로 따른 잘못된 평가였음.
- 즉시 5점 척도로 분포 보정 매핑: 7→5, 6→4, 5→3, 4→2, 3→1.
- Plan_Summary.md 섹션 6 척도 가이드를 1–5 척도 기준으로 재작성, 인덱스 표 29행 점수 모두 갱신.
- 29개 Events MD의 frontmatter(direction_shift·impact)와 본문 분석 제안 섹션의 점수 라벨(X/7→Y/5) 및 1–7 척도 흔적("7점은 아닌 6점" 등) 일괄 교정.
- 본 파일 컨텍스트 블록을 1–5 척도 결과로 재작성.

### 2026-05-18 08:18 — Phase 2 완료: 29개 이벤트 점수·분석 일괄 작성 (1–7 척도, 후속 수정됨)
- 29개 Events MD를 모두 읽어 횡적 비교 매트릭스 수립 (7점 5건 / 6점 6건 / 5점 7건 / 4점 8건 / 3점 1건, 1~2점 없음).
- 각 MD frontmatter 갱신: `direction_shift` 점수, `impact` 점수, `status: pending → analyzed`.
- 각 MD 본문 `## 분석 제안 (Phase 2)` 섹션 채움: 전환 근거 2~3개, 영향력 근거 2~3개, 의미 견해 초안 1~3문장.
- `Plan_Summary.md` 인덱스 표의 전환·영향력·상태 컬럼 29행 모두 갱신.
- 본 파일 최상단 컨텍스트 블록을 Phase 2 결과 요약 + Phase 3(사용자 검토) 진입 안내로 재작성.
- 채점 원칙: (a) 영역 신설·체제 전면 교체는 7점, (b) 작동 원리 재편·새 트랙 출범은 6점, (c) 영역 확장·통합 우산 신설은 5점, (d) 위층 추가·운영 단위 확장은 4점, (e) 시행령급 부분 보완은 3점. 진행형 정책은 영향력 점수에 -1.

### 2026-05-18 07:57 — WorkingHistory.md 생성 및 컨텍스트 정리
- 본 파일 (`WorkingHistory.md`) 신설
- 최상단에 다음 페이즈 진입용 컨텍스트 블록 배치
- 컴팩트·클리어 이후에도 Phase 2 진입이 가능하도록 핵심 상태·주의사항·산출물 위치 명시
- 작업 시간은 Python `datetime.now()`로 측정해 기록

### 2026-05-16 — Plan_Summary.md 인덱스 표 + 카테고리 분포 갱신
- Phase 1 완료 후 인덱스 표를 29건 전체로 확장 (연도순)
- 카테고리별 분포 표 추가: 중등직업교육 6 / 직업훈련 7 / 고등 및 평생직업교육 7 / 진로교육 4 / 직무능력 및 자격체계 5
- 각 행에 `[📄](Events/...md)` 링크와 점수 placeholder(`_`), `status: pending` 기록

### 2026-05-16 — Phase 1 일괄 변환: Events/ 28개 MD 추가 생성
- 사용자가 `Screenshot/`에 28개 `.txt` 추가 → 일괄 변환 요청
- 28개 모두 표준 템플릿(YAML frontmatter + 본문 metadata 블록 + 4개 섹션 + 분석 제안 placeholder)으로 생성
- 파일명 규칙 `{YYYY}_{단축명}.md` 준수 (연도 prefix → OS 정렬 = 시간순)
- 생성 목록:
  - 1967_직업훈련법, 1973_국가기술자격제도, 1974_사업내직업훈련의무제, 1977_전문대학체제출범, 1989_기능장려법
  - 1995_고용보험법, 1995_531교육개혁, 1997_자격기본법, 1998_국가기술자격체계정비, 1999_진로정보센터_CareerNet
  - 2002_인적자원개발기본법, 2005_산학협력중등직업교육, 2006_한국폴리텍대학, 2007_전문대학학위경로
  - 2008_마이스터고, 2008_내일배움카드, 2011_진로진학상담교사, 2012_지역산학협력강화, 2013_진로체험지원센터
  - 2014_NCS자격교육훈련연계, 2014_NCS교육과정, 2014_일학습병행제, 2014_특성화전문대학, 2015_진로교육법
  - 2018_전문대학성인친화, 2021_국가교육위원회, 2021_국민평생직업능력개발법, 2022_기업직업훈련혁신

### 2026-05-16 — 템플릿 보강: 카테고리를 본문 metadata 블록으로 가시화
- 사용자 피드백: "텍스트 파일 맨 윗줄 카테고리는 가장 큰 분류축인데 MD에서도 한 부분으로 들어가야 하지 않을까?"
- 본문 H1 제목 바로 아래에 blockquote 형태의 metadata 블록 추가
  - 카테고리(첫 줄) / 시기·정부 / 정책 영역 / 주요 문서를 모두 가시 영역에 노출
- 기존 `Events/1963_산업교육진흥법.md`와 `Plan_Summary.md`의 템플릿 함께 갱신

### 2026-05-16 — Phase 1 첫 번째 케이스: Events/1963_산업교육진흥법.md 생성
- 기존 `Screenshot/산업교육진흥법 ….txt`를 템플릿 기준 케이스로 변환
- 텍스트 라인 매핑 완료:
  - `시기` → frontmatter `date`
  - `정부` → `government`
  - `정책 영역` 첫 줄([직접적]·[간접적]) → `policy_area_direct`/`policy_area_indirect`
  - `주요 문서` → `key_documents` 리스트
  - `개요/등장배경/핵심 정책 내용/의미` → 동명 본문 섹션
  - `○` 머리표 → 마크다운 `-` 리스트로 정규화

### 2026-05-16 — Phase 1 인프라 구축: Plan_Summary.md, Events/ 폴더 생성
- 프로젝트 루트에 `Plan_Summary.md` 작성 (작업 허브 역할)
  - 8개 섹션: 프로젝트 목표 / 워크플로우 / 폴더 구조 / MD 템플릿 / 이벤트 인덱스 / Phase 2 점수 척도 / 자료 전달 팁 / 검증 체크리스트
- `Events/` 폴더 생성

### 2026-05-16 — 계획 수립 (Plan Mode)
- 사용자 요청: 우측 패널 텍스트를 받아 체계적 MD 파일로 정리하고 추후 분석에 활용할 계획 수립
- AskUserQuestion 2회 진행:
  - Q1 (응답 통합): 한 MD에 본문 + 응답 모두 vs 본문/응답 분리 → "한 MD" 채택
  - Q2 (입력 방식): 채팅 붙여넣기 vs Screenshot 폴더 일괄 vs 스크린샷 OCR → "Screenshot 폴더 일괄" 채택
- 계획 파일: `C:\Users\krivet\.claude\plans\screenshot-surveypannel-png-screenshot-velvet-thompson.md`
- ExitPlanMode로 승인 완료

---

## 기록 규칙

- 본 파일은 작업 이력 누적 기록. **최신 항목이 최상단에 위치** (최상단 컨텍스트 블록 바로 아래).
- 새 작업 시작 시:
  1. Python `from datetime import datetime; print(datetime.now().strftime('%Y-%m-%d %H:%M'))`으로 시각 확보
  2. 컨텍스트 블록 갱신 (현재 상태·다음 페이즈 주의사항 변경 시)
  3. "작업 이력" 섹션 최상단에 새 항목 추가
- 이전 시간이 불분명한 항목은 `2026-05-16`으로 기록.
- 작업 단위: 사용자 한 턴의 요청 = 한 이력 항목. 부속 작업은 항목 내 bullet으로.
