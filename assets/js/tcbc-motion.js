/*! tcbc-motion.js v0.1.0
 * Dependency-free interactive explainer of tracer characteristic-based co-registration (TCBC).
 * Mount: <div data-widget="tcbc-motion" data-lang="en|zh-Hant"></div>
 * Schematic 2-D phantom, NOT patient data. The method follows Chiu, Perucho, Fang,
 * EJNMMI Physics 12:75 (2025), doi:10.1186/s40658-025-00789-6 (CC BY 4.0):
 * rigid transform of a white-matter mask, objective = mean PET uptake inside the mask,
 * Nelder-Mead simplex, 100 random starts within +-10 mm / +-10 deg. The widget uses
 * 3 parameters (tx, ty, rotation) because it is 2-D; the paper uses 6.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TcbcMotion = api;
  if (typeof document !== 'undefined') {
    var boot = function () { api.mountAll(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  /* ---------- model (pure, unit-tested) ---------- */
  var FOV = { x0: -100, y0: -110, w: 200, h: 220 };          // mm, 1 mm cells
  var PH = {
    brain: { cx: 0, cy: 0, rx: 68, ry: 84, rot: 0 },
    wm: { cx: 0, cy: 2, rx: 56, ry: 71, rot: 0 },
    // lateral lobes make the outline non-elliptic, which is what pins down rotation
    lobes: [{ cx: -50, cy: 14, rx: 11, ry: 24, rot: 0.35 }, { cx: 50, cy: 14, rx: 11, ry: 24, rot: -0.35 }],
    vents: [{ cx: -10, cy: 4, rx: 6, ry: 22, rot: 0.32 }, { cx: 11, cy: 2, rx: 5.5, ry: 19, rot: -0.27 }]
  };
  var GM_THICK = 11;                                          // mm
  var VAL = { wm: 1, gm: 0.45, csf: 0.1 };                    // relative uptake
  var PSF_SIGMA = 3.5;                                        // mm, PET blur
  var N_STARTS = 100, RANGE = 10;                             // as in the paper
  var D2R = Math.PI / 180;

  function inEll(x, y, e) {
    var dx = x - e.cx, dy = y - e.cy, c = Math.cos(e.rot), s = Math.sin(e.rot);
    var u = (dx * c + dy * s) / e.rx, v = (-dx * s + dy * c) / e.ry;
    return u * u + v * v <= 1;
  }
  function inVent(x, y) { return inEll(x, y, PH.vents[0]) || inEll(x, y, PH.vents[1]); }
  function grow(e, d) { return { cx: e.cx, cy: e.cy, rx: e.rx + d, ry: e.ry + d, rot: e.rot }; }
  function inWM(x, y) { return inEll(x, y, PH.wm) || inEll(x, y, PH.lobes[0]) || inEll(x, y, PH.lobes[1]); }
  function inBrain(x, y) {
    return inEll(x, y, PH.brain) || inEll(x, y, grow(PH.lobes[0], GM_THICK)) || inEll(x, y, grow(PH.lobes[1], GM_THICK));
  }

  function rng(seed) {                                         // mulberry32
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  function blur(src, W, H, sigma) {
    var rad = Math.ceil(3 * sigma), k = [], sum = 0, i, x, y, j;
    for (i = -rad; i <= rad; i++) { var g = Math.exp(-i * i / (2 * sigma * sigma)); k.push(g); sum += g; }
    for (i = 0; i < k.length; i++) k[i] /= sum;
    var tmp = new Float32Array(W * H), out = new Float32Array(W * H);
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      var a = 0; for (j = -rad; j <= rad; j++) { var xx = Math.min(W - 1, Math.max(0, x + j)); a += k[j + rad] * src[y * W + xx]; }
      tmp[y * W + x] = a;
    }
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      var b = 0; for (j = -rad; j <= rad; j++) { var yy = Math.min(H - 1, Math.max(0, y + j)); b += k[j + rad] * tmp[yy * W + x]; }
      out[y * W + x] = b;
    }
    return out;
  }

  var refCache = null;
  function buildRef() {                                        // blurred reference PET (head at rest)
    if (refCache) return refCache;
    var W = FOV.w, H = FOV.h, lab = new Float32Array(W * H);
    for (var j = 0; j < H; j++) for (var i = 0; i < W; i++) {
      var x = FOV.x0 + i + 0.5, y = FOV.y0 + j + 0.5, v = 0;
      if (inBrain(x, y)) v = VAL.gm;
      if (inWM(x, y)) v = VAL.wm;
      if (inVent(x, y)) v = VAL.csf;
      lab[j * W + i] = v;
    }
    refCache = { W: W, H: H, data: blur(lab, W, H, PSF_SIGMA) };
    return refCache;
  }

  function sample(img, x, y) {                                 // bilinear, edge-clamped
    var W = img.W, H = img.H, gx = x - FOV.x0 - 0.5, gy = y - FOV.y0 - 0.5;
    var i0 = Math.floor(gx), j0 = Math.floor(gy), fx = gx - i0, fy = gy - j0;
    var i1 = i0 + 1, j1 = j0 + 1;
    i0 = i0 < 0 ? 0 : i0 > W - 1 ? W - 1 : i0; i1 = i1 < 0 ? 0 : i1 > W - 1 ? W - 1 : i1;
    j0 = j0 < 0 ? 0 : j0 > H - 1 ? H - 1 : j0; j1 = j1 < 0 ? 0 : j1 > H - 1 ? H - 1 : j1;
    var d = img.data;
    return (d[j0 * W + i0] * (1 - fx) + d[j0 * W + i1] * fx) * (1 - fy) + (d[j1 * W + i0] * (1 - fx) + d[j1 * W + i1] * fx) * fy;
  }

  // Rigid transform of a point: p = R(th) q + t, th in degrees (y axis points down; positive th is clockwise on screen).
  function xform(q, m) {
    var th = m.th * D2R, c = Math.cos(th), s = Math.sin(th);
    return [c * q[0] - s * q[1] + m.tx, s * q[0] + c * q[1] + m.ty];
  }
  function invXform(p, m) {
    var th = m.th * D2R, c = Math.cos(th), s = Math.sin(th), dx = p[0] - m.tx, dy = p[1] - m.ty;
    return [c * dx + s * dy, -s * dx + c * dy];
  }

  // PET frame after the head moved by `motion` (so the MR mask, at rest, is now misaligned). Optional noise (std relative to WM = 1).
  function makePet(motion, noiseStd, seed) {
    var ref = buildRef(), W = ref.W, H = ref.H, data = new Float32Array(W * H);
    for (var j = 0; j < H; j++) for (var i = 0; i < W; i++) {
      var q = invXform([FOV.x0 + i + 0.5, FOV.y0 + j + 0.5], motion);
      data[j * W + i] = sample(ref, q[0], q[1]);
    }
    if (noiseStd > 0) {
      var r = rng(seed || 1), nz = new Float32Array(W * H), k, mean = 0, v = 0;
      for (k = 0; k < nz.length; k++) nz[k] = gauss(r);
      nz = blur(nz, W, H, 2);
      for (k = 0; k < nz.length; k++) mean += nz[k]; mean /= nz.length;
      for (k = 0; k < nz.length; k++) v += (nz[k] - mean) * (nz[k] - mean);
      var sd = Math.sqrt(v / nz.length) || 1;
      for (k = 0; k < data.length; k++) data[k] += noiseStd * (nz[k] - mean) / sd;
    }
    return { W: W, H: H, data: data };
  }

  function maskPoints(step) {                                  // WM mask: inside WM ellipse, outside ventricles
    step = step || 3; var pts = [], x, y;
    for (y = -75; y <= 75; y += step)
      for (x = -66; x <= 66; x += step)
        if (inWM(x, y) && !inVent(x, y)) pts.push([x, y]);
    return pts;
  }

  // Objective: mean PET uptake under the transformed mask. p = [tx, ty, thDeg].
  function meanUptake(pet, pts, p) {
    var th = p[2] * D2R, c = Math.cos(th), s = Math.sin(th), a = 0;
    for (var i = 0; i < pts.length; i++) {
      var q = pts[i];
      a += sample(pet, c * q[0] - s * q[1] + p[0], s * q[0] + c * q[1] + p[1]);
    }
    return a / pts.length;
  }

  // Nelder-Mead simplex (standard coefficients 1, 2, 0.5, 0.5). Minimises fn. path = best vertex after each iteration.
  function nelderMead(fn, x0, o) {
    o = o || {};
    var n = x0.length, step = o.step || 2.5, maxEval = o.maxEval || 200 * n, tolX = o.tolX || 1e-3, tolF = o.tolF || 1e-5;
    var evals = 0, i, j;
    function F(x) { evals++; return fn(x); }
    function mk(x) { return { x: x, f: F(x) }; }
    var S = [mk(x0.slice())];
    for (i = 0; i < n; i++) { var xi = x0.slice(); xi[i] += step; S.push(mk(xi)); }
    var path = [x0.slice()];
    function comb(a, b, t) { return a.map(function (v, k) { return v + t * (b[k] - v); }); } // a + t(b - a)
    while (evals < maxEval) {
      S.sort(function (p, q) { return p.f - q.f; });
      path.push(S[0].x.slice());
      var dx = 0, df = 0;
      for (i = 1; i <= n; i++) {
        df = Math.max(df, Math.abs(S[i].f - S[0].f));
        for (j = 0; j < n; j++) dx = Math.max(dx, Math.abs(S[i].x[j] - S[0].x[j]));
      }
      if (dx <= tolX && df <= tolF) break;
      var c = new Array(n).fill(0);
      for (i = 0; i < n; i++) for (j = 0; j < n; j++) c[j] += S[i].x[j] / n;
      var w = S[n], xr = comb(c, w.x, -1), fr = F(xr);
      if (fr < S[0].f) {
        var xe = comb(c, w.x, -2), fe = F(xe);
        S[n] = fe < fr ? { x: xe, f: fe } : { x: xr, f: fr };
      } else if (fr < S[n - 1].f) {
        S[n] = { x: xr, f: fr };
      } else {
        var shrink = false;
        if (fr < w.f) {
          var xo = comb(c, xr, 0.5), fo = F(xo);
          if (fo <= fr) S[n] = { x: xo, f: fo }; else shrink = true;
        } else {
          var xi2 = comb(c, w.x, 0.5), fi = F(xi2);
          if (fi < w.f) S[n] = { x: xi2, f: fi }; else shrink = true;
        }
        if (shrink) for (i = 1; i <= n; i++) S[i] = mk(comb(S[0].x, S[i].x, 0.5));
      }
    }
    S.sort(function (p, q) { return p.f - q.f; });
    return { x: S[0].x, f: S[0].f, evals: evals, path: path };
  }

  // One TCBC start: random initial guess in +-RANGE, maximise mean uptake.
  function runStart(pet, pts, r) {
    var x0 = [(r() * 2 - 1) * RANGE, (r() * 2 - 1) * RANGE, (r() * 2 - 1) * RANGE];
    var res = nelderMead(function (p) { return -meanUptake(pet, pts, p); }, x0);
    return { x0: x0, x: res.x, f: -res.f, evals: res.evals, path: res.path };
  }
  function summarize(starts) {
    var best = starts[0], evals = 0, i;
    for (i = 0; i < starts.length; i++) { evals += starts[i].evals; if (starts[i].f > best.f) best = starts[i]; }
    var near = 0;
    for (i = 0; i < starts.length; i++) {
      var s = starts[i];
      if (Math.hypot(s.x[0] - best.x[0], s.x[1] - best.x[1]) <= 1 && Math.abs(s.x[2] - best.x[2]) <= 1) near++;
    }
    return { best: best, near: near, total: starts.length, evals: evals };
  }
  function multiStart(pet, pts, seed, n) {
    var r = rng(seed || 7), out = [];
    for (var i = 0; i < (n || N_STARTS); i++) out.push(runStart(pet, pts, r));
    var s = summarize(out); s.starts = out; return s;
  }
  function poseError(est, truth) {                             // est and truth are {tx,ty,th}
    return { mm: Math.hypot(est.tx - truth.tx, est.ty - truth.ty), deg: Math.abs(est.th - truth.th) };
  }
  function randomMotion(seed) {                                // "typical" head motion for the demo
    var r = rng(seed), sg = function () { return r() < 0.5 ? -1 : 1; };
    return { tx: sg() * (4 + 8 * r()), ty: sg() * (3 + 7 * r()), th: sg() * (2 + 6 * r()) };
  }

  /* ---------- text ---------- */
  var MIN = '−';
  var T = {
    en: {
      title: 'TCBC: align PET to MR by tracer uptake', lang: '中文',
      tabTry: 'Try it', tabEv: 'Evidence',
      intro: 'A schematic head, not patient data. The PET frame has moved. The amber outline is the white-matter mask from the MR image. TCBC moves the mask until the mean PET uptake inside it is as high as possible, because white matter shows high, uniform non-specific tracer binding.',
      motion: 'New head motion', run: 'Run TCBC', running: 'Running…', reset: 'Reset mask', truth: 'Show true position',
      dx: 'Mask shift x', dy: 'Mask shift y', rot: 'Mask rotation', noise: 'PET noise',
      rUp: 'Mean uptake in mask', rOff: 'Mask offset', rErr: 'Error vs true motion', rNear: 'Starts near the best', rEv: 'Objective evaluations',
      mm: 'mm', pct: '%',
      noteTry: 'Drag the sliders and watch the mean uptake: it is highest when the mask sits on the white matter. The ventricles are holes in the mask because the MR segmentation excludes them. With more noise the estimate gets less exact, rotation first.',
      noteRun: 'Result of {n} random starts (within ±10 mm and ±10°), Nelder–Mead on 3 parameters. The paper optimizes 6 (3 translations, 3 rotations) with MATLAB fminsearch from 100 starts, on the last PET frame.',
      stage: 'Axial schematic of a brain PET frame with the white-matter mask outline',
      evHead: 'Age vs early amyloid, 146 cognitively normal adults (OASIS-3, ¹⁸F-florbetapir PET/MR)',
      evCols: ['Region', 'No correction', 'FSMC', 'TCBC'],
      evRows: [['Medial orbitofrontal cortex', '0.378', '0.004', '< 0.001'], ['Precuneus', '0.023', '0.007', '0.004'], ['Early Aβ composite', '0.039', '0.006', '0.002']],
      evCap: 'p-values for the association of age with amyloid uptake (smaller means a stronger association). FSMC is FreeSurfer’s mutual-information co-registration (mri_coreg). Values are from the paper’s abstract; this animation does not reproduce them.',
      cite: 'Chiu SC, Perucho JAU, Fang YHD. Motion correction of simultaneous brain PET/MR images based on tracer uptake characteristics. EJNMMI Physics 12, 75 (2025). CC BY 4.0.',
      st: 'Mask shifted {x} mm in x and {y} mm in y, rotated {r} degrees. Mean uptake in the mask {f}.',
      stRun: 'TCBC finished. Mask offset error {e} millimetres and {d} degrees. Mean uptake {f}.'
    },
    zh: {
      title: 'TCBC：用示蹤劑攝取特性對齊 PET 與 MR', lang: 'EN',
      tabTry: '動手試', tabEv: '論文證據',
      intro: '這是示意用的頭部，不是病人資料。PET 影像已經因頭動而位移，琥珀色輪廓是 MR 切出來的白質 mask。TCBC 會移動 mask，直到 mask 內的平均 PET 攝取最高，因為白質的示蹤劑非特異性結合高而且均勻。',
      motion: '產生新的頭動', run: '執行 TCBC', running: '執行中…', reset: '重設 mask', truth: '顯示真實位置',
      dx: 'Mask 平移 x', dy: 'Mask 平移 y', rot: 'Mask 旋轉', noise: 'PET 雜訊',
      rUp: 'Mask 內平均攝取', rOff: 'Mask 偏移', rErr: '與真實頭動的誤差', rNear: '接近最佳解的起點數', rEv: '目標函數計算次數',
      mm: 'mm', pct: '%',
      noteTry: '拖曳滑桿並看平均攝取：mask 剛好蓋在白質上時最高。腦室是 mask 裡的洞，因為 MR 分割會把它排除。雜訊越大，估計越不準，旋轉最先受影響。',
      noteRun: '結果來自 {n} 組隨機起點（±10 mm、±10° 內），對 3 個參數做 Nelder–Mead。論文則用 MATLAB fminsearch，從 100 組起點優化 6 個參數（3 平移、3 旋轉），使用最後一個 PET frame。',
      stage: '腦部 PET 軸狀切面示意圖與白質 mask 輪廓',
      evHead: '年齡與早期類澱粉蛋白，146 位認知正常成人（OASIS-3，¹⁸F-florbetapir PET/MR）',
      evCols: ['區域', '未校正', 'FSMC', 'TCBC'],
      evRows: [['內側眼眶額葉皮質', '0.378', '0.004', '< 0.001'], ['楔前葉', '0.023', '0.007', '0.004'], ['早期 Aβ 綜合指標', '0.039', '0.006', '0.002']],
      evCap: '年齡與類澱粉蛋白攝取關聯的 p 值（越小代表關聯越強）。FSMC 是 FreeSurfer 以互資訊為基礎的共配準（mri_coreg）。數值取自論文摘要，這個動畫並未重現它們。',
      cite: 'Chiu SC, Perucho JAU, Fang YHD. Motion correction of simultaneous brain PET/MR images based on tracer uptake characteristics. EJNMMI Physics 12, 75 (2025). CC BY 4.0.',
      st: 'Mask 在 x 方向平移 {x} mm，y 方向 {y} mm，旋轉 {r} 度。Mask 內平均攝取 {f}。',
      stRun: 'TCBC 完成。Mask 偏移誤差 {e} 毫米與 {d} 度。平均攝取 {f}。'
    }
  };

  /* ---------- helpers ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); }
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function sg(n, d) { var t = Math.abs(n).toFixed(d); return (n < 0 && +t !== 0 ? MIN : (n > 0 && +t !== 0 ? '+' : '')) + t; }
  var uid = 0;

  var CSS = [
    '.tc{--tc-bg:var(--bg-elevated,#151c28);--tc-fg:var(--text,#e2e6ef);--tc-mute:#8e98ab;--tc-accent:var(--accent,#5eaab4);--tc-amber:#e3b15c;--tc-line:var(--border,rgba(255,255,255,.08));',
    'box-sizing:border-box;margin:1.6rem 0;padding:1rem;border:1px solid var(--tc-line);border-radius:12px;background:var(--tc-bg);color:var(--tc-fg);font:14px/1.5 var(--font-b,"DM Sans",system-ui,sans-serif);}',
    '.tc *{box-sizing:border-box}',
    '.tc-bar{display:flex;align-items:center;justify-content:space-between;gap:.75rem;margin-bottom:.6rem}',
    '.tc-title{font:600 .95rem/1.3 var(--font-d,"Playfair Display",Georgia,serif);letter-spacing:.01em}',
    '.tc button,.tc select,.tc input{font:inherit;color:inherit}',
    '.tc-btn{white-space:nowrap;flex-shrink:0;padding:.32rem .75rem;border:1px solid var(--tc-line);border-radius:999px;background:transparent;cursor:pointer;min-height:36px}',
    '.tc-btn:hover:not(:disabled){border-color:var(--tc-accent)}',
    '.tc-btn:disabled{opacity:.5;cursor:default}',
    '.tc-btn[aria-pressed="true"]{background:var(--tc-accent);border-color:var(--tc-accent);color:#071014;font-weight:600}',
    '.tc :focus-visible{outline:2px solid var(--tc-accent);outline-offset:2px}',
    '.tc-tabs{display:flex;gap:.5rem;margin-bottom:.7rem;flex-wrap:wrap}',
    '.tc-intro{margin:0 0 .8rem;font-size:.85rem;color:var(--tc-mute);max-width:68ch}',
    '.tc-main{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:1rem;align-items:start}',
    '@media (max-width:600px){.tc-main{grid-template-columns:minmax(0,1fr)}}',
    '.tc-stage{position:relative;margin:0;border-radius:8px;background:#05080f;overflow:hidden;aspect-ratio:200/220;max-width:420px;width:100%;justify-self:center}',
    '.tc-stage canvas,.tc-stage svg{position:absolute;inset:0;width:100%;height:100%;display:block}',
    '.tc-row{display:flex;flex-wrap:wrap;gap:.5rem;margin:0 0 .75rem}',
    '.tc-ro{display:grid;grid-template-columns:repeat(auto-fit,minmax(9.5rem,1fr));gap:.5rem;margin:0 0 .8rem;padding:0}',
    '.tc-ro div{padding:.4rem .55rem;border:1px solid var(--tc-line);border-radius:8px;min-width:0}',
    '.tc-ro dt{font-size:.72rem;color:var(--tc-mute);letter-spacing:.02em}',
    '.tc-ro dd{margin:.1rem 0 0;font:500 .9rem/1.3 var(--font-m,"Fira Code",ui-monospace,monospace);font-variant-numeric:tabular-nums}',
    '.tc-ctl{display:grid;gap:.55rem}',
    '.tc-ctl label{display:grid;gap:.2rem;font-size:.8rem;color:var(--tc-mute)}',
    '.tc-ctl label span b{color:var(--tc-fg);font-weight:500;font-variant-numeric:tabular-nums}',
    '.tc-ctl input[type=range]{width:100%;accent-color:var(--tc-accent);min-height:26px}',
    '.tc-note{margin:.85rem 0 0;font-size:.8rem;color:var(--tc-mute);max-width:68ch}',
    '.tc-h3{margin:0 0 .6rem;font:600 .92rem/1.35 var(--font-d,Georgia,serif)}',
    '.tc-tbl{width:100%;border-collapse:collapse;font-size:.85rem}',
    '.tc-tbl th,.tc-tbl td{padding:.4rem .5rem;border-bottom:1px solid var(--tc-line);text-align:right;font-variant-numeric:tabular-nums}',
    '.tc-tbl th:first-child,.tc-tbl td:first-child{text-align:left}',
    '.tc-tbl th{color:var(--tc-mute);font-weight:500;font-size:.78rem}',
    '.tc-tbl td:last-child{color:var(--tc-accent);font-weight:600}',
    '.tc-ev a{color:var(--tc-accent)}',
    '.tc-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
    '.tc[hidden],.tc [hidden]{display:none!important}'
  ].join('');
  function injectStyle() {
    if (document.getElementById('tc-style')) return;
    var st = h('style', { id: 'tc-style' }); st.textContent = CSS; document.head.appendChild(st);
  }

  // PET value -> RGB ramp (dark, teal, pale)
  var RAMP = [[0, 5, 8, 15], [0.45, 38, 110, 120], [0.85, 150, 215, 220], [1.1, 240, 253, 255]];
  function colour(v) {
    if (v <= RAMP[0][0]) return RAMP[0].slice(1);
    for (var i = 1; i < RAMP.length; i++) if (v <= RAMP[i][0]) {
      var a = RAMP[i - 1], b = RAMP[i], t = (v - a[0]) / (b[0] - a[0]);
      return [a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2]), a[3] + t * (b[3] - a[3])];
    }
    return RAMP[RAMP.length - 1].slice(1);
  }

  /* ---------- widget ---------- */
  function mount(host) {
    if (host.__tc) return host.__tc;
    injectStyle();
    var id = 'tc' + (++uid);
    var langAttr = host.getAttribute('data-lang'), anc = host.closest ? host.closest('[lang]') : null;
    var L = /^zh/i.test(langAttr || (anc && anc.getAttribute('lang')) || '') ? 'zh' : 'en';
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var pts = maskPoints(3);
    var st = { tab: 'try', noise: 0, seed: 11, motion: { tx: 9, ty: -6, th: 5 }, mask: { tx: 0, ty: 0, th: 0 }, truth: false, running: false, result: null };
    var pet = makePet(st.motion, st.noise, st.seed), raf = 0, runTok = 0, srTimer = 0;
    function tx(k, v) { var o = T[L][k]; if (v) for (var n in v) o = o.replace('{' + n + '}', v[n]); return o; }

    host.classList.add('tc'); host.innerHTML = '';
    var title = h('span', { class: 'tc-title' }), langBtn = h('button', { type: 'button', class: 'tc-btn' });
    var bar = h('div', { class: 'tc-bar' }, [title, langBtn]);
    var tTry = h('button', { type: 'button', class: 'tc-btn' }), tEv = h('button', { type: 'button', class: 'tc-btn' });
    var tabs = h('div', { class: 'tc-tabs', role: 'group' }, [tTry, tEv]);

    /* stage: canvas for PET, SVG overlay for mask outlines */
    var cv = h('canvas', { width: FOV.w, height: FOV.h, role: 'img' });
    var svg = s('svg', { viewBox: FOV.x0 + ' ' + FOV.y0 + ' ' + FOV.w + ' ' + FOV.h, 'aria-hidden': 'true' });
    function ellEl(e, attrs) {
      var el = s('ellipse', { cx: e.cx, cy: e.cy, rx: e.rx, ry: e.ry, transform: 'rotate(' + (e.rot / D2R).toFixed(2) + ' ' + e.cx + ' ' + e.cy + ')' });
      for (var k in attrs) el.setAttribute(k, attrs[k]);
      return el;
    }
    // Outline of the union (main ellipse + lobes): stroke every ellipse, then hide whatever lies inside the union.
    var union = [PH.wm, PH.lobes[0], PH.lobes[1]], defs = s('defs', {}), mk = s('mask', { id: id + 'm', maskUnits: 'userSpaceOnUse', x: FOV.x0, y: FOV.y0, width: FOV.w, height: FOV.h });
    union.forEach(function (e) { mk.appendChild(ellEl(e, { fill: '#fff', stroke: '#fff', 'stroke-width': 2.4 })); });
    union.forEach(function (e) { mk.appendChild(ellEl(e, { fill: '#000', stroke: 'none' })); });
    defs.appendChild(mk); svg.appendChild(defs);
    function maskGroup(stroke, w, dash, op) {
      var g = s('g', { fill: 'none', stroke: stroke, opacity: op || 1 }), ring = s('g', { mask: 'url(#' + id + 'm)', 'stroke-width': w * 2, 'stroke-dasharray': dash || 'none' });
      union.forEach(function (e) { ring.appendChild(ellEl(e, {})); });
      g.appendChild(ring);
      PH.vents.forEach(function (e) { g.appendChild(ellEl(e, { 'stroke-width': w, 'stroke-dasharray': dash || 'none' })); });
      return g;
    }
    var gTruth = maskGroup('#ffffff', 0.8, '3 2.5', 0.85), gMask = maskGroup('var(--tc-amber)', 1.1);
    svg.appendChild(gTruth); svg.appendChild(gMask);
    var stage = h('div', { class: 'tc-stage' }, [cv, svg]);
    var ctx = cv.getContext('2d');

    function paint() {
      var img = ctx.createImageData(pet.W, pet.H), d = img.data;
      for (var k = 0; k < pet.data.length; k++) {
        var c = colour(Math.max(0, pet.data[k]));
        d[4 * k] = c[0]; d[4 * k + 1] = c[1]; d[4 * k + 2] = c[2]; d[4 * k + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    }

    /* controls */
    var bMotion = h('button', { type: 'button', class: 'tc-btn' }), bRun = h('button', { type: 'button', class: 'tc-btn' });
    var bReset = h('button', { type: 'button', class: 'tc-btn' }), bTruth = h('button', { type: 'button', class: 'tc-btn' });
    var btns = h('div', { class: 'tc-row' }, [bRun, bMotion, bReset, bTruth]);
    function ro() { var dt = h('dt'), dd = h('dd'); return { el: h('div', {}, [dt, dd]), dt: dt, dd: dd }; }
    var rUp = ro(), rOff = ro(), rErr = ro(), rNear = ro(), rEv = ro();
    var readouts = h('dl', { class: 'tc-ro' }, [rUp.el, rOff.el, rErr.el, rNear.el, rEv.el]);
    function range(key, min, max, step, val) {
      var inp = h('input', { type: 'range', id: id + key, min: min, max: max, step: step, value: val }), out = h('b'), lab = h('span');
      var top = h('span', {}, []); top.appendChild(lab); top.appendChild(document.createTextNode(' ')); top.appendChild(out);
      return { wrap: h('label', { for: id + key }, [top, inp]), inp: inp, out: out, lab: lab };
    }
    var cX = range('x', -20, 20, 0.5, 0), cY = range('y', -20, 20, 0.5, 0), cR = range('r', -10, 10, 0.5, 0), cN = range('n', 0, 30, 5, 0);
    var ctl = h('div', { class: 'tc-ctl' }, [cX.wrap, cY.wrap, cR.wrap, cN.wrap]);
    var right = h('div', {}, [btns, readouts, ctl]);
    var main = h('div', { class: 'tc-main' }, [stage, right]);
    var note = h('div', { class: 'tc-note' }), intro = h('div', { class: 'tc-intro' });
    var panTry = h('div', {}, [intro, main, note]);

    /* evidence pane */
    var evH = h('div', { class: 'tc-h3', role: 'heading', 'aria-level': '3' }), tbl = h('table', { class: 'tc-tbl' }), evCap = h('div', { class: 'tc-note' }), cite = h('div', { class: 'tc-note' });
    var doi = h('a', { href: 'https://doi.org/10.1186/s40658-025-00789-6', target: '_blank', rel: 'noopener', text: 'doi:10.1186/s40658-025-00789-6' });
    var panEv = h('div', { class: 'tc-ev' }, [evH, tbl, evCap, cite]);
    var sr = h('div', { class: 'tc-sr', role: 'status', 'aria-live': 'polite' });
    [bar, tabs, panTry, panEv, sr].forEach(function (n) { host.appendChild(n); });

    function labels() {
      title.textContent = tx('title'); langBtn.textContent = tx('lang'); langBtn.setAttribute('aria-label', L === 'en' ? '切換為中文' : 'Switch to English');
      tTry.textContent = tx('tabTry'); tEv.textContent = tx('tabEv'); tabs.setAttribute('aria-label', tx('title'));
      intro.textContent = tx('intro'); bMotion.textContent = tx('motion'); bRun.textContent = tx(st.running ? 'running' : 'run');
      bReset.textContent = tx('reset'); bTruth.textContent = tx('truth');
      cX.lab.textContent = tx('dx'); cY.lab.textContent = tx('dy'); cR.lab.textContent = tx('rot'); cN.lab.textContent = tx('noise');
      rUp.dt.textContent = tx('rUp'); rOff.dt.textContent = tx('rOff'); rErr.dt.textContent = tx('rErr'); rNear.dt.textContent = tx('rNear'); rEv.dt.textContent = tx('rEv');
      cv.setAttribute('aria-label', tx('stage'));
      evH.textContent = tx('evHead');
      tbl.innerHTML = '';
      var thead = h('thead', {}, [h('tr', {}, T[L].evCols.map(function (c) { return h('th', { scope: 'col', text: c }); }))]);
      var tb = h('tbody', {}, T[L].evRows.map(function (r) { return h('tr', {}, r.map(function (c, i) { return h(i === 0 ? 'th' : 'td', i === 0 ? { scope: 'row', text: c } : { text: c }); })); }));
      tbl.appendChild(thead); tbl.appendChild(tb);
      evCap.textContent = tx('evCap'); cite.textContent = tx('cite') + ' '; cite.appendChild(doi);
      host.setAttribute('lang', L === 'zh' ? 'zh-Hant' : 'en');
    }
    function pose(g, m) { g.setAttribute('transform', 'translate(' + m.tx.toFixed(2) + ' ' + m.ty.toFixed(2) + ') rotate(' + m.th.toFixed(2) + ')'); }
    function values() {
      var m = st.mask, f = meanUptake(pet, pts, [m.tx, m.ty, m.th]);
      pose(gMask, m); pose(gTruth, st.motion); gTruth.style.display = st.truth ? '' : 'none';
      rUp.dd.textContent = f.toFixed(3);
      rOff.dd.textContent = sg(m.tx, 1) + ', ' + sg(m.ty, 1) + ' mm; ' + sg(m.th, 1) + '°';
      var r = st.result;
      rErr.dd.textContent = r ? poseError(m, st.motion).mm.toFixed(1) + ' mm; ' + poseError(m, st.motion).deg.toFixed(1) + '°' : '—';
      rNear.dd.textContent = r ? r.near + ' / ' + r.total : '—';
      rEv.dd.textContent = r ? r.evals.toLocaleString('en-US') : '—';
      cX.out.textContent = sg(m.tx, 1) + ' mm'; cY.out.textContent = sg(m.ty, 1) + ' mm'; cR.out.textContent = sg(m.th, 1) + '°';
      cN.out.textContent = Math.round(st.noise * 100) + '%';
      cX.inp.value = m.tx; cY.inp.value = m.ty; cR.inp.value = m.th;
      bTruth.setAttribute('aria-pressed', st.truth);
      tTry.setAttribute('aria-pressed', st.tab === 'try'); tEv.setAttribute('aria-pressed', st.tab === 'ev');
      panTry.hidden = st.tab !== 'try'; panEv.hidden = st.tab !== 'ev';
      note.textContent = r ? tx('noteRun', { n: r.total }) : tx('noteTry');
      [cX.inp, cY.inp, cR.inp, cN.inp, bMotion, bReset].forEach(function (e) { e.disabled = st.running; });
      bRun.disabled = st.running;
      return f;
    }
    function announce(done) {
      clearTimeout(srTimer);
      srTimer = setTimeout(function () {
        var m = st.mask, f = meanUptake(pet, pts, [m.tx, m.ty, m.th]).toFixed(3);
        if (done) { var e = poseError(m, st.motion); sr.textContent = tx('stRun', { e: e.mm.toFixed(1), d: e.deg.toFixed(1), f: f }); }
        else sr.textContent = tx('st', { x: sg(m.tx, 1), y: sg(m.ty, 1), r: sg(m.th, 1), f: f });
      }, 400);
    }
    function refresh(done) { values(); announce(done); }
    function cancelRun() { runTok++; cancelAnimationFrame(raf); st.running = false; labels(); }
    function setMotion(m) { st.motion = m; pet = makePet(st.motion, st.noise, st.seed); st.result = null; paint(); }

    cX.inp.addEventListener('input', function () { st.mask.tx = +cX.inp.value; st.result = null; refresh(); });
    cY.inp.addEventListener('input', function () { st.mask.ty = +cY.inp.value; st.result = null; refresh(); });
    cR.inp.addEventListener('input', function () { st.mask.th = +cR.inp.value; st.result = null; refresh(); });
    cN.inp.addEventListener('input', function () { st.noise = +cN.inp.value / 100; pet = makePet(st.motion, st.noise, st.seed); st.result = null; paint(); refresh(); });
    bMotion.addEventListener('click', function () { st.seed++; setMotion(randomMotion(st.seed * 7919)); st.mask = { tx: 0, ty: 0, th: 0 }; refresh(); });
    bReset.addEventListener('click', function () { st.mask = { tx: 0, ty: 0, th: 0 }; st.result = null; refresh(); });
    bTruth.addEventListener('click', function () { st.truth = !st.truth; values(); });
    tTry.addEventListener('click', function () { st.tab = 'try'; values(); });
    tEv.addEventListener('click', function () { st.tab = 'ev'; values(); });
    langBtn.addEventListener('click', function () { L = L === 'en' ? 'zh' : 'en'; labels(); values(); announce(!!st.result); });

    function run() {
      cancelRun(); st.running = true; st.result = null; labels(); values();
      var tok = ++runTok, r = rng(st.seed * 31 + 7), all = [], first = true;
      (function chunk() {
        if (tok !== runTok) return;
        for (var i = 0; i < 10 && all.length < N_STARTS; i++) all.push(runStart(pet, pts, r));
        if (all.length < N_STARTS) { setTimeout(chunk, 0); return; }
        var sum = summarize(all), best = sum.best, path = best.path, fin = { tx: best.x[0], ty: best.x[1], th: best.x[2] };
        function finish() {
          st.mask = fin; st.running = false; st.result = { near: sum.near, total: sum.total, evals: sum.evals };
          labels(); values(); announce(true);
        }
        if (reduce) { finish(); return; }
        var frames = [], step = Math.max(1, Math.floor(path.length / 70));
        for (var k = 0; k < path.length; k += step) frames.push(path[k]);
        frames.push(best.x);
        var t0 = 0, DUR = 2600;
        function play(ts) {
          if (tok !== runTok) return;
          if (!t0) t0 = ts;
          var u = Math.min(1, (ts - t0) / DUR), pos = u * (frames.length - 1), i0 = Math.floor(pos), fr = pos - i0;
          var a = frames[i0], b = frames[Math.min(frames.length - 1, i0 + 1)];
          st.mask = { tx: a[0] + fr * (b[0] - a[0]), ty: a[1] + fr * (b[1] - a[1]), th: a[2] + fr * (b[2] - a[2]) };
          values();
          if (u < 1) raf = requestAnimationFrame(play); else finish();
        }
        raf = requestAnimationFrame(play);
      })();
    }
    bRun.addEventListener('click', run);

    labels(); paint(); values(); announce();
    var api = {
      state: st, run: run, refresh: refresh,
      destroy: function () { cancelRun(); host.__tc = null; }
    };
    host.__tc = api; return api;
  }

  function mountAll() {
    var list = document.querySelectorAll('[data-widget="tcbc-motion"]');
    for (var i = 0; i < list.length; i++) mount(list[i]);
  }

  return {
    mount: mount, mountAll: mountAll,
    math: {
      PH: PH, FOV: FOV, VAL: VAL, N_STARTS: N_STARTS, RANGE: RANGE,
      inWM: inWM, inBrain: inBrain, inVent: inVent, buildRef: buildRef, sample: sample, xform: xform, invXform: invXform,
      makePet: makePet, maskPoints: maskPoints, meanUptake: meanUptake, nelderMead: nelderMead,
      runStart: runStart, multiStart: multiStart, summarize: summarize, poseError: poseError, randomMotion: randomMotion, rng: rng
    }
  };
});
