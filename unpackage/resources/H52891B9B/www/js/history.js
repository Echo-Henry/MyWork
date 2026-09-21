(function (App) {
  'use strict';

  const { $, $$, esc, makeKey } = App.util;
  const { CATS, WEEK_CN } = App.config;   // ★ WEEK_CN 在这里
  const store = App.store;

  let selectedKey = '';
  let searchKeyword = '';

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

  /* ============ 渲染某天详情 ============ */
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

  /* ============ 搜索历史 ============ */
  function searchHistory(keyword) {
    const kw = String(keyword || '').toLowerCase().trim();
    if (!kw) return [];

    const allData = (store.getAll ? store.getAll() : {}) || {};
    const results = [];

    const keys = Object.keys(allData)
      .filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k))
      .sort()
      .reverse();

    keys.forEach(dateKey => {
      const d = allData[dateKey];
      if (!d || typeof d !== 'object') return;

      if (Array.isArray(d.todos)) {
        d.todos.forEach(t => {
          if (t.text && t.text.toLowerCase().indexOf(kw) !== -1) {
            results.push({
              date: dateKey,
              type: 'todo',
              text: t.text,
              done: !!t.done
            });
          }
        });
      }

      if (d.note && d.note.toLowerCase().indexOf(kw) !== -1) {
        results.push({
          date: dateKey,
          type: 'note',
          text: d.note
        });
      }
    });

    return results;
  }

  /* ============ 渲染搜索结果 ============ */
  function renderSearchResults(keyword) {
    const bodyEl = $('#detailBody');
    const dateEl = $('#detailDate');
    const badgeEl = $('#detailBadge');
    if (!bodyEl) return;

    if (badgeEl) badgeEl.style.display = 'none';
    if (dateEl) dateEl.textContent = '🔍 搜索结果';

    const results = searchHistory(keyword);

    if (!results.length) {
      bodyEl.innerHTML = '<div class="search-empty">'
        + '<span class="em">🌱</span>'
        + '没有找到匹配的记录<br>换个词试试吧～'
        + '</div>';
      return;
    }

    let html = '<p class="search-count">共找到 ' + results.length + ' 条记录（点任意一条可跳转当天）</p>';
    html += '<div class="search-results">';

    results.forEach(r => {
      const dp = r.date.split('-');
      const dateLabel = (+dp[1]) + '月' + (+dp[2]) + '日';
      const wd = WEEK_CN[new Date(+dp[0], +dp[1] - 1, +dp[2]).getDay()];

      if (r.type === 'todo') {
        html += '<div class="search-item" data-date="' + r.date + '">'
          + '<span class="si-date">' + dateLabel + ' 周' + wd + '</span>'
          + '<span class="si-icon">' + (r.done ? '✅' : '⬜') + '</span>'
          + '<span class="si-text">' + esc(r.text) + '</span>'
          + '</div>';
      } else {
        html += '<div class="search-item" data-date="' + r.date + '">'
          + '<span class="si-date">' + dateLabel + ' 周' + wd + '</span>'
          + '<span class="si-icon">💭</span>'
          + '<span class="si-text">' + esc(r.text) + '</span>'
          + '</div>';
      }
    });

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
        /* 搜索结果点击 → 跳转到那天 */
        const searchItem = e.target.closest('.search-item');
        if (searchItem) {
          const date = searchItem.dataset.date;
          const si = $('#searchInput');
          if (si) si.value = '';
          const sc = $('#searchClear');
          if (sc) sc.style.display = 'none';
          searchKeyword = '';

          const dp = date.split('-');
          App.state.calYear = +dp[0];
          App.state.calMonth = +dp[1];
          selectedKey = date;
          App.state.calSelectedKey = date;
          renderCalendar();
          renderDetail(date);
          return;
        }

        /* 普通详情打勾 */
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

    /* 搜索框 */
    const si = $('#searchInput');
    const sc = $('#searchClear');

    if (si) {
      si.addEventListener('input', function () {
        const v = si.value.trim();
        searchKeyword = v;
        if (sc) sc.style.display = v ? 'grid' : 'none';

        const calCard = $('#calCard');
        const detailCard = $('#detailCard');

        if (v) {
          if (calCard) calCard.style.display = 'none';
          if (detailCard) detailCard.style.gridColumn = '1 / -1';
          renderSearchResults(v);
        } else {
          if (calCard) calCard.style.display = '';
          if (detailCard) detailCard.style.gridColumn = '';
          renderCalendar();
          renderDetail(selectedKey);
        }
      });
    }

    if (sc) {
      sc.addEventListener('click', function () {
        if (si) si.value = '';
        searchKeyword = '';
        sc.style.display = 'none';
        const calCard = $('#calCard');
        const detailCard = $('#detailCard');
        if (calCard) calCard.style.display = '';
        if (detailCard) detailCard.style.gridColumn = '';
        renderCalendar();
        renderDetail(selectedKey);
      });
    }

    renderCalendar();
    renderDetail(selectedKey);
  }

  function refresh() {
    if (!selectedKey) selectedKey = App.state.todayKey;
    App.state.calSelectedKey = selectedKey;

    const si = $('#searchInput');
    if (si && si.value.trim()) {
      const calCard = $('#calCard');
      if (calCard) calCard.style.display = 'none';
      renderSearchResults(si.value.trim());
      return;
    }

    renderCalendar();
    renderDetail(selectedKey);
  }

  App.history = { init: init, refresh: refresh };
})(window.App);