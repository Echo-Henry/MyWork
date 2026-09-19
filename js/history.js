(function (App) {
  'use strict';

  const { $, $$, esc, makeKey } = App.util;
  const { CATS, WEEK_CN } = App.config;
  const store = App.store;

  let selectedKey = '';

  /* ============ 渲染日历 ============ */
  function renderCalendar() {
    const y = App.state.calYear;
    const m = App.state.calMonth;

    const titleEl = $('#calTitleText');
    if (titleEl) titleEl.textContent = y + '年' + m + '月';

    const grid = $('#calGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const firstWeekday = new Date(y, m - 1, 1).getDay();
    const lead = (firstWeekday === 0) ? 6 : firstWeekday - 1;
    const daysInMonth = new Date(y, m, 0).getDate();

    for (let i = 0; i < lead; i++) {
      const s = document.createElement('div');
      s.className = 'day blank';
      grid.appendChild(s);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const key = makeKey(y, m, d);
      const el = document.createElement('div');
      el.className = 'day';
      if (key === App.state.todayKey) el.classList.add('today');
      if (key === selectedKey) el.classList.add('selected');
      if (store.hasData(key)) el.classList.add('has-data');
      el.dataset.key = key;

      const num = document.createElement('span');
      num.textContent = d;

      const dot = document.createElement('span');
      dot.className = 'dot';

      el.appendChild(num);
      el.appendChild(dot);
      grid.appendChild(el);
    }
  }

  /* ============ 渲染详情 ============ */
  function renderDetail(key) {
    if (!key) return;

    const bodyEl = $('#detailBody');
    if (!bodyEl) return;

    const d = store.readDay(key);
    const parts = key.split('-');
    const y = +parts[0], m = +parts[1], dd = +parts[2];
    const wd = WEEK_CN[new Date(y, m - 1, dd).getDay()];
    const isToday = key === App.state.todayKey;

    const dateEl = $('#detailDate');
    const badgeEl = $('#detailBadge');
    if (dateEl) dateEl.textContent = y + '年' + m + '月' + dd + '日 · 星期' + wd;
    if (badgeEl) badgeEl.style.display = isToday ? '' : 'none';

    let html = '';

    html += '<div class="d-sec"><div class="d-label">📝 待办清单</div>';
    if (d.todos.length) {
      html += '<ul class="d-list">';
      d.todos.forEach(function (t) {
        const ck = CATS[t.cat] ? t.cat : 'other';
        const cat = CATS[ck];
        html += '<li class="d-item' + (t.done ? ' done' : '') + '" data-id="' + esc(t.id) + '">'
              +   '<div class="h-check"></div>'
              +   '<span class="h-txt">' + esc(t.text) + '</span>'
              +   '<span class="tag" data-cat="' + ck + '">' + cat.emoji + ' ' + cat.name + '</span>'
              + '</li>';
      });
      html += '</ul>';
    } else {
      html += '<p class="d-empty">这天没有记录待办</p>';
    }
    html += '</div>';

    html += '<div class="d-sec"><div class="d-label">🌈 当天心情</div>';
    if (d.mood) html += '<div class="d-mood">' + d.mood + '</div>';
    else html += '<p class="d-empty">这天没有记录心情</p>';
    html += '</div>';

    html += '<div class="d-sec"><div class="d-label">💭 当天碎碎念</div>';
    if (d.note && d.note.trim()) html += '<p class="d-note">' + esc(d.note) + '</p>';
    else html += '<p class="d-empty">这天没有写碎碎念</p>';
    html += '</div>';

    bodyEl.innerHTML = html;
  }

  /* ============ 选中某天 ============ */
  function selectDay(key) {
    if (!key) return;
    selectedKey = key;
    App.state.calSelectedKey = key;

    renderCalendar();
    renderDetail(key);

    if (window.innerWidth < 820) {
      const card = $('#detailCard');
      if (card) {
        setTimeout(function () {
          card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
      }
    }
  }

  /* ============ 初始化 ============ */
  function init() {
    selectedKey = App.state.todayKey;
    App.state.calSelectedKey = selectedKey;

    const prevBtn = $('#prevMonth');
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        App.state.calMonth--;
        if (App.state.calMonth < 1) { App.state.calMonth = 12; App.state.calYear--; }
        renderCalendar();
      });
    }

    const nextBtn = $('#nextMonth');
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        App.state.calMonth++;
        if (App.state.calMonth > 12) { App.state.calMonth = 1; App.state.calYear++; }
        renderCalendar();
      });
    }

    const titleBtn = $('#calTitle');
    if (titleBtn) {
      titleBtn.addEventListener('click', function () {
        const n = new Date();
        App.state.calYear = n.getFullYear();
        App.state.calMonth = n.getMonth() + 1;
        selectDay(App.state.todayKey);
      });
    }

    const grid = $('#calGrid');
    if (grid) {
      grid.addEventListener('click', function (e) {
        const el = e.target.closest('.day');
        if (!el) return;
        if (el.classList.contains('blank')) return;
        const key = el.dataset.key;
        if (!key) return;
        selectDay(key);
      });
    }

    const body = $('#detailBody');
    if (body) {
      body.addEventListener('click', function (e) {
        const li = e.target.closest('.d-item');
        if (!li) return;
        if (!e.target.closest('.h-check') && !e.target.closest('.h-txt')) return;

        const id = li.dataset.id;
        const d = store.getDayRef(selectedKey);
        const t = d.todos.find(function (x) { return x.id === id; });
        if (!t) return;

        t.done = !t.done;
        store.save();
        renderDetail(selectedKey);
        renderCalendar();

        if (selectedKey === App.state.todayKey && App.today && App.today.refresh) {
          App.today.refresh();
        }
      });
    }

    renderCalendar();
    renderDetail(selectedKey);
  }

  function refresh() {
    if (!selectedKey) selectedKey = App.state.todayKey;
    App.state.calSelectedKey = selectedKey;
    renderCalendar();
    renderDetail(selectedKey);
  }

  App.history = { init: init, refresh: refresh };
})(window.App);