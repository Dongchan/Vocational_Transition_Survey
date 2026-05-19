"""
Voc_edu_history 데이터 빌드 스크립트.

입력: Events/*.md frontmatter + Korean Law MCP 응답(메모 형태로 본 스크립트 내 LAW_REGISTRY에 박힘)
출력: data/laws.json, data/relations.json, data/policy_events.json

원칙:
- verified=True: Korean Law MCP search_law 응답으로 mst/law_id 확보된 법령
- verified=False: 폐지 법령 등 MCP 현행 DB에 없는 항목. 출처는 Events MD에 명시된 법률 번호·공포일
- 관계(relations)는 Events MD 본문에 명시적으로 언급된 것만 포함. 추정 금지.
"""
import json
import os
import re
from pathlib import Path

PROJECT_ROOT = Path(r"D:\AI_Work\Claude\Vocational_Transition_Survey")
EVENTS_DIR = PROJECT_ROOT / "Events"
DATA_DIR = PROJECT_ROOT / "Voc_edu_history" / "data"


# ────────────────────────────────────────────────────────────────────
# 법령 레지스트리: Korean Law MCP search_law 응답(2026-05-18 조회) 기준.
# verified=True 항목은 mst가 비어있지 않음.
# enacted_year는 Events MD의 key_documents에 명시된 법률 번호·공포일 또는
# 한국 법제처 현행 법령 정보에서 확인된 값만 사용.
# track_order는 카테고리·시간순으로 세로 배치 순서 (1=상단).
# ────────────────────────────────────────────────────────────────────

