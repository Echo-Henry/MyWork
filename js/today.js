(function (App) {
  'use strict';

  const { $, $$, esc, uid, makeKey, dayDiff } = App.util;
  const { CATS, MOODS, MOOD_TIPS, QUOTES, YIS, WEEK_CN } = App.config;
  const store = App.store;

  let curCat = 'work';
  let lastAllDone = false;
  let noteTimer = null;
  let noteEl = null;

  /* ============ 顶部文案 ============ */
  function greetingByHour() {
    const h = new Date().getHours();
    if (h < 5)  return '夜深了，早点休息哦 🌙';
    if (h < 11) return '早上好，新的一天开始啦 ☀️';
    if (h < 14) return '中午好，记得好好吃饭 🍚';
    if (h < 18) return '下午好，来杯咖啡提提神 ☕️';
    if (h < 23) return '晚上好，今天辛苦啦 🌆';
    return '夜安，别熬太晚呀 🌙';
  }

  function updateHero() {
    const T_KEY = App.state.todayKey;
    const key = App.state.selectedDateKey;
    const p = key.split('-');
    const yy = +p[0], mm = +p[1], dd = +p[2];
    const dObj = new Date(yy, mm - 1, dd);
    const isT = key === T_KEY;
    const diff = dayDiff(key);
    const md = mm + '月' + dd + '日';

    $('#dateText').textContent = md + ' 星期' + WEEK_CN[dObj.getDay()];

    const seed = key.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    $('#yiText').textContent = YIS[seed % YIS.length];

    let title;
    if (isT) title = '今天也要<span class="hl">好好生活</span>呀';
    else if (diff === 1) title = '明天也要<span class="hl">好好生活</span>呀';
    else if (diff === 2) title = '后天也要<span class="hl">好好生活</span>呀';
    else title = md + ' 的<span class="hl">小计划</span>';
    $('#heroTitle').innerHTML = title;

    let sub;
    if (isT) sub = greetingByHour();
    else if (diff === 1) sub = '提前规划，明天更从容～';
    else if (diff === 2) sub = '后天的事，先记下来吧';
    else sub = '提前安排，到时候不慌';
    $('#greet').textContent = sub;

    const prefix = isT ? '今日' : (diff === 1 ? '明天' : (diff === 2 ? '后天' : '当天'));
    $('#todoLabel').textContent = '📝 ' + prefix + '待办';
    $('#moodLabel').textContent = '🌈 ' + prefix + '心情';
    $('#noteLabel').textContent = '💭 ' + prefix + '碎碎念';

    $('#input').placeholder = isT ? '今天想完成什么呢～'
      : (diff === 1 ? '明天想完成什么呢～' : (diff === 2 ? '后天想完成什么呢～' : '想完成什么呢～'));

    $('#quote').textContent = '「 ' + QUOTES[seed % QUOTES.length] + ' 」';
  }

  /* ============ 日期条 ============ */
  function buildStrip() {
    const strip = $('#dateStrip');
    strip.innerHTML = '';
    const base = new Date();

    for (let i = 0; i < 7; i++) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      const key = makeKey(d.getFullYear(), d.getMonth() + 1, d.getDate());

      let w;
      if (i === 0) w = '今天';
      else if (i === 1) w = '明天';
      else if (i === 2) w = '后天';
      else w = '周' + WEEK_CN[d.getDay()];

      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'dchip' + (key === App.state.selectedDateKey ? ' active' : '');
      chip.dataset.key = key;
      chip.innerHTML = '<span class="w">' + w + '</span>'
                     + '<span class="d">' + (d.getMonth() + 1) + '/' + d.getDate() + '</span>';
      strip.appendChild(chip);
    }
  }

  function setStripActive() {
    $$('.dchip').forEach(c => c.classList.toggle('active', c.dataset.key === App.state.selectedDateKey));
  }

  /* ============ 切换日期 ============ */
  function switchDate(key) {
    if (key === App.state.selectedDateKey) return;

    if (noteTimer) { clearTimeout(noteTimer); noteTimer = null; }
    App.state.day.note = noteEl.value;
    store.save();

    App.state.selectedDateKey = key;
    App.state.day = store.getDayRef(key);
    lastAllDone = false;

    updateHero();
    setStripActive();
    renderTodayList();
    renderMoods();
    noteEl.value = App.state.day.note;
  }

  /* ============ 待办列表 ============ */
  function renderTodayList(newestId) {
    const day = App.state.day;
    const listEl = $('#list');
    listEl.innerHTML = '';

    day.todos.forEach(t => {
      const key = CATS[t.cat] ? t.cat : 'other';
      const cat = CATS[key];

      const li = document.createElement('li');
      li.className = 'item' + (t.done ? ' done' : '') + (t.id === newestId ? ' new' : '');
      li.dataset.id = t.id;

      const check = document.createElement('div');
      check.className = 'check';
      check.setAttribute('role', 'checkbox');
      check.setAttribute('aria-checked', t.done ? 'true' : 'false');

      const txt = document.createElement('span');
      txt.className = 'txt';
      txt.textContent = t.text;

      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.dataset.cat = key;
      tag.textContent = cat.emoji + ' ' + cat.name;

      const edit = document.createElement('button');
      edit.className = 'edit';
      edit.type = 'button';
      edit.title = '修改';
      edit.setAttribute('aria-label', '修改');
      edit.textContent = '✎';

      const del = document.createElement('button');
      del.className = 'del';
      del.type = 'button';
      del.title = '删除';
      del.setAttribute('aria-label', '删除');
      del.textContent = '✕';

      li.appendChild(check);
      li.appendChild(txt);
      li.appendChild(tag);
      li.appendChild(edit);
      li.appendChild(del);
      listEl.appendChild(li);
    });

    $('#empty').style.display = day.todos.length ? 'none' : 'block';
    updateProgress();
  }

  /* ============ 进度 ============ */
  function updateProgress() {
    const day = App.state.day;
    const total = day.todos.length;
    const done = day.todos.filter(t => t.done).length;
    const pct = total ? Math.round(done / total * 100) : 0;

    $('#ring').style.setProperty('--p', pct + '%');
    $('#pct').textContent = pct + '%';
    $('#counter').textContent = done + ' / ' + total;

    const allDone = total > 0 && done === total;
    if (allDone && !lastAllDone) celebrate();
    lastAllDone = allDone;
  }

  /* ============ 撒花 ============ */
  function celebrate() {
    const emojis = ['🎉', '✨', '💖', '🌸', '⭐️', '🍰'];
    for (let i = 0; i < 14; i++) {
      const el = document.createElement('div');
      el.className = 'confetti';
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      el.style.left = Math.random() * 96 + 'vw';
      el.style.fontSize = (14 + Math.random() * 14) + 'px';
      el.style.animationDelay = (Math.random() * 0.5) + 's';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3100);
    }
  }

  /* ============ 添加 ============ */
  function addTodo() {
    const day = App.state.day;
    const input = $('#input');
    const text = input.value.trim();
    if (!text) { input.focus(); return; }

    const item = { id: uid(), text: text, cat: curCat, done: false };
    day.todos.push(item);
    input.value = '';
    store.save();
    renderTodayList(item.id);
    input.focus();
  }

  /* ============ 编辑 ============ */
  function startEdit(li, t) {
    if (li.dataset.editing) return;
    li.dataset.editing = '1';

    const txt = li.querySelector('.txt');
    if (!txt) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'edit-input';
    input.value = t.text;
    input.maxLength = 60;
    input.setAttribute('aria-label', '修改待办');

    li.replaceChild(input, txt);
    input.focus();
    try { input.setSelectionRange(input.value.length, input.value.length); } catch (e) {}

    let finished = false;
    function finish(commit) {
      if (finished) return;
      finished = true;
      if (commit) {
        const v = input.value.trim();
        if (v && v !== t.text) { t.text = v; store.save(); }
      }
      delete li.dataset.editing;
      renderTodayList();
    }

    input.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') { ev.preventDefault(); finish(true); }
      else if (ev.key === 'Escape') { ev.preventDefault(); finish(false); }
    });
    input.addEventListener('blur', () => finish(true));
  }

  /* ============ 心情 ============ */
  function renderMoods() {
    const day = App.state.day;
    const box = $('#moods');
    box.innerHTML = '';
    MOODS.forEach(m => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mood' + (day.mood === m ? ' active' : '');
      b.dataset.mood = m;
      b.textContent = m;
      b.setAttribute('aria-label', '心情 ' + m);
      box.appendChild(b);
    });
    $('#moodTip').textContent = day.mood
      ? (MOOD_TIPS[day.mood] || '记录好啦～')
      : '点一下记录心情吧';
  }

  /* ============ 初始化 ============ */
  function init() {
    noteEl = $('#note');
    noteEl.value = App.state.day.note;

    updateHero();
    buildStrip();
    renderTodayList();
    renderMoods();

    /* 日期条点击 */
    $('#dateStrip').addEventListener('click', e => {
      const chip = e.target.closest('.dchip');
      if (!chip) return;
      switchDate(chip.dataset.key);
    });

    /* 添加按钮 */
    $('#addBtn').addEventListener('click', addTodo);
    $('#input').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); addTodo(); }
    });

    /* 列表交互 */
    $('#list').addEventListener('click', e => {
      const li = e.target.closest('.item');
      if (!li) return;
      const day = App.state.day;
      const id = li.dataset.id;
      const t = day.todos.find(x => x.id === id);
      if (!t) return;

      if (e.target.closest('.del')) {
        day.todos = day.todos.filter(x => x.id !== id);
        store.save();
        renderTodayList();
        return;
      }

      if (e.target.closest('.edit')) {
        startEdit(li, t);
        return;
      }

      if (e.target.closest('.check') || e.target.closest('.txt')) {
        if (li.dataset.editing) return;
        t.done = !t.done;
        store.save();
        li.classList.toggle('done', t.done);
        const c = li.querySelector('.check');
        if (c) c.setAttribute('aria-checked', t.done ? 'true' : 'false');
        updateProgress();
      }
    });

    $('#list').addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const c = e.target.closest('.check');
      if (!c) return;
      e.preventDefault();
      c.click();
    });

    /* 分类切换 */
    $('#cats').addEventListener('click', e => {
      const btn = e.target.closest('.cat');
      if (!btn) return;
      curCat = btn.dataset.cat;
      $$('.cat').forEach(b => b.classList.toggle('active', b === btn));
    });

    /* 心情点击 */
    $('#moods').addEventListener('click', e => {
      const b = e.target.closest('.mood');
      if (!b) return;
      const day = App.state.day;
      const m = b.dataset.mood;
      day.mood = (day.mood === m) ? '' : m;
      store.save();
      renderMoods();
    });

    /* 碎碎念 */
    noteEl.addEventListener('input', () => {
      clearTimeout(noteTimer);
      noteTimer = setTimeout(() => {
        App.state.day.note = noteEl.value;
        store.save();
        noteTimer = null;
      }, 400);
    });
  }

  function refresh() {
    updateHero();
    setStripActive();
    renderTodayList();
    renderMoods();
    noteEl.value = App.state.day.note;
  }

  App.today = { init, refresh, switchDate };
})(window.App);