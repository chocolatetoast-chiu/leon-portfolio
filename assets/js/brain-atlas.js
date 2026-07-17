/* Procedural 3D brain atlas (Three.js CDN) — links to Quantification Console */
(function () {
  'use strict';

  var mount = document.getElementById('brainMount');
  if (!mount) return;

  var reduced =
    window.Instruments && Instruments.prefersReducedMotion && Instruments.prefersReducedMotion();
  var hasWebGL = (function () {
    try {
      var c = document.createElement('canvas');
      return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  })();

  if (!hasWebGL || typeof THREE === 'undefined') {
    mount.setAttribute('data-brain', 'fallback');
    document.documentElement.classList.add('brain-fallback');
    return;
  }
  /* reduced-motion: still show a static 3D frame (no RAF spin / no drag loop) */
  var staticOnly = !!reduced;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0.35, 0.15, 3.4);

  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  mount.appendChild(renderer.domElement);
  renderer.domElement.id = 'brainCanvas';

  var amb = new THREE.AmbientLight(0x5eaab4, 0.55);
  scene.add(amb);
  var key = new THREE.DirectionalLight(0xffffff, 0.65);
  key.position.set(2, 3, 4);
  scene.add(key);
  var rim = new THREE.DirectionalLight(0x5eaab4, 0.35);
  rim.position.set(-3, -1, -2);
  scene.add(rim);

  var group = new THREE.Group();
  scene.add(group);

  var matWire = new THREE.MeshBasicMaterial({
    color: 0x5eaab4,
    wireframe: true,
    transparent: true,
    opacity: 0.22
  });
  var matFill = new THREE.MeshStandardMaterial({
    color: 0x1a3038,
    emissive: 0x0a1a20,
    metalness: 0.2,
    roughness: 0.65,
    transparent: true,
    opacity: 0.85
  });

  function lobe(sx, sy, sz, x, y, z, rx, ry, rz) {
    var geo = new THREE.SphereGeometry(1, 28, 20);
    var mesh = new THREE.Mesh(geo, matFill.clone());
    mesh.scale.set(sx, sy, sz);
    mesh.position.set(x, y, z);
    if (rx || ry || rz) mesh.rotation.set(rx || 0, ry || 0, rz || 0);
    var wire = new THREE.Mesh(geo, matWire.clone());
    wire.scale.copy(mesh.scale);
    wire.position.copy(mesh.position);
    wire.rotation.copy(mesh.rotation);
    group.add(mesh);
    group.add(wire);
    return mesh;
  }

  var regions = {
    frontal: lobe(0.72, 0.55, 0.62, -0.55, 0.12, 0.1, 0.2, 0, 0.15),
    parietal: lobe(0.55, 0.48, 0.55, 0.15, 0.28, 0.05, -0.1, 0, 0),
    occipital: lobe(0.42, 0.4, 0.45, 0.72, 0.05, -0.05, 0, 0.2, 0),
    temporal: lobe(0.55, 0.35, 0.48, -0.15, -0.35, 0.35, 0.4, 0.1, 0),
    cerebellum: lobe(0.4, 0.28, 0.38, 0.45, -0.55, -0.15, 0.3, 0, 0),
    midline: lobe(0.28, 0.45, 0.35, 0.05, 0.0, -0.05, 0, 0, 0)
  };

  // Soft particle field around brain
  var pCount = 80;
  var pGeo = new THREE.BufferGeometry();
  var positions = new Float32Array(pCount * 3);
  for (var i = 0; i < pCount; i++) {
    var th = Math.random() * Math.PI * 2;
    var ph = Math.acos(2 * Math.random() - 1);
    var r = 1.4 + Math.random() * 0.9;
    positions[i * 3] = r * Math.sin(ph) * Math.cos(th);
    positions[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.7;
    positions[i * 3 + 2] = r * Math.cos(ph);
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  var pMat = new THREE.PointsMaterial({
    color: 0x5eaab4,
    size: 0.03,
    transparent: true,
    opacity: 0.45
  });
  group.add(new THREE.Points(pGeo, pMat));

  var activeRegion = 'global';
  var baseEmissive = 0x0a1a20;
  var hotEmissive = 0x2a6a72;

  function setRegion(id) {
    activeRegion = id || 'global';
    Object.keys(regions).forEach(function (key) {
      var m = regions[key];
      var on =
        activeRegion === 'global' ||
        activeRegion === 'cortex' ||
        key === activeRegion ||
        (activeRegion === 'cortex' && key !== 'cerebellum');
      m.material.emissive.setHex(on && activeRegion !== 'global' ? hotEmissive : baseEmissive);
      m.material.opacity = on ? 0.9 : 0.45;
    });
    if (activeRegion === 'global') {
      Object.keys(regions).forEach(function (key) {
        regions[key].material.emissive.setHex(hotEmissive);
        regions[key].material.opacity = 0.88;
      });
    }
  }

  window.BrainAtlas = {
    setRegion: setRegion,
    ready: true
  };

  // Pointer rotate
  var dragging = false;
  var didDrag = false;
  var prevX = 0;
  var prevY = 0;
  var targetRotY = -0.35;
  var targetRotX = 0.15;
  group.rotation.y = targetRotY;
  group.rotation.x = targetRotX;

  function onDown(e) {
    dragging = true;
    didDrag = false;
    prevX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    prevY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
  }
  function onMove(e) {
    if (!dragging) return;
    var x = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    var y = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    var dx = x - prevX;
    var dy = y - prevY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didDrag = true;
    targetRotY += dx * 0.005;
    targetRotX += dy * 0.004;
    targetRotX = Math.max(-0.6, Math.min(0.6, targetRotX));
    prevX = x;
    prevY = y;
  }
  function onUp() {
    dragging = false;
  }

  if (!staticOnly) {
    renderer.domElement.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    renderer.domElement.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
  }

  // Click lobes → console stage
  var raycaster = new THREE.Raycaster();
  var pointer = new THREE.Vector2();
  var regionToStage = {
    frontal: 'segment',
    parietal: 'segment',
    occipital: 'validate',
    temporal: 'quantify',
    midline: 'coreg',
    cerebellum: 'coreg'
  };

  renderer.domElement.addEventListener('click', function (e) {
    if (didDrag) {
      didDrag = false;
      return;
    }
    var rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    var meshes = Object.keys(regions).map(function (k) {
      return regions[k];
    });
    var hits = raycaster.intersectObjects(meshes);
    if (!hits.length) return;
    var hit = hits[0].object;
    var found = null;
    Object.keys(regions).forEach(function (k) {
      if (regions[k] === hit) found = k;
    });
    if (found && window.QuantConsole && QuantConsole.setStage) {
      QuantConsole.setStage(regionToStage[found] || 'segment');
    }
  });

  function resize() {
    var parent = mount.parentElement || mount;
    var w = parent.clientWidth;
    var h = parent.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  var raf;
  var visible = true;
  function loop() {
    if (!visible || staticOnly) return;
    group.rotation.y += dragging ? 0 : 0.0022;
    group.rotation.y += (targetRotY - group.rotation.y) * 0.08;
    group.rotation.x += (targetRotX - group.rotation.x) * 0.08;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }

  var obs = new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    if (visible && !staticOnly) loop();
    else cancelAnimationFrame(raf);
  });
  obs.observe(mount.parentElement || mount);

  window.addEventListener('resize', resize);
  resize();
  setRegion('global');
  if (staticOnly) {
    renderer.render(scene, camera);
  } else {
    loop();
  }
})();