LAW_REGISTRY = [
    # ━━ 직업교육 학교 트랙 ━━
    {
        "id": "education_act_1949",
        "name_kr": "교육법",
        "aliases": ["구 교육법(1949)"],
        "enacted": "1949-12-31",
        "enacted_year": 1949,
        "abolished": "1997-12-13",
        "category": "중등직업교육",
        "track_order": 0,
        "mst": "",
        "law_id": "",
        "verified": False,
        "milestones": [
            {"date": "1949-12-31", "type": "enacted",
             "label": "교육법 제정", "law_number": "법률 제86호"},
            {"date": "1997-12-13", "type": "abolished",
             "label": "교육법 폐지(초·중등교육법·고등교육법 분할 제정)"},
        ],
        "source_note": "폐지 법령(법제처 현행 DB 미존재). 후신 「초·중등교육법」(법률 제5438호, mst=279605)·「고등교육법」(법률 제5439호, mst=268513)이 1997-12-13 동시 제정·교육법 폐지로 분할. MCP search_law(2026-05-18) 후신 법령 공포일 일치 검증",
    },
    {
        "id": "industrial_education_act",
        "name_kr": "산업교육진흥 및 산학연협력촉진에 관한 법률",
        "aliases": ["산업교육진흥법"],
        "enacted": "1963-09-19",
        "enacted_year": 1963,
        "abolished": None,
        "category": "중등직업교육",
        "track_order": 1,
        "mst": "267351",
        "law_id": "000865",
        "verified": True,
        "milestones": [
            {"date": "1963-09-19", "type": "enacted",
             "label": "산업교육진흥법 제정", "law_number": "법률 제1403호"},
            {"date": "1996", "type": "renamed",
             "label": "산업교육진흥 및 산학협력진흥에 관한 법률로 개칭"},
            {"date": "2003", "type": "renamed",
             "label": "현행 명칭으로 개칭(산학연협력촉진)"},
        ],
        "source_note": "MCP search_law(2026-05-18): 현행 법령 mst=267351, 공포 20241220",
    },
    {
        "id": "elementary_secondary_education_act",
        "name_kr": "초·중등교육법",
        "aliases": [],
        "enacted": "1997-12-13",
        "enacted_year": 1997,
        "abolished": None,
        "category": "중등직업교육",
        "track_order": 2,
        "mst": "279605",
        "law_id": "000900",
        "verified": True,
        "milestones": [
            {"date": "1997-12-13", "type": "enacted",
             "label": "초·중등교육법 제정(교육법 분할)"},
            {"date": "2013-01-23", "type": "major_amended",
             "label": "시행령 개정으로 진로체험지원센터 근거 마련"},
        ],
        "source_note": "MCP search_law(2026-05-18): 현행 법령 mst=279605",
    },
    {
        "id": "higher_education_act",
        "name_kr": "고등교육법",
        "aliases": [],
        "enacted": "1997-12-13",
        "enacted_year": 1997,
        "abolished": None,
        "category": "고등 및 평생직업교육",
        "track_order": 3,
        "mst": "268513",
        "law_id": "000899",
        "verified": True,
        "milestones": [
            {"date": "1977-12", "type": "major_amended",
             "label": "(전신) 교육법 개정으로 전문대학 체제 출범",
             "law_number": "교육법 일부개정"},
            {"date": "1997-12-13", "type": "enacted",
             "label": "고등교육법 제정(교육법 분할)"},
            {"date": "2007-07-25", "type": "major_amended",
             "label": "전문대학 학위경로 확장 개정",
             "law_number": "법률 제8543호"},
            {"date": "2021-02", "type": "major_amended",
             "label": "마이스터대(전문기술석사) 도입 개정",
             "law_number": "법률 제8543호 계열"},
        ],
        "source_note": "MCP search_law(2026-05-18): 현행 법령 mst=268513",
    },
    {
        "id": "lifelong_education_act",
        "name_kr": "평생교육법",
        "aliases": [],
        "enacted": "1999-08-31",
        "enacted_year": 1999,
        "abolished": None,
        "category": "고등 및 평생직업교육",
        "track_order": 4,
        "mst": "279615",
        "law_id": "000851",
        "verified": True,
        "milestones": [
            {"date": "1999-08-31", "type": "enacted",
             "label": "평생교육법 제정(사회교육법 전부개정)"},
        ],
        "source_note": "MCP search_law(2026-05-18): 현행 법령 mst=279615",
    },

    # ━━ 직업훈련 트랙 ━━
    {
        "id": "vocational_training_act_1967",
        "name_kr": "직업훈련법",
        "aliases": [],
        "enacted": "1967-01-16",
        "enacted_year": 1967,
        "abolished": "1976-12-31",
        "category": "직업훈련",
        "track_order": 5,
        "mst": None,
        "law_id": None,
        "verified": False,
        "milestones": [
            {"date": "1967-01-16", "type": "enacted",
             "label": "직업훈련법 제정", "law_number": "법률 제1880호"},
            {"date": "1976-12-31", "type": "abolished",
             "label": "직업훈련기본법 시행으로 폐지"},
        ],
        "source_note": "Events/1967_직업훈련법.md key_documents에 명시된 법률 제1880호. 폐지로 MCP 현행 DB에 없음",
    },
    {
        "id": "vocational_training_special_act",
        "name_kr": "직업훈련에 관한 특별조치법",
        "aliases": [],
        "enacted": "1974-12-26",
        "enacted_year": 1974,
        "abolished": "1976-12-31",
        "category": "직업훈련",
        "track_order": 6,
        "mst": None,
        "law_id": None,
        "verified": False,
        "milestones": [
            {"date": "1974-12-26", "type": "enacted",
             "label": "사업내 직업훈련 의무제 도입(특별조치법)",
             "law_number": "법률 제2741호"},
            {"date": "1976-12-31", "type": "abolished",
             "label": "직업훈련기본법으로 통합"},
        ],
        "source_note": "Events/1974_사업내직업훈련의무제.md key_documents 명시. 폐지로 MCP 현행 DB에 없음",
    },
    {
        "id": "vocational_training_basic_act",
        "name_kr": "직업훈련기본법",
        "aliases": [],
        "enacted": "1976-12-31",
        "enacted_year": 1976,
        "abolished": "1997-12-24",
        "category": "직업훈련",
        "track_order": 7,
        "mst": None,
        "law_id": None,
        "verified": False,
        "milestones": [
            {"date": "1976-12-31", "type": "enacted",
             "label": "직업훈련기본법 제정", "law_number": "법률 제2973호"},
            {"date": "1997-12-24", "type": "abolished",
             "label": "근로자직업훈련촉진법 시행으로 폐지"},
        ],
        "source_note": "Events/1974_사업내직업훈련의무제.md, 1995_고용보험법.md 명시. 폐지로 MCP 현행 DB에 없음",
    },
    {
        "id": "vocational_training_promotion_fund_act",
        "name_kr": "직업훈련촉진기금법",
        "aliases": [],
        "enacted": "1976-12-31",
        "enacted_year": 1976,
        "abolished": "1995-07-01",
        "category": "직업훈련",
        "track_order": 8,
        "mst": None,
        "law_id": None,
        "verified": False,
        "milestones": [
            {"date": "1976-12-31", "type": "enacted",
             "label": "직업훈련촉진기금법 제정(분담금 재원 도입)",
             "law_number": "법률 제2974호"},
            {"date": "1995-07-01", "type": "abolished",
             "label": "고용보험 직능개발사업으로 편입"},
        ],
        "source_note": "Events/1974_사업내직업훈련의무제.md 명시. 폐지로 MCP 현행 DB에 없음",
    },
    {
        "id": "ktma_act",
        "name_kr": "한국직업훈련관리공단법",
        "aliases": [],
        "enacted": "1981",
        "enacted_year": 1981,
        "abolished": None,
        "category": "직업훈련",
        "track_order": 9,
        "mst": None,
        "law_id": None,
        "verified": False,
        "milestones": [
            {"date": "1981", "type": "enacted",
             "label": "한국직업훈련관리공단 설립 법적 근거 마련",
             "law_number": "법률 제3506호"},
        ],
        "source_note": "Events/1974_사업내직업훈련의무제.md key_documents 명시. MCP 현행 DB 미확인",
    },
    {
        "id": "employment_insurance_act",
        "name_kr": "고용보험법",
        "aliases": [],
        "enacted": "1993-12-27",
        "enacted_year": 1993,
        "abolished": None,
        "category": "직업훈련",
        "track_order": 10,
        "mst": "279807",
        "law_id": "001761",
        "verified": True,
        "milestones": [
            {"date": "1993-12-27", "type": "enacted",
             "label": "고용보험법 제정", "law_number": "법률 제4644호"},
            {"date": "1995-07-01", "type": "major_amended",
             "label": "직업능력개발사업 시행(직업훈련 보험화)"},
        ],
        "source_note": "MCP search_law(2026-05-18): 현행 법령 mst=279807",
    },
    {
        "id": "lifelong_vocational_skills_dev_act",
        "name_kr": "국민 평생 직업능력 개발법",
        "aliases": ["근로자직업훈련촉진법", "근로자직업능력 개발법"],
        "enacted": "1997-12-24",
        "enacted_year": 1997,
        "abolished": None,
        "category": "직업훈련",
        "track_order": 11,
        "mst": "247245",
        "law_id": "000117",
        "verified": True,
        "milestones": [
            {"date": "1997-12-24", "type": "enacted",
             "label": "근로자직업훈련촉진법 제정(직업훈련기본법 대체)",
             "law_number": "법률 제5474호"},
            {"date": "2004-12-31", "type": "renamed",
             "label": "근로자직업능력 개발법으로 전부개정",
             "law_number": "법률 제7298호"},
            {"date": "2021-08-17", "type": "renamed",
             "label": "국민 평생 직업능력 개발법으로 개칭(외연 확장)",
             "law_number": "법률 제18425호"},
        ],
        "source_note": "MCP search_law(2026-05-18): 현행 법령 mst=247245. 1997·2004 명칭 변경 Events/1995_고용보험법.md, 2006_한국폴리텍대학.md, 2021_국민평생직업능력개발법.md 명시",
    },
    {
        "id": "industry_field_work_learning_act",
        "name_kr": "산업현장 일학습병행 지원에 관한 법률",
        "aliases": [],
        "enacted": "2019-08-27",
        "enacted_year": 2019,
        "abolished": None,
        "category": "직업훈련",
        "track_order": 12,
        "mst": "234773",
        "law_id": "013573",
        "verified": True,
        "milestones": [
            {"date": "2019-08-27", "type": "enacted",
             "label": "산업현장 일학습병행 지원에 관한 법률 제정",
             "law_number": "법률 제16559호"},
        ],
        "source_note": "MCP search_law(2026-05-18): 현행 법령 mst=234773. Events/2014_일학습병행제.md 명시",
    },

    # ━━ 자격체계 트랙 ━━
    {
        "id": "national_technical_qualifications_act",
        "name_kr": "국가기술자격법",
        "aliases": [],
        "enacted": "1973-12-31",
        "enacted_year": 1973,
        "abolished": None,
        "category": "직무능력 및 자격체계",
        "track_order": 13,
        "mst": "243041",
        "law_id": "000135",
        "verified": True,
        "milestones": [
            {"date": "1973-12-31", "type": "enacted",
             "label": "국가기술자격법 제정", "law_number": "법률 제2672호"},
            {"date": "1998-05-09", "type": "major_amended",
             "label": "시행령 개정: 8단계→5단계 자격체계",
             "law_number": "대통령령 제15794호"},
            {"date": "2010", "type": "major_amended",
             "label": "시행령 개정: 사무·서비스 분야 도입",
             "law_number": "대통령령 제22179호"},
            {"date": "2017", "type": "major_amended",
             "label": "NCS 기반 자격 일부개정"},
        ],
        "source_note": "MCP search_law(2026-05-18): 현행 법령 mst=243041",
    },
    {
        "id": "skill_promotion_act",
        "name_kr": "숙련기술장려법",
        "aliases": ["기능장려법"],
        "enacted": "1989-04-01",
        "enacted_year": 1989,
        "abolished": None,
        "category": "직무능력 및 자격체계",
        "track_order": 14,
        "mst": "252725",
        "law_id": "000133",
        "verified": True,
        "milestones": [
            {"date": "1989-04-01", "type": "enacted",
             "label": "기능장려법 제정", "law_number": "법률 제4081호"},
            {"date": "2011", "type": "renamed",
             "label": "숙련기술장려법으로 개칭(우대정책 확장)",
             "law_number": "법률 제10678호"},
        ],
        "source_note": "MCP search_law(2026-05-18): 현행 법령 mst=252725",
    },
    {
        "id": "qualifications_basic_act",
        "name_kr": "자격기본법",
        "aliases": [],
        "enacted": "1997-03-27",
        "enacted_year": 1997,
        "abolished": None,
        "category": "직무능력 및 자격체계",
        "track_order": 15,
        "mst": "246585",
        "law_id": "000866",
        "verified": True,
        "milestones": [
            {"date": "1997-03-27", "type": "enacted",
             "label": "자격기본법 제정(통합 자격체계)",
             "law_number": "법률 제5333호"},
        ],
        "source_note": "MCP search_law(2026-05-18): 현행 법령 mst=246585",
    },

    # ━━ 진로교육 트랙 ━━
    {
        "id": "career_education_act",
        "name_kr": "진로교육법",
        "aliases": [],
        "enacted": "2015-06-22",
        "enacted_year": 2015,
        "abolished": None,
        "category": "진로교육",
        "track_order": 16,
        "mst": "234005",
        "law_id": "012309",
        "verified": True,
        "milestones": [
            {"date": "2015-06-22", "type": "enacted",
             "label": "진로교육법 제정"},
        ],
        "source_note": "MCP search_law(2026-05-18): 현행 법령 mst=234005",
    },

    # ━━ 거버넌스·범부처 트랙 ━━
    {
        "id": "hrd_basic_act",
        "name_kr": "인적자원개발 기본법",
        "aliases": ["인적자원개발기본법"],
        "enacted": "2002-08-26",
        "enacted_year": 2002,
        "abolished": None,
        "category": "고등 및 평생직업교육",
        "track_order": 17,
        "mst": "276189",
        "law_id": "009349",
        "verified": True,
        "milestones": [
            {"date": "2002-08-26", "type": "enacted",
             "label": "인적자원개발기본법 제정"},
        ],
        "source_note": "MCP search_law(2026-05-18): 현행 법령 mst=276189",
    },
    {
        "id": "national_education_council_act",
        "name_kr": "국가교육위원회 설치 및 운영에 관한 법률",
        "aliases": [],
        "enacted": "2021-07-20",
        "enacted_year": 2021,
        "abolished": None,
        "category": "중등직업교육",
        "track_order": 18,
        "mst": "233989",
        "law_id": "014118",
        "verified": True,
        "milestones": [
            {"date": "2021-07-20", "type": "enacted",
             "label": "국가교육위원회 설치 및 운영에 관한 법률 제정"},
            {"date": "2022", "type": "major_amended",
             "label": "시행령 제정"},
        ],
        "source_note": "MCP search_law(2026-05-18): 현행 법령 mst=233989",
    },
]


