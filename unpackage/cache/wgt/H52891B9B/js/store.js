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

  /* ============ 加密导出（用 MediaStore 写入公共 Download 目录） ============ */
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
    const fileName = '好好生活数据备份_' + App.state.todayKey + '.txt';

    /* ===== 方案 A：APK/基座 环境，用 MediaStore 写入公共 Download ===== */
    if (window.plus && plus.android) {
      try {
        var main = plus.android.runtimeMainActivity();
        var Build = plus.android.importClass('android.os.Build');
        var Base64 = plus.android.importClass('android.util.Base64');
        var sdkInt = Build.VERSION.SDK_INT;
        var bytes = Base64.decode(base64, Base64.DEFAULT);

        var writtenPath = '';

        if (sdkInt >= 29) {
          /* Android 10+：使用 MediaStore.Downloads */
          var ContentValues = plus.android.importClass('android.content.ContentValues');
          var MediaStore = plus.android.importClass('android.provider.MediaStore');

          var values = new ContentValues();
          values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
          values.put(MediaStore.Downloads.MIME_TYPE, 'text/plain');
          values.put(MediaStore.Downloads.RELATIVE_PATH, 'Download');

          var resolver = main.getContentResolver();
          var collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
          var uri = resolver.insert(collection, values);

          if (!uri) {
            throw new Error('无法创建文件（MediaStore 返回空）');
          }

          var os = resolver.openOutputStream(uri);
          os.write(bytes);
          os.flush();
          os.close();

          writtenPath = 'Download/' + fileName;
        } else {
          /* Android 9 及以下：用 File API 直接写 */
          var Environment = plus.android.importClass('android.os.Environment');
          var File = plus.android.importClass('java.io.File');
          var FileOutputStream = plus.android.importClass('java.io.FileOutputStream');

          var downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
          if (!downloadDir.exists()) downloadDir.mkdirs();
          var file = new File(downloadDir, fileName);
          var fos = new FileOutputStream(file);
          fos.write(bytes);
          fos.flush();
          fos.close();

          writtenPath = file.getAbsolutePath();
        }

        /* 通知系统媒体扫描，文件管理器立刻能看到 */
        try {
          var MediaScannerConnection = plus.android.importClass('android.media.MediaScannerConnection');
          var File2 = plus.android.importClass('java.io.File');
          var f2 = new File2(writtenPath);
          MediaScannerConnection.scanFile(main, [f2.getAbsolutePath()], null, null);
        } catch (e) {}

        if (typeof successCallback === 'function') {
          successCallback(fileName, writtenPath);
        }
        return fileName;
      } catch (e) {
        console.error('MediaStore 写入失败', e);
        /* 不要直接 alert，走兜底 */
      }
    }

    /* ===== 方案 B：兜底，用 plus.io 写入私有目录 ===== */
    if (window.plus && plus.io) {
      try {
        plus.io.requestFileSystem(plus.io.PUBLIC_DOWNLOADS, function (fs) {
          fs.root.getFile(fileName, { create: true }, function (fileEntry) {
            fileEntry.createWriter(function (writer) {
              writer.write(base64);
              writer.onwrite = function () {
                if (typeof successCallback === 'function') {
                  successCallback(fileName, fileEntry.fullPath);
                }
              };
              writer.onerror = function (e) {
                alert('写入文件失败：' + (e.message || '未知错误'));
              };
            });
          }, function (e) {
            alert('创建文件失败：' + (e.message || '未知错误'));
          });
        });
      } catch (e) {
        alert('文件系统调用失败：' + e.message);
      }
      return 'writing';
    }

    /* ===== 方案 C：浏览器环境 ===== */
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
        successCallback(fileName, '');
      }
      return fileName;
    } catch (e) {
      alert('导出失败：' + (e && e.message ? e.message : ''));
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