/* About page: journey scrubber, thread chips, philosophy toggle */
(function () {
  'use strict';

  var stops = [
    {
      id: 'nycu',
      year: '2026 — Present',
      title: 'NYCU',
      org: 'Postdoctoral Researcher · Digital Medicine & Smart Healthcare Research Center',
      short:
        'Homecoming with fresh energy — sovereign AI, digital twins, surgical computer vision, and fMRI foundation models inside Taiwan’s healthcare ecosystem.',
      full:
        'After five years abroad, I returned to Taiwan in early 2026 and joined the Digital Medicine & Smart Healthcare Research Center at NYCU, working alongside Albert Yang. Research directions now span trustworthy locally governed clinical AI, patient digital twins, DaVinci surgical vision, and fMRI models that learn healthy brain dynamics.',
      threads: ['imaging', 'vision', 'data']
    },
    {
      id: 'uab',
      year: '2020 — 2025',
      title: 'UAB',
      org: 'Ph.D. in Biomedical Engineering',
      short:
        'COVID isolation clarified the compass: family cognitive decline → amyloid PET/MR deep learning, TCBC, LEON, MRI-less quantification.',
      full:
        'I arrived in fall 2020 as COVID locked down the world. Quiet months clarified a personal motivation that became my research compass. By 2022 momentum shifted: motion correction (TCBC), MR-based DL segmentation (LEON), MRI-less quantification, and large-cohort biomarkers — with SNMMI 2023/2024 forcing clearer communication beyond the lab.',
      threads: ['imaging']
    },
    {
      id: 'ncku',
      year: '2016 — 2020',
      title: 'NCKU',
      org: 'B.S. in Biomedical Engineering',
      short:
        'Engineering should serve people — VEINAVI, EmoSpace (RehabWeek), and social entrepreneurship that taught clinical grounding.',
      full:
        'I joined the Biomedical Information Analysis Lab sophomore year. VEINAVI reached EMedIC finals but lacked clinical grounding — a hard lesson. Junior year brought EmoSpace (3rd worldwide, RehabWeek 2019 / RESNA), VR cultural work, and CareFULL social entrepreneurship (Best Social Impact, Aalto).',
      threads: ['data', 'vision']
    }
  ];

  var rail = document.getElementById('journeyRail');
  var panel = document.getElementById('journeyPanel');
  var fill = document.getElementById('journeyFill');
  if (rail && panel) {
    var track = rail.querySelector('.journey__track');
    stops.forEach(function (s, i) {
      var el = document.createElement('div');
      el.className = 'journey-stop' + (i === 0 ? ' is-active' : '');
      el.setAttribute('data-stop', s.id);
      el.setAttribute('data-threads', s.threads.join(' '));
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.innerHTML =
        '<div class="journey-stop__dot"></div>' +
        '<span class="journey-stop__year">' +
        s.year +
        '</span>' +
        '<span class="journey-stop__title">' +
        s.title +
        '</span>';
      el.addEventListener('click', function () {
        activate(i);
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate(i);
        }
      });
      track.appendChild(el);
    });

    var expanded = false;
    function activate(idx) {
      var s = stops[idx];
      rail.querySelectorAll('.journey-stop').forEach(function (el, i) {
        el.classList.toggle('is-active', i === idx);
      });
      panel.classList.toggle('is-expanded', expanded);
      panel.innerHTML =
        '<div class="instrument__fig"><span class="lp">Fig.</span> Journey · ' +
        (idx + 1) +
        ' / ' +
        stops.length +
        '</div>' +
        '<h3>' +
        s.title +
        '</h3>' +
        '<div class="org">' +
        s.org +
        '</div>' +
        '<p class="short">' +
        s.short +
        '</p>' +
        '<p class="full">' +
        s.full +
        '</p>' +
        '<button type="button" class="expand-btn">' +
        (expanded ? 'Show less' : 'Read full story') +
        '</button>';
      panel.querySelector('.expand-btn').addEventListener('click', function () {
        expanded = !expanded;
        activate(idx);
      });
      var active = rail.querySelectorAll('.journey-stop')[idx];
      var dot = active.querySelector('.journey-stop__dot');
      if (fill && dot) {
        fill.style.height = dot.offsetTop + dot.offsetHeight / 2 + 8 + 'px';
      }
    }
    activate(0);

    /* Thread chips */
    document.querySelectorAll('[data-thread]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var key = chip.getAttribute('data-thread');
        var on = chip.classList.toggle('is-active');
        document.querySelectorAll('[data-thread]').forEach(function (c) {
          if (c !== chip) c.classList.remove('is-active');
        });
        rail.querySelectorAll('.journey-stop').forEach(function (stop) {
          var threads = (stop.getAttribute('data-threads') || '').split(/\s+/);
          var dim = on && threads.indexOf(key) === -1;
          stop.classList.toggle('is-dimmed', dim);
        });
        if (!on) {
          rail.querySelectorAll('.journey-stop').forEach(function (stop) {
            stop.classList.remove('is-dimmed');
          });
        }
      });
    });
  }

  /* Philosophy toggle */
  var phiNav = document.getElementById('phiNav');
  var phiContent = document.getElementById('phiContent');
  if (phiNav && phiContent) {
    var items = [
      {
        id: 'trust',
        title: 'Trustworthy AI',
        body: 'Clinical AI must be reliable, interpretable, and safe — minimizing false positives, addressing bias, and staying robust across diverse patient populations.',
        chips: ['Equivalence testing', 'Multi-site validation', 'Sovereign AI framing']
      },
      {
        id: 'personal',
        title: 'Personal Motivation',
        body: 'Work on Alzheimer’s imaging was born from witnessing family members navigate cognitive decline. That stake keeps the work grounded — every dataset is people and stories.',
        chips: ['Amyloid PET', 'Cognitive phenotyping', 'Patient-first']
      },
      {
        id: 'cross',
        title: 'Cross-disciplinary Collaboration',
        body: 'Hard problems live at intersections: engineers who understand medicine, radiologists who know deep learning, and computer scientists who grasp neuroanatomy.',
        chips: ['Nuclear medicine', 'Surgery CV', 'Health data privacy']
      }
    ];
    items.forEach(function (it, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = i === 0 ? 'is-active' : '';
      btn.textContent = it.title;
      btn.addEventListener('click', function () {
        show(i);
      });
      phiNav.appendChild(btn);
    });
    function show(i) {
      var it = items[i];
      phiNav.querySelectorAll('button').forEach(function (b, j) {
        b.classList.toggle('is-active', j === i);
      });
      phiContent.innerHTML =
        '<h3>' +
        it.title +
        '</h3><p>' +
        it.body +
        '</p><div class="pillar-chips">' +
        it.chips
          .map(function (c) {
            return '<span>' + c + '</span>';
          })
          .join('') +
        '</div><a class="link-arrow" href="cv.html#publications">See evidence on CV <i class="fas fa-arrow-right" style="font-size:0.8em"></i></a>';
    }
    show(0);
  }
})();