# ────────────────────────────────────────────────────────────────────
# 관계 정의: Events MD 본문에 명시적으로 언급된 법령 간 관계만 포함.
# type: succession (구법 폐지→신법) | renamed (단일 법령 개칭) |
#       basis (모법-자법, 영향) | branch (한 법령에서 분할)
# ────────────────────────────────────────────────────────────────────

RELATIONS = [
    # 직업훈련 트랙 계승 체인
    {"from": "vocational_training_act_1967", "to": "vocational_training_special_act",
     "type": "basis", "year": 1974,
     "note": "1967 직업훈련법의 자율 보조금 모델 작동 정지에 대응한 특별조치법 제정"},
    {"from": "vocational_training_act_1967", "to": "vocational_training_basic_act",
     "type": "succession", "year": 1976,
     "note": "1967 직업훈련법 폐지, 직업훈련기본법으로 일원화"},
    {"from": "vocational_training_special_act", "to": "vocational_training_basic_act",
     "type": "succession", "year": 1976,
     "note": "특별조치법 폐지, 직업훈련기본법으로 통합"},
    {"from": "vocational_training_basic_act", "to": "vocational_training_promotion_fund_act",
     "type": "basis", "year": 1976,
     "note": "직업훈련기본법과 동시 제정된 재원 짝법(Train-or-Pay 체계)"},
    {"from": "vocational_training_basic_act", "to": "ktma_act",
     "type": "basis", "year": 1981,
     "note": "공공직업훈련 거버넌스로 한국직업훈련관리공단 설립"},
    {"from": "vocational_training_basic_act", "to": "lifelong_vocational_skills_dev_act",
     "type": "succession", "year": 1997,
     "note": "직업훈련기본법 폐지, 근로자직업훈련촉진법 제정(민간 자율 시장 체제 전환)"},
    {"from": "vocational_training_promotion_fund_act", "to": "employment_insurance_act",
     "type": "succession", "year": 1995,
     "note": "분담금 재원이 고용보험 직능개발사업으로 편입"},
    {"from": "employment_insurance_act", "to": "lifelong_vocational_skills_dev_act",
     "type": "basis", "year": 1997,
     "note": "고용보험 직능개발사업의 운영 근거를 별도 법률로 분리"},

    # 자격체계 트랙
    {"from": "vocational_training_act_1967", "to": "national_technical_qualifications_act",
     "type": "basis", "year": 1973,
     "note": "직업훈련 영역에서 자격제도 분리·국가 통합 자격체계 출범"},
    {"from": "national_technical_qualifications_act", "to": "qualifications_basic_act",
     "type": "basis", "year": 1997,
     "note": "국가기술자격 중심에서 통합 자격체계(국가자격+민간자격)로 확장"},
    {"from": "national_technical_qualifications_act", "to": "skill_promotion_act",
     "type": "reference", "year": 1989,
     "note": "자격제도와 숙련기술 우대정책의 상호 참조"},

    # 학교 직업교육 트랙
    {"from": "industrial_education_act", "to": "higher_education_act",
     "type": "reference", "year": 1977,
     "note": "교육법 개정으로 전문대학 체제 출범(이후 1997 고등교육법 분할)"},

    # 교육법 분할 (branch) — 1997-12-13 교육법 폐지·동시 제정
    {"from": "education_act_1949", "to": "elementary_secondary_education_act",
     "type": "branch", "year": 1997,
     "note": "1949 교육법 폐지·분할. 초등·중등 영역이 「초·중등교육법」(법률 제5438호)로 이관"},
    {"from": "education_act_1949", "to": "higher_education_act",
     "type": "branch", "year": 1997,
     "note": "1949 교육법 폐지·분할. 고등교육 영역이 「고등교육법」(법률 제5439호)로 이관"},

    # 일학습병행제 관련
    {"from": "lifelong_vocational_skills_dev_act", "to": "industry_field_work_learning_act",
     "type": "basis", "year": 2019,
     "note": "일학습병행제 운영 근거를 별도 법률로 제정"},

    # 진로교육
    {"from": "elementary_secondary_education_act", "to": "career_education_act",
     "type": "basis", "year": 2015,
     "note": "초·중등교육법의 진로교육 운영을 별도 법률로 제도화"},

    # 거버넌스
    {"from": "hrd_basic_act", "to": "national_education_council_act",
     "type": "reference", "year": 2021,
     "note": "범부처 인적자원개발 거버넌스와 국가교육 거버넌스의 메타 정책 영역 연속성"},
]


