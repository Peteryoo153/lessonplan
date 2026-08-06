/*
 * app.js — 편집기 · 저장 · 인쇄 · 내보내기
 *
 * 저장은 브라우저 localStorage 한 곳에만 쌓인다. 다른 컴퓨터로 옮기거나
 * 브라우저 데이터를 지울 일이 있으면 반드시 「전체 백업 내보내기(.json)」를 쓸 것.
 */

(function () {
  'use strict';

  var KEY = 'lessonplan.2026fall.v1';
  var AUTOSAVE_MS = 1200;

  var state = load();
  var dirty = false;
  var autosaveTimer = null;

  var $form = document.getElementById('form');
  var $tabs = document.getElementById('tabs');
  var $status = document.getElementById('status');
  var $saveBtn = document.getElementById('saveBtn');
  var $toast = document.getElementById('toast');

  /* ── 상태 ─────────────────────────────────────────────────── */

  function fresh() {
    var docs = {};
    TPL.GRADES.forEach(function (g) { docs[g] = TPL.emptyDoc(g); });
    return { version: 1, active: TPL.GRADES[0], docs: docs, applied: {} };
  }

  function load() {
    var s;
    try {
      var raw = localStorage.getItem(KEY);
      s = raw ? JSON.parse(raw) : null;
    } catch (e) {
      s = null;
    }
    return normalize(s);
  }

  // 저장본이 오래됐거나 손상돼도 화면이 뜨도록 항상 형태를 맞춰 준다.
  function normalize(s) {
    var base = fresh();
    if (!s || typeof s !== 'object' || !s.docs) return base;
    TPL.GRADES.forEach(function (g) {
      var src = s.docs[g];
      if (!src || typeof src !== 'object') return;
      var d = base.docs[g];
      ['subject', 'teacher', 'textbook', 'targetGrade', 'classroom', 'email',
       'overview', 'philosophy', 'objectives', 'extraRules'].forEach(function (k) {
        if (typeof src[k] === 'string') d[k] = src[k];
      });
      if (Array.isArray(src.values)) d.values = src.values.slice();
      // 평가 영역은 교사가 추가·삭제할 수 있으므로 개수를 고정하지 않고 그대로 옮긴다.
      if (Array.isArray(src.grading)) {
        d.grading = src.grading.map(function (r) {
          r = r || {};
          return {
            area: typeof r.area === 'string' ? r.area : '',
            pct: r.pct == null ? '' : String(r.pct),
            detail: typeof r.detail === 'string' ? r.detail : ''
          };
        });
      }
      if (Array.isArray(src.schedule)) {
        src.schedule.forEach(function (r, i) {
          if (!d.schedule[i] || !r) return;
          ['unit', 'standard', 'method'].forEach(function (k) {
            if (typeof r[k] === 'string') d.schedule[i][k] = r[k];
          });
          // 주차별 「비고」는 시험 구간 단위 병합으로 바뀌었다. 옮겨 담을 때까지만 들고 있는다.
          if (typeof r.note === 'string' && r.note) d.schedule[i]._note = r.note;
        });
      }
      if (Array.isArray(src.worldview)) {
        src.worldview.forEach(function (v, i) {
          if (i < d.worldview.length && typeof v === 'string') d.worldview[i] = v;
        });
      }
      if (typeof src.updatedAt === 'string') d.updatedAt = src.updatedAt;
    });
    if (TPL.GRADES.indexOf(s.active) !== -1) base.active = s.active;
    if (s.applied && typeof s.applied === 'object') base.applied = s.applied;
    return base;
  }

  /* 이미 저장된 문서에 10절 기본값(수업없음 / Orientation / Review Test)을 한 번만 채운다.
   * 교사가 일부러 비워 둔 칸을 열 때마다 되살리지 않도록, 적용 여부를 applied 에 기록한다. */
  var MIGRATION = 'schedule-defaults-1';

  function applyScheduleDefaults() {
    if (state.applied[MIGRATION]) return false;
    TPL.GRADES.forEach(function (g) {
      var sched = state.docs[g].schedule;
      Object.keys(TPL.SCHEDULE_DEFAULTS).forEach(function (k) {
        var row = sched[parseInt(k, 10)];
        var def = TPL.SCHEDULE_DEFAULTS[k];
        if (!row || !def.unit) return;
        if (!(row.unit || '').trim()) row.unit = def.unit;
      });
    });
    state.applied[MIGRATION] = true;
    return true;
  }

  /* 주차별로 흩어져 있던 「비고 / (기독교 세계관)」을 시험 구간 두 칸으로 합친다.
   * 이미 써 둔 내용은 해당 구간 칸에 「일시 — 내용」 형태로 이어 붙여 보존한다. */
  var MIGRATION_WV = 'worldview-merge-1';

  function applyWorldviewMerge() {
    var had = false;
    TPL.GRADES.forEach(function (g) {
      var d = state.docs[g];
      TPL.WORLDVIEW_BLOCKS.forEach(function (blk, bi) {
        var carried = [];
        for (var i = blk.from; i <= blk.to; i++) {
          var row = d.schedule[i];
          if (!row) continue;
          if (row._note) {
            carried.push(TPL.SCHEDULE[i].lines[0] + ' — ' + row._note);
            had = true;
          }
          delete row._note;
        }
        if (!carried.length) return;
        var cur = (d.worldview[bi] || '').trim();
        d.worldview[bi] = cur ? cur + '\n' + carried.join('\n') : carried.join('\n');
      });
      // 구간 밖(마지막 고정 2행 등)에 남은 값이 있으면 버리지 않고 흘려보내지 않도록 정리
      d.schedule.forEach(function (row) { delete row._note; });
    });
    if (state.applied[MIGRATION_WV]) return had;
    state.applied[MIGRATION_WV] = true;
    return true;
  }

  function doc() { return state.docs[state.active]; }

  // 「마지막 저장 시각」을 건드리지 않고 그대로 기록만 한다 (내부 정리용).
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      toast('저장 실패: ' + (e && e.name === 'QuotaExceededError'
        ? '브라우저 저장 공간이 가득 찼습니다.' : e.message), true);
      return false;
    }
  }

  function save(quiet) {
    doc().updatedAt = new Date().toISOString();
    if (!persist()) return false;
    dirty = false;
    updateStatus();
    renderTabs();
    if (!quiet) toast('저장했습니다.');
    return true;
  }

  function markDirty() {
    dirty = true;
    updateStatus();
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(function () { save(true); }, AUTOSAVE_MS);
  }

  function updateStatus() {
    if (dirty) {
      $status.textContent = '저장 안 됨';
      $status.className = 'status warn';
      $saveBtn.classList.add('urgent');
    } else {
      var u = doc().updatedAt;
      $status.textContent = u ? '저장됨 · ' + timeLabel(u) : '아직 작성 전';
      $status.className = 'status';
      $saveBtn.classList.remove('urgent');
    }
  }

  function timeLabel(iso) {
    var d = new Date(iso), n = new Date();
    var sameDay = d.toDateString() === n.toDateString();
    var t = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    return sameDay ? t : d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) + ' ' + t;
  }

  /* ── 유틸 ─────────────────────────────────────────────────── */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setPath(obj, path, value) {
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
    cur[parts[parts.length - 1]] = value;
  }

  function toast(msg, isError) {
    $toast.textContent = msg;
    $toast.className = 'toast' + (isError ? ' error' : '');
    $toast.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { $toast.hidden = true; }, isError ? 5000 : 2200);
  }

  // 병합된 세로 칸(.wv-cell)의 입력란은 칸 높이를 그대로 채워야 하므로 자동 높이 조절에서 뺀다.
  function autoGrow(el) {
    if (el.closest && el.closest('.wv-cell')) return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight + 2, 34) + 'px';
  }

  function download(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // 갓 만든 빈 문서와 완전히 같은지 비교한다. 10절 기본값처럼 미리 채워 둔 값이 있어도
  // 손대지 않았다면 「비어 있음」으로 본다.
  function isEmptyDoc(d) {
    return contentOf(d) === contentOf(TPL.emptyDoc(d.grade));
  }

  function contentOf(d) {
    var c = JSON.parse(JSON.stringify(d));
    c.updatedAt = null;
    return JSON.stringify(c);
  }

  /* ── 탭 ───────────────────────────────────────────────────── */

  function renderTabs() {
    $tabs.innerHTML = TPL.GRADES.map(function (g) {
      var filled = !isEmptyDoc(state.docs[g]);
      return '<button class="tab' + (g === state.active ? ' active' : '') + '" data-grade="' + g + '">' +
        g + (filled ? '<span class="dot" title="작성 내용 있음"></span>' : '') + '</button>';
    }).join('');
  }

  $tabs.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-grade]');
    if (!btn || btn.dataset.grade === state.active) return;
    if (dirty) save(true);
    state.active = btn.dataset.grade;
    save(true);
    renderTabs();
    renderForm();
    window.scrollTo(0, 0);
  });

  /* ── 편집기 렌더 ──────────────────────────────────────────── */

  function ta(path, value, rows, placeholder) {
    return '<textarea data-path="' + path + '" rows="' + (rows || 3) +
      '" placeholder="' + esc(placeholder || '') + '">' + esc(value) + '</textarea>';
  }

  function input(path, value, placeholder) {
    return '<input type="text" data-path="' + path + '" value="' + esc(value) +
      '" placeholder="' + esc(placeholder || '') + '" autocomplete="off">';
  }

  function lockedBlock(inner) {
    return '<div class="locked"><span class="locked-tag">학교 공통 · 고정</span>' + inner + '</div>';
  }

  function lockedList(items, style) {
    var pre = { circle: function () { return '○ '; },
                num: function (i) { return (i + 1) + '. '; },
                paren: function (i) { return (i + 1) + ') '; },
                plain: function () { return ''; } }[style] || function () { return ''; };
    return '<ul class="plain-list">' + items.map(function (it, i) {
      return '<li>' + esc(pre(i) + it) + '</li>';
    }).join('') + '</ul>';
  }

  function lockedTable(cols, head, rows) {
    var total = cols.reduce(function (a, b) { return a + b; }, 0);
    return '<table class="t"><colgroup>' + cols.map(function (w) {
      return '<col style="width:' + (w / total * 100).toFixed(3) + '%">';
    }).join('') + '</colgroup><thead><tr>' + head.map(function (h) {
      return '<th>' + esc(h) + '</th>';
    }).join('') + '</tr></thead><tbody>' + rows.map(function (r) {
      return '<tr>' + r.map(function (c, i) {
        return '<td' + (i === 0 ? ' class="c-center"' : '') + '>' + esc(c) + '</td>';
      }).join('') + '</tr>';
    }).join('') + '</tbody></table>';
  }

  function renderForm() {
    var d = doc();
    var H = [];

    H.push('<div class="sheet">');
    H.push('<div class="doc-title">' + esc(TPL.DOC_TITLE) + '</div>');
    H.push('<div class="doc-sub">' + esc(TPL.DOC_SUBTITLE) + '</div>');

    // 머리 표
    H.push('<table class="t hdr"><colgroup><col style="width:18%"><col style="width:36%">' +
      '<col style="width:14%"><col style="width:32%"></colgroup><tbody>');
    H.push('<tr><th>과 목 명</th><td>' + input('subject', d.subject, '예: 영어 독해') +
      '</td><th>담당 교사</th><td>' + input('teacher', d.teacher) + '</td></tr>');
    H.push('<tr><th>교 재 명</th><td>' + input('textbook', d.textbook) +
      '</td><th>대상 학년</th><td>' + input('targetGrade', d.targetGrade, d.grade) + '</td></tr>');
    H.push('<tr><th>구글클래스룸</th><td>' + input('classroom', d.classroom, '수업 코드 또는 링크') +
      '</td><th>이 메 일</th><td>' + input('email', d.email) + '</td></tr>');
    H.push('</tbody></table>');

    // 1
    H.push(sec('1. 과목 개요 및 교육 철학'));
    H.push(sub('가. 과목 개요'));
    H.push('<div class="field">' + ta('overview', d.overview, 5, '과목의 성격과 한 학기 동안 다룰 내용을 서술') + '</div>');
    H.push(sub('나. 교육 철학 (기독교적 가치 교과통합 방안)'));
    H.push('<div class="field">' + ta('philosophy', d.philosophy, 5,
      '기독교 교육의 목적과 어떻게 연계되는지, 근거 성경 구절 포함') + '</div>');
    H.push('<p class="note">※ 기독교 교육의 목적과 연계하고 근거 성경 구절을 포함하여 작성</p>');

    // 2
    H.push(sec('2. 학생 핵심 역량 (Student Learning Outcomes)'));
    H.push(lockedBlock('<p>' + esc(TPL.COMPETENCY_INTRO) + '</p>' +
      lockedList(TPL.COMPETENCIES, 'circle')));

    // 3
    H.push(sec('3. 학습 목표 (Learning Objectives)'));
    H.push('<div class="field">' + ta('objectives', d.objectives, 5,
      '이 과목을 마쳤을 때 학생이 도달해야 할 목표') + '</div>');

    // 4
    H.push(sec('4. 학습 자료 및 수업 준비물 (Student Materials)'));
    H.push(lockedBlock('<p>' + esc(TPL.MATERIALS_INTRO) + '</p>' +
      lockedList(TPL.MATERIALS, 'num')));

    // 5
    H.push(sec('5. 성적 평가 및 반영 비율 (Grading Policy)'));
    H.push(sub('가. 성적 등급 기준'));
    H.push(lockedBlock(lockedTable(TPL.COLS.gradeScale, ['등급', '비율', '등급', '비율'], TPL.GRADE_SCALE)));

    H.push(sub('나. 성적 반영 비율'));
    H.push('<div id="gradingBox">' + gradingTableHtml(d) + '</div>');

    H.push(sub('다. 인성 점수 상세 평가 기준'));
    H.push(lockedBlock(lockedList(TPL.CHARACTER_CRITERIA, 'circle')));

    // 6
    H.push(sec('6. 과제 및 결석 정책 (Homework & Absences)'));
    H.push(lockedBlock(lockedList(TPL.HOMEWORK_POLICY, 'circle')));
    H.push('<div class="field"><label class="fl">○ 과목별 추가 규정 (해당 시)</label>' +
      ta('extraRules', d.extraRules, 3, '없으면 비워 두세요') + '</div>');

    // 7
    H.push(sec('7. 교실 행동 지침 및 징계 절차 (Classroom Guidelines)'));
    H.push(sub('가. 행동 지침'));
    H.push(lockedBlock(lockedList(TPL.GUIDELINES, 'paren')));
    H.push(sub('나. 단계별 징계 절차'));
    H.push(lockedBlock(lockedTable(TPL.COLS.discipline, ['위반 차수', '조치 내용'], TPL.DISCIPLINE_STEPS)));

    // 8
    H.push(sec('8. 인공지능(AI) 사용 및 표절 정책'));
    H.push(sub('가. AI 정책'));
    H.push(lockedBlock(lockedList(TPL.AI_POLICY, 'circle')));
    H.push(sub('나. 부정행위 및 표절'));
    H.push(lockedBlock(lockedList(TPL.PLAGIARISM, 'circle')));
    H.push(sub('다. 징계 조치'));
    H.push(lockedBlock(lockedTable(TPL.COLS.plagiarism,
      ['위반 차수', '학업적 불이익', '징계 조치'], TPL.PLAGIARISM_STEPS)));

    // 9
    H.push(sec('9. 교과통합 핵심 가치 (과목별 특성에 따라 선택)'));
    H.push('<p class="note">체크한 항목만 인쇄물과 .docx 에 실립니다.</p>');
    H.push('<ul class="values">' + TPL.CORE_VALUES.map(function (v) {
      var on = d.values.indexOf(v.key) !== -1;
      return '<li><label><input type="checkbox" data-value="' + v.key + '"' + (on ? ' checked' : '') +
        '><span>' + esc(v.text) + '</span></label></li>';
    }).join('') + '</ul>');

    // 10
    H.push(sec('10. 단원별 지도계획'));
    H.push('<div class="scroll-x"><table class="t plan"><colgroup>' +
      TPL.COLS.schedule.map(function (w) {
        return '<col style="width:' + (w / TPL.PAGE_WIDTH * 100).toFixed(3) + '%">';
      }).join('') +
      '</colgroup><thead><tr><th>일시</th><th>단원명</th><th>교육과정 성취기준</th>' +
      '<th>수업 방법</th><th>비고 / (기독교 세계관)</th></tr></thead><tbody>');
    TPL.SCHEDULE.forEach(function (s, i) {
      var r = d.schedule[i];
      H.push('<tr><th class="when">' + s.lines.map(function (l, j) {
        return '<span class="' + (j === 0 ? 'w-main' : 'w-sub') + '">' + esc(l) + '</span>';
      }).join('') + '</th>' +
        '<td>' + ta('schedule.' + i + '.unit', r.unit, 2) + '</td>' +
        '<td>' + ta('schedule.' + i + '.standard', r.standard, 2) + '</td>' +
        '<td>' + ta('schedule.' + i + '.method', r.method, 2) + '</td>');
      // 마지막 열은 시험 구간 단위로 병합된 한 칸. 구간 첫 행에서만 칸을 연다.
      var hit = TPL.worldviewBlockAt(i);
      if (hit) {
        var span = hit.block.to - hit.block.from + 1;
        H.push('<td class="wv-cell" rowspan="' + span + '">' +
          ta('worldview.' + hit.idx, d.worldview[hit.idx], 6, '') + '</td>');
      }
      H.push('</tr>');
    });
    TPL.SCHEDULE_FOOTER.forEach(function (f) {
      H.push('<tr class="fixed-row"><th class="when"><span class="w-main">' + esc(f.date) +
        '</span></th><td colspan="4">' + esc(f.text) + '</td></tr>');
    });
    H.push('</tbody></table></div>');

    H.push('</div>');

    $form.innerHTML = H.join('');
    Array.prototype.forEach.call($form.querySelectorAll('textarea'), autoGrow);
    updateSum();
    updateStatus();
  }

  function sec(t) { return '<h2 class="sec">' + esc(t) + '</h2>'; }
  function sub(t) { return '<h3 class="sub">' + esc(t) + '</h3>'; }

  // 5-나. 평가 영역은 행 추가·삭제가 되므로 이 표만 따로 다시 그린다
  // (전체를 다시 그리면 편집 중이던 다른 칸의 커서와 스크롤이 튄다).
  function gradingTableHtml(d) {
    var H = [];
    H.push('<table class="t grading"><colgroup><col style="width:24%"><col style="width:15%">' +
      '<col style="width:53%"><col style="width:8%"></colgroup>' +
      '<thead><tr><th>평가 영역</th><th>반영 비율(%)</th><th>세부 내용</th>' +
      '<th class="c-tools"></th></tr></thead><tbody>');
    d.grading.forEach(function (r, i) {
      H.push('<tr><td>' + input('grading.' + i + '.area', r.area, '평가 영역') +
        '</td><td>' + input('grading.' + i + '.pct', r.pct) +
        '</td><td>' + ta('grading.' + i + '.detail', r.detail, 2, '평가 방법 · 세부 기준') +
        '</td><td class="c-tools"><button type="button" class="row-del" data-act="delGrading" ' +
        'data-i="' + i + '" title="이 행 삭제" aria-label="이 행 삭제">×</button></td></tr>');
    });
    H.push('<tr class="sum-row"><th>합계</th><th id="gradingSum">' + TPL.sumPct(d.grading) +
      '%</th><td class="sum-hint"></td><td></td></tr>');
    H.push('</tbody></table>');
    H.push('<div class="row-add"><button type="button" class="btn small" data-act="addGrading">' +
      '+ 평가 영역 추가</button></div>');
    return H.join('');
  }

  function refreshGrading(focusLast) {
    var box = document.getElementById('gradingBox');
    if (!box) return;
    box.innerHTML = gradingTableHtml(doc());
    Array.prototype.forEach.call(box.querySelectorAll('textarea'), autoGrow);
    updateSum();
    if (focusLast) {
      var inputs = box.querySelectorAll('input[data-path$=".area"]');
      if (inputs.length) inputs[inputs.length - 1].focus();
    }
  }

  function updateSum() {
    var el = document.getElementById('gradingSum');
    if (!el) return;
    var total = TPL.sumPct(doc().grading);
    el.textContent = total + '%';
    var row = el.closest('tr');
    var hint = row.querySelector('.sum-hint');
    if (total === 100) {
      row.classList.remove('bad');
      hint.textContent = '';
    } else {
      row.classList.add('bad');
      hint.textContent = '합계가 100% 가 아닙니다.';
    }
  }

  /* ── 입력 처리 ────────────────────────────────────────────── */

  $form.addEventListener('input', function (e) {
    var el = e.target;
    if (el.dataset && el.dataset.path) {
      setPath(doc(), el.dataset.path, el.value);
      if (el.tagName === 'TEXTAREA') autoGrow(el);
      if (/^grading\.\d+\.pct$/.test(el.dataset.path)) updateSum();
      markDirty();
    }
  });

  $form.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!btn) return;

    if (btn.dataset.act === 'addGrading') {
      doc().grading.push({ area: '', pct: '', detail: '' });
      markDirty();
      refreshGrading(true);
    }

    if (btn.dataset.act === 'delGrading') {
      var i = parseInt(btn.dataset.i, 10);
      var row = doc().grading[i];
      if (!row) return;
      var remove = function () {
        doc().grading.splice(i, 1);
        markDirty();
        refreshGrading(false);
      };
      // 세부 내용을 써 둔 행만 확인을 받는다. 빈 행은 바로 지운다.
      if ((row.detail || '').trim()) {
        confirmDialog('평가 영역 삭제',
          '「' + (row.area || '이름 없는 영역') + '」 행을 삭제합니다. 입력한 세부 내용도 함께 지워집니다.',
          '삭제', remove, true);
      } else {
        remove();
      }
    }
  });

  $form.addEventListener('change', function (e) {
    var el = e.target;
    if (el.type === 'checkbox' && el.dataset.value) {
      var vals = doc().values;
      var idx = vals.indexOf(el.dataset.value);
      if (el.checked && idx === -1) vals.push(el.dataset.value);
      if (!el.checked && idx !== -1) vals.splice(idx, 1);
      markDirty();
    }
  });

  /* ── 인쇄 · 내보내기 ──────────────────────────────────────── */

  function blocksToPrintHtml(blocks) {
    return blocks.map(function (b) {
      switch (b.t) {
        case 'title': return '<h1 class="p-title">' + esc(b.text) + '</h1>';
        case 'sub': return '<p class="p-sub">' + esc(b.text) + '</p>';
        case 'h1': return '<h2 class="p-h1">' + esc(b.text) + '</h2>';
        case 'h2': return '<h3 class="p-h2">' + esc(b.text) + '</h3>';
        case 'p': return '<p>' + esc(b.text) + '</p>';
        case 'note': return '<p class="p-note">' + esc(b.text) + '</p>';
        case 'list':
          var pre = { circle: function () { return '○ '; },
                      num: function (i) { return (i + 1) + '. '; },
                      paren: function (i) { return (i + 1) + ') '; },
                      plain: function () { return ''; } }[b.style] || function () { return ''; };
          return b.items.map(function (it, i) {
            return '<p class="p-li">' + esc(pre(i) + it) + '</p>';
          }).join('');
        case 'table':
          var total = b.cols.reduce(function (a, c) { return a + c; }, 0);
          var out = '<table class="p-table"><colgroup>' + b.cols.map(function (w) {
            return '<col style="width:' + (w / total * 100).toFixed(3) + '%">';
          }).join('') + '</colgroup><tbody>';
          b.rows.forEach(function (row) {
            out += '<tr>';
            row.forEach(function (c) {
              if (c.vmergeCont) return;   // 세로 병합으로 이어지는 칸 — 위 칸의 rowspan 이 덮는다
              var tag = c.head ? 'th' : 'td';
              var attr = (c.span ? ' colspan="' + c.span + '"' : '') +
                (c.rowspan ? ' rowspan="' + c.rowspan + '"' : '') +
                (c.align === 'center' ? ' class="c-center"' : '');
              var body;
              if (c.lines && c.lines.length) {
                body = c.lines.map(function (l, i) {
                  return '<div class="' + (i === 0 ? 'w-main' : 'w-sub') + '">' + esc(l) + '</div>';
                }).join('');
              } else {
                body = '<div class="pre">' + esc(c.text) + '</div>';
              }
              out += '<' + tag + attr + '>' + body + '</' + tag + '>';
            });
            out += '</tr>';
          });
          return out + '</tbody></table>';
        default: return '';
      }
    }).join('');
  }

  function docFileName(d, ext) {
    var subject = (d.subject || '교과명').trim();
    var teacher = (d.teacher || '교사명').trim();
    return '2026등대 교육계획서(' + subject + ',' + d.grade + ')' + teacher + '.' + ext;
  }

  function doPrint() {
    if (dirty) save(true);
    var area = document.getElementById('printArea');
    area.innerHTML = blocksToPrintHtml(TPL.buildBlocks(doc()));
    var prevTitle = document.title;
    document.title = docFileName(doc(), 'pdf').replace(/\.pdf$/, '');
    window.print();
    setTimeout(function () { document.title = prevTitle; }, 500);
  }

  function exportDocx(d) {
    var blob = DOCX.build(TPL.buildBlocks(d), '2026 가을학기 교육계획서 ' + d.grade);
    download(blob, docFileName(d, 'docx'));
  }

  /* ── 백업 ─────────────────────────────────────────────────── */

  function backup() {
    if (dirty) save(true);
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    var d = new Date();
    var stamp = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' +
      pad(d.getHours()) + pad(d.getMinutes());
    download(blob, '교육계획서_백업_' + stamp + '.json');
    toast('백업 파일을 내려받았습니다.');
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  document.getElementById('restoreFile').addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var parsed;
      try {
        parsed = JSON.parse(reader.result);
      } catch (err) {
        toast('백업 파일을 읽을 수 없습니다 (JSON 형식 오류).', true);
        return;
      }
      confirmDialog('백업 가져오기',
        '현재 브라우저에 저장된 7개 학년 내용이 모두 백업 파일의 내용으로 바뀝니다. 계속할까요?',
        '가져오기', function () {
          state = normalize(parsed);
          applyScheduleDefaults();
          applyWorldviewMerge();
          save(true);
          renderTabs();
          renderForm();
          toast('백업을 불러왔습니다.');
        });
    };
    reader.readAsText(file);
  });

  /* ── 모달 ─────────────────────────────────────────────────── */

  function modal(title, bodyHtml, okLabel, onOk, okDanger) {
    var wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    wrap.innerHTML = '<div class="modal"><h3>' + esc(title) + '</h3>' +
      '<div class="modal-body">' + bodyHtml + '</div>' +
      '<div class="modal-foot"><button class="btn" data-x="cancel">취소</button>' +
      '<button class="btn ' + (okDanger ? 'danger' : 'primary') + '" data-x="ok">' +
      esc(okLabel) + '</button></div></div>';
    document.body.appendChild(wrap);
    function close() { document.body.removeChild(wrap); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target.dataset.x === 'cancel') return close();
      if (e.target.dataset.x === 'ok') {
        var keep = onOk(wrap);
        if (keep !== false) close();
      }
    });
    return wrap;
  }

  function confirmDialog(title, msg, okLabel, onOk, danger) {
    modal(title, '<p>' + esc(msg) + '</p>', okLabel, function () { onOk(); }, danger);
  }

  function copyToDialog() {
    if (dirty) save(true);
    var others = TPL.GRADES.filter(function (g) { return g !== state.active; });
    var body = '<p>' + esc(state.active) + ' 의 작성 내용을 아래 학년으로 복사합니다. ' +
      '선택한 학년의 기존 내용은 덮어씁니다.</p><ul class="check-list">' +
      others.map(function (g) {
        var filled = !isEmptyDoc(state.docs[g]);
        return '<li><label><input type="checkbox" value="' + g + '"><span>' + g +
          (filled ? ' <em class="warn-mini">작성된 내용 있음</em>' : '') + '</span></label></li>';
      }).join('') + '</ul>';

    modal('다른 학년으로 복사', body, '복사', function (wrap) {
      var picked = Array.prototype.map.call(
        wrap.querySelectorAll('input:checked'), function (i) { return i.value; });
      if (!picked.length) { toast('복사할 학년을 선택하세요.', true); return false; }
      var src = doc();
      picked.forEach(function (g) {
        var copy = JSON.parse(JSON.stringify(src));
        copy.grade = g;
        copy.updatedAt = null;
        state.docs[g] = copy;
      });
      save(true);
      renderTabs();
      toast(picked.join(', ') + ' 로 복사했습니다.');
    });
  }

  /* ── 툴바 ─────────────────────────────────────────────────── */

  $saveBtn.addEventListener('click', function () { save(false); });
  document.getElementById('printBtn').addEventListener('click', doPrint);
  document.getElementById('docxBtn').addEventListener('click', function () {
    if (dirty) save(true);
    exportDocx(doc());
    toast('.docx 파일을 내려받았습니다.');
  });

  var $moreBtn = document.getElementById('moreBtn');
  var $moreMenu = document.getElementById('moreMenu');

  $moreBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    $moreMenu.hidden = !$moreMenu.hidden;
    $moreBtn.setAttribute('aria-expanded', String(!$moreMenu.hidden));
  });
  document.addEventListener('click', function () {
    if (!$moreMenu.hidden) {
      $moreMenu.hidden = true;
      $moreBtn.setAttribute('aria-expanded', 'false');
    }
  });

  $moreMenu.addEventListener('click', function (e) {
    var act = e.target.dataset && e.target.dataset.act;
    if (!act) return;
    if (act === 'copyTo') copyToDialog();
    if (act === 'backup') backup();
    if (act === 'restore') document.getElementById('restoreFile').click();
    if (act === 'docxAll') {
      if (dirty) save(true);
      TPL.GRADES.forEach(function (g, i) {
        setTimeout(function () { exportDocx(state.docs[g]); }, i * 400);
      });
      toast('7개 파일을 순서대로 내려받습니다.');
    }
    if (act === 'clear') {
      confirmDialog('이 학년 내용 비우기',
        state.active + ' 에 작성한 내용을 모두 지웁니다. 되돌릴 수 없습니다.',
        '모두 비우기', function () {
          state.docs[state.active] = TPL.emptyDoc(state.active);
          save(true);
          renderTabs();
          renderForm();
          toast(state.active + ' 내용을 비웠습니다.');
        }, true);
    }
  });

  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      save(false);
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      doPrint();
    }
  });

  window.addEventListener('beforeunload', function (e) {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = '';
  });

  /* ── 시작 ─────────────────────────────────────────────────── */

  var migrated = applyScheduleDefaults();
  if (applyWorldviewMerge()) migrated = true;
  if (migrated) persist();
  renderTabs();
  renderForm();
})();
