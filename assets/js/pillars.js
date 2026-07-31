/* Research focus cards */
(function () {
  'use strict';

  var root = document.getElementById('pillarsExplorer');
  if (!root || !window.ResearchData) return;

  var pillars = ResearchData.pillars;
  var panels = root.querySelector('.pillars-panels');
  var tabs = root.querySelector('.pillars-tabs');
  if (tabs) tabs.remove();

  pillars.forEach(function (p) {
    var panel = document.createElement('article');
    panel.className = 'pillar-card';
    panel.setAttribute('data-pillar', p.id);
    panel.innerHTML =
      '<div class="pillar-card__top"><span>' + p.index + '</span><span>' + p.label + '</span></div>' +
      '<h3>' + p.title + '</h3>' +
      '<p>' + p.desc + '</p>' +
      '<div class="pillar-chips">' +
      p.chips
        .map(function (c) {
          return c.href
            ? '<a href="' + c.href + '">' + c.label + '</a>'
            : '<span>' + c.label + '</span>';
        })
        .join('') +
      '</div>';
    panels.appendChild(panel);
  });
})();
