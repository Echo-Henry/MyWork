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

  App.store = { save, readDay, getDayRef, hasData };
})(window.App);