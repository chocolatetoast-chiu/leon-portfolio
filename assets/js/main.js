(function () {
  /* ── Typing animation (homepage only) ── */
  const textToType = 'Sovereign AI · Neuroimaging · Digital Twin for Healthcare';
  const typeElement = document.getElementById('typing-text');
  let typeIndex = 0;

  function typeWriter() {
    if (!typeElement) return;
    if (typeIndex < textToType.length) {
      typeElement.textContent += textToType.charAt(typeIndex);
      typeIndex++;
      setTimeout(typeWriter, 45);
    }
  }

  /* ── Fade-in observer ── */
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px',
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0) translateX(0)';
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.fade-element, .section-title, .story-node').forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(el);
  });

  /* ── Mobile menu toggle ── */
  window.toggleMenu = function toggleMenu() {
    document.querySelector('.nav-links')?.classList.toggle('active');
    // Close any open dropdowns when toggling menu
    document.querySelectorAll('.nav-dropdown.open').forEach(function (d) {
      d.classList.remove('open');
    });
  };

  /* ── Navbar dropdown (Posts submenu) ── */
  document.querySelectorAll('.nav-dropdown > a').forEach(function (trigger) {
    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      var parent = this.closest('.nav-dropdown');
      // Close other dropdowns
      document.querySelectorAll('.nav-dropdown.open').forEach(function (d) {
        if (d !== parent) d.classList.remove('open');
      });
      parent.classList.toggle('open');
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav-dropdown')) {
      document.querySelectorAll('.nav-dropdown.open').forEach(function (d) {
        d.classList.remove('open');
      });
    }
  });

  /* ── Active nav link ── */
  (function setActiveNav() {
    var path = window.location.pathname;
    var page = path.substring(path.lastIndexOf('/') + 1) || 'index.html';

    document.querySelectorAll('.nav-links > a, .nav-links > .nav-dropdown > a').forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href) return;
      var linkPage = href.substring(href.lastIndexOf('/') + 1);

      if (linkPage === page) {
        link.classList.add('active');
      }
    });

    // Check if we're on a posts page — activate Posts dropdown
    if (path.indexOf('/posts/') !== -1 || page === 'tutorials.html' || page === 'reflections.html') {
      var postsDropdown = document.querySelector('.nav-dropdown > a');
      if (postsDropdown) postsDropdown.classList.add('active');
    }
  })();

  /* ── Scroll-to-top button ── */
  var scrollTopBtn = document.getElementById('scrollTop');
  window.onscroll = function () {
    if (!scrollTopBtn) return;
    if (document.body.scrollTop > 500 || document.documentElement.scrollTop > 500) {
      scrollTopBtn.classList.add('active');
    } else {
      scrollTopBtn.classList.remove('active');
    }
  };

  window.scrollToTop = function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ── On load: typing animation ── */
  window.addEventListener('load', function () {
    if (typeElement) {
      typeElement.textContent = '';
      typeIndex = 0;
      setTimeout(typeWriter, 500);
    }
  });

  /* ── Project card thumbnail loader ── */
  document.querySelectorAll('.project-card[data-thumb]').forEach(function (card) {
    var file = card.getAttribute('data-thumb');
    var img = card.querySelector('img.project-thumb');
    if (!img || !file) return;
    // Determine correct base path for images
    var basePath = 'assets/images/';
    if (window.location.pathname.indexOf('/posts/') !== -1) {
      basePath = '../assets/images/';
    }
    img.src = basePath + file;
    img.addEventListener(
      'load',
      function () {
        img.removeAttribute('hidden');
      },
      { once: true }
    );
    img.addEventListener('error', function () {
      img.setAttribute('hidden', '');
    });
  });

  /* ── Progress bar animation (skills section) ── */
  var progressObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var fill = entry.target;
          fill.style.width = fill.parentElement.parentElement.querySelector('.skill-info span:last-child')
            ? fill.getAttribute('style').match(/width:\s*(\d+%)/)?.[1] || '0'
            : '0';
          progressObserver.unobserve(fill);
        }
      });
    },
    { threshold: 0.5 }
  );

  document.querySelectorAll('.progress-fill').forEach(function (fill) {
    var target = fill.style.width;
    fill.style.width = '0';
    fill.setAttribute('data-target', target);
    progressObserver.observe(fill);
  });

  // Re-trigger progress fills when observed
  var progressObserver2 = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var fill = entry.target;
          fill.style.width = fill.getAttribute('data-target') || '0';
          progressObserver2.unobserve(fill);
        }
      });
    },
    { threshold: 0.3 }
  );

  document.querySelectorAll('.progress-fill[data-target]').forEach(function (fill) {
    progressObserver2.observe(fill);
  });
})();