# ────────────────────────────────────────────────────────────────────
# 정책 이벤트 ↔ 법령 매핑: Events MD frontmatter + key_documents 기반.
# 한 이벤트가 여러 법령에 연결될 수 있음.
# ────────────────────────────────────────────────────────────────────

EVENT_LAW_MAP = {
    "1963_산업교육진흥법.md": ["industrial_education_act"],
    "1967_직업훈련법.md": ["vocational_training_act_1967", "national_technical_qualifications_act"],
    "1973_국가기술자격제도.md": ["national_technical_qualifications_act"],
    "1974_사업내직업훈련의무제.md": ["vocational_training_special_act", "vocational_training_basic_act",
                          "vocational_training_promotion_fund_act", "ktma_act"],
    "1977_전문대학체제출범.md": ["higher_education_act"],
    "1989_기능장려법.md": ["skill_promotion_act"],
    "1995_531교육개혁.md": [],
    "1995_고용보험법.md": ["employment_insurance_act", "lifelong_vocational_skills_dev_act"],
    "1997_자격기본법.md": ["qualifications_basic_act"],
    "1998_국가기술자격체계정비.md": ["national_technical_qualifications_act"],
    "1999_진로정보센터_CareerNet.md": [],
    "2002_인적자원개발기본법.md": ["hrd_basic_act"],
    "2005_산학협력중등직업교육.md": [],
    "2006_한국폴리텍대학.md": ["lifelong_vocational_skills_dev_act"],
    "2007_전문대학학위경로.md": ["higher_education_act"],
    "2008_내일배움카드.md": ["lifelong_vocational_skills_dev_act"],
    # 마이스터고는 「초·중등교육법 시행령」 제76조의3(산업수요맞춤형 고등학교) 근거 — 모법에 매핑
    "2008_마이스터고.md": ["elementary_secondary_education_act"],
    "2011_진로진학상담교사.md": ["elementary_secondary_education_act"],
    "2012_지역산학협력강화.md": ["higher_education_act"],
    "2013_진로체험지원센터.md": ["elementary_secondary_education_act"],
    "2014_NCS교육과정.md": ["elementary_secondary_education_act", "higher_education_act"],
    "2014_NCS자격교육훈련연계.md": ["national_technical_qualifications_act"],
    "2014_일학습병행제.md": ["lifelong_vocational_skills_dev_act", "industry_field_work_learning_act"],
    "2014_특성화전문대학.md": ["higher_education_act"],
    "2015_진로교육법.md": ["career_education_act"],
    "2018_전문대학성인친화.md": ["higher_education_act", "lifelong_education_act"],
    "2021_국가교육위원회.md": ["national_education_council_act"],
    "2021_국민평생직업능력개발법.md": ["lifelong_vocational_skills_dev_act"],
    "2022_기업직업훈련혁신.md": ["lifelong_vocational_skills_dev_act"],
}


