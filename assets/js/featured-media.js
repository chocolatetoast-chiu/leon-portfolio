/* Homepage featured media: lazy-load preview videos, play muted only while in view. */
(function () {
  var vids = document.querySelectorAll('.feature-media__video[data-src]');
  if (!vids.length) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return; // poster only
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) {
        if (!v.src) { v.src = v.dataset.src; }
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      } else { v.pause(); }
    });
  }, { threshold: 0.5 });
  vids.forEach(function (v) { obs.observe(v); });
})();
