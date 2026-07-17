/* ═══ Portfolio Interactions ═══ */
(function () {
  'use strict';

  /* ── Particle Network (Hero — used when 3D brain falls back) ── */
  var canvas = document.getElementById('heroCanvas');
  var reducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var force2d = document.documentElement.classList.contains('brain-fallback');
  var use3dMount = document.getElementById('brainMount');
  if (canvas && !reducedMotion && (force2d || !use3dMount)) {
    var ctx = canvas.getContext('2d');
    var particles = [];
    var mouse = { x: null, y: null };
    var raf;
    var W = 0, H = 0;
    var PC = [94, 170, 180];

    function resize() {
      W = canvas.parentElement.offsetWidth;
      H = canvas.parentElement.offsetHeight;
      var dpr = window.devicePixelRatio || 1;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function init() {
      resize();
      var count = Math.min(55, Math.max(18, Math.floor(W * H / 20000)));
      particles = [];
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          r: Math.random() * 1.4 + 0.6
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      /* ── Geometric Brain Mesh (right side) ── */
      var bcx = W * 0.72, bcy = H * 0.48;
      var bsc = Math.min(W, H) * 0.36;

      // Brain node positions (normalized, anatomical side-view profile)
      // Frontal lobe is left, occipital is right, temporal below
      var brainNodes = [
        // Cerebrum outer — frontal face (slight irregularity)
        [-0.78, 0.12],   // 0  frontal pole
        [-0.83, 0.01],   // 1  frontal face lower
        [-0.81, -0.11],  // 2  frontal face mid (slight indent)
        [-0.79, -0.25],  // 3  frontal face upper
        [-0.72, -0.36],  // 4  frontal-top transition (bump)
        [-0.59, -0.45],  // 5  superior frontal
        // Top of brain — subtle gyri bumps (not a smooth arc)
        [-0.46, -0.52],  // 6  frontal gyrus peak
        [-0.34, -0.49],  // 7  pre-central dip
        [-0.22, -0.54],  // 8  precentral gyrus
        [-0.08, -0.52],  // 9  central sulcus dip
        [0.08, -0.54],   // 10 postcentral gyrus
        [0.22, -0.50],   // 11 parietal
        [0.36, -0.46],   // 12 parietal gyrus
        [0.48, -0.36],   // 13 parieto-occipital
        // Occipital (subtle lower bump, not too smooth)
        [0.57, -0.22],   // 14 occipital upper
        [0.60, -0.08],   // 15 occipital mid
        [0.59, 0.05],    // 16 occipital (slight indent)
        [0.54, 0.16],    // 17 occipital lower bump
        [0.40, 0.24],    // 18 occipital pole
        // Cerebellum gap + cerebellum (compact rounded mass)
        [0.26, 0.26],    // 19 transverse fissure (gap)
        [0.38, 0.32],    // 20 cerebellum back-top
        [0.46, 0.42],    // 21 cerebellum back
        [0.42, 0.52],    // 22 cerebellum back-bottom
        [0.30, 0.56],    // 23 cerebellum bottom
        [0.16, 0.52],    // 24 cerebellum front-bottom
        [0.08, 0.44],    // 25 cerebellum front
        [0.00, 0.36],    // 26 brainstem
        // Temporal lobe bottom (relatively flat)
        [-0.16, 0.34],   // 27 posterior temporal
        [-0.34, 0.29],   // 28 mid temporal
        [-0.52, 0.24],   // 29 anterior temporal
        [-0.68, 0.17],   // 30 temporal-frontal
        // Sylvian fissure (separates frontal/parietal from temporal)
        [-0.56, -0.02],  // 31 sylvian anterior
        [-0.36, -0.07],  // 32 sylvian mid
        [-0.14, -0.10],  // 33 sylvian center
        [0.10, -0.05],   // 34 sylvian posterior
        [0.30, 0.02],    // 35 sylvian end
        // Inner frontal nodes
        [-0.56, -0.14],  // 36
        [-0.44, -0.29],  // 37
        [-0.28, -0.41],  // 38
        // Inner parietal nodes
        [0.02, -0.41],   // 39
        [0.24, -0.31],   // 40
        [0.44, -0.10],   // 41
        // Inner temporal nodes
        [-0.44, 0.12],   // 42
        [-0.24, 0.14],   // 43
        [-0.02, 0.17],   // 44
        [0.18, 0.12],    // 45
        // Deep core (thalamus)
        [-0.16, -0.14],  // 46
        [0.04, -0.12],   // 47
        [0.14, 0.05],    // 48
        [-0.08, 0.05],   // 49
        // Cerebellum inner structure (compact spiral)
        [0.36, 0.38],    // 50 inner top-right
        [0.40, 0.46],    // 51 inner right
        [0.32, 0.50],    // 52 inner bottom
        [0.18, 0.46],    // 53 inner left
        [0.28, 0.44],    // 54 center
      ];

      // Connection pairs
      var brainEdges = [
        // Outer contour
        [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],
        [10,11],[11,12],[12,13],[13,14],[14,15],[15,16],[16,17],[17,18],
        [18,19],[19,20],[20,21],[21,22],[22,23],[23,24],[24,25],[25,26],
        [26,27],[27,28],[28,29],[29,30],[30,0],
        // Cerebellum outer cross
        [18,20],[19,25],[19,26],
        // Sylvian fissure
        [31,32],[32,33],[33,34],[34,35],
        // Frontal: outer to sylvian/inner
        [0,31],[1,31],[30,31],
        [2,36],[3,36],[31,36],
        [3,37],[4,37],[32,37],[7,37],
        [5,38],[6,38],[37,38],[38,33],
        // Parietal: outer to inner
        [33,39],[8,39],[9,39],
        [39,40],[10,40],[11,40],[12,40],
        [40,41],[13,41],[14,41],[15,41],[16,41],
        [34,41],[35,41],
        // Temporal + occipital connections
        [35,18],[35,19],
        [29,42],[28,43],[27,44],[27,45],
        [42,31],[43,32],[44,33],[45,34],
        // Inner chains
        [36,37],[37,38],[38,39],
        [40,41],
        [42,43],[43,44],[44,45],
        [36,32],
        // Deep core
        [46,47],[47,48],[48,49],[49,46],
        // Core connections
        [33,46],[32,46],[38,46],
        [39,47],[40,47],[34,47],
        [34,48],[45,48],
        [44,49],[43,49],[33,49],
        // Radial to core
        [36,46],[37,46],[41,47],[35,48],[42,49],
        // Cerebellum inner mesh (clean, no crossing diagonals)
        [50,51],[51,52],[52,53],[53,50],
        [50,54],[51,54],[52,54],[53,54],
        [20,50],[21,50],[21,51],[22,52],
        [23,52],[24,53],[25,53],[19,54],
      ];

      ctx.save();
      ctx.translate(bcx, bcy);

      // Draw edges
      ctx.lineWidth = 1.2;
      for (var ei = 0; ei < brainEdges.length; ei++) {
        var e = brainEdges[ei];
        var n1 = brainNodes[e[0]], n2 = brainNodes[e[1]];
        var x1 = n1[0] * bsc, y1 = n1[1] * bsc;
        var x2 = n2[0] * bsc, y2 = n2[1] * bsc;

        // Distance-based opacity for depth feel
        var emx = (x1 + x2) / 2, emy = (y1 + y2) / 2;
        var ed = Math.sqrt(emx * emx + emy * emy) / bsc;
        var ea = 0.12 + 0.08 * (1 - ed);

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(94,180,190,' + ea + ')';
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Draw nodes
      for (var ni = 0; ni < brainNodes.length; ni++) {
        var n = brainNodes[ni];
        var nx = n[0] * bsc, ny = n[1] * bsc;
        var nd = Math.sqrt(nx * nx + ny * ny) / bsc;
        var nr = ni < 31 ? 2.2 : (ni < 46 ? 1.8 : (ni < 50 ? 1.4 : 1.6)); // contour > inner > core > cerebellum
        var na = 0.25 + 0.35 * (1 - nd);

        // Glow
        ctx.beginPath();
        ctx.arc(nx, ny, nr + 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(94,180,190,' + (na * 0.15) + ')';
        ctx.fill();

        // Node dot
        ctx.beginPath();
        ctx.arc(nx, ny, nr, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(94,180,190,' + na + ')';
        ctx.fill();
      }

      ctx.restore();

      /* ── Particle connections ── */
      var i, j, dx, dy, d2, d, a, p;
      for (i = 0; i < particles.length; i++) {
        for (j = i + 1; j < particles.length; j++) {
          dx = particles[i].x - particles[j].x;
          dy = particles[i].y - particles[j].y;
          d2 = dx * dx + dy * dy;
          if (d2 < 16900) {
            d = Math.sqrt(d2);
            a = 0.07 * (1 - d / 130);
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(' + PC.join(',') + ',' + a + ')';
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      for (i = 0; i < particles.length; i++) {
        p = particles[i];
        a = 0.3;
        if (mouse.x !== null) {
          dx = p.x - mouse.x;
          dy = p.y - mouse.y;
          d = Math.sqrt(dx * dx + dy * dy);
          if (d < 140) a = 0.3 + 0.55 * (1 - d / 140);
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + PC.join(',') + ',' + a + ')';
        ctx.fill();
      }
    }

    function update() {
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        if (mouse.x !== null) {
          var dx = p.x - mouse.x, dy = p.y - mouse.y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < 100 && d > 0) {
            p.x += (dx / d) * 0.25;
            p.y += (dy / d) * 0.25;
          }
        }
      }
    }

    function loop() {
      update();
      draw();
      raf = requestAnimationFrame(loop);
    }

    canvas.addEventListener('mousemove', function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    });
    canvas.addEventListener('mouseleave', function () {
      mouse.x = mouse.y = null;
    });

    var heroObs = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) loop();
      else cancelAnimationFrame(raf);
    });
    heroObs.observe(canvas.parentElement);

    window.addEventListener('resize', init);
    init();
    loop();
  }

  /* ── Hero activate ── */
  var hero = document.querySelector('.hero');
  if (hero) {
    requestAnimationFrame(function () {
      hero.classList.add('active');
    });
  }

  /* ── Scroll Reveal ── */
  var revealObs = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('revealed');
          revealObs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
  );
  document.querySelectorAll('[data-reveal]').forEach(function (el) {
    revealObs.observe(el);
  });

  /* ── Nav scroll ── */
  var nav = document.getElementById('nav');
  window.addEventListener(
    'scroll',
    function () {
      if (nav) nav.classList.toggle('nav--scrolled', window.scrollY > 50);
      var stb = document.getElementById('scrollTop');
      if (stb) stb.classList.toggle('active', window.scrollY > 500);
    },
    { passive: true }
  );

  /* ── Mobile menu ── */
  window.toggleMenu = function () {
    document.getElementById('navLinks').classList.toggle('active');
    document.querySelectorAll('.nav-dropdown.open').forEach(function (d) {
      d.classList.remove('open');
    });
  };

  /* ── Dropdown ── */
  document.querySelectorAll('.nav-dropdown > a').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var p = a.closest('.nav-dropdown');
      document.querySelectorAll('.nav-dropdown.open').forEach(function (d) {
        if (d !== p) d.classList.remove('open');
      });
      p.classList.toggle('open');
    });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav-dropdown'))
      document.querySelectorAll('.nav-dropdown.open').forEach(function (d) {
        d.classList.remove('open');
      });
  });

  /* ── Scroll to top ── */
  window.scrollToTop = function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ── Active nav link ── */
  var path = location.pathname.replace(/\\/g, '/');
  var page = path.split('/').pop() || 'index.html';
  var inPosts = /\/posts\//.test(path) || page === 'tutorials.html' || page === 'reflections.html';
  document.querySelectorAll('.nav__links > a').forEach(function (a) {
    a.classList.remove('active');
    var hp = (a.getAttribute('href') || '').split('/').pop();
    if (hp === page) a.classList.add('active');
  });
  if (inPosts) {
    var postsTrigger = document.querySelector('.nav-dropdown > a');
    if (postsTrigger) postsTrigger.classList.add('active');
  }

  /* Lazy images */
  document.querySelectorAll('img:not([loading])').forEach(function (img) {
    if (!img.closest('.hero')) img.setAttribute('loading', 'lazy');
  });
})();
