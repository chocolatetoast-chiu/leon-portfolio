/* ═══ v2/script.js — Portfolio Interactions ═══ */
(function () {
  'use strict';

  /* ── Particle Network (Hero) ── */
  var canvas = document.getElementById('heroCanvas');
  if (canvas) {
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
        // Outer contour — top arc (frontal → parietal → occipital)
        [-0.72, 0.10],  // 0  frontal pole bottom
        [-0.75, -0.08], // 1  frontal lower
        [-0.72, -0.25], // 2  frontal mid
        [-0.62, -0.42], // 3  frontal upper
        [-0.45, -0.55], // 4  prefrontal top
        [-0.25, -0.63], // 5  superior frontal
        [-0.05, -0.66], // 6  central sulcus top
        [0.15, -0.63],  // 7  parietal anterior
        [0.32, -0.56],  // 8  parietal mid
        [0.48, -0.44],  // 9  parietal posterior
        [0.58, -0.28],  // 10 parieto-occipital
        [0.62, -0.10],  // 11 occipital upper
        [0.58, 0.08],   // 12 occipital mid
        [0.48, 0.22],   // 13 occipital lower
        // Bottom contour — occipital → temporal → frontal
        [0.38, 0.32],   // 14 occipital-temporal junction
        [0.22, 0.28],   // 15 cerebellum top (indent)
        [0.30, 0.42],   // 16 cerebellum back
        [0.15, 0.48],   // 17 cerebellum bottom
        [0.02, 0.40],   // 18 brainstem top
        [-0.08, 0.50],  // 19 brainstem
        [-0.15, 0.35],  // 20 temporal pole bottom
        [-0.30, 0.30],  // 21 inferior temporal
        [-0.48, 0.25],  // 22 middle temporal
        [-0.62, 0.20],  // 23 temporal-frontal
        // Sylvian fissure line (indent between frontal/parietal and temporal)
        [-0.55, 0.05],  // 24 sylvian anterior
        [-0.35, -0.02], // 25 sylvian mid
        [-0.10, -0.05], // 26 sylvian center
        [0.12, 0.00],   // 27 sylvian posterior
        [0.35, 0.05],   // 28 sylvian end
        // Inner frontal nodes
        [-0.50, -0.15], // 29
        [-0.38, -0.30], // 30
        [-0.20, -0.42], // 31
        // Inner parietal nodes
        [0.05, -0.45],  // 32
        [0.25, -0.35],  // 33
        [0.42, -0.18],  // 34
        // Inner temporal nodes
        [-0.40, 0.15],  // 35
        [-0.20, 0.18],  // 36
        [0.00, 0.20],   // 37
        [0.20, 0.15],   // 38
        // Deep core (thalamus region)
        [-0.15, -0.12], // 39
        [0.05, -0.10],  // 40
        [0.15, 0.08],   // 41
        [-0.10, 0.08],  // 42
      ];

      // Connection pairs
      var brainEdges = [
        // Outer top contour
        [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,12],[12,13],
        // Outer bottom contour
        [13,14],[14,15],[15,16],[16,17],[17,18],[18,19],[19,20],[20,21],[21,22],[22,23],[23,0],
        // Cerebellum detail
        [14,16],[15,17],[15,18],
        // Sylvian fissure
        [24,25],[25,26],[26,27],[27,28],
        // Outer to Sylvian
        [0,24],[1,24],[23,24],[2,29],[24,29],[25,29],[25,30],[3,30],[4,30],[30,31],[5,31],[31,26],
        [26,32],[6,32],[7,32],[32,33],[8,33],[9,33],[33,34],[10,34],[11,34],[27,34],[28,34],
        [28,13],[28,14],[27,38],[22,35],[21,36],[20,37],[35,24],[36,25],[37,26],[38,27],
        // Inner frontal
        [29,30],[30,31],[31,32],[29,25],
        // Inner parietal
        [33,34],
        // Temporal inner
        [35,36],[36,37],[37,38],
        // Deep core
        [39,40],[40,41],[41,42],[42,39],[39,40],
        // Core connections
        [26,39],[25,39],[31,39],[32,40],[33,40],[27,40],[27,41],[38,41],[37,42],[36,42],[26,42],[39,42],[40,41],
        // Radial to core
        [29,39],[30,39],[34,40],[28,41],[35,42],
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
        var nr = ni < 24 ? 2.5 : (ni < 39 ? 2.0 : 1.6); // outer bigger
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
  var page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__links > a').forEach(function (a) {
    var hp = (a.getAttribute('href') || '').split('/').pop();
    if (hp === page) a.classList.add('active');
  });
})();
