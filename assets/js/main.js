(function () {
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

  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px',
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.fade-element, .section-title').forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(el);
  });

  window.toggleMenu = function toggleMenu() {
    document.querySelector('.nav-links')?.classList.toggle('active');
  };

  const scrollTopBtn = document.getElementById('scrollTop');
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

  window.addEventListener('load', function () {
    if (typeElement) {
      typeElement.textContent = '';
      typeIndex = 0;
      setTimeout(typeWriter, 500);
    }
  });

  document.querySelectorAll('.project-card[data-thumb]').forEach(function (card) {
    var file = card.getAttribute('data-thumb');
    var img = card.querySelector('img.project-thumb');
    if (!img || !file) return;
    img.src = 'assets/images/' + file;
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
})();
