/*
 * template.js — 「2026학년도 가을학기 교육계획서」 원본 서식 정의
 *
 * 원본: (Template) 2026등대 교육계획서(교과명,학년)교사명.docx
 * 이 파일이 서식의 유일한 원본이다. 화면 편집기 / 인쇄(PDF) / .docx 내보내기가
 * 모두 여기서 나온 blocks 를 렌더링하므로, 문구 수정은 이 파일만 고치면 된다.
 *
 * 표 열너비는 원본 docx 의 twips 값을 그대로 옮겼다. (1 twip = 1/1440 inch)
 */

var TPL = (function () {
  'use strict';

  /* ── 학년 탭 ─────────────────────────────────────────────── */

  var GRADES = ['M6', 'M7', 'M8', 'H9', 'H10', 'H11', 'H12'];

  /* ── 고정 문구 ───────────────────────────────────────────── */

  var DOC_TITLE = '「2026학년도 가을학기 교육계획서」';
  var DOC_SUBTITLE = '하나님의 온전한 사람을 세우는 등대교육공동체';

  // 2. 학생 핵심 역량
  var COMPETENCY_INTRO = '본교는 학업 내용을 넘어 다음 5가지 핵심 자질을 함양하고자 한다.';
  var COMPETENCIES = [
    '평생 학습자 (Lifelong Learners)',
    '혁신적 사상가 (Innovative Thinkers)',
    '글로벌 협력자 (Global Collaborators)',
    '겸손한 기독교인 (Humble Christians)',
    '재능 있는 성취자 (Talented Achievers)'
  ];

  // 4. 학습 자료 및 수업 준비물
  var MATERIALS_INTRO = '매 수업마다 다음 항목을 반드시 지참하여야 한다.';
  var MATERIALS = [
    'Pencil and eraser',
    'Textbooks',
    'Notebook',
    'A good attitude with the energy for active learning'
  ];

  // 5-가. 성적 등급 기준
  var GRADE_SCALE = [
    ['A+', '95 – 100%', 'C', '73 – 76%'],
    ['A', '90 – 94%', 'C-', '70 – 72%'],
    ['B+', '87 – 89%', 'D+', '65 – 69%'],
    ['B', '83 – 86%', 'D', '60– 64%'],
    ['B-', '80 – 82%', 'F', '0– 59%'],
    ['C+', '77 – 79%', '', '']
  ];

  // 5-나. 성적 반영 비율 (영역·비율은 초기값, 교사가 조정 가능)
  var GRADING_ROWS = [
    { area: '인성', pct: '30' },
    { area: '수업내 활동', pct: '15' },
    { area: '숙제', pct: '15' },
    { area: '중간고사/프로젝트', pct: '20' },
    { area: '기말고사', pct: '20' }
  ];

  // 5-다. 인성 점수 상세 평가 기준
  var CHARACTER_CRITERIA = [
    '수업 정시 입실',
    '교재 및 필수 준비물 지참',
    '숙제 완료 및 지참',
    '교실 내 영어만 사용하기',
    '수업 토론 참여 및 질문하기',
    '수업 전, 중, 후의 전반적인 태도 및 행동 반영'
  ];

  // 6. 과제 및 결석 정책
  var HOMEWORK_POLICY = [
    '과제 제출: 매 단원 과제가 부여되며 일일/주간 일정 관리는 학생의 책임이다. 과제 지연 제출 시 10% 점수 감점이 적용되며, 지연 3일이 지난 과제는 접수하지 아니한다.',
    '결석 및 보충: 병가로 인한 결석은 불이익을 주지 아니한다, 등교 후 누락된 과제를 확인하고 보충할 책임은 학생에게 있다. 보충 기간은 기본 1일로 한다.',
    '기한 연장: 가족 비상사태 등의 사유로 연장이 필요한 경우, 마감 24시간 전에 담당 교사에게 직접 연락하여야 한다.'
  ];

  // 7-가. 행동 지침
  var GUIDELINES = [
    '수업 시작 전 자리에 착석하여 수업을 준비한다.',
    '교사와 동료 학생을 존중하는 언어와 태도를 유지한다.',
    '발언 시 손을 들고 지명을 받은 후 말한다.',
    '교실 내에서는 영어만 사용한다.',
    '수업 중 허가 없이 자리를 이탈하지 아니한다.',
    '전자기기는 교사의 지시가 있는 경우에만 사용한다.',
    '교실 기물과 학습 자료를 소중히 다룬다.',
    '과제와 준비물을 반드시 지참한다.',
    '정직하게 행동하며 부정행위를 하지 아니한다.'
  ];

  // 7-나. 단계별 징계 절차
  var DISCIPLINE_STEPS = [
    ['1차 위반', '구두 경고'],
    ['2차 위반', '교사 자체 처벌 (인성 점수 감점, 반성문·사과문 작성, 추가 청소)'],
    ['3차 위반', '타임아웃 (수업 격리)'],
    ['4차 위반', '상담 교사 보고 및 학부모 연락'],
    ['5차 위반', '교장 및 교장단에서 최종 처벌 수위 결정']
  ];

  // 8-가. AI 정책
  var AI_POLICY = [
    '교사의 명확한 지시가 없는 한 ChatGPT, Google Gemini, Claude 등 AI 도구 사용을 엄격히 금지한다.',
    '오용의 정의: 과제의 아이디어, 개요, 요약, 초안 생성에 AI를 사용하는 것은 부정행위로 간주한다.',
    '검증: AI 생성물로 의심되는 모든 작업물은 표절로 취급하며 즉시 징계 절차를 적용한다.'
  ];

  // 8-나. 부정행위 및 표절
  var PLAGIARISM = [
    '표절의 정의: 타인의 작업물이나 아이디어를 자신의 것처럼 제시하는 행위',
    '주요 표절 예시: 동료·인터넷 과제 복사, 위키피디아를 학술 출처로 사용, 참고문헌(Works Cited) 누락, 번역 애플리케이션의 번역본을 그대로 복사하는 행위'
  ];

  // 8-다. 징계 조치
  var PLAGIARISM_STEPS = [
    ['1차 위반', '해당 과제 0점 처리', '학부모 통지, 재제출 및 보충 불가'],
    ['2차 위반', '해당 과제 0점 처리', '보충 불가, 학내 징계위원회 소집'],
    ['3차 위반', '과목 낙제 (Course Failure)', '담당 교사 낙제 요청, 학교 리더십 팀 추가 조치 결정']
  ];

  // 9. 교과통합 핵심 가치 — 과목별 특성에 따라 선택
  var CORE_VALUES = [
    { key: '경외', text: '경외: 모든 배움은 하나님 앞에서 이루어집니다. 우리는 말씀 앞에 겸손히 순종하는 태도를 기릅니다.' },
    { key: '정직', text: '정직: 말과 행동이 삶 전체에서 일치되도록 훈련합니다. 숨겨진 자리에서도 진실하게 살아갑니다.' },
    { key: '책임', text: '책임: 맡겨진 일에 끝까지 최선을 다하는 태도. 삶의 모든 영역에 소명의식을 품고 임합니다.' },
    { key: '협력', text: '협력: 공동체 안에서 함께 배우고 성장합니다. 우리는 서로를 세워주는 배움의 동역자가 됩니다.' },
    { key: '존중', text: '존중: 사람과 자연, 배움의 과정을 하나님이 주신 선물로 여기고 소중히 대합니다.' },
    { key: '창의', text: '창의: 주어진 틀을 넘어 생각하고 표현하는 훈련을 통해 창조적 사고를 실천합니다.' },
    { key: '소명', text: '소명: 각자에게 주신 길을 발견하고 순종하는 삶. 모든 배움은 부르심을 향한 준비입니다.' }
  ];

  /* ── 10. 단원별 지도계획 — 학사일정 ──────────────────────────
   * lines: 「일시」 칸에 들어가는 줄들 (원본은 셀 안에서 줄바꿈).
   * 원본 그대로 옮겼다. 학사일정이 바뀌면 이 배열만 고치면 된다.
   *   ※ 원본에서 바로잡은 항목:
   *      - 2번째 주: '8/17 광복절' → '8/17 광복절 대체휴일'
   *        (2026년 광복절 8/15 는 토요일이라 8/17 월요일이 대체휴일)
   *   ※ 원본 표기 그대로 유지 중인 항목:
   *      - 12번째 주 '12/26-10/30' (10/26-10/30 의 오타로 보임)
   */
  var SCHEDULE = [
    { lines: ['8/14', '예비소집'] },
    { lines: ['8/17-21', '8/17 광복절 대체휴일'] },
    { lines: ['8/24-28'] },
    { lines: ['8/31-9/4'] },
    { lines: ['9/7-11'] },
    { lines: ['9/14-18', '9/15-9/18 수련회 기간'] },
    { lines: ['9/21-9/25', '9/24-9/25 추석'] },
    { lines: ['9/28-10/2'] },
    { lines: ['10/5-10/9', '10/5 개천절', '10/9 한글날'] },
    { lines: ['10/12-10/16'] },
    { lines: ['10/19-10/23', '학교개교 20주년 기념 주간'] },
    { lines: ['12/26-10/30', '10/29~10/30', '교사-학부모 상담 주간'] },
    { lines: ['11/2-11/6'] },
    { lines: ['11/9-11/13'] },
    { lines: ['11/16~11/20'] },
    { lines: ['11/23~11/27'] },
    { lines: ['11/30~12/04'] },
    { lines: ['12/07~12/11'] }
  ];

  /* 10절 「단원명」 칸에 미리 채워 두는 값. (SCHEDULE 의 인덱스 → 값)
   * 모든 학년 공통이며, 교사가 지우거나 고쳐 쓸 수 있는 일반 입력값이다.
   *
   *   0  8/14        예비소집    → 수업없음
   *   1  8/17-21                 → Orientation
   *   8  10/5-10/9               → Review Test  (중간고사 전주)
   *  17  12/07~12/11             → Review Test  (기말고사 12/14-12/16 전주)
   *
   * ※ 중간고사 주간은 원본 학사일정에 표기가 없어 학기 중간인 10/12-10/16 주로 보았다.
   *   실제 중간고사가 다른 주라면 아래 인덱스 8 을 그 전주 인덱스로 바꾸면 된다.
   */
  var SCHEDULE_DEFAULTS = {
    0: { unit: '수업없음' },
    1: { unit: 'Orientation' },
    8: { unit: 'Review Test' },
    17: { unit: 'Review Test' }
  };

  // 표 마지막 2행 — 입력 칸 없이 통합된 고정 행
  var SCHEDULE_FOOTER = [
    { date: '12/14-12/16', text: '12/14-12/16 기말고사,' },
    { date: '12/21-12/23', text: '12/22 스쿨 나잇, 12/23 가을 학기 종업일' }
  ];

  /* ── 표 열너비 (원본 twips) ──────────────────────────────── */

  var COLS = {
    header: [1701, 3472, 1276, 3189],
    full: [9638],
    objectives: [9628],
    gradeScale: [2427, 2427, 2427, 2428],
    grading: [3118, 1928, 4592],
    discipline: [2268, 7370],
    plagiarism: [1701, 2764, 5173],
    schedule: [1346, 1418, 2976, 2127, 1842]
  };

  var PAGE_WIDTH = 9638; // 본문 폭 (twips)

  /* ── 빈 문서 ─────────────────────────────────────────────── */

  function emptyDoc(grade) {
    return {
      grade: grade,
      subject: '',
      teacher: '',
      textbook: '',
      targetGrade: '',
      classroom: '',
      email: '',
      overview: '',
      philosophy: '',
      objectives: '',
      grading: GRADING_ROWS.map(function (r) {
        return { area: r.area, pct: r.pct, detail: '' };
      }),
      extraRules: '',
      values: [],
      schedule: SCHEDULE.map(function (s, i) {
        var def = SCHEDULE_DEFAULTS[i] || {};
        return {
          unit: def.unit || '',
          standard: def.standard || '',
          method: def.method || '',
          note: def.note || ''
        };
      }),
      updatedAt: null
    };
  }

  /* ── 문서 블록 생성 ──────────────────────────────────────────
   * 인쇄(HTML)와 .docx 내보내기가 공유하는 중간 표현.
   *   { t:'title'|'sub'|'h1'|'h2'|'p'|'note', text }
   *   { t:'list', style:'circle'|'num'|'paren', items:[…] }
   *   { t:'table', cols:[twips…], rows:[[cell…]] }
   *     cell = { text, head?:bool, span?:int, align?:'center', lines?:[…] }
   */
  function buildBlocks(d) {
    var B = [];
    var dash = function (v) { return v || ''; };

    B.push({ t: 'title', text: DOC_TITLE });
    B.push({ t: 'sub', text: DOC_SUBTITLE });

    B.push({ t: 'table', cols: COLS.header, rows: [
      [cellH('과 목 명'), cell(dash(d.subject)), cellH('담당 교사'), cell(dash(d.teacher))],
      [cellH('교 재 명'), cell(dash(d.textbook)), cellH('대상 학년'), cell(dash(d.targetGrade))],
      [cellH('구글클래스룸'), cell(dash(d.classroom)), cellH('이 메 일'), cell(dash(d.email))]
    ]});

    B.push({ t: 'h1', text: '1. 과목 개요 및 교육 철학' });
    B.push({ t: 'h2', text: '가. 과목 개요' });
    B.push({ t: 'table', cols: COLS.full, rows: [[cell(dash(d.overview), { grow: true })]] });
    B.push({ t: 'h2', text: '나. 교육 철학 (기독교적 가치 교과통합 방안)' });
    B.push({ t: 'table', cols: COLS.full, rows: [[cell(dash(d.philosophy), { grow: true })]] });
    B.push({ t: 'note', text: '※ 기독교 교육의 목적과 연계하고 근거 성경 구절을 포함하여 작성' });

    B.push({ t: 'h1', text: '2. 학생 핵심 역량 (Student Learning Outcomes)' });
    B.push({ t: 'p', text: COMPETENCY_INTRO });
    B.push({ t: 'list', style: 'circle', items: COMPETENCIES });

    B.push({ t: 'h1', text: '3. 학습 목표 (Learning Objectives)' });
    B.push({ t: 'table', cols: COLS.objectives, rows: [[cell(dash(d.objectives), { grow: true })]] });

    B.push({ t: 'h1', text: '4. 학습 자료 및 수업 준비물 (Student Materials)' });
    B.push({ t: 'p', text: MATERIALS_INTRO });
    B.push({ t: 'list', style: 'num', items: MATERIALS });

    B.push({ t: 'h1', text: '5. 성적 평가 및 반영 비율 (Grading Policy)' });
    B.push({ t: 'h2', text: '가. 성적 등급 기준' });
    B.push({ t: 'table', cols: COLS.gradeScale, rows: [
      [cellH('등급', 'center'), cellH('비율', 'center'), cellH('등급', 'center'), cellH('비율', 'center')]
    ].concat(GRADE_SCALE.map(function (r) {
      return r.map(function (v) { return cell(v, { align: 'center' }); });
    }))});

    B.push({ t: 'h2', text: '나. 성적 반영 비율' });
    B.push({ t: 'table', cols: COLS.grading, rows: [
      [cellH('평가 영역', 'center'), cellH('반영 비율(%)', 'center'), cellH('세부 내용', 'center')]
    ].concat(d.grading.map(function (r) {
      return [cell(r.area), cell(r.pct, { align: 'center' }), cell(r.detail)];
    })).concat([
      [cellH('합계'), cellH(sumPct(d.grading) + '%', 'center'), cell('')]
    ])});

    B.push({ t: 'h2', text: '다. 인성 점수 상세 평가 기준' });
    B.push({ t: 'list', style: 'circle', items: CHARACTER_CRITERIA });

    B.push({ t: 'h1', text: '6. 과제 및 결석 정책 (Homework & Absences)' });
    B.push({ t: 'list', style: 'circle', items: HOMEWORK_POLICY });
    B.push({ t: 'list', style: 'circle', items: ['과목별 추가 규정(해당 시): ' + dash(d.extraRules)] });

    B.push({ t: 'h1', text: '7. 교실 행동 지침 및 징계 절차 (Classroom Guidelines)' });
    B.push({ t: 'h2', text: '가. 행동 지침' });
    B.push({ t: 'list', style: 'paren', items: GUIDELINES });
    B.push({ t: 'h2', text: '나. 단계별 징계 절차' });
    B.push({ t: 'table', cols: COLS.discipline, rows: [
      [cellH('위반 차수', 'center'), cellH('조치 내용', 'center')]
    ].concat(DISCIPLINE_STEPS.map(function (r) {
      return [cell(r[0], { align: 'center' }), cell(r[1])];
    }))});

    B.push({ t: 'h1', text: '8. 인공지능(AI) 사용 및 표절 정책' });
    B.push({ t: 'h2', text: '가. AI 정책' });
    B.push({ t: 'list', style: 'circle', items: AI_POLICY });
    B.push({ t: 'h2', text: '나. 부정행위 및 표절' });
    B.push({ t: 'list', style: 'circle', items: PLAGIARISM });
    B.push({ t: 'h2', text: '다. 징계 조치' });
    B.push({ t: 'table', cols: COLS.plagiarism, rows: [
      [cellH('위반 차수', 'center'), cellH('학업적 불이익', 'center'), cellH('징계 조치', 'center')]
    ].concat(PLAGIARISM_STEPS.map(function (r) {
      return [cell(r[0], { align: 'center' }), cell(r[1]), cell(r[2])];
    }))});

    B.push({ t: 'h1', text: '9. 교과통합 핵심 가치 (과목별 특성에 따라 선택)' });
    var picked = CORE_VALUES.filter(function (v) { return d.values.indexOf(v.key) !== -1; });
    B.push({ t: 'list', style: 'plain', items: (picked.length ? picked : []).map(function (v) { return v.text; }) });

    B.push({ t: 'h1', text: '10. 단원별 지도계획' });
    var rows = [[
      cellH('일시', 'center'), cellH('단원명', 'center'), cellH('교육과정 성취기준', 'center'),
      cellH('수업 방법', 'center'), cellH('비고 / (기독교 세계관)', 'center')
    ]];
    SCHEDULE.forEach(function (s, i) {
      var r = d.schedule[i] || { unit: '', standard: '', method: '', note: '' };
      rows.push([
        cell('', { lines: s.lines, align: 'center' }),
        cell(dash(r.unit)), cell(dash(r.standard)), cell(dash(r.method)), cell(dash(r.note))
      ]);
    });
    SCHEDULE_FOOTER.forEach(function (f) {
      rows.push([cell(f.date, { align: 'center' }), cell(f.text, { span: 4 })]);
    });
    B.push({ t: 'table', cols: COLS.schedule, rows: rows });

    return B;
  }

  function cell(text, opts) {
    var c = { text: text == null ? '' : String(text) };
    if (opts) {
      if (opts.align) c.align = opts.align;
      if (opts.span) c.span = opts.span;
      if (opts.lines) c.lines = opts.lines;
      if (opts.grow) c.grow = true;
    }
    return c;
  }

  function cellH(text, align) {
    var c = cell(text, { align: align });
    c.head = true;
    return c;
  }

  function sumPct(rows) {
    return rows.reduce(function (a, r) {
      var n = parseFloat(r.pct);
      return a + (isNaN(n) ? 0 : n);
    }, 0);
  }

  return {
    GRADES: GRADES,
    DOC_TITLE: DOC_TITLE,
    DOC_SUBTITLE: DOC_SUBTITLE,
    CORE_VALUES: CORE_VALUES,
    SCHEDULE: SCHEDULE,
    SCHEDULE_DEFAULTS: SCHEDULE_DEFAULTS,
    SCHEDULE_FOOTER: SCHEDULE_FOOTER,
    GRADING_ROWS: GRADING_ROWS,
    GRADE_SCALE: GRADE_SCALE,
    COMPETENCY_INTRO: COMPETENCY_INTRO,
    COMPETENCIES: COMPETENCIES,
    MATERIALS_INTRO: MATERIALS_INTRO,
    MATERIALS: MATERIALS,
    CHARACTER_CRITERIA: CHARACTER_CRITERIA,
    HOMEWORK_POLICY: HOMEWORK_POLICY,
    GUIDELINES: GUIDELINES,
    DISCIPLINE_STEPS: DISCIPLINE_STEPS,
    AI_POLICY: AI_POLICY,
    PLAGIARISM: PLAGIARISM,
    PLAGIARISM_STEPS: PLAGIARISM_STEPS,
    COLS: COLS,
    PAGE_WIDTH: PAGE_WIDTH,
    emptyDoc: emptyDoc,
    buildBlocks: buildBlocks,
    sumPct: sumPct
  };
})();
