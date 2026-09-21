(function (App) {
  'use strict';

  const { $, $$, esc, uid, makeKey, dayDiff } = App.util;
  const { CATS, MOODS, MOOD_TIPS, QUOTES, YIS, WEEK_CN } = App.config;
  const store = App.store;

  let curCat = 'work';
  let lastAllDone = false;
  let noteTimer = null;
  let noteEl = null;
  let inputEl = null;
  let lastExportedFileName = '';
  let lastExportedFilePath = '';

  const pad2 = n => String(n).padStart(2, '0');

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

    if (inputEl) {
      inputEl.placeholder = '只需输入待办事项内容，系统会自动排序（回车添加，Shift+回车换行）';
    }

    $('#quote').textContent = '「 ' + QUOTES[seed % QUOTES.length] + ' 」';
  }

  function sendNotify(title, content) {
    if (window.plus && plus.push && plus.push.createMessage) {
      try {
        plus.push.createMessage(content, 'LocalMsg', { title: title });
        return true;
      } catch (e) {}
    }
    return false;
  }

  function buildStrip() {
    const strip = $('#dateStrip');
    strip.innerHTML = '';
    const base = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      const key = makeKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
      let w = (i === 0) ? '今天' : (i === 1) ? '明天' : (i === 2) ? '后天' : '周' + WEEK_CN[d.getDay()];
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

  function renderTodayList(newestId) {
    const day = App.state.day;
    const listEl = $('#list');
    listEl.innerHTML = '';

    const isToday = App.state.selectedDateKey === App.state.todayKey;

    day.todos.sort((a, b) => {
      if (a.starred !== b.starred) return b.starred - a.starred;
      if (a.done !== b.done) return a.done - b.done;
      return 0;
    });

    const frag = document.createDocumentFragment();

    day.todos.forEach((t, index) => {
      const key = CATS[t.cat] ? t.cat : 'other';
      const cat = CATS[key];

      const li = document.createElement('li');
      li.className = 'item' + (t.done ? ' done' : '') + (t.id === newestId ? ' new' : '');
      li.dataset.id = t.id;

      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = index + 1;

      const check = document.createElement('div');
      check.className = 'check';
      check.setAttribute('role', 'checkbox');
      check.setAttribute('aria-checked', t.done ? 'true' : 'false');

      if (!isToday) {
        check.style.opacity = '0.4';
        check.style.cursor = 'not-allowed';
        check.title = '只能完成当天的事项';
      }

      const txt = document.createElement('span');
      txt.className = 'txt';
      txt.textContent = t.text;

      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.dataset.cat = key;
      tag.textContent = cat.emoji + ' ' + cat.name;

      const star = document.createElement('span');
      star.className = 'star-btn' + (t.starred ? ' active' : '');
      star.innerHTML = t.starred ? '⭐' : '☆';

      const handle = document.createElement('span');
      handle.className = 'drag-handle';
      handle.innerHTML = '☰';
      handle.title = '按住拖动排序';
      handle.setAttribute('aria-label', '按住拖动排序');

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

      edit.addEventListener('click', function (ev) {
        ev.stopPropagation();
        ev.preventDefault();
        startEdit(li, t);
      });

      li.appendChild(num);
      li.appendChild(check);
      li.appendChild(txt);
      li.appendChild(tag);
      li.appendChild(star);
      li.appendChild(handle);
      li.appendChild(edit);
      li.appendChild(del);
      frag.appendChild(li);
    });

    listEl.appendChild(frag);

    $('#empty').style.display = day.todos.length ? 'none' : 'block';
    updateProgress();

    if (isToday && window.Sortable) {
      if (listEl._sortable) {
        listEl._sortable.destroy();
        listEl._sortable = null;
      }
      listEl._sortable = new Sortable(listEl, {
        animation: 180,
        handle: '.drag-handle',
        delay: 1000,
        delayOnTouchOnly: true,
        touchStartThreshold: 8,
        filter: '.check, .edit, .del, .star-btn, .edit-input, .tag',
        preventOnFilter: false,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        onEnd: function (evt) {
          const movedItem = day.todos.splice(evt.oldIndex, 1)[0];
          day.todos.splice(evt.newIndex, 0, movedItem);
          store.save();
          const nums = listEl.querySelectorAll('.num');
          nums.forEach((el, i) => { el.textContent = i + 1; });
        }
      });
    }
  }

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

  function autoGrowInput() {
    if (!inputEl) return;
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 140) + 'px';
  }

  function addTodo() {
    const text = inputEl.value.trim();
    if (!text) { inputEl.focus(); return; }

    const item = { id: uid(), text: text, cat: curCat, done: false, starred: false };
    App.state.day.todos.push(item);
    inputEl.value = '';
    inputEl.style.height = 'auto';
    store.save();
    renderTodayList(item.id);
    inputEl.focus();
  }

  function startEdit(li, t) {
    if (li.dataset.editing) return;
    li.dataset.editing = '1';

    const txt = li.querySelector('.txt');
    if (!txt) return;

    const input = document.createElement('textarea');
    input.className = 'edit-input';
    input.value = t.text;
    input.maxLength = 200;
    input.rows = 1;
    input.setAttribute('aria-label', '修改待办');

    li.replaceChild(input, txt);

    function autoResize() {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 240) + 'px';
    }
    autoResize();
    input.addEventListener('input', autoResize);

    input.focus();
    try {
      input.setSelectionRange(input.value.length, input.value.length);
    } catch (e) {}
    setTimeout(function () {
      input.scrollTop = input.scrollHeight;
      autoResize();
    }, 0);

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

    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' && !ev.shiftKey) {
        ev.preventDefault();
        finish(true);
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        finish(false);
      }
    });
    input.addEventListener('blur', function () { finish(true); });
  }

  function renderMoods() {
    const day = App.state.day;
    const box = $('#moods');
    box.innerHTML = '';
    const frag = document.createDocumentFragment();
    MOODS.forEach(m => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mood' + (day.mood === m ? ' active' : '');
      b.dataset.mood = m;
      b.textContent = m;
      frag.appendChild(b);
    });
    box.appendChild(frag);
    $('#moodTip').textContent = day.mood
      ? (MOOD_TIPS[day.mood] || '记录好啦～')
      : '点一下记录心情吧';
  }

  function openSettings() { $('#settingsModal').style.display = 'flex'; }
  function closeSettings() { $('#settingsModal').style.display = 'none'; }

  function showExportSuccess(fileName) {
    lastExportedFileName = fileName;
    const el = document.getElementById('exportFileName');
    if (el) el.textContent = fileName;

    const tipEl = document.getElementById('exportPathTip');
    if (tipEl) {
      tipEl.textContent = '💡 文件已保存到手机存储，点下方按钮可尝试打开。';
    }

    const modal = document.getElementById('exportModal');
    if (modal) modal.style.display = 'flex';
  }

  function closeExportModal() {
    const modal = document.getElementById('exportModal');
    if (modal) modal.style.display = 'none';
  }

  /* ============ 打开文件所在文件夹 ============ */
  function openExportFolder() {
    if (!window.plus || plus.os.name !== 'Android') {
      alert('文件已保存到「下载」文件夹。\n\n文件名：' + lastExportedFileName);
      return;
    }

    var main = plus.android.runtimeMainActivity();
    var Intent = plus.android.importClass('android.content.Intent');
    var Uri = plus.android.importClass('android.net.Uri');
    var FLAG_NEW_TASK = 268435456;
    var success = false;

    /* 方案 1：用 DocumentsContract 直接定位到公共 Download 目录 */
    if (!success) {
      try {
        var DocumentsContract = plus.android.importClass('android.provider.DocumentsContract');
        var uri = DocumentsContract.buildDocumentUri(
          'com.android.externalstorage.documents',
          'primary:Download'
        );
        var intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, 'vnd.android.document/directory');
        intent.addFlags(FLAG_NEW_TASK);
        main.startActivity(intent);
        success = true;
      } catch (e1) { success = false; }
    }

    /* 方案 2：用 content:// URI 直接打开 Download 目录 */
    if (!success) {
      try {
        var uri2 = Uri.parse('content://com.android.externalstorage.documents/document/primary%3ADownload');
        var intent2 = new Intent(Intent.ACTION_VIEW);
        intent2.setDataAndType(uri2, 'vnd.android.document/directory');
        intent2.addFlags(FLAG_NEW_TASK);
        main.startActivity(intent2);
        success = true;
      } catch (e2) { success = false; }
    }

    /* 方案 3：尝试启动华为/荣耀自带文件管理器 */
    if (!success) {
      var pkgs = [
        'com.huawei.hidisk',
        'com.huawei.filemanager',
        'com.android.documentsui'
      ];
      for (var i = 0; i < pkgs.length; i++) {
        try {
          var launchIntent = main.getPackageManager().getLaunchIntentForPackage(pkgs[i]);
          if (launchIntent) {
            launchIntent.addFlags(FLAG_NEW_TASK);
            main.startActivity(launchIntent);
            success = true;
            break;
          }
        } catch (e3) { /* 继续试 */ }
      }
    }

    /* 方案 4：系统文件选择器兜底 */
    if (!success) {
      try {
        var intent4 = new Intent(Intent.ACTION_GET_CONTENT);
        intent4.setType('*/*');
        intent4.addFlags(FLAG_NEW_TASK);
        main.startActivity(intent4);
        success = true;
      } catch (e4) { success = false; }
    }

    if (!success) {
      alert('当前设备不支持自动跳转。\n\n请手动打开手机自带的「文件管理」App → 点「下载」分类，找到：\n\n' + lastExportedFileName);
    }
  }

  /* ============ 导出加密数据 ============ */
  function exportData() {
    const password = prompt('请设置导出密码（用于换机导入）：');
    if (!password) return;

    sendNotify('📤 正在导出', '正在生成加密备份文件，请稍等…');

    const result = store.exportData(password, function (fileName, filePath) {
      lastExportedFileName = fileName;
      lastExportedFilePath = filePath || '';
      sendNotify('✅ 导出完成', '文件已生成，可在手机「文件管理」中查找。文件名：' + fileName);
      showExportSuccess(fileName);
    });

    if (result === 'writing') return;
    if (!result) return;

    lastExportedFileName = result;
    sendNotify('✅ 导出完成', '文件已下载。文件名：' + result);
    showExportSuccess(result);
  }

  function importData(file) {
    if (!file) return;
    const password = prompt('请输入导入密码：');
    if (!password) return;
    store.importData(file, password).then(() => {
      sendNotify('✅ 导入成功', '数据已恢复，页面即将刷新。');
      alert('数据导入成功！页面即将刷新。');
      location.reload();
    }).catch(err => {
      const msg = err.message || '导入失败，密码错误或文件损坏。';
      sendNotify('❌ 导入失败', msg);
      alert(msg);
    });
  }

  function exportMarkdown(type) {
    let md = '';
    const key = App.state.selectedDateKey;

    if (type === 'day') {
      const d = store.readDay(key);
      const p = key.split('-');
      md += '# 好好生活 · ' + p[0] + '年' + (+p[1]) + '月' + (+p[2]) + '日\n\n';
      md += '## 📝 待办清单\n';
      if (d.todos.length) {
        d.todos.forEach((t, i) => {
          md += (i + 1) + '. [' + (t.done ? 'x' : ' ') + '] ' + t.text + (t.starred ? ' ⭐' : '') + '\n';
        });
      } else { md += '（无）\n'; }
      md += '\n## 🌈 今日心情\n' + (d.mood || '（无）') + '\n\n';
      md += '## 💭 碎碎念\n' + (d.note || '（无）') + '\n';
    } else {
      const allData = (store.getAll ? store.getAll() : {}) || {};
      const p = key.split('-');
      const prefix = p[0] + '-' + p[1];
      let total = 0, done = 0, notes = [];
      for (let k in allData) {
        if (k.indexOf(prefix) === 0) {
          const d = allData[k];
          if (d.todos && d.todos.length) {
            total += d.todos.length;
            done += d.todos.filter(t => t.done).length;
          }
          if (d.note && d.note.trim()) {
            notes.push('**' + k + '**: ' + d.note);
          }
        }
      }
      md = '# 好好生活 · ' + p[0] + '年' + (+p[1]) + '月 总结\n\n';
      md += '## 📊 总体完成度：' + done + '/' + total + '\n\n';
      md += '## 💭 本月碎碎念精选\n' + (notes.length ? notes.join('\n\n') : '（无）') + '\n';
    }

    $('#outputTitle').textContent = type === 'day' ? '📝 今日明文导出' : '📅 当月明文导出';
    $('#outputText').value = md;
    $('#outputModal').style.display = 'flex';
  }

  function copyOutput() {
    const textarea = $('#outputText');
    textarea.select();
    try {
      document.execCommand('copy');
      alert('已复制到剪贴板！可以粘贴到其他笔记软件里了。');
    } catch (e) {
      alert('复制失败，请长按文本框手动复制。');
    }
  }

  function generateAISummary() {
    const allData = (store.getAll ? store.getAll() : {}) || {};
    const allKeys = Object.keys(allData).sort();

    const p = App.state.selectedDateKey.split('-');
    const prefix = p[0] + '-' + p[1];

    let total = 0, done = 0;
    const notes = [];
    const moodCount = {};
    const doneList = [];
    const undoneList = [];

    let scanKeys = allKeys.filter(k => k.indexOf(prefix) === 0);
    if (scanKeys.length === 0) {
      scanKeys = allKeys.filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k));
    }

    scanKeys.forEach(k => {
      const d = allData[k];
      if (!d || typeof d !== 'object') return;
      const dp = k.split('-');
      const dayLabel = (+dp[1]) + '月' + (+dp[2]) + '日';

      if (Array.isArray(d.todos) && d.todos.length) {
        total += d.todos.length;
        d.todos.forEach(t => {
          if (t.done) {
            done++;
            doneList.push('· ' + dayLabel + '：' + t.text);
          } else {
            undoneList.push('· ' + dayLabel + '：' + t.text);
          }
        });
      }
      if (d.mood) moodCount[d.mood] = (moodCount[d.mood] || 0) + 1;
      if (d.note && d.note.trim()) notes.push(d.note.trim());
    });

    const rate = total ? Math.round(done / total * 100) : 0;

    if (!App.config.AI_API_KEY) {
      let topMood = '';
      let maxM = 0;
      for (let m in moodCount) {
        if (moodCount[m] > maxM) { maxM = moodCount[m]; topMood = m; }
      }
      const moodText = topMood ? '你最常记录的心情是 ' + topMood : '你还没有记录心情';
      const noteText = notes.length ? '碎碎念里你写过：“' + notes[0].substring(0, 30) + '...”' : '这个月没有写碎碎念哦';

      const doneText = doneList.length
        ? doneList.slice(0, 30).join('\n') + (doneList.length > 30 ? '\n· …等共 ' + doneList.length + ' 件' : '')
        : '（本月没有完成的待办）';

      const localText = '✨ 好好生活 · 本月总结 ✨\n\n' +
        '📊 本月记录 ' + total + ' 件待办，完成 ' + done + ' 件，完成率 ' + rate + '%。\n\n' +
        '✅ 你完成的事：\n' + doneText + '\n\n' +
        moodText + '。\n\n' + noteText + '\n\n' +
        '数据全部保存在你的手机本地，没有上传到任何服务器。\n下个月也要继续好好生活呀！🌸';

      $('#outputTitle').textContent = '🤖 AI 月度总结（本地版）';
      $('#outputText').value = localText;
      $('#outputModal').style.display = 'flex';
      return;
    }

    $('#outputTitle').textContent = '🤖 AI 正在思考中…';
    $('#outputText').value = '正在把你的记录发给 AI 总结，请稍等几秒…';
    $('#outputModal').style.display = 'flex';

    const doneForAI = doneList.length ? doneList.join('\n') : '（无）';
    const undoneForAI = undoneList.length ? undoneList.join('\n') : '（无）';
    const notesForAI = notes.length ? notes.join(' | ') : '（无）';

    const prompt = '你是一位温柔、鼓励式的月度总结助理。请根据下面的真实数据，写一段月度总结。\n\n' +
      '【要求】\n' +
      '1. 必须包含一个"✅ 本月你完成了"的部分，用列表形式逐条列出用户完成的待办事项（保留日期）。\n' +
      '2. 如果完成的事项太多，就挑选有代表性的 10-15 条列出。\n' +
      '3. 后面写一段温暖的鼓励语，150 字以内。\n' +
      '4. 不要编造数据，不要提"AI"这个词。\n' +
      '5. 语气温柔、像朋友在替你回顾这个月。\n\n' +
      '【本月完成情况】\n' +
      '共记录 ' + total + ' 件待办，完成 ' + done + ' 件，完成率 ' + rate + '%。\n\n' +
      '【已完成的待办】\n' + doneForAI + '\n\n' +
      '【未完成的待办】\n' + undoneForAI + '\n\n' +
      '【心情记录】' + JSON.stringify(moodCount) + '\n\n' +
      '【碎碎念】\n' + notesForAI;

    fetch(App.config.AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + App.config.AI_API_KEY
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    })
      .then(res => res.json())
      .then(data => {
        let aiText = '';
        if (data.choices && data.choices[0] && data.choices[0].message) {
          aiText = data.choices[0].message.content;
        } else if (data.error) {
          aiText = 'AI 返回错误：' + (data.error.message || JSON.stringify(data.error));
        } else {
          aiText = 'AI 返回格式异常：' + JSON.stringify(data);
        }
        $('#outputText').value = aiText;
        $('#outputTitle').textContent = '🤖 AI 月度总结（GLM-4-Flash）';
      })
      .catch(err => {
        $('#outputText').value = '调用 AI 失败：' + err.message +
          '\n\n请检查：\n1. 手机/电脑是否联网\n2. config.js 里的 API Key 是否填写正确';
        $('#outputTitle').textContent = '⚠️ AI 调用失败';
      });
  }

  function init() {
    noteEl = $('#note');
    noteEl.value = App.state.day.note;

    inputEl = $('#input');
    inputEl.addEventListener('input', autoGrowInput);
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addTodo();
      }
    });

    updateHero();
    buildStrip();
    renderTodayList();
    renderMoods();

    $('#dateStrip').addEventListener('click', e => {
      const chip = e.target.closest('.dchip');
      if (!chip) return;
      switchDate(chip.dataset.key);
    });

    $('#addBtn').addEventListener('click', addTodo);

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

      if (e.target.closest('.star-btn')) {
        t.starred = !t.starred;
        store.save();
        renderTodayList();
        return;
      }

      if (e.target.closest('.check') || e.target.closest('.txt')) {
        if (li.dataset.editing) return;
        if (App.state.selectedDateKey !== App.state.todayKey) {
          alert('只能完成当天的事项哦～');
          return;
        }
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

    $('#cats').addEventListener('click', e => {
      const btn = e.target.closest('.cat');
      if (!btn) return;
      curCat = btn.dataset.cat;
      $$('.cat').forEach(b => b.classList.toggle('active', b === btn));
    });

    $('#moods').addEventListener('click', e => {
      const b = e.target.closest('.mood');
      if (!b) return;
      const day = App.state.day;
      const m = b.dataset.mood;
      day.mood = (day.mood === m) ? '' : m;
      store.save();
      renderMoods();
    });

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

  App.today = {
    init, refresh, switchDate,
    openSettings, closeSettings,
    exportData, importData,
    exportMarkdown, copyOutput,
    generateAISummary,
    openExportFolder, closeExportModal
  };
})(window.App);