/* Quantification Console — stage selector + datasheet */
(function () {
  'use strict';

  var root = document.getElementById('quantConsole');
  if (!root || !window.ResearchData) return;

  var stages = ResearchData.stages;
  var stageRow = root.querySelector('.console-stages');
  var metricsEl = root.querySelector('.metrics-grid');
  var descEl = root.querySelector('.console-desc');
  var titleEl = root.querySelector('.console-title');
  var current = stages[0].id;

  function renderMetrics(stage) {
    metricsEl.innerHTML = stage.metrics
      .map(function (m) {
        return (
          '<div class="metric">' +
          '<div class="metric__label">' +
          m.label +
          '</div>' +
          '<div class="metric__value">' +
          m.value +
          '</div>' +
          (m.hint ? '<div class="metric__hint">' + m.hint + '</div>' : '') +
          '</div>'
        );
      })
      .join('');
  }

  function setStage(id) {
    var stage = null;
    for (var i = 0; i < stages.length; i++) {
      if (stages[i].id === id) {
        stage = stages[i];
        break;
      }
    }
    if (!stage) return;
    current = id;
    stageRow.querySelectorAll('.console-stage').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-stage') === id);
    });
    if (titleEl) titleEl.textContent = stage.title;
    if (descEl) descEl.textContent = stage.desc;
    renderMetrics(stage);
    if (window.BrainAtlas && BrainAtlas.setRegion) {
      BrainAtlas.setRegion(stage.region);
    }
  }

  stages.forEach(function (s, idx) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'console-stage' + (idx === 0 ? ' is-active' : '');
    btn.setAttribute('data-stage', s.id);
    btn.textContent = (idx + 1) + ' · ' + s.label;
    btn.addEventListener('click', function () {
      setStage(s.id);
    });
    stageRow.appendChild(btn);
  });

  window.QuantConsole = { setStage: setStage, getStage: function () { return current; } };
  setStage(stages[0].id);
})();
