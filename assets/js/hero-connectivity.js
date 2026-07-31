/* 2D connectivity field + cursor meteor trails */
(function () {
  'use strict';

  var canvas = document.getElementById('heroConnectivity');
  var hero = canvas && canvas.closest('.hero');
  if (!canvas || !hero) return;

  var context = canvas.getContext('2d');
  var reduced =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var width = 0;
  var height = 0;
  var dpr = 1;
  var nodes = [];
  var ambientStars = [];
  var meteors = [];
  var pointer = { x:0, y:0, previousX:0, previousY:0, active:false };
  var lastFrame = 0;

  function resize() {
    var rect = hero.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildNodes();
  }

  function buildNodes() {
    nodes = [];
    ambientStars = [];
    var count = width < 760 ? 16 : 24;
    for (var i = 0; i < count; i++) {
      var angle = (i / count) * Math.PI * 2 + (i % 3) * 0.17;
      var radiusX = width * (0.18 + (i % 5) * 0.018);
      var radiusY = height * (0.24 + (i % 4) * 0.018);
      nodes.push({
        x:width * (width < 760 ? 0.5 : 0.76) + Math.cos(angle) * radiusX,
        y:height * (width < 760 ? 0.72 : 0.5) + Math.sin(angle) * radiusY,
        baseX:0,
        baseY:0,
        phase:i * 0.74,
        drift:8 + (i % 5) * 2.2,
        size:0.9 + (i % 4) * 0.34
      });
      nodes[i].baseX = nodes[i].x;
      nodes[i].baseY = nodes[i].y;
    }

    var starCount = width < 760 ? 28 : 42;
    for (var j = 0; j < starCount; j++) {
      ambientStars.push({
        baseX:width * (
          width < 760
            ? 0.08 + Math.random() * 0.84
            : 0.46 + Math.random() * 0.52
        ),
        baseY:height * (0.08 + Math.random() * 0.84),
        driftX:7 + Math.random() * 20,
        driftY:5 + Math.random() * 17,
        speed:0.00007 + Math.random() * 0.00016,
        phase:Math.random() * Math.PI * 2,
        size:0.45 + Math.random() * 1.25,
        alpha:0.1 + Math.random() * 0.24,
        hue:[190, 205, 225, 272][j % 4]
      });
    }
  }

  function spawnMeteor(x, y, dx, dy) {
    for (var i = 0; i < 3; i++) {
      meteors.push({
        x:x + (Math.random() - 0.5) * 14,
        y:y + (Math.random() - 0.5) * 14,
        previousX:x,
        previousY:y,
        vx:-dx * (0.025 + Math.random() * 0.018) + (Math.random() - 0.5) * 0.32,
        vy:-dy * (0.025 + Math.random() * 0.018) - 0.18 - Math.random() * 0.26,
        life:1,
        decay:0.012 + Math.random() * 0.009,
        size:0.8 + Math.random() * 1.7,
        hue:[190, 215, 272, 322][(meteors.length + i) % 4]
      });
    }
    if (meteors.length > 110) meteors.splice(0, meteors.length - 110);
  }

  function onPointerMove(event) {
    var rect = hero.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    var dx = pointer.active ? x - pointer.x : 1;
    var dy = pointer.active ? y - pointer.y : 0;
    pointer.previousX = pointer.x;
    pointer.previousY = pointer.y;
    pointer.x = x;
    pointer.y = y;
    pointer.active = true;
    if (!reduced && dx * dx + dy * dy > 3) spawnMeteor(x, y, dx, dy);
  }

  function drawAmbientStars(time) {
    for (var i = 0; i < ambientStars.length; i++) {
      var star = ambientStars[i];
      var x = star.baseX;
      var y = star.baseY;
      if (!reduced) {
        x += Math.sin(time * star.speed + star.phase) * star.driftX;
        y += Math.cos(time * star.speed * 0.78 + star.phase) * star.driftY;
      }
      var twinkle = reduced
        ? 0.72
        : 0.58 + Math.sin(time * star.speed * 4.2 + star.phase) * 0.36;
      var alpha = star.alpha * Math.max(0.2, twinkle);
      context.beginPath();
      context.arc(x, y, star.size * (0.82 + twinkle * 0.35), 0, Math.PI * 2);
      context.fillStyle =
        'hsla(' + star.hue + ', 88%, 78%, ' + alpha + ')';
      if (star.size > 1.15) {
        context.shadowColor =
          'hsla(' + star.hue + ', 94%, 70%, ' + alpha * 0.8 + ')';
        context.shadowBlur = 8;
      }
      context.fill();
      context.shadowBlur = 0;
    }
  }

  function drawNetwork(time) {
    var centerX = width * (width < 760 ? 0.5 : 0.76);
    var centerY = height * (width < 760 ? 0.72 : 0.5);
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (!reduced) {
        node.x =
          node.baseX +
          Math.cos(time * 0.00016 + node.phase) * node.drift;
        node.y =
          node.baseY +
          Math.sin(time * 0.00012 + node.phase) * node.drift * 0.72;
      }
      for (var j = i + 1; j < nodes.length; j++) {
        var other = nodes[j];
        var dx = node.x - other.x;
        var dy = node.y - other.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < Math.min(width, height) * 0.19) {
          context.beginPath();
          context.moveTo(node.x, node.y);
          context.lineTo(other.x, other.y);
          context.strokeStyle =
            'rgba(86, 199, 255,' + (0.1 * (1 - distance / (height * 0.19))) + ')';
          context.lineWidth = 0.7;
          context.stroke();
        }
      }
      var pulse = reduced ? 1 : 0.75 + Math.sin(time * 0.0014 + node.phase) * 0.25;
      context.beginPath();
      context.arc(node.x, node.y, node.size + pulse, 0, Math.PI * 2);
      context.fillStyle = 'rgba(113, 216, 255, 0.3)';
      context.shadowColor = 'rgba(93, 200, 255, 0.42)';
      context.shadowBlur = 9;
      context.fill();
      context.shadowBlur = 0;
    }

    context.beginPath();
    context.arc(centerX, centerY, Math.min(width, height) * 0.255, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(66, 217, 255, 0.055)';
    context.lineWidth = 1;
    context.stroke();
  }

  function drawMeteors(delta) {
    for (var i = meteors.length - 1; i >= 0; i--) {
      var meteor = meteors[i];
      meteor.previousX = meteor.x;
      meteor.previousY = meteor.y;
      meteor.x += meteor.vx * delta;
      meteor.y += meteor.vy * delta;
      meteor.life -= meteor.decay * delta;
      if (meteor.life <= 0) {
        meteors.splice(i, 1);
        continue;
      }
      context.beginPath();
      context.moveTo(meteor.x, meteor.y);
      context.lineTo(
        meteor.x - meteor.vx * 22,
        meteor.y - meteor.vy * 22
      );
      context.strokeStyle =
        'hsla(' + meteor.hue + ', 92%, 74%, ' + meteor.life * 0.32 + ')';
      context.lineWidth = Math.max(0.5, meteor.size * 0.72);
      context.stroke();

      context.beginPath();
      context.arc(meteor.x, meteor.y, meteor.size, 0, Math.PI * 2);
      context.fillStyle =
        'hsla(' + meteor.hue + ', 96%, 82%, ' + meteor.life * 0.68 + ')';
      context.shadowColor =
        'hsla(' + meteor.hue + ', 100%, 72%, ' + meteor.life * 0.72 + ')';
      context.shadowBlur = 10;
      context.fill();
      context.shadowBlur = 0;
    }
  }

  function frame(time) {
    var delta = Math.min(2, Math.max(0.5, (time - lastFrame) / 16.67 || 1));
    lastFrame = time;
    context.clearRect(0, 0, width, height);
    drawAmbientStars(time);
    drawNetwork(time);
    if (!reduced) drawMeteors(delta);
    if (!reduced) requestAnimationFrame(frame);
  }

  hero.addEventListener('mousemove', onPointerMove);
  hero.addEventListener('mouseleave', function () {
    pointer.active = false;
  });
  window.addEventListener('resize', resize);
  resize();
  if (reduced) frame(0);
  else requestAnimationFrame(frame);
})();
