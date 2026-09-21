(function (App) {
  'use strict';

  const { $, $$, todayKey } = App.util;

  function boot() {
    const tKey = todayKey();
    App.state.todayKey = tKey;
    App.state.selectedDateKey = tKey;
    App.state.day = App.store.getDayRef(tKey);

    const n = new Date();
    App.state.calYear = n.getFullYear();
    App.state.calMonth = n.getMonth() + 1;
    App.state.calSelectedKey = tKey;

    App.today.init();
    App.history.init();

    $('#tabs').addEventListener('click', function (e) {
      const btn = e.target.closest('.tab');
      if (!btn) return;
      const v = btn.dataset.view;

      $$('.tab').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      $('#viewToday').classList.toggle('active', v === 'today');
      $('#viewHistory').classList.toggle('active', v === 'history');

      if (v === 'history') App.history.refresh();
      else App.today.refresh();

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('beforeunload', function () {
      if (App.state.day) {
        App.state.day.note = $('#note').value;
        App.store.save();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window.App);