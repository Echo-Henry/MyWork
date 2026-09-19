window.App = window.App || {};

(function (App) {
  'use strict';

  App.config = {
    KEY: 'xhs_workbench_v1',

    CATS: {
      work:  { name: '工作', emoji: '💼' },
      study: { name: '学习', emoji: '📖' },
      life:  { name: '生活', emoji: '🌿' },
      other: { name: '其他', emoji: '✨' }
    },

    MOODS: ['🥰', '😊', '😌', '😐', '😫', '🥳'],

    MOOD_TIPS: {
      '🥰': '被幸福包围的一天～',
      '😊': '心情不错，继续保持呀',
      '😌': '平静安稳，也很好',
      '😐': '平平淡淡才是真',
      '😫': '辛苦啦，抱抱你 🫂',
      '🥳': '太棒啦！值得庆祝一下'
    },

    QUOTES: [
      '把每一件小事做好，就是在慢慢变好。',
      '不必焦虑，你想要的都在路上。',
      '今天也要做个温柔又有力量的人呀。',
      '慢慢来，比较快。',
      '认真生活的样子，本身就很迷人。',
      '允许自己慢慢来，也是一种勇敢。',
      '先完成，再完美。',
      '日拱一卒，功不唐捐。'
    ],

    YIS: ['宜 · 认真生活', '宜 · 慢慢来', '宜 · 喝杯热奶茶', '宜 · 完成小事',
          '宜 · 早睡', '宜 · 犒劳自己', '宜 · 晒晒太阳', '宜 · 整理房间'],

    WEEK_CN: ['日', '一', '二', '三', '四', '五', '六']
  };

  App.state = {
    todayKey: '',
    selectedDateKey: '',
    day: null,
    calYear: 0,
    calMonth: 0,
    calSelectedKey: ''
  };

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const pad = n => String(n).padStart(2, '0');

  function esc(s) {
    return String(s).replace(/[&<>"']/g, m => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
    ));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function makeKey(y, m, d) {
    return y + '-' + pad(m) + '-' + pad(d);
  }

  function todayKey() {
    const n = new Date();
    return makeKey(n.getFullYear(), n.getMonth() + 1, n.getDate());
  }

  function dayDiff(key) {
    const p = key.split('-');
    const d = new Date(+p[0], +p[1] - 1, +p[2]);
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return Math.round((d - t) / 86400000);
  }

  App.util = { $, $$, pad, esc, uid, makeKey, todayKey, dayDiff };
})(window.App);