def extract_overview_first_sentences(content: str, n: int = 2) -> str:
    """## 개요 섹션에서 처음 n문장 추출. 본문 톤(명사형 종결) 유지."""
    m = re.search(r"## 개요\n(.+?)(?=\n## |\Z)", content, re.DOTALL)
    if not m:
        return ""
    body = m.group(1).strip()
    # 마침표·물음표·느낌표 단위로 분할
    sentences = re.split(r"(?<=[.!?])\s+", body)
    return " ".join(sentences[:n]).strip()


def extract_frontmatter(content: str) -> dict:
    fm_match = re.search(r"^---\n(.+?)\n---", content, re.DOTALL)
    if not fm_match:
        return {}
    fm = fm_match.group(1)

    def g(p, default=None, cast=None):
        m = re.search(p, fm, re.MULTILINE)
        if not m:
            return default
        v = m.group(1).strip()
        return cast(v) if cast else v

    return {
        "title": g(r"^title:\s*(.+)$"),
        "year": g(r"^year:\s*(\d+)$", cast=int),
        "date": g(r"^date:\s*(.+)$"),
        "category": g(r"^category:\s*(.+)$"),
        "government": g(r"^government:\s*(.+)$"),
        "direction_shift": g(r"^direction_shift:\s*(\d+)$", cast=int),
        "impact": g(r"^impact:\s*(\d+)$", cast=int),
    }


