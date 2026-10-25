/*! mri-less-amyloid.js v0.1.0
 * Dependency-free interactive explainer of MRI-less amyloid PET quantification (Centiloid).
 * Mount: <div data-widget="mri-less-amyloid" data-lang="en|zh-Hant"></div>
 * Schematic 2-D cortex slice, NOT patient data. Source: Chiu, Lin, McConathy, Lin, Fang,
 * EJNMMI Physics 13:37 (2026), doi:10.1186/s40658-026-00854-8.
 * Teaching model: a 3 mm gray-matter ribbon over folded white matter, PET blurred to 6 mm FWHM,
 * Centiloid = 188.22 x SUVR - 189.16 (paper Eq. 1). The reader slides the cortical outline into
 * white matter and watches the Centiloid rise. The slide is set by hand; it is not the output of
 * any real model. The Evidence tab shows the paper's published results.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MriLessAmyloid = api;
  if (typeof document !== 'undefined') {
    var boot = function () { api.mountAll(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  /* ---------- model (pure functions, unit-tested in test_math.cjs) ---------- */
  var G = { cell: 0.5, wmm: 40, hmm: 44, period: 10, amp: 18, base: 36, pw: 0.4, gm: 3, skull: 5, roiTop: 6, roiBot: 42 };
  G.W = Math.round(G.wmm / G.cell); G.H = Math.round(G.hmm / G.cell);
  var VAL = { wm: 1.5, csf: 0.15, bone: 0.1 };                 // SUVR units (cerebellum reference = 1)
  var FWHM = 6;                                                 // mm, as in the paper's harmonised PET
  var CL_A = 188.22, CL_B = 189.16, CUT = 20, GZ = [0, 40];     // paper Eq. 1, cutoff, gray zone
  var GM_RANGE = [1.0, 1.5], SLIP_MAX = 1.5;

  function wmTop(x) {                                           // y (mm, pointing down) of the white-matter surface
    var ph = (((x - 6) % G.period) + G.period) % G.period / G.period;
    return G.base - G.amp * Math.pow(Math.max(0, Math.cos(2 * Math.PI * ph)), G.pw);
  }
  var sdCache = null;
  function signedDist() {                                       // distance to the WM surface; negative inside WM
    if (sdCache) return sdCache;
    var W = G.W, H = G.H, cur = [], x, i, j, k;
    for (x = -10; x <= G.wmm + 10; x += 0.2) cur.push([x, wmTop(x)]);
    var sd = new Float32Array(W * H);
    for (j = 0; j < H; j++) for (i = 0; i < W; i++) {
      var px = (i + 0.5) * G.cell, py = (j + 0.5) * G.cell, m = 1e9;
      for (k = 0; k < cur.length; k++) {
        var dx = cur[k][0] - px; if (dx > 12 || dx < -12) continue;
        var dy = cur[k][1] - py, d = dx * dx + dy * dy; if (d < m) m = d;
      }
      m = Math.sqrt(m); sd[j * W + i] = py > wmTop(px) ? -m : m;
    }
    sdCache = sd; return sd;
  }
  function sdAt(x, y) {                                        // bilinear sample of the signed distance (mm)
    var sd = signedDist(), W = G.W, H = G.H, gx = x / G.cell - 0.5, gy = y / G.cell - 0.5;
    var i0 = Math.max(0, Math.min(W - 2, Math.floor(gx))), j0 = Math.max(0, Math.min(H - 2, Math.floor(gy))), fx = Math.max(0, Math.min(1, gx - i0)), fy = Math.max(0, Math.min(1, gy - j0));
    return (sd[j0 * W + i0] * (1 - fx) + sd[j0 * W + i0 + 1] * fx) * (1 - fy) + (sd[(j0 + 1) * W + i0] * (1 - fx) + sd[(j0 + 1) * W + i0 + 1] * fx) * fy;
  }
  function tissue(k) {                                          // 0 bone, 1 csf, 2 gm, 3 wm
    var sd = signedDist(), y = (Math.floor(k / G.W) + 0.5) * G.cell;
    if (y < G.skull) return 0;
    if (sd[k] <= 0) return 3;
    return sd[k] <= G.gm ? 2 : 1;
  }
  function labelImage(gm) {
    var n = G.W * G.H, out = new Float32Array(n), v = [VAL.bone, VAL.csf, gm, VAL.wm];
    for (var k = 0; k < n; k++) out[k] = v[tissue(k)];
    return out;
  }
  function blur(src, W, H, sigmaCells) {
    var rad = Math.ceil(3 * sigmaCells), kk = [], sum = 0, i, x, y, j;
    for (i = -rad; i <= rad; i++) { var g = Math.exp(-i * i / (2 * sigmaCells * sigmaCells)); kk.push(g); sum += g; }
    for (i = 0; i < kk.length; i++) kk[i] /= sum;
    var tmp = new Float32Array(W * H), out = new Float32Array(W * H);
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      var a = 0; for (j = -rad; j <= rad; j++) { var xx = x + j; xx = xx < 0 ? 0 : xx > W - 1 ? W - 1 : xx; a += kk[j + rad] * src[y * W + xx]; }
      tmp[y * W + x] = a;
    }
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      var b = 0; for (j = -rad; j <= rad; j++) { var yy = y + j; yy = yy < 0 ? 0 : yy > H - 1 ? H - 1 : yy; b += kk[j + rad] * tmp[yy * W + x]; }
      out[y * W + x] = b;
    }
    return out;
  }
  var basis = null;                                             // PET(gm) = P0 + gm * P1 (blur is linear)
  function petBasis() {
    if (basis) return basis;
    var sig = FWHM / (2 * Math.sqrt(2 * Math.log(2))) / G.cell;
    var p0 = blur(labelImage(0), G.W, G.H, sig), p1g = blur(labelImage(1), G.W, G.H, sig), p1 = new Float32Array(p0.length);
    for (var k = 0; k < p0.length; k++) p1[k] = p1g[k] - p0[k];
    basis = { p0: p0, p1: p1 }; return basis;
  }
  function petImage(gm) {
    var b = petBasis(), out = new Float32Array(b.p0.length);
    for (var k = 0; k < out.length; k++) out[k] = b.p0[k] + gm * b.p1[k];
    return out;
  }
  function inRoi(k, slip) {                                     // gray-matter ribbon whose inner edge reaches `slip` mm into white matter
    var y = (Math.floor(k / G.W) + 0.5) * G.cell; if (y <= G.roiTop || y >= G.roiBot) return false;
    var d = signedDist()[k]; return d > -slip && d <= G.gm;
  }
  var coefCache = {};
  function coef(slip) {                                         // mean PET in ROI = a * gm + b
    var key = slip.toFixed(3); if (coefCache[key]) return coefCache[key];
    var b = petBasis(), a0 = 0, b0 = 0, n = 0;
    for (var k = 0; k < b.p0.length; k++) if (inRoi(k, slip)) { a0 += b.p1[k]; b0 += b.p0[k]; n++; }
    return (coefCache[key] = { a: a0 / n, b: b0 / n, n: n });
  }
  function suvr(gm, slip) { var c = coef(slip); return c.a * gm + c.b; }
  function centiloid(s) { return CL_A * s - CL_B; }
  function measure(gm, slip) {
    var ref = centiloid(suvr(gm, 0)), cur = centiloid(suvr(gm, slip));
    return { ref: ref, cur: cur, diff: cur - ref, refPos: ref > CUT, curPos: cur > CUT, flip: (ref > CUT) !== (cur > CUT), grayRef: ref >= GZ[0] && ref <= GZ[1] };
  }
  function contrast(gm) { return (VAL.wm - gm) / VAL.wm; }      // gray-white uptake difference, fraction of WM

  // Iso-lines of the signed distance (marching squares) -> segments in mm, for crisp outlines.
  function isoSegments(level) {
    var sd = signedDist(), W = G.W, H = G.H, c = G.cell, segs = [];
    function P(i, j) { return sd[j * W + i] - level; }
    function lerpPt(x1, y1, v1, x2, y2, v2) { var t = v1 / (v1 - v2); return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)]; }
    for (var j = 0; j < H - 1; j++) for (var i = 0; i < W - 1; i++) {
      var a = P(i, j), b = P(i + 1, j), d = P(i, j + 1), e = P(i + 1, j + 1);
      var x0 = (i + 0.5) * c, y0 = (j + 0.5) * c, x1 = x0 + c, y1 = y0 + c, pts = [];
      if ((a > 0) !== (b > 0)) pts.push(lerpPt(x0, y0, a, x1, y0, b));
      if ((b > 0) !== (e > 0)) pts.push(lerpPt(x1, y0, b, x1, y1, e));
      if ((e > 0) !== (d > 0)) pts.push(lerpPt(x1, y1, e, x0, y1, d));
      if ((d > 0) !== (a > 0)) pts.push(lerpPt(x0, y1, d, x0, y0, a));
      if (pts.length >= 2) segs.push([pts[0], pts[1]]);
      if (pts.length === 4) segs.push([pts[2], pts[3]]);
    }
    return segs.filter(function (s2) { return s2[0][1] > G.roiTop && s2[0][1] < G.roiBot; });
  }

  /* ---------- text (every user-visible string, both languages) ---------- */
  var MIN = '−';
  var T = {
    en: {
      title: 'Measuring amyloid PET without MRI', lang: '中文', tabTry: 'Try it', tabEv: 'Paper results',
      intro: 'A schematic slice of cortex, not patient data. Centiloid is measured inside the cortical gray matter, a ribbon only 2 to 3 mm thick. An MRI shows where it is. Without one, the outline can reach into the white matter underneath, which holds more tracer, and the Centiloid goes up.',
      vPet: 'PET', vCt: 'CT', vMr: 'MRI', play: 'Show it', stop: 'Stop', reset: 'Back to MRI outline',
      gm: 'Amyloid in cortex (gray-matter SUVR)', slip: 'Outline reaches into white matter',
      rRef: 'Centiloid, MRI outline', rCur: 'Centiloid, this outline', rDiff: 'Difference', rCall: 'Call at 20 (MRI → this)', rCon: 'Gray vs white on PET',
      pos: 'positive', neg: 'negative', flip: 'call flips', lower: 'gray matter lower', equal: 'about equal', to: 'to',
      axis: 'Centiloid', cut: 'cutoff 20', gz: 'gray zone 0 to 40', mrMark: 'MRI', curMark: 'this',
      legRef: 'MRI outline', legCur: 'region used for Centiloid',
      viewPet: 'Amyloid PET, blurred to 6 mm like the training data. Dark ribbon = cortex, bright = white matter.',
      viewCt: 'CT: bone and fluid show the anatomy, and CT contrast does not depend on the tracer. Gray and white matter look almost the same.',
      viewMr: 'MRI (T1): white matter bright, gray matter gray. This is the outline the Centiloid reference uses.',
      note: 'Drag the amyloid slider up and the gray matter on PET gets closer to white matter, so the edge is harder to see. Then widen the outline: it takes in white matter, which holds more tracer and sits farther from the fluid at the brain surface, so the Centiloid rises. Near the cutoff of 20 that can change the call. Toy model: 2-D, no noise, white matter set to SUVR 1.5, reference region fixed at 1. You set the outline by hand; it is not the output of any real model. Centiloid = 188.22 × SUVR − 189.16 (paper Eq. 1).',
      stage: 'Schematic cortex slice with the cortical outline',
      evHead: 'External test on 424 PET/CT scans (OASIS-3). Reference: MRI with FreeSurfer.',
      evMae: 'Mean absolute error (Centiloid, lower is better)', evEq: 'Equivalence test: 95% CI of the mean difference vs MRI, margin ±5',
      evGz: 'Gray zone, 0 to 40 Centiloid (n = 93)', evCols: ['Method', 'Sensitivity', 'Specificity', 'Accuracy'],
      mPc: 'PET/CT model', mPo: 'PET-only model', mRp: 'rPOP (template)', pass: 'inside ±5', fail: 'outside',
      evCap: 'Both deep-learning models are nnU-Net networks trained on 2774 ADNI PET/MRI pairs. ADNI has no CT, so the PET/CT model was trained with synthetic CT made from each T1 MRI. The PET/CT model had R² = 0.96 and, in the gray zone, Cohen’s kappa = 0.79. rPOP warps the PET to a template. The ±5 margin reflects how much published cutoffs vary. The external test came from a single institution. Numbers are from the paper; this widget does not reproduce them.',
      cite: 'Chiu SC, Lin YC, McConathy J, Lin SY, Fang YHD. Amyloid PET quantification with deep learning segmentation models without MRI. EJNMMI Physics 13, 37 (2026).',
      st: 'Gray matter SUVR {g}. Outline reaches {s} millimetres into white matter. Centiloid {c} against {r} with the MRI outline, difference {d}.'
    },
    zh: {
      title: '沒有 MRI，怎麼量 amyloid PET', lang: 'EN', tabTry: '動手試', tabEv: '論文結果',
      intro: '這是示意用的皮質切片，不是病人資料。Centiloid 是在皮質灰質裡量的，灰質只有 2 到 3 mm 厚。MRI 看得出它在哪裡；沒有 MRI，輪廓可能伸進下面的白質，白質攝取比較高，Centiloid 就跟著變高。',
      vPet: 'PET', vCt: 'CT', vMr: 'MRI', play: '播放示範', stop: '停止', reset: '回到 MRI 輪廓',
      gm: '皮質的類澱粉（灰質 SUVR）', slip: '輪廓伸進白質',
      rRef: 'Centiloid（MRI 輪廓）', rCur: 'Centiloid（目前輪廓）', rDiff: '差值（目前 − MRI）', rCall: '切點 20 的判讀（MRI → 目前）', rCon: 'PET 灰白對比',
      pos: '陽性', neg: '陰性', flip: '判讀翻轉', lower: '灰質低', equal: '幾乎相同', to: '到',
      axis: 'Centiloid', cut: '切點 20', gz: '灰區 0 到 40', mrMark: 'MRI', curMark: '目前',
      legRef: 'MRI 輪廓', legCur: '用來算 Centiloid 的區域',
      viewPet: 'Amyloid PET，模糊到 6 mm，和訓練資料相同。暗的帶子是皮質，亮的是白質。',
      viewCt: 'CT：骨頭和腦脊液顯示解剖構造，CT 的對比和示蹤劑無關。灰質和白質幾乎同色。',
      viewMr: 'MRI（T1）：白質亮、灰質灰。Centiloid 的參考值用的就是這個輪廓。',
      note: '把類澱粉滑桿往上拉，PET 上的灰質越來越接近白質，邊界越難看清。再把輪廓往白質伸，它會包進白質；白質攝取較高，離腦表面的腦脊液也較遠，Centiloid 跟著上升。靠近切點 20 時，判讀可能因此翻轉。玩具模型：2-D、沒有雜訊、白質設為 SUVR 1.5、參考區固定為 1。輪廓由你設定，不是任何真實模型的輸出。Centiloid = 188.22 × SUVR − 189.16（論文 Eq. 1）。',
      stage: '皮質切片示意圖與皮質輪廓',
      evHead: '外部測試：424 組 PET/CT（OASIS-3）。參考標準：MRI 加 FreeSurfer。',
      evMae: '平均絕對誤差（Centiloid，越低越好）', evEq: '等價檢定：與 MRI 平均差值的 95% 信賴區間，邊界 ±5',
      evGz: '灰區，0 到 40 Centiloid（n = 93）', evCols: ['方法', '敏感度', '特異度', '準確度'],
      mPc: 'PET/CT 模型', mPo: 'PET-only 模型', mRp: 'rPOP（樣板法）', pass: '在 ±5 內', fail: '超出',
      evCap: '兩個深度學習模型都是 nnU-Net，用 2774 組 ADNI 的 PET/MRI 訓練。ADNI 沒有 CT，所以 PET/CT 模型用每個 T1 MRI 生成的合成 CT 訓練。PET/CT 模型的 R² = 0.96，灰區的 Cohen’s kappa = 0.79。rPOP 是把 PET 扭到樣板上。±5 的邊界反映文獻切點的差異。外部測試資料來自單一機構。數字取自論文，這個 widget 沒有重現它們。',
      cite: 'Chiu SC, Lin YC, McConathy J, Lin SY, Fang YHD. Amyloid PET quantification with deep learning segmentation models without MRI. EJNMMI Physics 13, 37 (2026).',
      st: '灰質 SUVR {g}，輪廓伸進白質 {s} 毫米。Centiloid {c}，MRI 輪廓為 {r}，差值 {d}。'
    }
  };
  var EV = {                                                    // paper results (research.md rows 15, 17, 20)
    mae: [['mPc', 5.79], ['mPo', 10.80], ['mRp', 14.45]],
    ci: [['mPc', 2.3, 3.7], ['mPo', 10, 11.3], ['mRp', 9.7, 12.7]],
    gz: [['mPc', '100%', '86%', '90%'], ['mPo', '100%', '70%', '80%'], ['mRp', '97%', '57%', '70%']],
    margin: 5
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
  function sgn(n, d) { var t = Math.abs(n).toFixed(d); return (n < 0 && +t !== 0 ? MIN : (n > 0 && +t !== 0 ? '+' : '')) + t; }
  function num(n, d) { var t = Math.abs(n).toFixed(d); return (n < 0 && +t !== 0 ? MIN : '') + t; }
  var uid = 0;

  var CSS = [
    '.mla{--mla-bg:var(--bg-elevated,#151c28);--mla-fg:var(--text,#e2e6ef);--mla-mute:#8e98ab;--mla-accent:var(--accent,#5eaab4);--mla-amber:#e3b15c;--mla-coral:#e07a62;--mla-line:var(--border,rgba(255,255,255,.08));',
    'box-sizing:border-box;margin:1.6rem 0;padding:1rem;border:1px solid var(--mla-line);border-radius:12px;background:var(--mla-bg);color:var(--mla-fg);font:14px/1.5 var(--font-b,"DM Sans",system-ui,sans-serif)}',
    '.mla *{box-sizing:border-box}',
    '.mla-bar{display:flex;align-items:center;justify-content:space-between;gap:.75rem;margin-bottom:.6rem}',
    '.mla-title{font:600 .95rem/1.3 var(--font-d,"Playfair Display",Georgia,serif)}',
    '.mla button,.mla input{font:inherit;color:inherit}',
    '.mla-btn{white-space:nowrap;flex-shrink:0;padding:.32rem .75rem;border:1px solid var(--mla-line);border-radius:999px;background:transparent;cursor:pointer;min-height:36px}',
    '.mla-btn:hover:not(:disabled){border-color:var(--mla-accent)}',
    '.mla-btn[aria-pressed="true"]{background:var(--mla-accent);border-color:var(--mla-accent);color:#071014;font-weight:600}',
    '.mla :focus-visible{outline:2px solid var(--mla-accent);outline-offset:2px}',
    '.mla-row{display:flex;flex-wrap:wrap;gap:.5rem;margin:0 0 .7rem}',
    '.mla-intro{margin:0 0 .8rem;font-size:.85rem;color:var(--mla-mute);max-width:70ch}',
    '.mla-main{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:1rem;align-items:start}',
    '@media (max-width:600px){.mla-main{grid-template-columns:minmax(0,1fr)}}',
    '.mla-stage{position:relative;border-radius:8px;background:#05080f;overflow:hidden;aspect-ratio:40/44;width:100%;max-width:380px;justify-self:center;margin:0 auto}',
    '.mla-sw{display:inline-block;width:14px;height:8px;border-radius:2px;margin-right:-.6rem;align-self:center}.mla-sw-roi{background:rgba(227,177,92,.75)}.mla-sw-ref{border-top:1.5px dashed #fff;height:0}',
    '.mla-stage canvas,.mla-stage svg.mla-ov{position:absolute;inset:0;width:100%;height:100%;display:block}',
    '.mla-cap{font-size:.78rem;color:var(--mla-mute);margin:.45rem 0 0;min-height:2.4em}',
    '.mla-leg{display:flex;gap:1rem;flex-wrap:wrap;font-size:.74rem;color:var(--mla-mute);margin:.3rem 0 .7rem}',
    '.mla-gauge{display:block;width:100%;height:auto;margin:.2rem 0 0}',
    '.mla-sw-gz{background:rgba(227,177,92,.35)}.mla-sw-cut{width:2px;height:12px;background:var(--mla-coral)}',
    '.mla-ro{display:grid;grid-template-columns:repeat(auto-fit,minmax(9.5rem,1fr));gap:.5rem;margin:0 0 .8rem;padding:0}',
    '.mla-ro div{padding:.4rem .55rem;border:1px solid var(--mla-line);border-radius:8px;min-width:0}',
    '.mla-ro dt{font-size:.72rem;color:var(--mla-mute);letter-spacing:.02em}',
    '.mla-ro dd{margin:.1rem 0 0;font:500 .9rem/1.3 var(--font-m,"Fira Code",ui-monospace,monospace);font-variant-numeric:tabular-nums}',
    '.mla-ro .mla-bad{color:var(--mla-coral)}',
    '.mla-ctl{display:grid;gap:.55rem}',
    '.mla-ctl label{display:grid;gap:.2rem;font-size:.8rem;color:var(--mla-mute)}',
    '.mla-ctl label span b{color:var(--mla-fg);font-weight:500;font-variant-numeric:tabular-nums}',
    '.mla-ctl input[type=range]{width:100%;accent-color:var(--mla-accent);min-height:28px}',
    '.mla-note{margin:.85rem 0 0;font-size:.8rem;color:var(--mla-mute);max-width:70ch}',
    '.mla-h3{margin:1rem 0 .4rem;font:600 .9rem/1.35 var(--font-d,Georgia,serif)}',
    '.mla-h3:first-child{margin-top:0}',
    '.mla-chart{display:grid;gap:.45rem;margin:.2rem 0 .4rem}',
    '.mla-cr{display:grid;grid-template-columns:8.5rem minmax(0,1fr) 11.5rem;gap:.6rem;align-items:center;font-size:.82rem}',
    '@media (max-width:480px){.mla-cr{grid-template-columns:6rem minmax(0,1fr);row-gap:.15rem}.mla-cr .mla-cv{grid-column:2}.mla-cr .mla-cv:empty{display:none}}',
    '.mla-cl{color:var(--mla-fg)}.mla-cv{font:500 .8rem/1.2 var(--font-m,monospace);color:var(--mla-fg);white-space:nowrap}',
    '.mla-track{position:relative;display:block;height:14px;border-radius:4px;background:rgba(255,255,255,.04)}',
    '.mla-fill{position:absolute;left:0;top:0;bottom:0;border-radius:4px;background:rgba(142,152,171,.45)}',
    '.mla-fill.mla-good{background:var(--mla-accent)}',
    '.mla-ftrack{background:none;height:18px}.mla-band{position:absolute;top:0;bottom:0;background:rgba(94,170,180,.14);border-left:1.5px dashed var(--mla-coral);border-right:1.5px dashed var(--mla-coral)}',
    '.mla-zero{position:absolute;top:0;bottom:0;border-left:1px dotted var(--mla-mute)}',
    '.mla-seg{position:absolute;top:6px;height:6px;border-radius:3px;min-width:6px}.mla-seg.mla-good{background:var(--mla-accent)}.mla-badseg{background:var(--mla-coral)}',
    '.mla-cv.mla-bad{color:var(--mla-coral)}',
    '.mla-axis{background:none;height:14px;font-size:.7rem;color:var(--mla-mute)}.mla-axis span{position:absolute;transform:translateX(-50%)}',
    '.mla-tbl{width:100%;border-collapse:collapse;font-size:.85rem}',
    '@media (max-width:360px){.mla-tbl{font-size:.74rem}.mla-tbl th,.mla-tbl td{padding:.35rem .25rem}}',
    '.mla-tbl th,.mla-tbl td{padding:.4rem .5rem;border-bottom:1px solid var(--mla-line);text-align:right;font-variant-numeric:tabular-nums}',
    '.mla-tbl th:first-child,.mla-tbl td:first-child{text-align:left}',
    '.mla-tbl thead th{color:var(--mla-mute);font-weight:500;font-size:.78rem}',
    '.mla-tbl tbody tr:first-child td{color:var(--mla-accent);font-weight:600}',
    '.mla-ev a{color:var(--mla-accent)}',
    '.mla-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
    '.mla[hidden],.mla [hidden]{display:none!important}'
  ].join('');
  function injectStyle() {
    if (document.getElementById('mla-style')) return;
    var st = h('style', { id: 'mla-style' }); st.textContent = CSS; document.head.appendChild(st);
  }
  var RAMP = [[0, 5, 8, 15], [0.6, 30, 70, 110], [1.05, 60, 150, 160], [1.4, 170, 225, 205], [1.75, 252, 246, 220]];
  function petColour(v) {
    if (v <= RAMP[0][0]) return RAMP[0].slice(1);
    for (var i = 1; i < RAMP.length; i++) if (v <= RAMP[i][0]) {
      var a = RAMP[i - 1], b = RAMP[i], t = (v - a[0]) / (b[0] - a[0]);
      return [a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2]), a[3] + t * (b[3] - a[3])];
    }
    return RAMP[RAMP.length - 1].slice(1);
  }
  var GREY = { ct: [235, 22, 70, 62], mr: [70, 20, 120, 225] };   // bone, csf, gm, wm (0-255)

  /* ---------- widget ---------- */
  function mount(host) {
    if (host.__mla) return host.__mla;
    injectStyle();
    var id = 'mla' + (++uid);
    var langAttr = host.getAttribute('data-lang'), anc = host.closest ? host.closest('[lang]') : null;
    var L = /^zh/i.test(langAttr || (anc && anc.getAttribute('lang')) || '') ? 'zh' : 'en';
    var reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var st = { tab: 'try', view: 'pet', gm: 1.1, slip: 1.0, playing: false, demoDone: false };
    var raf = 0, srTimer = 0, visible = true, lastTs = 0, phase = 0;
    function tx(k, v) { var o = T[L][k]; if (v) for (var n in v) o = o.split('{' + n + '}').join(v[n]); return o; }

    host.classList.add('mla'); host.innerHTML = '';
    var title = h('span', { class: 'mla-title' }), langBtn = h('button', { type: 'button', class: 'mla-btn' });
    var bar = h('div', { class: 'mla-bar' }, [title, langBtn]);
    var tTry = h('button', { type: 'button', class: 'mla-btn' }), tEv = h('button', { type: 'button', class: 'mla-btn' });
    var tabs = h('div', { class: 'mla-row', role: 'group' }, [tTry, tEv]);

    /* stage: canvas image + SVG outlines (mm coordinates) */
    var cv = h('canvas', { width: G.W, height: G.H, role: 'img' }), ctx = cv.getContext('2d');
    var ov = s('svg', { class: 'mla-ov', viewBox: '0 0 ' + G.wmm + ' ' + G.hmm, preserveAspectRatio: 'none', 'aria-hidden': 'true' });
    function segPath(segs) { var d = ''; segs.forEach(function (q) { d += 'M' + q[0][0].toFixed(2) + ' ' + q[0][1].toFixed(2) + 'L' + q[1][0].toFixed(2) + ' ' + q[1][1].toFixed(2); }); return d; }
    var refD = segPath(isoSegments(0).concat(isoSegments(G.gm)));
    var pRef = s('path', { d: refD, fill: 'none', stroke: '#ffffff', 'stroke-width': 0.35, 'stroke-dasharray': '1.2 0.9', opacity: 0.9 });
    ov.appendChild(pRef);
    var RS = 4, roiCv = h('canvas', { width: G.W * RS, height: G.H * RS, 'aria-hidden': 'true' }), roiCtx = roiCv.getContext('2d');
    var stage = h('div', { class: 'mla-stage' }, [cv, roiCv, ov]);
    var viewCap = h('div', { class: 'mla-cap' });
    var legRef = h('span'), legCur = h('span'), leg = h('div', { class: 'mla-leg' }, [h('span', { class: 'mla-sw mla-sw-roi' }), legCur, h('span', { class: 'mla-sw mla-sw-ref' }), legRef]);
    var bPet = h('button', { type: 'button', class: 'mla-btn' }), bCt = h('button', { type: 'button', class: 'mla-btn' }), bMr = h('button', { type: 'button', class: 'mla-btn' });
    var views = h('div', { class: 'mla-row', role: 'group' }, [bPet, bCt, bMr]);
    var left = h('div', {}, [views, stage, leg, viewCap]);

    /* gauge: Centiloid axis with cutoff and gray zone */
    var GX0 = 14, GX1 = 306, CL0 = -20, CL1 = 100;
    function gx(c) { return GX0 + (Math.max(CL0, Math.min(CL1, c)) - CL0) / (CL1 - CL0) * (GX1 - GX0); }
    var gauge = s('svg', { class: 'mla-gauge', viewBox: '0 0 320 76', role: 'img' });
    var gzR = s('rect', { x: gx(GZ[0]), y: 22, width: gx(GZ[1]) - gx(GZ[0]), height: 16, fill: 'rgba(227,177,92,.16)' });
    var axisL = s('line', { x1: GX0, x2: GX1, y1: 38, y2: 38, stroke: 'var(--mla-mute)', 'stroke-width': 1 });
    var cutL = s('line', { x1: gx(CUT), x2: gx(CUT), y1: 16, y2: 44, stroke: 'var(--mla-coral)', 'stroke-width': 1.5 });
    var tick = function (c) { var g = s('g', {}); g.appendChild(s('line', { x1: gx(c), x2: gx(c), y1: 38, y2: 42, stroke: 'var(--mla-mute)' })); var t = s('text', { x: gx(c), y: 53, 'text-anchor': 'middle', 'font-size': 10, fill: 'var(--mla-mute)' }); t.textContent = c < 0 ? MIN + Math.abs(c) : String(c); g.appendChild(t); return g; };
    var gzT = h('span'), cutT = h('span');
    var gLeg = h('div', { class: 'mla-leg' }, [h('span', { class: 'mla-sw mla-sw-gz' }), gzT, h('span', { class: 'mla-sw mla-sw-cut' }), cutT]);
    var axT = s('text', { x: GX1, y: 70, 'text-anchor': 'end', 'font-size': 10, fill: 'var(--mla-mute)' });
    var mRef = s('g', {}), mCur = s('g', {});
    mRef.appendChild(s('path', { d: 'M0 22 L0 57', stroke: '#fff', 'stroke-width': 1.6, 'stroke-dasharray': '2 1.5' }));
    var mRefT = s('text', { x: -4, y: 67, 'text-anchor': 'end', 'font-size': 10, fill: '#fff' }); mRef.appendChild(mRefT);
    mCur.appendChild(s('path', { d: 'M-4.5 28 L4.5 28 L0 37 Z', fill: 'var(--mla-amber)' }));
    var mCurT = s('text', { x: 6, y: 23, 'text-anchor': 'start', 'font-size': 10, fill: 'var(--mla-amber)' }); mCur.appendChild(mCurT);
    [gzR, axisL, tick(-20), tick(0), tick(20), tick(40), tick(60), tick(80), tick(100), cutL, axT, mRef, mCur].forEach(function (n) { gauge.appendChild(n); });

    function ro() { var dt = h('dt'), dd = h('dd'); return { el: h('div', {}, [dt, dd]), dt: dt, dd: dd }; }
    var rRef = ro(), rCur = ro(), rDiff = ro(), rCall = ro(), rCon = ro();
    var readouts = h('dl', { class: 'mla-ro' }, [rRef.el, rCur.el, rDiff.el, rCall.el, rCon.el]);
    function range(key, min, max, step, val) {
      var inp = h('input', { type: 'range', id: id + key, min: min, max: max, step: step, value: val }), out = h('b'), lab = h('span');
      var top = h('span', {}, []); top.appendChild(lab); top.appendChild(document.createTextNode(' ')); top.appendChild(out);
      return { wrap: h('label', { for: id + key }, [top, inp]), inp: inp, out: out, lab: lab };
    }
    var cG = range('g', GM_RANGE[0], GM_RANGE[1], 0.02, st.gm), cS = range('s', 0, SLIP_MAX, 0.1, st.slip);
    var bPlay = h('button', { type: 'button', class: 'mla-btn' }), bReset = h('button', { type: 'button', class: 'mla-btn' });
    var btns = h('div', { class: 'mla-row' }, [bPlay, bReset]);
    var ctl = h('div', { class: 'mla-ctl' }, [cG.wrap, cS.wrap]);
    var right = h('div', {}, [gauge, gLeg, readouts, btns, ctl]);
    var main = h('div', { class: 'mla-main' }, [left, right]);
    var intro = h('div', { class: 'mla-intro' }), note = h('div', { class: 'mla-note' });
    var panTry = h('div', {}, [intro, main, note]);

    /* evidence pane: three small charts from the paper */
    var evHead = h('div', { class: 'mla-h3', role: 'heading', 'aria-level': '3' });
    var hMae = h('div', { class: 'mla-h3', role: 'heading', 'aria-level': '4' }), maeSvg = h('div', { class: 'mla-chart', role: 'img' });
    var hEq = h('div', { class: 'mla-h3', role: 'heading', 'aria-level': '4' }), eqSvg = h('div', { class: 'mla-chart', role: 'img' });
    var hGz = h('div', { class: 'mla-h3', role: 'heading', 'aria-level': '4' }), tbl = h('table', { class: 'mla-tbl' });
    var evCap = h('div', { class: 'mla-note' }), cite = h('div', { class: 'mla-note' });
    var doi = h('a', { href: 'https://doi.org/10.1186/s40658-026-00854-8', target: '_blank', rel: 'noopener', text: 'doi:10.1186/s40658-026-00854-8' });
    var panEv = h('div', { class: 'mla-ev' }, [evHead, hMae, maeSvg, hEq, eqSvg, hGz, tbl, evCap, cite]);
    var sr = h('div', { class: 'mla-sr', role: 'status', 'aria-live': 'polite' });
    [bar, tabs, panTry, panEv, sr].forEach(function (n) { host.appendChild(n); });

    function svgText(parent, str, at) { var t = s('text', at); t.textContent = str; parent.appendChild(t); return t; }
    function drawEvidence() {
      var name = function (k) { return tx(k); };
      maeSvg.innerHTML = ''; eqSvg.innerHTML = '';
      EV.mae.forEach(function (r, i) {
        var fill = h('span', { class: 'mla-fill' + (i === 0 ? ' mla-good' : '') }); fill.style.width = (r[1] / 16 * 100).toFixed(1) + '%';
        maeSvg.appendChild(h('div', { class: 'mla-cr', 'aria-hidden': 'true' }, [h('span', { class: 'mla-cl', text: name(r[0]) }), h('span', { class: 'mla-track' }, [fill]), h('span', { class: 'mla-cv', text: r[1].toFixed(2) })]));
      });
      maeSvg.setAttribute('aria-label', tx('evMae') + ': ' + EV.mae.map(function (r) { return name(r[0]) + ' ' + r[1].toFixed(2); }).join(', '));
      var lo = -8, hi = 16, pc = function (v) { return ((v - lo) / (hi - lo) * 100).toFixed(2) + '%'; };
      EV.ci.forEach(function (r) {
        var ok = r[1] > -EV.margin && r[2] < EV.margin, band = h('span', { class: 'mla-band' }), z = h('span', { class: 'mla-zero' }), seg = h('span', { class: 'mla-seg' + (ok ? ' mla-good' : ' mla-badseg') });
        band.style.left = pc(-EV.margin); band.style.width = (2 * EV.margin / (hi - lo) * 100).toFixed(2) + '%'; z.style.left = pc(0);
        seg.style.left = pc(r[1]); seg.style.width = ((r[2] - r[1]) / (hi - lo) * 100).toFixed(2) + '%';
        eqSvg.appendChild(h('div', { class: 'mla-cr', 'aria-hidden': 'true' }, [h('span', { class: 'mla-cl', text: name(r[0]) }), h('span', { class: 'mla-track mla-ftrack' }, [band, z, seg]), h('span', { class: 'mla-cv' + (ok ? '' : ' mla-bad'), text: r[1] + ' ' + tx('to') + ' ' + r[2] + ' · ' + tx(ok ? 'pass' : 'fail') })]));
      });
      var axis = h('span', { class: 'mla-track mla-axis' });
      [-5, 0, 5, 10, 15].forEach(function (v) { var t = h('span', { text: v < 0 ? MIN + Math.abs(v) : String(v) }); t.style.left = pc(v); axis.appendChild(t); });
      eqSvg.appendChild(h('div', { class: 'mla-cr', 'aria-hidden': 'true' }, [h('span', { class: 'mla-cl' }), axis, h('span', { class: 'mla-cv' })]));
      eqSvg.setAttribute('aria-label', tx('evEq') + ': ' + EV.ci.map(function (r) { return name(r[0]) + ' ' + r[1] + ' ' + tx('to') + ' ' + r[2]; }).join(', '));
      tbl.innerHTML = '';
      tbl.appendChild(h('thead', {}, [h('tr', {}, T[L].evCols.map(function (c) { return h('th', { scope: 'col', text: c }); }))]));
      tbl.appendChild(h('tbody', {}, EV.gz.map(function (r) { return h('tr', {}, [h('td', { text: name(r[0]) }), h('td', { text: r[1] }), h('td', { text: r[2] }), h('td', { text: r[3] })]); })));
    }

    function labels() {
      title.textContent = tx('title'); langBtn.textContent = tx('lang'); langBtn.setAttribute('aria-label', L === 'en' ? '切換為中文' : 'Switch to English');
      tTry.textContent = tx('tabTry'); tEv.textContent = tx('tabEv'); tabs.setAttribute('aria-label', tx('title'));
      intro.textContent = tx('intro'); note.textContent = tx('note');
      bPet.textContent = tx('vPet'); bCt.textContent = tx('vCt'); bMr.textContent = tx('vMr'); views.setAttribute('aria-label', tx('stage'));
      bPlay.textContent = tx(st.playing ? 'stop' : 'play'); bReset.textContent = tx('reset');
      cG.lab.textContent = tx('gm'); cS.lab.textContent = tx('slip');
      rRef.dt.textContent = tx('rRef'); rCur.dt.textContent = tx('rCur'); rDiff.dt.textContent = tx('rDiff'); rCall.dt.textContent = tx('rCall'); rCon.dt.textContent = tx('rCon');
      gzT.textContent = tx('gz'); cutT.textContent = tx('cut'); axT.textContent = tx('axis'); mRefT.textContent = tx('mrMark'); mCurT.textContent = tx('curMark');
      legRef.textContent = tx('legRef'); legCur.textContent = tx('legCur');
      cv.setAttribute('aria-label', tx('stage'));
      evHead.textContent = tx('evHead'); hMae.textContent = tx('evMae'); hEq.textContent = tx('evEq'); hGz.textContent = tx('evGz');
      evCap.textContent = tx('evCap'); cite.textContent = tx('cite') + ' '; cite.appendChild(doi);
      drawEvidence();
      host.setAttribute('lang', L === 'zh' ? 'zh-Hant' : 'en');
    }
    var lastPaint = '';
    function paint() {
      var key = st.view + (st.view === 'pet' ? st.gm.toFixed(3) : ''); if (key === lastPaint) return; lastPaint = key;
      var img = ctx.createImageData(G.W, G.H), d = img.data, n = G.W * G.H, k, c;
      var pet = st.view === 'pet' ? petImage(st.gm) : null, gr = GREY[st.view];
      for (k = 0; k < n; k++) {
        if (pet) c = petColour(pet[k]); else { var v = gr[tissue(k)]; c = [v, v, v]; }
        d[4 * k] = c[0]; d[4 * k + 1] = c[1]; d[4 * k + 2] = c[2]; d[4 * k + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    }
    var lastRoi = -1;
    function paintRoi() {
      if (st.slip === lastRoi) return; lastRoi = st.slip;
      var w = G.W * RS, hh = G.H * RS, img = roiCtx.createImageData(w, hh), d = img.data, c = G.cell / RS;
      for (var j = 0; j < hh; j++) for (var i = 0; i < w; i++) {
        var y = (j + 0.5) * c; if (y <= G.roiTop || y >= G.roiBot) continue;
        var v = sdAt((i + 0.5) * c, y), k = 4 * (j * w + i);
        if (v > -st.slip && v <= G.gm) { d[k] = 227; d[k + 1] = 177; d[k + 2] = 92; d[k + 3] = 125; }
      }
      roiCtx.putImageData(img, 0, 0);
    }
    function values() {
      var m = measure(st.gm, st.slip);
      paint();
      paintRoi();
      pRef.style.display = st.slip > 0.001 ? '' : 'none';
      mRef.setAttribute('transform', 'translate(' + gx(m.ref).toFixed(1) + ' 0)'); mCur.setAttribute('transform', 'translate(' + gx(m.cur).toFixed(1) + ' 0)');
      mRef.style.display = st.slip > 0.001 ? '' : 'none';
      gauge.setAttribute('aria-label', tx('axis') + ' ' + num(m.cur, 1) + ', ' + tx('mrMark') + ' ' + num(m.ref, 1));
      rRef.dd.textContent = num(m.ref, 1); rCur.dd.textContent = num(m.cur, 1); rDiff.dd.textContent = sgn(m.diff, 1);
      rCall.dd.textContent = tx(m.refPos ? 'pos' : 'neg') + ' → ' + tx(m.curPos ? 'pos' : 'neg') + (m.flip ? ' (' + tx('flip') + ')' : '');
      rCall.dd.className = m.flip ? 'mla-bad' : '';
      var con = contrast(st.gm);
      rCon.dd.textContent = con > 0.02 ? (L === 'zh' ? tx('lower') + ' ' + Math.round(con * 100) + '%' : Math.round(con * 100) + '% ' + tx('lower')) : tx('equal');
      cG.out.textContent = st.gm.toFixed(2); cS.out.textContent = st.slip.toFixed(1) + ' mm';
      cG.inp.value = st.gm; cS.inp.value = st.slip;
      viewCap.textContent = tx(st.view === 'pet' ? 'viewPet' : st.view === 'ct' ? 'viewCt' : 'viewMr');
      [[bPet, 'pet'], [bCt, 'ct'], [bMr, 'mr']].forEach(function (p) { p[0].setAttribute('aria-pressed', st.view === p[1]); });
      tTry.setAttribute('aria-pressed', st.tab === 'try'); tEv.setAttribute('aria-pressed', st.tab === 'ev');
      bPlay.setAttribute('aria-pressed', st.playing); bPlay.textContent = tx(st.playing ? 'stop' : 'play');
      panTry.hidden = st.tab !== 'try'; panEv.hidden = st.tab !== 'ev';
      return m;
    }
    function announce() {
      clearTimeout(srTimer);
      srTimer = setTimeout(function () {
        var m = measure(st.gm, st.slip);
        sr.textContent = tx('st', { g: st.gm.toFixed(2), s: st.slip.toFixed(1), c: num(m.cur, 1), r: num(m.ref, 1), d: sgn(m.diff, 1) });
      }, 400);
    }
    function refresh() { values(); announce(); }

    /* "Show the slip": the outline slides 0 -> 1.5 mm and back, twice, then stops. */
    function loop(ts) {
      raf = 0; if (!st.playing) return;
      if (!visible) { lastTs = 0; return; }
      var dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0; lastTs = ts; phase += dt / 3.2;
      if (phase >= 2) { phase = 0; st.playing = false; st.slip = SLIP_MAX; st.demoDone = true; refresh(); return; }
      var u = phase % 1, tri = u < 0.5 ? u * 2 : 2 - u * 2, e = tri * tri * (3 - 2 * tri);
      st.slip = Math.round(e * SLIP_MAX * 20) / 20; values();
      raf = requestAnimationFrame(loop);
    }
    function play() { if (reduce) return; st.playing = true; phase = 0; lastTs = 0; values(); if (!raf) raf = requestAnimationFrame(loop); }
    function stop() { st.playing = false; if (raf) cancelAnimationFrame(raf); raf = 0; values(); }

    cG.inp.addEventListener('input', function () { st.gm = +cG.inp.value; if (!st.playing) refresh(); });
    cS.inp.addEventListener('input', function () { var v = +cS.inp.value; stop(); st.slip = v; refresh(); });
    bPlay.addEventListener('click', function () { if (st.playing) stop(); else play(); });
    bReset.addEventListener('click', function () { stop(); st.slip = 0; refresh(); });
    [[bPet, 'pet'], [bCt, 'ct'], [bMr, 'mr']].forEach(function (p) { p[0].addEventListener('click', function () { st.view = p[1]; values(); }); });
    tTry.addEventListener('click', function () { st.tab = 'try'; values(); });
    tEv.addEventListener('click', function () { stop(); st.tab = 'ev'; values(); });
    langBtn.addEventListener('click', function () { L = L === 'en' ? 'zh' : 'en'; labels(); values(); announce(); });

    var io = null;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible && st.playing && !raf) { lastTs = 0; raf = requestAnimationFrame(loop); }
        if (visible && !st.demoDone && !st.playing && !reduce && st.tab === 'try') { st.demoDone = true; play(); }
      }, { threshold: 0.35 });
      io.observe(host);
    }

    labels(); values(); announce();
    var api = {
      state: st, refresh: refresh, play: play, stop: stop,
      destroy: function () { stop(); if (io) io.disconnect(); clearTimeout(srTimer); host.__mla = null; }
    };
    host.__mla = api; return api;
  }

  function mountAll() {
    var list = document.querySelectorAll('[data-widget="mri-less-amyloid"]');
    for (var i = 0; i < list.length; i++) mount(list[i]);
  }

  return {
    mount: mount, mountAll: mountAll,
    math: {
      G: G, VAL: VAL, FWHM: FWHM, CL_A: CL_A, CL_B: CL_B, CUT: CUT, GZ: GZ, GM_RANGE: GM_RANGE, SLIP_MAX: SLIP_MAX, EV: EV,
      wmTop: wmTop, signedDist: signedDist, sdAt: sdAt, tissue: tissue, labelImage: labelImage, blur: blur, petImage: petImage,
      inRoi: inRoi, coef: coef, suvr: suvr, centiloid: centiloid, measure: measure, contrast: contrast, isoSegments: isoSegments
    }
  };
});
