/* CV: sticky TOC, pub lens, skills → evidence */
(function () {
  'use strict';

  if (window.Instruments) {
    Instruments.initStickyToc({ toc: '.cv-toc', sections: '[data-toc-section]' });
  }

  /* Pub lens */
  var filterRoot = document.querySelector('[data-pub-filters]');
  if (filterRoot) {
    var chips = filterRoot.querySelectorAll('[data-filter]');
    var pubs = document.querySelectorAll('[data-pub]');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var key = chip.getAttribute('data-filter');
        chips.forEach(function (c) {
          c.classList.toggle('is-active', c === chip);
        });
        pubs.forEach(function (p) {
          var tags = (p.getAttribute('data-pub') || '').split(/\s+/);
          var show = key === 'all' || tags.indexOf(key) !== -1;
          p.classList.toggle('is-hidden', !show);
        });
      });
    });
  }

  document.querySelectorAll('[data-pub]').forEach(function (item) {
    item.addEventListener('click', function (e) {
      if (e.target.closest('a')) return;
      item.classList.toggle('is-open');
    });
  });

  /* Skills → evidence */
  var skillMap = {
    Python: ['#experience', '[data-evidence~="python"]'],
    TensorFlow: ['#projects', '[data-evidence~="tf"]'],
    PyTorch: ['#projects', '[data-evidence~="torch"]'],
    PET: ['#publications', '[data-evidence~="pet"]'],
    MRI: ['#publications', '[data-evidence~="mri"]'],
    'Co-registration': ['#publications', '[data-evidence~="motion"]'],
    Segmentation: ['#projects', '[data-evidence~="seg"]'],
    Quantification: ['#publications', '[data-evidence~="quant"]'],
    MATLAB: ['#projects', '[data-evidence~="matlab"]'],
    FreeSurfer: ['#projects', '[data-evidence~="seg"]']
  };

  document.querySelectorAll('.skills-chips span[data-skill]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var name = chip.getAttribute('data-skill');
      document.querySelectorAll('.skills-chips span').forEach(function (s) {
        s.classList.toggle('is-active', s === chip);
      });
      document.querySelectorAll('.cv-entry, .pub-item, .work-card').forEach(function (el) {
        el.classList.remove('is-highlight');
      });
      var map = skillMap[name];
      if (!map) return;
      var targets = document.querySelectorAll(map[1]);
      targets.forEach(function (t) {
        t.classList.add('is-highlight');
      });
      var first = targets[0];
      if (first) {
        first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        var section = document.querySelector(map[0]);
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
})();