def build_policy_events() -> list:
    events = []
    for fn in sorted(os.listdir(EVENTS_DIR)):
        if not fn.endswith(".md"):
            continue
        path = EVENTS_DIR / fn
        content = path.read_text(encoding="utf-8")
        fm = extract_frontmatter(content)
        summary = extract_overview_first_sentences(content, n=2)
        law_ids = EVENT_LAW_MAP.get(fn, [])
        events.append({
            "file": fn,
            "year": fm.get("year"),
            "date": fm.get("date"),
            "title": fm.get("title"),
            "category": fm.get("category"),
            "government": fm.get("government"),
            "direction_shift": fm.get("direction_shift"),
            "impact": fm.get("impact"),
            "law_ids": law_ids,
            "summary": summary,
        })
    return events


def validate() -> list:
    """데이터 정합성 검증. 경고 목록 반환(빈 리스트면 통과)."""
    warnings = []
    law_ids = {law["id"] for law in LAW_REGISTRY}

    # 1. relations의 from/to가 law_ids에 존재하는가
    for r in RELATIONS:
        if r["from"] not in law_ids:
            warnings.append(f"RELATIONS: unknown from='{r['from']}'")
        if r["to"] not in law_ids:
            warnings.append(f"RELATIONS: unknown to='{r['to']}'")

    # 2. EVENT_LAW_MAP의 law_id가 law_ids에 존재하는가
    for fn, ids in EVENT_LAW_MAP.items():
        for lid in ids:
            if lid not in law_ids:
                warnings.append(f"EVENT_LAW_MAP[{fn}]: unknown law_id='{lid}'")

    # 3. track_order 중복 확인
    track_orders = [law["track_order"] for law in LAW_REGISTRY]
    if len(track_orders) != len(set(track_orders)):
        warnings.append("LAW_REGISTRY: duplicate track_order")

    return warnings


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    warnings = validate()
    if warnings:
        print("=== VALIDATION WARNINGS ===")
        for w in warnings:
            print(f"  ! {w}")
        print()
    else:
        print("Validation OK\n")

    (DATA_DIR / "laws.json").write_text(
        json.dumps(LAW_REGISTRY, ensure_ascii=False, indent=2), encoding="utf-8")
    (DATA_DIR / "relations.json").write_text(
        json.dumps(RELATIONS, ensure_ascii=False, indent=2), encoding="utf-8")

    events = build_policy_events()
    (DATA_DIR / "policy_events.json").write_text(
        json.dumps(events, ensure_ascii=False, indent=2), encoding="utf-8")

    # 통계
    verified_count = sum(1 for l in LAW_REGISTRY if l["verified"])
    print(f"laws.json:          {len(LAW_REGISTRY)} laws ({verified_count} verified, {len(LAW_REGISTRY)-verified_count} unverified)")
    print(f"relations.json:     {len(RELATIONS)} edges")
    print(f"policy_events.json: {len(events)} events")
    print(f"\nOutput: {DATA_DIR}")


if __name__ == "__main__":
    main()
