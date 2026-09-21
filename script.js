(function () {
  'use strict';

  var STORE_KEY = 'jee-planner:v1';
  var SUBJECTS = [
    { id: 'physics', name: 'Physics' },
    { id: 'chemistry', name: 'Chemistry' },
    { id: 'mathematics', name: 'Mathematics' },
    { id: 'other', name: 'Other', noun: 'miscellaneous' }
  ];
  var PRI = { high: 0, medium: 1, low: 2 };
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var ICON_EDIT = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
  var ICON_DEL = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>';

  var state = { tasks: [], examDate: '' };
  var ui = { filter: 'all', sort: 'deadline', query: '', editing: null };
  var storageOk = true;

  function $(id) { return document.getElementById(id); }
  var els = {
    board: $('board'), form: $('addForm'), fSubject: $('fSubject'), fTask: $('fTask'),
    fDue: $('fDue'), fPri: $('fPri'), formError: $('formError'),
    examDate: $('examDate'), examOut: $('examOut'), storageNote: $('storageNote'),
    sTotal: $('sTotal'), sDone: $('sDone'), sPending: $('sPending'), sToday: $('sToday'),
    sOverdue: $('sOverdue'), sOverdueBox: $('sOverdueBox'),
    overallBar: $('overallBar'), overallPct: $('overallPct'),
    cAll: $('cAll'), cPending: $('cPending'), cDone: $('cDone'),
    tSearch: $('tSearch'), tSort: $('tSort'), clearDone: $('clearDone'), toast: $('toast')
  };

  /* ---------- Storage ---------- */
  function validTask(t) {
    return t && typeof t.id === 'string' && typeof t.title === 'string' &&
      SUBJECTS.some(function (s) { return s.id === t.subject; });
  }
  function load() {
    try {
      localStorage.setItem('__probe', '1');
      localStorage.removeItem('__probe');
    } catch (e) { storageOk = false; }
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var p = JSON.parse(raw);
      if (p && Array.isArray(p.tasks)) {
        state.tasks = p.tasks.filter(validTask).map(function (t) {
          return {
            id: t.id, subject: t.subject, title: t.title,
            due: typeof t.due === 'string' ? t.due : '',
            priority: PRI.hasOwnProperty(t.priority) ? t.priority : 'medium',
            done: !!t.done, created: +t.created || 0, doneAt: +t.doneAt || null
          };
        });
        state.examDate = typeof p.examDate === 'string' ? p.examDate : '';
      }
    } catch (e) { /* start fresh */ }
  }
  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); storageOk = true; }
    catch (e) { storageOk = false; }
    els.storageNote.hidden = storageOk;
  }

  /* ---------- Dates ---------- */
  function todayStart() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function parseDate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return null;
    var p = s.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  function daysFrom(s) {
    var d = parseDate(s);
    return d ? Math.round((d - todayStart()) / 86400000) : null;
  }
  function fmtDate(s) {
    var d = parseDate(s);
    if (!d) return '';
    var y = d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '';
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + y;
  }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  /* ---------- DOM helper ---------- */
  function h(tag, props) {
    var el = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        var v = props[k];
        if (v == null || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      el.append(c.nodeType ? c : document.createTextNode(c));
    }
    return el;
  }
  function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function subjectName(id) { return SUBJECTS.filter(function (s) { return s.id === id; })[0].name; }

  /* ---------- Actions ---------- */
  function addTask(subject, title, due, priority) {
    state.tasks.push({
      id: newId(), subject: subject, title: title, due: due || '',
      priority: priority, done: false, created: Date.now(), doneAt: null
    });
    persist();
    render();
  }
  function toggle(id) {
    var t = state.tasks.filter(function (x) { return x.id === id; })[0];
    if (!t) return;
    t.done = !t.done;
    t.doneAt = t.done ? Date.now() : null;
    persist();
    render('[data-task="' + id + '"] .bubble');
  }
  function remove(id) {
    var i = state.tasks.findIndex(function (x) { return x.id === id; });
    if (i < 0) return;
    var t = state.tasks.splice(i, 1)[0];
    if (ui.editing === id) ui.editing = null;
    persist();
    render();
    showToast('Task deleted.', function () { state.tasks.push(t); persist(); render(); });
  }
  function clearDone() {
    var removed = state.tasks.filter(function (t) { return t.done; });
    if (!removed.length) return;
    state.tasks = state.tasks.filter(function (t) { return !t.done; });
    persist();
    render();
    showToast(plural(removed.length, 'completed task') + ' cleared.', function () {
      state.tasks = state.tasks.concat(removed); persist(); render();
    });
  }

  var toastTimer;
  function showToast(msg, undo) {
    clearTimeout(toastTimer);
    els.toast.replaceChildren(h('span', { text: msg }));
    if (undo) {
      els.toast.append(h('button', {
        type: 'button', text: 'Undo',
        onclick: function () { hideToast(); undo(); }
      }));
    }
    els.toast.hidden = false;
    toastTimer = setTimeout(hideToast, 6000);
  }
  function hideToast() { els.toast.hidden = true; }

  /* ---------- Sorting and filtering ---------- */
  function cmp(a, b) {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.done && b.done) return (b.doneAt || 0) - (a.doneAt || 0);
    if (ui.sort === 'added') return b.created - a.created;
    var pa = PRI[a.priority], pb = PRI[b.priority];
    var da = a.due || '9999-99-99', db = b.due || '9999-99-99';
    if (ui.sort === 'priority') {
      if (pa !== pb) return pa - pb;
      if (da !== db) return da < db ? -1 : 1;
      return a.created - b.created;
    }
    if (da !== db) return da < db ? -1 : 1;
    if (pa !== pb) return pa - pb;
    return a.created - b.created;
  }
  function visible(t) {
    if (ui.filter === 'pending' && t.done) return false;
    if (ui.filter === 'done' && !t.done) return false;
    if (ui.query && t.title.toLowerCase().indexOf(ui.query) === -1) return false;
    return true;
  }

  /* ---------- Rendering ---------- */
  function dueInfo(t) {
    if (!t.due || !parseDate(t.due)) return null;
    if (t.done) return { rel: '', cls: '', date: 'Due ' + fmtDate(t.due) };
    var n = daysFrom(t.due);
    if (n < 0) return { rel: 'Overdue by ' + plural(-n, 'day'), cls: 'overdue', date: fmtDate(t.due) };
    if (n === 0) return { rel: 'Due today', cls: 'today', date: '' };
    if (n === 1) return { rel: 'Due tomorrow', cls: '', date: fmtDate(t.due) };
    return { rel: plural(n, 'day') + ' left', cls: '', date: fmtDate(t.due) };
  }

  function taskRow(t) {
    if (ui.editing === t.id) return editRow(t);
    var info = dueInfo(t);
    var metaKids = [];
    if (info && info.rel) metaKids.push(h('span', { class: 'rel ' + info.cls, text: info.rel }));
    if (info && info.date) metaKids.push(h('span', { text: info.date }));
    if (t.priority === 'high') metaKids.push(h('span', { class: 'pri-high', text: 'High priority' }));
    if (t.priority === 'low') metaKids.push(h('span', { text: 'Low priority' }));

    var body = h('div', null, h('div', { class: 'task-title', text: t.title }));
    if (metaKids.length) body.append(h.apply(null, ['div', { class: 'meta' }].concat(metaKids)));

    return h('li', { class: 'task' + (t.done ? ' done' : ''), 'data-task': t.id },
      h('button', {
        class: 'bubble', type: 'button', role: 'checkbox',
        'aria-checked': t.done ? 'true' : 'false', 'aria-label': t.title,
        onclick: function () { toggle(t.id); }
      }),
      body,
      h('div', { class: 'actions' },
        h('button', {
          class: 'icon-btn edit-btn', type: 'button', html: ICON_EDIT,
          'aria-label': 'Edit task: ' + t.title, title: 'Edit',
          onclick: function () { ui.editing = t.id; render('[data-task="' + t.id + '"] .edit-title'); }
        }),
        h('button', {
          class: 'icon-btn', type: 'button', html: ICON_DEL,
          'aria-label': 'Delete task: ' + t.title, title: 'Delete',
          onclick: function () { remove(t.id); }
        })
      )
    );
  }

  function editRow(t) {
    var title = h('input', { type: 'text', class: 'edit-title', value: t.title, maxlength: '140', 'aria-label': 'Task name' });
    var date = h('input', { type: 'date', value: t.due || '', 'aria-label': 'Deadline' });
    var pri = h('select', { 'aria-label': 'Priority' },
      h('option', { value: 'high', selected: t.priority === 'high', text: 'High' }),
      h('option', { value: 'medium', selected: t.priority === 'medium', text: 'Medium' }),
      h('option', { value: 'low', selected: t.priority === 'low', text: 'Low' })
    );
    function save() {
      var v = title.value.trim();
      if (!v) { title.focus(); return; }
      t.title = v; t.due = date.value || ''; t.priority = pri.value;
      ui.editing = null;
      persist();
      render('[data-task="' + t.id + '"] .edit-btn');
    }
    function cancel() {
      ui.editing = null;
      render('[data-task="' + t.id + '"] .edit-btn');
    }
    var box = h('div', {
      class: 'edit',
      onkeydown: function (e) {
        if (e.key === 'Escape') { e.preventDefault(); cancel(); }
        else if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); save(); }
      }
    },
      title,
      h('div', { class: 'edit-row' }, date, pri),
      h('div', { class: 'edit-actions' },
        h('button', { type: 'button', class: 'btn-primary', text: 'Save', onclick: save }),
        h('button', { type: 'button', class: 'btn-quiet', text: 'Cancel', onclick: cancel })
      )
    );
    return h('li', { class: 'task editing', 'data-task': t.id }, box);
  }

  function renderColumn(sub) {
    var all = state.tasks.filter(function (t) { return t.subject === sub.id; });
    var done = all.filter(function (t) { return t.done; }).length;
    var pct = all.length ? Math.round(done / all.length * 100) : 0;
    var list = all.filter(visible).sort(cmp);

    var barFill = h('span');
    barFill.style.width = pct + '%';

    var body;
    if (!all.length) {
      body = h('div', { class: 'empty' },
        'No ' + (sub.noun || sub.name) + ' tasks yet. ',
        h('button', {
          type: 'button', class: 'btn-link', text: 'Add one',
          onclick: function () {
            els.fSubject.value = sub.id;
            els.form.scrollIntoView({ behavior: 'smooth', block: 'center' });
            els.fTask.focus({ preventScroll: true });
          }
        })
      );
    } else if (!list.length) {
      body = h('div', { class: 'empty', text: 'No tasks match the current filter.' });
    } else {
      body = h.apply(null, ['ul', { class: 'tasks' }].concat(list.map(taskRow)));
    }

    return h('section', { class: 'col', 'data-subject': sub.id, 'aria-label': sub.name },
      h('div', { class: 'col-head' },
        h('h3', { text: sub.name }),
        h('span', { class: 'col-count', text: done + ' of ' + all.length + ' done' })
      ),
      h('div', { class: 'bar', 'aria-hidden': 'true' }, barFill),
      body
    );
  }

  function renderStats() {
    var t = state.tasks, total = t.length;
    var done = t.filter(function (x) { return x.done; }).length;
    var today = 0, overdue = 0;
    t.forEach(function (x) {
      if (x.done || !x.due) return;
      var n = daysFrom(x.due);
      if (n === 0) today++;
      else if (n !== null && n < 0) overdue++;
    });
    els.sTotal.textContent = total;
    els.sDone.textContent = done;
    els.sPending.textContent = total - done;
    els.sToday.textContent = today;
    els.sOverdue.textContent = overdue;
    els.sOverdueBox.classList.toggle('alert', overdue > 0);
    var pct = total ? Math.round(done / total * 100) : 0;
    els.overallBar.style.width = pct + '%';
    els.overallPct.textContent = pct + '%';
    els.cAll.textContent = total;
    els.cPending.textContent = total - done;
    els.cDone.textContent = done;
    els.clearDone.hidden = done === 0;
  }

  function renderExam() {
    var n = state.examDate ? daysFrom(state.examDate) : null;
    els.examOut.replaceChildren();
    if (n === null) {
      els.examOut.append(h('span', { class: 'exam-hint', text: 'Set a date to start the countdown.' }));
    } else if (n > 0) {
      els.examOut.append(
        h('span', { class: 'exam-num', text: String(n) }),
        h('span', { class: 'exam-unit', text: n === 1 ? 'day to go' : 'days to go' })
      );
    } else if (n === 0) {
      els.examOut.append(h('span', { class: 'exam-unit', text: 'Exam day. All the best!' }));
    } else {
      els.examOut.append(h('span', { class: 'exam-unit', text: 'This exam date has passed.' }));
    }
  }

  function render(focusSel) {
    renderStats();
    renderExam();
    els.board.replaceChildren.apply(els.board, SUBJECTS.map(renderColumn));
    if (focusSel) {
      var el = document.querySelector(focusSel);
      if (el) el.focus();
    }
  }

  /* ---------- Events ---------- */
  els.form.addEventListener('submit', function (e) {
    e.preventDefault();
    var subject = els.fSubject.value;
    var title = els.fTask.value.trim();
    if (!subject) { els.formError.textContent = 'Choose a subject.'; els.fSubject.focus(); return; }
    if (!title) { els.formError.textContent = 'Enter a task.'; els.fTask.focus(); return; }
    els.formError.textContent = '';
    addTask(subject, title, els.fDue.value, els.fPri.value);
    els.fTask.value = '';
    els.fDue.value = '';
    els.fPri.value = 'medium';
    els.fTask.focus();
  });
  els.fSubject.addEventListener('change', function () { els.formError.textContent = ''; });
  els.fTask.addEventListener('input', function () { els.formError.textContent = ''; });

  document.querySelectorAll('[data-filter]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      ui.filter = btn.getAttribute('data-filter');
      document.querySelectorAll('[data-filter]').forEach(function (b) {
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      render();
    });
  });
  els.tSearch.addEventListener('input', function () { ui.query = els.tSearch.value.trim().toLowerCase(); render(); });
  els.tSort.addEventListener('change', function () { ui.sort = els.tSort.value; render(); });
  els.clearDone.addEventListener('click', clearDone);
  els.examDate.addEventListener('change', function () {
    state.examDate = els.examDate.value || '';
    persist();
    renderExam();
  });

  /* Refresh "due today / overdue" labels when the date rolls over */
  var dayKey = todayStart().getTime();
  function checkDay() {
    var k = todayStart().getTime();
    if (k !== dayKey) { dayKey = k; if (!ui.editing) render(); }
  }
  setInterval(checkDay, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) checkDay(); });

  /* ---------- Init ---------- */
  load();
  els.examDate.value = state.examDate;
  els.storageNote.hidden = storageOk;
  render();
})();