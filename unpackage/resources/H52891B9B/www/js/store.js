(function (App) {
  'use strict';

  const KEY = App.config.KEY;

  let store = {};
  try { store = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { store = {}; }
  if (typeof store !== 'object' || store === null) store = {};

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {}
  }

  function readDay(key) {
    const d = store[key];
    if (!d || typeof d !== 'object') return { todos: [], mood: '', note: '' };
    return {
      todos: Array.isArray(d.todos) ? d.todos : [],
      mood: typeof d.mood === 'string' ? d.mood : '',
      note: typeof d.note === 'string' ? d.note : ''
    };
  }

  function getDayRef(key) {
    let d = store[key];
    if (!d || typeof d !== 'object') { d = {}; store[key] = d; }
    if (!Array.isArray(d.todos)) d.todos = [];
    d.todos.forEach(t => {
      if (typeof t.starred !== 'boolean') t.starred = false;
      if (typeof t.done !== 'boolean') t.done = false;
      if (typeof t.remind !== 'string') t.remind = '';
    });
    if (typeof d.mood !== 'string') d.mood = '';
    if (typeof d.note !== 'string') d.note = '';
    return d;
  }

  function hasData(key) {
    const d = store[key];
    if (!d || typeof d !== 'object') return false;
    if (Array.isArray(d.todos) && d.todos.length > 0) return true;
    if (typeof d.mood === 'string' && d.mood) return true;
    if (typeof d.note === 'string' && d.note.trim()) return true;
    return false;
  }

  function getAll() {
    return store;
  }

  /* ============ 加密导出（支持 APK 原生写入） ============ */
  function exportData(password, successCallback) {
    const dataStr = JSON.stringify(store);
    const utf8Str = encodeURIComponent(dataStr);
    let encrypted = '';
    for (let i = 0; i < utf8Str.length; i++) {
      encrypted += String.fromCharCode(
        utf8Str.charCodeAt(i) ^ password.charCodeAt(i % password.length)
      );
    }
    const base64 = btoa(encrypted);
    const fileName = '好好生活数据备份_' + App.state.todayKey + '.workbench';

    /* 情况 A：APK 原生环境，使用 plus.io 写入手机存储 */
    if (window.plus && plus.io) {
      try {
        plus.io.requestFileSystem(plus.io.PUBLIC_DOWNLOADS, function (fs) {
          fs.root.getFile(fileName, { create: true }, function (fileEntry) {
            fileEntry.createWriter(function (writer) {
              writer.write(base64);
              writer.onwrite = function () {
                if (typeof successCallback === 'function') {
                  successCallback(fileName);
                }
              };
              writer.onerror = function (e) {
                alert('写入文件失败：' + (e.message || '未知错误'));
              };
            }, function (e) {
              alert('创建文件写入流失败：' + (e.message || '未知错误'));
            });
          }, function (e) {
            alert('创建文件失败：' + (e.message || '未知错误'));
          });
        }, function (e) {
          alert('获取手机下载目录失败：' + (e.message || '未知错误'));
        });
      } catch (e) {
        alert('调用原生文件系统失败：' + e.message);
      }
      return 'writing'; // 异步写入中
    }

    /* 情况 B：浏览器环境，使用 Blob 下载 */
    try {
      const blob = new Blob([base64], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);

      if (typeof successCallback === 'function') {
        successCallback(fileName);
      }
      return fileName;
    } catch (e) {
      alert('导出失败，请重试。\n' + (e && e.message ? e.message : ''));
      return null;
    }
  }

  function importData(file, password) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          const base64 = String(e.target.result).trim();
          const encrypted = atob(base64);
          let decrypted = '';
          for (let i = 0; i < encrypted.length; i++) {
            decrypted += String.fromCharCode(
              encrypted.charCodeAt(i) ^ password.charCodeAt(i % password.length)
            );
          }
          const dataStr = decodeURIComponent(decrypted);
          const importedStore = JSON.parse(dataStr);
          if (importedStore && typeof importedStore === 'object') {
            Object.assign(store, importedStore);
            save();
            resolve(true);
          } else {
            reject(new Error('数据格式不正确'));
          }
        } catch (err) {
          reject(new Error('密码错误或文件损坏'));
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  }

  App.store = { save, readDay, getDayRef, hasData, getAll, exportData, importData };
})(window.App);