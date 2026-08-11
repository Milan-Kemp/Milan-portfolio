/* ==========================================================================
   Milan Kemp — Portfolio: index page behaviour
   Hero stagger, scroll reveals, magnetic tilt cards, dot navigation.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  revealStagger([...document.querySelectorAll('.hero .reveal')], 80, 70);
  observeReveal('.observe');
  observeStaggerGroup('.other-grid', '.other-item', { stagger: 55 });
  observeStaggerGroup('.skills-grid', '.skill-card', { stagger: 55 });
  observeStaggerGroup('.licenses-grid', '.license-card', { stagger: 55 });

  document.querySelectorAll('.tilt-card').forEach(el => {
    const arrowEl = el.querySelector('.project-card-cta');
    attachMagneticTilt(el, arrowEl ? { arrowEl } : {});
    attachHoverSpotlight(el);
  });
  document.querySelectorAll('.lift-card').forEach(el => {
    attachMagneticTilt(el, { maxTilt: 6, lift: -2, hoverScale: 1.02, downScale: 0.985 });
  });
  document.querySelectorAll('.btn, .footer-link, .project-links a').forEach(el => attachPressFeedback(el));
  document.querySelectorAll('.badge').forEach(el => attachBadgePop(el));

  document.querySelectorAll('.mesh').forEach(el => {
    attachScrollParallax(el, { factor: parseFloat(el.dataset.parallax) || 0.05, max: 34, baseTransform: 'translateX(-50%)' });
  });
  document.querySelectorAll('[data-parallax-card]').forEach(el => {
    attachScrollParallax(el, { factor: 0.1, max: 22 });
  });

  document.querySelectorAll('.count').forEach((el, i) => setTimeout(() => animateCount(el), 450 + i * 80));

  setupCardLinks();
  setupDotNav();
});

/* Makes .project-card[data-href] navigate on click anywhere in the card
   (not just the "Bekijk case study" text), while the GitHub link stays
   independently clickable. Keyboard-accessible via tabindex + Enter. */
function setupCardLinks() {
  document.querySelectorAll('.project-card[data-href]').forEach(card => {
    const href = card.dataset.href;
    const title = card.querySelector('.project-title');

    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'link');
    if (title) card.setAttribute('aria-label', 'Bekijk case study: ' + title.textContent.trim());

    card.addEventListener('click', () => { window.location.href = href; });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { window.location.href = href; }
    });

    const githubLink = card.querySelector('.project-links a.secondary');
    if (githubLink) githubLink.addEventListener('click', (e) => e.stopPropagation());
  });
}

function setupDotNav() {
  const nav = document.querySelector('.dot-nav');
  if (!nav) return;
  const dots = [...nav.querySelectorAll('.dot')];
  const sections = dots
    .map(dot => document.getElementById(dot.dataset.target))
    .filter(Boolean);

  const indicator = nav.querySelector('.dot-nav-indicator');
  const indicatorSpring = indicator
    ? new Spring({ value: 0, response: 0.5, damping: 0.88, onUpdate: v => { indicator.style.transform = `translate(-50%, ${v}px)`; } })
    : null;
  const moveIndicatorTo = (dot) => {
    if (!indicatorSpring) return;
    indicatorSpring.setTarget(dot.offsetTop + dot.offsetHeight / 2 - indicator.offsetHeight / 2);
  };
  if (dots[0]) moveIndicatorTo(dots[0]);

  dots.forEach(dot => {
    const tooltip = dot.querySelector('.dot-tooltip');

    const scaleSpring = new Spring({ value: 1, response: 0.3, damping: 0.8, onUpdate: v => { dot.style.transform = `scale(${v})`; } });
    const tipOpacitySpring = new Spring({ value: 0, response: 0.25, damping: 1, onUpdate: v => { if (tooltip) tooltip.style.opacity = v; } });
    const tipXSpring = new Spring({ value: 6, response: 0.3, damping: 0.9, onUpdate: v => { if (tooltip) tooltip.style.transform = `translateX(${v}px) translateY(-50%)`; } });
    dot._scaleSpring = scaleSpring;

    dot.addEventListener('pointerenter', () => {
      tipOpacitySpring.setTarget(1); tipXSpring.setTarget(0);
      if (!dot.classList.contains('active')) scaleSpring.setTarget(1.3);
    });
    dot.addEventListener('pointerleave', () => {
      tipOpacitySpring.setTarget(0); tipXSpring.setTarget(6);
      if (!dot.classList.contains('active')) scaleSpring.setTarget(1);
    });
    dot.addEventListener('pointerdown', () => scaleSpring.setTarget(0.85));
    dot.addEventListener('pointerup', () => scaleSpring.setTarget(dot.classList.contains('active') ? 1.5 : 1.3));
    dot.addEventListener('click', () => {
      const target = document.getElementById(dot.dataset.target);
      if (target) target.scrollIntoView({ behavior: REDUCED_MOTION ? 'auto' : 'smooth', block: 'start' });
      moveIndicatorTo(dot);
    });
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const dot = dots.find(d => d.dataset.target === entry.target.id);
      if (!dot) return;
      dots.forEach(d => {
        const wasActive = d.classList.contains('active');
        d.classList.remove('active');
        if (d !== dot && wasActive) d._scaleSpring.setTarget(1);
      });
      dot.classList.add('active');
      dot._scaleSpring.setTarget(1.5);
      moveIndicatorTo(dot);
    });
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

  sections.forEach(s => io.observe(s));
}
