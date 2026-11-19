(() => {
  /* Header background once you leave the hero */
  const header = document.querySelector('.site-header');
  const onScroll = () => header.classList.toggle('scrolled', scrollY > innerHeight * 0.6);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Mobile menu */
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
    toggle.textContent = open ? 'Close' : 'Menu';
  });
  nav.addEventListener('click', e => {
    if (e.target.closest('a')) { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); toggle.textContent = 'Menu'; }
  });

  /* Full-page previews scroll on hover / focus */
  document.querySelectorAll('.scroll-frame').forEach(frame => {
    const img = frame.querySelector('img');
    const distance = () => Math.max(0, img.getBoundingClientRect().height - frame.clientHeight);
    const go = () => {
      const d = distance();
      if (!d) { frame.classList.add('no-scroll'); return; }
      frame.style.setProperty('--dur', Math.max(2, d / 140) + 's');
      img.style.transform = `translateY(${-d}px)`;
      frame.classList.add('is-scrolling');
    };
    const back = () => {
      frame.style.setProperty('--dur', '1.2s');
      img.style.transform = '';
      frame.classList.remove('is-scrolling');
    };
    frame.addEventListener('mouseenter', go);
    frame.addEventListener('mouseleave', back);
    frame.addEventListener('focus', go);
    frame.addEventListener('blur', back);
    if (img.complete && !distance()) frame.classList.add('no-scroll');
  });

  /* Lightbox for every work image */
  const lb = document.getElementById('lightbox');
  const lbImg = lb.querySelector('img');
  document.addEventListener('click', e => {
    const img = e.target.closest('img[data-zoom]');
    if (!img) return;
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;
    lb.showModal();
  });
  lb.querySelector('.lb-close').addEventListener('click', () => lb.close());
  lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
  document.querySelectorAll('img[data-zoom]').forEach(img => {
    if (img.closest('.scroll-frame')) return; // frame itself is focusable
    img.tabIndex = 0;
    img.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); img.click(); } });
  });

  /* Breadcrumb company links: jump to the job in the CV and flash its name twice */
  document.addEventListener('click', e => {
    const link = e.target.closest('a[data-job]');
    if (!link) return;
    const job = document.getElementById(link.dataset.job);
    if (!job) return;
    e.preventDefault();
    const name = job.querySelector('.co');
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    job.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' });
    history.replaceState(null, '', '#' + job.id);
    let done = false;
    const flash = () => {
      if (done) return; done = true;
      name.classList.remove('flash'); void name.offsetWidth; name.classList.add('flash');
    };
    if ('onscrollend' in window) addEventListener('scrollend', flash, { once: true });
    setTimeout(flash, smooth ? 1100 : 50);
  });

  /* Text reveal every time it scrolls into view */
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const SEL = 'main h1, main h2, main h3:not(.visually-hidden), main h4, main p, main li, main dt, main dd, main blockquote footer, main .crumb, main .btn, .site-footer p';
    const all = [...document.querySelectorAll(SEL)];
    // animate the innermost text blocks only, so nothing is animated twice
    const items = all.filter(el => !all.some(o => o !== el && el.contains(o)) && !el.closest('.hero-foot, #lightbox, svg'));
    items.forEach(el => el.classList.add('reveal'));
    const io = new IntersectionObserver(entries => {
      let i = 0;
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.style.setProperty('--d', Math.min(i++ * 0.06, 0.6) + 's');
          en.target.classList.add('in');
        } else {
          en.target.style.setProperty('--d', '0s');
          en.target.classList.remove('in');
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });
    items.forEach(el => io.observe(el));
  }
})();
