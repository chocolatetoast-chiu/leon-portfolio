/* Research Pillars Explorer */
(function () {
  'use strict';

  var root = document.getElementById('pillarsExplorer');
  if (!root || !window.ResearchData) return;

  var pillars = ResearchData.pillars;
  var tabs = root.querySelector('.pillars-tabs');
  var panels = root.querySelector('.pillars-panels');

  pillars.forEach(function (p, idx) {
    var tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'pillar-tab' + (idx === 0 ? ' is-active' : '');
    tab.setAttribute('data-pillar', p.id);
    tab.textContent = p.label;
    tab.addEventListener('click', function () {
      activate(p.id);
    });
    tabs.appendChild(tab);

    var panel = document.createElement('div');
    panel.className = 'pillar-panel' + (idx === 0 ? ' is-active' : '');
    panel.setAttribute('data-pillar-panel', p.id);
    panel.innerHTML =
      '<div>' +
      '<h3>' +
      p.title +
      '</h3>' +
      '<p>' +
      p.desc +
      '</p>' +
      '<div class="pillar-chips">' +
      p.chips
        .map(function (c) {
          return c.href
            ? '<a href="' + c.href + '">' + c.label + '</a>'
            : '<span>' + c.label + '</span>';
        })
        .join('') +
      '</div>' +
      '<a href="about.html#journey" class="link-arrow">Read the journey <i class="fas fa-arrow-right" style="font-size:0.8em"></i></a>' +
      '</div>' +
      '<div class="instrument">' +
      '<div class="instrument__fig"><span class="lp">Fig.</span> Numbers that matter</div>' +
      '<div class="metrics-grid">' +
      p.metrics
        .map(function (m) {
          return (
            '<div class="metric"><div class="metric__label">' +
            m.label +
            '</div><div class="metric__value">' +
            m.value +
            '</div></div>'
          );
        })
        .join('') +
      '</div></div>';
    panels.appendChild(panel);
  });

  function activate(id) {
    tabs.querySelectorAll('.pillar-tab').forEach(function (t) {
      t.classList.toggle('is-active', t.getAttribute('data-pillar') === id);
    });
    panels.querySelectorAll('.pillar-panel').forEach(function (p) {
      p.classList.toggle('is-active', p.getAttribute('data-pillar-panel') === id);
    });
  }
})();
