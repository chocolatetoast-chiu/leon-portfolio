/* Homepage featured media.
 * data-play="view":  load and play muted while at least half visible (the spotlight).
 * data-play="hover": load and play muted while the card is hovered or focused (desktop); touch screens keep the poster.
 * Reduced motion or Save-Data: posters only. */
(function () {
  var vids = document.querySelectorAll('.feature-media__video[data-src]');
  if (!vids.length) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData = navigator.connection && navigator.connection.saveData;
  if (reduce || saveData) return;
  function play(v) { if (!v.src) v.src = v.dataset.src; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  var hoverable = window.matchMedia && window.matchMedia('(hover: hover)').matches;
  var obs = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) play(e.target); else e.target.pause(); });
  }, { threshold: 0.5 }) : null;
  vids.forEach(function (v) {
    if (v.dataset.play === 'hover') {
      if (!hoverable) return;
      var card = v.closest('a, article') || v;
      card.addEventListener('mouseenter', function () { play(v); });
      card.addEventListener('focusin', function () { play(v); });
      card.addEventListener('mouseleave', function () { v.pause(); });
      card.addEventListener('focusout', function () { v.pause(); });
    } else if (obs) obs.observe(v);
  });
})();
