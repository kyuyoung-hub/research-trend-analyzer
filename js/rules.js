// js/rules.js — 판단 기준은 전부 여기 (기획안 "지킬 것": 기준을 바꿀 때마다 PR로 검토)
//   ① 불용어  ② 동의어 통합 사전  ③ 추세 판정 규칙
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RULES = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    // ③ 추세 판정 (기획안): 자료의 마지막 연도 기준 최근 N년 합 vs 직전 N년 합
    trend: {
      window: 3,          // 최근 3년 vs 이전 3년
      up: 0.5,            // 증가율 +50% 이상 → 상승
      down: -0.5,         // 증가율 −50% 이하 → 하락
      minTotal: 3,        // 두 구간 합이 3건 미만 → 판정 보류
      keepTop: 300        // 결과에 담을 키워드 수(합계 순) · 자료가 크면 상위만. 0이면 전부
    },

    // ① 불용어 — 키워드로 세지 않을 낱말 (소문자 · 영문은 낱말 단위, 한글은 그대로 일치)
    stopwords: [
      // 영어 기능어
      'a', 'an', 'the', 'of', 'in', 'on', 'at', 'for', 'to', 'and', 'or', 'with', 'without', 'from', 'by', 'as',
      'is', 'are', 'was', 'were', 'be', 'been', 'it', 'its', 'this', 'that', 'these', 'those', 'their', 'our',
      'how', 'what', 'why', 'when', 'who', 'which', 'do', 'does', 'can', 'not', 'no', 'vs', 'versus', 'via',
      'between', 'among', 'within', 'during', 'after', 'before', 'across', 'into', 'about', 'than', 'towards', 'toward',
      // 논문 제목에 흔한 일반어
      'study', 'studies', 'review', 'analysis', 'using', 'based', 'role', 'impact', 'effect', 'effects', 'approach',
      'evidence', 'results', 'case', 'new', 'development', 'evaluation', 'assessment', 'perspective', 'perspectives',
      'perceptions', 'perception', 'factors', 'associated', 'outcomes', 'outcome', 'quality',
      'systematic', 'scoping', 'protocol', 'randomized', 'randomised', 'trial', 'cross', 'sectional', 'cohort',
      'treatment', 'improve', 'improving', 'improvement', 'future', 'letter', 'association', 'data', 'service', 'services',
      'hospital', 'hospitals', 'integrated', 'practice', 'process', 'model', 'models', 'use', 'toward', 'need', 'needs',
      // 검색어 자체 (모든 자료에 들어 있어 흐름을 가리므로 뺌 · 기획안 수집 기준 검색어)
      'patient', 'patients', 'experience', 'experiences', 'care', 'health', 'healthcare', 'medical', 'clinical',
      'patient experience', 'patient experiences', 'patient-reported experience', 'patient-reported experiences',
      // 한글 일반어 (환자경험평가 · 환자중심성 등 주제어는 넣지 않음)
      '연구', '분석', '사례', '대한', '위한', '관련', '통한', '따른', '대상', '효과', '영향', '및', '의', '에서', '에', '를', '을',
      '관한', '미치는', '주는', '있는', '중심', '방안', '요인', '관계', '차이', '조사', '비교', '탐색', '개발', '적용', '활용', '정도', '고찰', '사례연구', '실태',
      // 한글 검색어 자체 (RISS · DBpia 검색어 '환자경험'이 거의 모든 제목에 들어 있어 흐름을 가리므로 뺌)
      '환자', '경험', '환자경험', '경험한', '경험하는', '미치', '인식한', '인식하는',
      // 언론기사 제목에 흔한 일반어
      '1위', '교수', '개원', '선정', '혁신', '평가', '의료', '기자', '단독', '속보', '인터뷰', '기획'
    ],

    // ② 동의어 통합 사전 — 대표어: [같은 뜻으로 묶을 표현들] (소문자 · 하이픈과 공백은 같은 것으로 봄)
    synonyms: {
      'PREM': ['prem', 'prems', 'patient reported experience measure', 'patient reported experience measures'],
      'PROM': ['prom', 'proms', 'patient reported outcome measure', 'patient reported outcome measures', 'patient reported outcomes'],
      '환자경험평가': ['환자경험평가', '환자경험 평가', '환자 경험 평가', 'patient experience survey', 'patient experience surveys', 'patient experience measurement'],
      '환자중심성': ['환자중심성', '환자중심', '환자중심 의료', '환자중심간호', 'patient centered care', 'patient centred care', 'patient centeredness', 'patient centredness', 'person centered care', 'person centred care', 'person centred', 'person centered', 'patient centered', 'patient centred', 'patient centered approach'],
      '환자만족도': ['환자만족도', '환자 만족도', '환자만족', 'patient satisfaction', 'satisfaction'],
      '환자안전': ['환자안전', 'patient safety'],
      'CAHPS': ['cahps', 'hcahps'],
      '의료질': ['의료질', '의료의 질', 'quality of care', 'healthcare quality', 'quality improvement', 'care quality', 'quality in health care'],
      '공유의사결정': ['공유의사결정', 'shared decision making', 'shared decision-making', 'sdm'],
      '의사소통': ['의사소통', 'communication', 'patient provider communication', 'doctor patient communication', 'physician patient communication'],
      '환자참여': ['환자참여', 'patient engagement', 'patient involvement', 'patient participation', 'patient activation', 'patient and public involvement'],
      '자연어처리': ['자연어처리', 'natural language processing', 'nlp'],
      '대형언어모델': ['대형언어모델', 'large language model', 'large language models', 'llm', 'llms', 'chatgpt', 'generative ai'],
      '인공지능': ['인공지능', 'artificial intelligence', 'ai'],
      '기계학습': ['기계학습', 'machine learning', 'deep learning'],
      '토픽모델링': ['토픽모델링', 'topic modeling', 'topic modelling'],
      '실시간피드백': ['실시간피드백', 'real time feedback', 'patient feedback', 'feedback'],
      '디지털헬스': ['디지털헬스', 'digital health', 'telehealth', 'telemedicine', 'ehealth', 'mhealth', 'mobile health'],
      '코로나19': ['코로나19', 'covid 19', 'covid', 'sars cov 2', 'pandemic'],
      '1차의료': ['1차의료', 'primary care', 'primary health care', 'general practice'],
      '입원환자': ['입원환자', 'inpatient', 'inpatients', 'hospitalized patients', 'hospital care'],
      '응급': ['응급', 'emergency department', 'emergency departments', 'emergency care'],
      '암': ['암', 'cancer', 'oncology'],
      '간호': ['간호', 'nursing', 'nurses', 'nurse'],
      '의사': ['의사', 'physician', 'physicians', 'doctor', 'doctors'],
      '정신건강': ['정신건강', 'mental health', 'psychiatry'],
      '소아': ['소아', 'pediatric', 'pediatrics', 'paediatric', 'children'],
      '노인': ['노인', 'older adults', 'elderly', 'geriatric'],
      '질적연구': ['질적연구', 'qualitative research', 'qualitative study', 'qualitative', 'interviews'],
      '측정도구': ['측정도구', 'questionnaire', 'questionnaires', 'instrument', 'instruments', 'psychometric', 'psychometrics', 'validation', 'scale', 'survey', 'surveys'],
      '체계적문헌고찰': ['체계적문헌고찰', 'systematic review', 'meta analysis', 'meta-analysis'],
      '주제범위문헌고찰': ['주제범위문헌고찰', 'scoping review'],
      '형평성': ['형평성', 'equity', 'health equity', 'disparities', 'health disparities', 'inequalities'],
      '완화의료': ['완화의료', 'palliative care', 'end of life', 'hospice'],
      '의료비': ['의료비', 'cost', 'costs', 'value based care']
    }
  };
});
