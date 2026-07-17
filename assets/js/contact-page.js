/* Contact: intent chips, timezone strip */
(function () {
  'use strict';

  var email = 'scchiu.phd@gmail.com';
  var intents = document.querySelectorAll('[data-intent]');
  intents.forEach(function (chip) {
    chip.addEventListener('click', function () {
      intents.forEach(function (c) {
        c.classList.toggle('is-active', c === chip);
      });
      var subject = chip.getAttribute('data-intent');
      var label = chip.getAttribute('data-intent-label') || subject;
      var mailto = 'mailto:' + email + '?subject=' + encodeURIComponent(subject);
      var btn = document.getElementById('contactMailBtn');
      if (btn) {
        btn.setAttribute('href', mailto);
        var lab = btn.querySelector('.contact-mail-label');
        if (lab) lab.textContent = label;
      }
    });
  });

  function fmt(tz) {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        weekday: 'short'
      }).format(new Date());
    } catch (e) {
      return '—';
    }
  }

  function tick() {
    var tpe = document.getElementById('tzTaipei');
    var nyc = document.getElementById('tzNYC');
    var lon = document.getElementById('tzLondon');
    if (tpe) tpe.textContent = fmt('Asia/Taipei');
    if (nyc) nyc.textContent = fmt('America/New_York');
    if (lon) lon.textContent = fmt('Europe/London');
  }
  if (document.getElementById('tzTaipei')) {
    tick();
    setInterval(tick, 30000);
  }
})();
