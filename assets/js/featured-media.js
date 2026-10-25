/* Homepage Featured Work reel: one row of project cards that scrolls sideways.
 * - Dots and arrow buttons move one card at a time (scroll-snap does the alignment).
 * - The most visible card (leftmost on a tie) is "active": its preview video loads and plays muted; the others pause.
 *   Only one video plays at a time, and nothing loads until the reel is on screen.
 * - Reduced motion or Save-Data: posters only, no autoplay. */
(function () {
  var track = document.getElementById('workReel');
  if (!track) return;
  var cards = Array.prototype.slice.call(track.querySelectorAll('.reel-card'));
  var reel = track.closest('.reel'), dotsBox = reel.querySelector('.reel__dots');
  var prev = reel.querySelector('.reel__btn[data-dir="-1"]'), next = reel.querySelector('.reel__btn[data-dir="1"]');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData = navigator.connection && navigator.connection.saveData;
  var active = 0, onScreen = false;

  var dots = cards.map(function (card, i) {
    var d = document.createElement('button');
    d.type = 'button'; d.className = 'reel__dot';
    d.setAttribute('aria-label', (card.querySelector('.reel-card__title') || {}).textContent || ('Project ' + (i + 1)));
    d.addEventListener('click', function () { go(i); });
    dotsBox.appendChild(d); return d;
  });
  function go(i) {
    i = Math.max(0, Math.min(cards.length - 1, i));
    track.scrollTo({ left: cards[i].offsetLeft - track.offsetLeft - 2, behavior: reduce ? 'auto' : 'smooth' });
  }
  if (prev) prev.addEventListener('click', function () { go(active - 1); });
  if (next) next.addEventListener('click', function () { go(active + 1); });
  track.addEventListener('keydown', function (e) {
    if (e.target !== track) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(active + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(active - 1); }
  });

  function video(i) { return cards[i] && cards[i].querySelector('.feature-media__video[data-src]'); }
  function syncVideos() {
    cards.forEach(function (c, i) {
      var v = video(i); if (!v) return;
      if (i === active && onScreen && !reduce && !saveData) {
        if (!v.src) v.src = v.dataset.src;
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      } else v.pause();
    });
  }
  function setActive(i) {
    active = i;
    dots.forEach(function (d, k) { d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
    var max = track.scrollWidth - track.clientWidth - 4;
    if (prev) prev.disabled = track.scrollLeft <= 4;
    if (next) next.disabled = track.scrollLeft >= max;
    syncVideos();
  }
  function pickActive() {                     // the most visible card wins; ties go to the leftmost
    var l = track.scrollLeft, r = l + track.clientWidth, best = 0, bv = -1;
    cards.forEach(function (c, i) {
      var x0 = c.offsetLeft - track.offsetLeft, x1 = x0 + c.offsetWidth;
      var vis = Math.max(0, Math.min(r, x1) - Math.max(l, x0)) / c.offsetWidth;
      if (vis > bv + 0.01) { bv = vis; best = i; }
    });
    setActive(best);
  }
  var t = 0;
  track.addEventListener('scroll', function () { clearTimeout(t); t = setTimeout(pickActive, 90); }, { passive: true });
  window.addEventListener('resize', pickActive);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; syncVideos(); }, { threshold: 0.4 }).observe(track);
  }
  setActive(0);
})();
