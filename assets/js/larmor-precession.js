/*! larmor-precession.js v0.1.1
 * Dependency-free interactive Larmor precession widget.
 * Mount: <div data-widget="larmor-precession" data-lang="en|zh-Hant"></div>
 * Physics: for gamma > 0, dmu/dt = gamma * mu x B. With B = B0 z the moment
 * turns at omega0 = gamma*B0, clockwise when seen from the tip of B0, at a
 * fixed cone angle (relaxation ignored).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.LarmorPrecession = api;
  if (typeof document !== 'undefined') {
    var boot = function () { api.mountAll(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  /* ---------- physics (pure, unit-tested) ---------- */
  var TWO_PI = 2 * Math.PI;
  // gamma/2pi in MHz/T. 1H: CODATA proton value. 13C: from gamma = 6.728284e7 rad/s/T.
  var NUCLEI = {
    '1H': { label: '¹H', g2p: 42.577478 },
    '13C': { label: '¹³C', g2p: 10.7084 }
  };
  var REF_NU_MHZ = 42.577478 * 1.5; // 1H at 1.5 T
  var REF_PERIOD_S = 4;             // on-screen period at that reference

  function larmorMHz(nuc, B0) { return NUCLEI[nuc].g2p * B0; }
  function omega0(nuc, B0) { return TWO_PI * larmorMHz(nuc, B0) * 1e6; }
  function visPeriod(nuc, B0) { return REF_PERIOD_S * REF_NU_MHZ / larmorMHz(nuc, B0); }
  function slowdown(nuc, B0) { return larmorMHz(nuc, B0) * 1e6 * visPeriod(nuc, B0); }
  // Unit moment at polar angle theta; phase is the azimuth. Time evolution lowers phase.
  function vec(theta, phase) {
    return [Math.sin(theta) * Math.cos(phase), Math.sin(theta) * Math.sin(phase), Math.cos(theta)];
  }
  // n spins on one cone. coh = 0: phases evenly spread; coh = 1: all in phase.
  function ensemble(n, theta, coh, phase) {
    var spins = [], sx = 0, sy = 0, sz = 0;
    for (var k = 0; k < n; k++) {
      var v = vec(theta, phase + (1 - coh) * TWO_PI * k / n);
      spins.push(v); sx += v[0]; sy += v[1]; sz += v[2];
    }
    var M = [sx / n, sy / n, sz / n];
    return { spins: spins, M: M, mxy: Math.hypot(M[0], M[1]), mz: M[2] };
  }

  /* ---------- text ---------- */
  var T = {
    en: {
      title: 'Larmor precession', lang: '中文',
      single: 'One moment μ', many: 'Many spins and M',
      field: 'Field B₀', nucleus: 'Nucleus', cone: 'Cone angle θ', coh: 'Phase coherence',
      equil: 'Thermal equilibrium', rf: 'Just after RF', play: 'Play', pause: 'Pause',
      nu: 'ν₀ = γB₀ / 2π', om: 'ω₀ = γB₀',
      mz: 'M along z', mxy: 'M in xy plane', speed: 'Playback',
      slow: '{x} × slower than real time',
      noteBase: 'For γ > 0 (¹H, ¹³C) the moment turns clockwise seen from the tip of B₀. Relaxation is ignored, so the cone angle stays fixed. Playback is slowed by the same factor for every field and nucleus, so relative speeds are true.',
      noteMany: 'Twelve spins stand in for the ~10²⁰ protons of a 1 mm³ water voxel. Evenly spread phases cancel in the xy plane, so M stays on z. In-phase spins leave a transverse M that turns at ω₀. The RF pulse itself is not simulated.',
      mu: 'μ', stage: 'Magnetic moment precessing around B zero',
      stSingle: 'One moment, cone angle {th} degrees, field {b} tesla, {nuc}: {nu} megahertz.',
      stMany: 'Twelve spins, phase coherence {c} percent: M along z {mz}, M in the xy plane {mxy}.'
    },
    zh: {
      title: '拉莫爾進動', lang: 'EN',
      single: '單一磁矩 μ', many: '多個自旋與 M',
      field: '磁場 B₀', nucleus: '原子核', cone: '圓錐角 θ', coh: '相位一致程度',
      equil: '熱平衡', rf: 'RF 剛結束', play: '播放', pause: '暫停',
      nu: 'ν₀ = γB₀ / 2π', om: 'ω₀ = γB₀',
      mz: 'M 沿 z 軸', mxy: 'M 在 xy 平面', speed: '播放速度',
      slow: '比真實慢 {x} 倍',
      noteBase: 'γ > 0（¹H、¹³C）時，從 B₀ 箭頭端看下去，磁矩是順時針轉。這裡不考慮弛豫，所以圓錐角不變。不管磁場或原子核，播放都慢下同一倍數，因此快慢的比例是真的。',
      noteMany: '12 個自旋代表 1 mm³ 水 voxel 裡約 10²⁰ 個質子。相位均勻分散時，它們在 xy 平面互相抵消，M 留在 z 軸。相位一致時則留下橫向 M，以 ω₀ 旋轉。RF 脈衝本身沒有在這裡模擬。',
      mu: 'μ', stage: '磁矩繞 B 零進動的示意圖',
      stSingle: '單一磁矩，圓錐角 {th} 度，磁場 {b} 特斯拉，{nuc}，進動頻率 {nu} 兆赫。',
      stMany: '12 個自旋，相位一致程度 {c}%：M 沿 z 軸 {mz}，在 xy 平面 {mxy}。'
    }
  };

  /* ---------- helpers ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); }
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function f1(n) { return n.toFixed(1); }
  function sci(x) {
    var e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e);
    var sup = String(e).split('').map(function (c) { return c === '-' ? '⁻' : '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c]; }).join('');
    return m.toFixed(2) + '×10' + sup;
  }
  var uid = 0;

  var CSS = [
    '.lp{--lp-bg:var(--bg-elevated,#151c28);--lp-fg:var(--text,#e2e6ef);--lp-mute:#8e98ab;--lp-accent:var(--accent,#5eaab4);--lp-mu:#e3b15c;--lp-m:#f4f6fb;--lp-line:var(--border,rgba(255,255,255,.08));',
    'box-sizing:border-box;margin:1.6rem 0;padding:1rem;border:1px solid var(--lp-line);border-radius:12px;background:var(--lp-bg);color:var(--lp-fg);font:14px/1.5 var(--font-b,"DM Sans",system-ui,sans-serif);}',
    '.lp *{box-sizing:border-box}',
    '.lp-bar{display:flex;align-items:center;justify-content:space-between;gap:.75rem;margin-bottom:.5rem}',
    '.lp-title{font:600 .95rem/1.3 var(--font-d,"Playfair Display",Georgia,serif);letter-spacing:.01em}',
    '.lp button,.lp select,.lp input{font:inherit;color:inherit}',
    '.lp-btn{padding:.32rem .75rem;border:1px solid var(--lp-line);border-radius:999px;background:transparent;cursor:pointer;min-height:36px}',
    '.lp-btn:hover{border-color:var(--lp-accent)}',
    '.lp-btn[aria-pressed="true"]{background:var(--lp-accent);border-color:var(--lp-accent);color:#071014;font-weight:600}',
    '.lp :focus-visible{outline:2px solid var(--lp-accent);outline-offset:2px}',
    '.lp-stage{margin:0;border-radius:8px;background:rgba(0,0,0,.22);overflow:hidden}',
    '.lp-stage svg{display:block;width:100%;height:auto;max-height:430px}',
    '.lp-row{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.75rem}',
    '.lp-ro{display:grid;grid-template-columns:repeat(auto-fit,minmax(10.5rem,1fr));gap:.5rem;margin:.75rem 0 0;padding:0}',
    '.lp-ro div{padding:.45rem .6rem;border:1px solid var(--lp-line);border-radius:8px;min-width:0}',
    '.lp-ro dt{font-size:.74rem;color:var(--lp-mute);letter-spacing:.02em}',
    '.lp-ro dd{margin:.1rem 0 0;font:500 .95rem/1.3 var(--font-m,"Fira Code",ui-monospace,monospace);font-variant-numeric:tabular-nums}',
    '.lp-ctl{display:grid;grid-template-columns:repeat(auto-fit,minmax(13rem,1fr));gap:.7rem 1rem;margin-top:.85rem}',
    '.lp-ctl label{display:grid;gap:.25rem;font-size:.82rem;color:var(--lp-mute)}',
    '.lp-ctl label span b{color:var(--lp-fg);font-weight:500;font-variant-numeric:tabular-nums}',
    '.lp-ctl input[type=range]{width:100%;accent-color:var(--lp-accent);min-height:28px}',
    '.lp-ctl select{padding:.35rem .5rem;border:1px solid var(--lp-line);border-radius:8px;background:rgba(0,0,0,.25);min-height:36px}',
    '.lp-note{margin:.85rem 0 0;font-size:.82rem;color:var(--lp-mute);max-width:68ch}',
    '.lp-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
    '.lp[hidden],.lp [hidden]{display:none!important}'
  ].join('');

  function injectStyle() {
    if (document.getElementById('lp-style')) return;
    var st = h('style', { id: 'lp-style' }); st.textContent = CSS; document.head.appendChild(st);
  }

  /* ---------- widget ---------- */
  function mount(host) {
    if (host.__lp) return host.__lp;
    injectStyle();
    var id = 'lp' + (++uid);
    var langAttr = host.getAttribute('data-lang');
    var anc = host.closest ? host.closest('[lang]') : null;
    var L = /^zh/i.test(langAttr || (anc && anc.getAttribute('lang')) || '') ? 'zh' : 'en';
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var st = { mode: 'single', nuc: '1H', B0: 1.5, theta: 30, coh: 0, playing: !reduce, phase: 0 };
    var N = 12, TRAIL = 44, visible = true, last = 0, raf = 0;
    var trail = [];
    var S = { cx: 236, cy: 250, s: 150 };
    function proj(p) { return [S.cx + S.s * (p[0] + 0.40 * p[1]), S.cy - S.s * (p[2] + 0.28 * p[1])]; }
    var O = proj([0, 0, 0]);
    function tx(k, v) { var o = T[L][k]; if (v) for (var n in v) o = o.replace('{' + n + '}', v[n]); return o; }

    host.classList.add('lp'); host.innerHTML = '';
    /* stage */
    var svg = s('svg', { viewBox: '0 0 520 430', role: 'img', 'aria-label': tx('stage') });
    var gStatic = s('g', {}), gCone = s('path', { fill: 'none', stroke: 'var(--lp-accent)', 'stroke-width': 1.2, 'stroke-dasharray': '4 4', opacity: .7 });
    var ground = [];
    for (var i = 0; i <= 72; i++) { var a = TWO_PI * i / 72; ground.push(proj([Math.cos(a), Math.sin(a), 0])); }
    gStatic.appendChild(s('path', { d: 'M' + ground.map(function (p) { return f1(p[0]) + ',' + f1(p[1]); }).join('L'), fill: 'none', stroke: 'rgba(142,152,171,.35)', 'stroke-width': 1 }));
    [[[-1.25, 0, 0], [1.25, 0, 0], 'x'], [[0, -1.25, 0], [0, 1.25, 0], 'y'], [[0, 0, -0.85], [0, 0, 1.3], 'z']].forEach(function (ax) {
      var a = proj(ax[0]), b = proj(ax[1]);
      gStatic.appendChild(s('line', { x1: f1(a[0]), y1: f1(a[1]), x2: f1(b[0]), y2: f1(b[1]), stroke: 'rgba(142,152,171,.45)', 'stroke-width': 1 }));
      var l = proj(ax[2] === 'x' ? [1.38, 0, 0] : ax[2] === 'y' ? [0, 1.38, 0] : [0, 0, 1.46]);
      var t = s('text', { x: f1(l[0]), y: f1(l[1]), fill: '#8e98ab', 'font-size': 13, 'text-anchor': 'middle', 'font-family': 'ui-monospace,monospace' }); t.textContent = ax[2];
      gStatic.appendChild(t);
    });
    svg.appendChild(gStatic); svg.appendChild(gCone);

    function arrow(parent, color, width, head) {
      var g = s('g', {}), line = s('line', { stroke: color, 'stroke-width': width, 'stroke-linecap': 'round' }), poly = s('polygon', { fill: color });
      g.appendChild(line); g.appendChild(poly); parent.appendChild(g);
      return {
        g: g, set: function (a, b) {
          var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
          if (len < 1.5) { g.style.display = 'none'; return; } g.style.display = '';
          var ux = dx / len, uy = dy / len, hl = Math.min(head, len * 0.6), bx = b[0] - ux * hl, by = b[1] - uy * hl, hw = hl * 0.38;
          line.setAttribute('x1', f1(a[0])); line.setAttribute('y1', f1(a[1])); line.setAttribute('x2', f1(bx)); line.setAttribute('y2', f1(by));
          poly.setAttribute('points', f1(b[0]) + ',' + f1(b[1]) + ' ' + f1(bx - uy * hw) + ',' + f1(by + ux * hw) + ' ' + f1(bx + uy * hw) + ',' + f1(by - ux * hw));
        }
      };
    }
    var b0a = proj([0, 0, 1.3]), b0 = arrow(svg, 'var(--lp-accent)', 3.2, 14); b0.set(O, b0a);
    var b0t = s('text', { x: f1(b0a[0] + 18), y: f1(b0a[1] + 4), fill: 'var(--lp-accent)', 'font-size': 15, 'font-family': 'var(--font-d,Georgia,serif)', 'font-style': 'italic' }); b0t.textContent = 'B₀'; svg.appendChild(b0t);
    var trailG = s('g', {}), segs = [];
    for (i = 0; i < TRAIL; i++) { var sg = s('line', { 'stroke-linecap': 'round', 'stroke-width': 2 }); trailG.appendChild(sg); segs.push(sg); }
    svg.appendChild(trailG);
    var gSpins = s('g', {}), spinEls = [];
    for (i = 0; i < N; i++) {
      var sp = s('g', {}), ln = s('line', { stroke: 'var(--lp-mu)', 'stroke-width': 1.6, opacity: .85, 'stroke-linecap': 'round' }), dot = s('circle', { r: 3, fill: 'var(--lp-mu)' });
      sp.appendChild(ln); sp.appendChild(dot); gSpins.appendChild(sp); spinEls.push({ g: sp, ln: ln, dot: dot, y: 0 });
    }
    svg.appendChild(gSpins);
    var muA = arrow(svg, 'var(--lp-mu)', 3.4, 15), mA = arrow(svg, 'var(--lp-m)', 4, 17);
    var muT = s('text', { fill: 'var(--lp-mu)', 'font-size': 15, 'font-family': 'var(--font-d,Georgia,serif)', 'font-style': 'italic' }); muT.textContent = 'μ'; svg.appendChild(muT);
    var mT = s('text', { fill: 'var(--lp-m)', 'font-size': 16, 'font-weight': 700, 'font-family': 'var(--font-d,Georgia,serif)' }); mT.textContent = 'M'; svg.appendChild(mT);
    svg.appendChild(s('circle', { cx: f1(O[0]), cy: f1(O[1]), r: 3, fill: '#8e98ab' }));

    /* controls */
    var title = h('span', { class: 'lp-title' }), langBtn = h('button', { type: 'button', class: 'lp-btn' });
    var bar = h('div', { class: 'lp-bar' }, [title, langBtn]);
    var stage = h('div', { class: 'lp-stage' }, []); stage.appendChild(svg);
    var bSingle = h('button', { type: 'button', class: 'lp-btn' }), bMany = h('button', { type: 'button', class: 'lp-btn' }), bPlay = h('button', { type: 'button', class: 'lp-btn' });
    var modes = h('div', { class: 'lp-row', role: 'group' }, [bSingle, bMany, bPlay]);
    function ro(key) { var dt = h('dt'), dd = h('dd'); return { el: h('div', {}, [dt, dd]), dt: dt, dd: dd, key: key }; }
    var rNu = ro('nu'), rOm = ro('om'), rMz = ro('mz'), rMxy = ro('mxy'), rSp = ro('speed');
    var readouts = h('dl', { class: 'lp-ro' }, [rNu.el, rOm.el, rMz.el, rMxy.el, rSp.el]);
    function range(key, min, max, step, val) {
      var inp = h('input', { type: 'range', id: id + key, min: min, max: max, step: step, value: val }), out = h('b'), lab = h('span'), wrap = h('label', { for: id + key }, [h('span', {}, []), inp]);
      wrap.firstChild.appendChild(lab); wrap.firstChild.appendChild(document.createTextNode(' ')); wrap.firstChild.appendChild(out);
      return { wrap: wrap, inp: inp, out: out, lab: lab };
    }
    var cB = range('B', 0.5, 7, 0.1, st.B0), cT = range('T', 10, 80, 1, st.theta), cC = range('C', 0, 100, 1, st.coh);
    var nucSel = h('select', { id: id + 'N' }, [h('option', { value: '1H', text: NUCLEI['1H'].label }), h('option', { value: '13C', text: NUCLEI['13C'].label })]);
    var nucLab = h('span'), nucWrap = h('label', { for: id + 'N' }, [nucLab, nucSel]);
    var pEq = h('button', { type: 'button', class: 'lp-btn' }), pRf = h('button', { type: 'button', class: 'lp-btn' });
    var presets = h('div', { class: 'lp-row' }, [pEq, pRf]);
    var cohBox = h('div', { class: 'lp-ctl-coh' }, [cC.wrap, presets]);
    var ctl = h('div', { class: 'lp-ctl' }, [cB.wrap, nucWrap, cT.wrap, cohBox]);
    var note = h('div', { class: 'lp-note' }), sr = h('div', { class: 'lp-sr', role: 'status', 'aria-live': 'polite' });
    [bar, stage, modes, readouts, ctl, note, sr].forEach(function (n) { host.appendChild(n); });

    function labels() {
      title.textContent = tx('title'); langBtn.textContent = tx('lang'); langBtn.setAttribute('aria-label', L === 'en' ? '切換為中文' : 'Switch to English');
      bSingle.textContent = tx('single'); bMany.textContent = tx('many'); bPlay.textContent = tx(st.playing ? 'pause' : 'play');
      modes.setAttribute('aria-label', tx('title'));
      rNu.dt.textContent = tx('nu'); rOm.dt.textContent = tx('om'); rMz.dt.textContent = tx('mz'); rMxy.dt.textContent = tx('mxy'); rSp.dt.textContent = tx('speed');
      cB.lab.textContent = tx('field'); cT.lab.textContent = tx('cone'); cC.lab.textContent = tx('coh'); nucLab.textContent = tx('nucleus');
      pEq.textContent = tx('equil'); pRf.textContent = tx('rf'); svg.setAttribute('aria-label', tx('stage'));
      host.setAttribute('lang', L === 'zh' ? 'zh-Hant' : 'en');
    }
    function clearTrail() { trail.length = 0; segs.forEach(function (g) { g.setAttribute('x1', 0); g.setAttribute('x2', 0); g.setAttribute('y1', 0); g.setAttribute('y2', 0); }); }

    function draw() {
      var th = st.theta * Math.PI / 180, many = st.mode === 'many';
      var pts = [];
      for (var i = 0; i <= 72; i++) { var a = TWO_PI * i / 72; pts.push(proj(vec(th, a))); }
      gCone.setAttribute('d', 'M' + pts.map(function (p) { return f1(p[0]) + ',' + f1(p[1]); }).join('L'));
      var tip, lab;
      if (!many) {
        var v = vec(th, st.phase); tip = proj(v); muA.set(O, tip); muA.g.style.display = muA.g.style.display;
        gSpins.style.display = 'none'; mA.g.style.display = 'none'; mT.style.display = 'none'; muT.style.display = '';
        muT.setAttribute('x', f1(tip[0] + 10)); muT.setAttribute('y', f1(tip[1] - 6));
        rMz.dd.textContent = '—'; rMxy.dd.textContent = '—';
      } else {
        var e = ensemble(N, th, st.coh / 100, st.phase), order = [];
        gSpins.style.display = ''; muA.g.style.display = 'none'; muT.style.display = 'none'; mT.style.display = '';
        for (var k = 0; k < N; k++) { spinEls[k].y = e.spins[k][1]; spinEls[k].p = proj(e.spins[k]); order.push(spinEls[k]); }
        order.sort(function (p, q) { return q.y - p.y; });
        order.forEach(function (it) {
          it.ln.setAttribute('x1', f1(O[0])); it.ln.setAttribute('y1', f1(O[1])); it.ln.setAttribute('x2', f1(it.p[0])); it.ln.setAttribute('y2', f1(it.p[1]));
          it.dot.setAttribute('cx', f1(it.p[0])); it.dot.setAttribute('cy', f1(it.p[1])); gSpins.appendChild(it.g);
        });
        tip = proj(e.M); mA.set(O, tip);
        mT.setAttribute('x', f1(tip[0] + 10)); mT.setAttribute('y', f1(tip[1] - 8));
        rMz.dd.textContent = e.mz.toFixed(2); rMxy.dd.textContent = e.mxy < 5e-9 ? '0' : e.mxy.toFixed(2);
      }
      trail.push(tip); if (trail.length > TRAIL) trail.shift();
      var col = many ? '244,246,251' : '227,177,92';
      for (var j = 0; j < TRAIL; j++) {
        var g = segs[j], idx = j - (TRAIL - trail.length);
        if (idx < 1) { g.setAttribute('opacity', 0); continue; }
        var p0 = trail[idx - 1], p1 = trail[idx];
        g.setAttribute('x1', f1(p0[0])); g.setAttribute('y1', f1(p0[1])); g.setAttribute('x2', f1(p1[0])); g.setAttribute('y2', f1(p1[1]));
        g.setAttribute('stroke', 'rgb(' + col + ')'); g.setAttribute('opacity', (0.05 + 0.5 * idx / TRAIL).toFixed(2));
      }
    }
    function values() {
      var nu = larmorMHz(st.nuc, st.B0);
      rNu.dd.textContent = nu.toFixed(2) + ' MHz'; rOm.dd.textContent = sci(omega0(st.nuc, st.B0)) + ' rad/s';
      rSp.dd.textContent = tx('slow', { x: sci(slowdown(st.nuc, st.B0)) });
      cB.out.textContent = st.B0.toFixed(1) + ' T'; cT.out.textContent = st.theta + '°'; cC.out.textContent = st.coh + '%';
      cohBox.hidden = st.mode !== 'many';
      bSingle.setAttribute('aria-pressed', st.mode === 'single'); bMany.setAttribute('aria-pressed', st.mode === 'many');
      pEq.setAttribute('aria-pressed', st.coh === 0); pRf.setAttribute('aria-pressed', st.coh === 100);
      note.textContent = tx('noteBase') + (st.mode === 'many' ? ' ' + tx('noteMany') : '');
    }
    var srTimer = 0;
    function announce() {
      clearTimeout(srTimer);
      srTimer = setTimeout(function () {
        var th = st.theta * Math.PI / 180, e = ensemble(N, th, st.coh / 100, 0);
        sr.textContent = st.mode === 'single'
          ? tx('stSingle', { th: st.theta, b: st.B0.toFixed(1), nuc: NUCLEI[st.nuc].label, nu: larmorMHz(st.nuc, st.B0).toFixed(2) })
          : tx('stMany', { c: st.coh, mz: e.mz.toFixed(2), mxy: e.mxy < 5e-9 ? '0' : e.mxy.toFixed(2) });
      }, 400);
    }
    function refresh(resetTrail) { if (resetTrail) clearTrail(); values(); draw(); announce(); }

    bSingle.addEventListener('click', function () { st.mode = 'single'; refresh(true); });
    bMany.addEventListener('click', function () { st.mode = 'many'; refresh(true); });
    bPlay.addEventListener('click', function () { st.playing = !st.playing; labels(); });
    langBtn.addEventListener('click', function () { L = L === 'en' ? 'zh' : 'en'; labels(); values(); announce(); });
    cB.inp.addEventListener('input', function () { st.B0 = +cB.inp.value; refresh(false); });
    cT.inp.addEventListener('input', function () { st.theta = +cT.inp.value; refresh(true); });
    cC.inp.addEventListener('input', function () { st.coh = +cC.inp.value; refresh(true); });
    nucSel.addEventListener('change', function () { st.nuc = nucSel.value; refresh(false); });
    pEq.addEventListener('click', function () { st.coh = 0; cC.inp.value = 0; refresh(true); });
    pRf.addEventListener('click', function () { st.coh = 100; cC.inp.value = 100; refresh(true); });

    function tick(ts) {
      var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
      if (st.playing && visible) { st.phase = (st.phase - TWO_PI * dt / visPeriod(st.nuc, st.B0)) % TWO_PI; draw(); }
      raf = requestAnimationFrame(tick);
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0 }).observe(host);
    }
    labels(); values(); draw(); announce();
    raf = requestAnimationFrame(tick);
    var api = {
      state: st, refresh: refresh,
      step: function (dtSec) { st.phase = (st.phase - TWO_PI * dtSec / visPeriod(st.nuc, st.B0)) % TWO_PI; draw(); },
      destroy: function () { cancelAnimationFrame(raf); host.__lp = null; }
    };
    host.__lp = api; return api;
  }

  function mountAll() {
    var list = document.querySelectorAll('[data-widget="larmor-precession"]');
    for (var i = 0; i < list.length; i++) mount(list[i]);
  }

  return {
    mount: mount, mountAll: mountAll,
    math: { NUCLEI: NUCLEI, larmorMHz: larmorMHz, omega0: omega0, visPeriod: visPeriod, slowdown: slowdown, vec: vec, ensemble: ensemble }
  };
});
