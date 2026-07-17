/* Shared interactive utilities: toast, copy, TOC, filter, progress */
(function (global) {
  'use strict';

  function ensureToast() {
    var el = document.getElementById('siteToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'siteToast';
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    return el;
  }

  function toast(msg) {
    var el = ensureToast();
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      el.classList.remove('is-visible');
    }, 1800);
  }

  function copyText(text, okMsg) {
    if (!text) return;
    var done = function () {
      toast(okMsg || 'Copied');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () {
        fallbackCopy(text, done);
      });
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      done();
    } catch (e) {}
    document.body.removeChild(ta);
  }

  function initCopyButtons() {
    document.querySelectorAll('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        copyText(btn.getAttribute('data-copy'), btn.getAttribute('data-copy-msg') || 'Copied');
      });
    });
  }

  function initReadingProgress() {
    var bar = document.querySelector('.reading-progress');
    if (!bar) return;
    var article = document.querySelector('.article-body') || document.querySelector('main') || document.body;
    function onScroll() {
      var rect = article.getBoundingClientRect();
      var total = article.scrollHeight - window.innerHeight;
      var scrolled = Math.min(Math.max(-rect.top, 0), total);
      var pct = total > 0 ? (scrolled / total) * 100 : 0;
      bar.style.width = pct + '%';
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function initStickyToc(opts) {
    opts = opts || {};
    var toc = document.querySelector(opts.toc || '.cv-toc');
    var sections = document.querySelectorAll(opts.sections || '[data-toc-section]');
    if (!toc || !sections.length) return;

    var links = toc.querySelectorAll('a[href^="#"]');
    var obs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var id = entry.target.id;
          links.forEach(function (a) {
            a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
          });
        });
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: 0 }
    );
    sections.forEach(function (s) {
      obs.observe(s);
    });
  }

  function initChipFilter(opts) {
    var root = document.querySelector(opts.root || '[data-filter-root]');
    if (!root) return;
    var chips = root.querySelectorAll(opts.chip || '[data-filter]');
    var items = document.querySelectorAll(opts.item || '[data-filter-item]');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var key = chip.getAttribute('data-filter');
        chips.forEach(function (c) {
          c.classList.toggle('is-active', c === chip);
        });
        items.forEach(function (item) {
          var tags = (item.getAttribute('data-filter-item') || '').split(/\s+/);
          var show = key === 'all' || tags.indexOf(key) !== -1;
          item.classList.toggle('is-hidden', !show);
        });
      });
    });
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  global.Instruments = {
    toast: toast,
    copyText: copyText,
    initCopyButtons: initCopyButtons,
    initReadingProgress: initReadingProgress,
    initStickyToc: initStickyToc,
    initChipFilter: initChipFilter,
    prefersReducedMotion: prefersReducedMotion
  };

  function boot() {
    initCopyButtons();
    initReadingProgress();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
