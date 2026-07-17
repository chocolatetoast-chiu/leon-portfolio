/* Case study page binder — reads data-case from article */
(function () {
  'use strict';
  var article = document.querySelector('[data-case]');
  if (!article || !window.ResearchData) return;
  var key = article.getAttribute('data-case');
  var map = { leon: 'leon', 'mri-less': 'mriLess', tcbc: 'tcbc' };
  var data = ResearchData.projects[map[key] || key];
  if (!data) return;

  var problem = document.getElementById('caseProblem');
  var steps = document.getElementById('caseSteps');
  var note = document.getElementById('caseNote');
  var metrics = document.getElementById('caseMetrics');
  var pubs = document.getElementById('casePubs');

  if (problem) problem.textContent = data.problem;
  if (pubs) pubs.textContent = data.pubs;

  if (metrics) {
    metrics.innerHTML = data.numbers
      .map(function (m) {
        return (
          '<div class="metric"><div class="metric__label">' +
          m.label +
          '</div><div class="metric__value">' +
          m.value +
          '</div></div>'
        );
      })
      .join('');
  }

  if (steps && note) {
    data.method.forEach(function (label, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      if (i === 0) btn.className = 'is-active';
      btn.addEventListener('click', function () {
        steps.querySelectorAll('button').forEach(function (s) {
          s.classList.remove('is-active');
        });
        btn.classList.add('is-active');
        note.textContent = data.methodNotes[i] || '';
      });
      steps.appendChild(btn);
    });
    note.textContent = data.methodNotes[0] || '';
  }
})();
