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
  setupOtherItems();
  setupDotNav();
});

/* Accordion group across all .other-item cards: opening one closes
   whichever other card was open (same single-open pattern the pipeline
   stages use). Per-card row height (.other-item-body's grid-template-rows)
   now switches instantly, with no transition of its own — animating that
   independently per card was the bug: card A's row and card B's row live
   in different grid rows that reflow independently, so the two height
   changes drift out of sync and the page height dips and springs back
   instead of moving on one curve. flipGridHeight()
   below animates the .other-grid CONTAINER's overall height instead
   (classic FLIP: measure before, mutate the DOM, measure after, lock the
   box at the old height, force a reflow, then transition to the new
   height) so there is exactly one height animation for the whole
   section, not two competing ones. The JS Spring still drives each
   card's inner content fade (blur/scale/opacity) and chevron rotation —
   unrelated to layout height, so it runs independently underneath. */
function setupOtherItems() {
  const grid = document.querySelector('.other-grid');
  let activeClose = null;
  let flipGen = 0;

  function flipGridHeight(mutate) {
    if (!grid || REDUCED_MOTION) { mutate(); return; }

    const startHeight = grid.getBoundingClientRect().height;
    mutate();
    const endHeight = grid.getBoundingClientRect().height;
    if (Math.abs(endHeight - startHeight) < 0.5) return;

    const gen = ++flipGen;
    grid.style.transition = 'none';
    grid.style.overflow = 'hidden';
    grid.style.height = `${startHeight}px`;
    grid.getBoundingClientRect(); // force reflow at the locked start height

    requestAnimationFrame(() => {
      if (gen !== flipGen) return;
      requestAnimationFrame(() => {
        if (gen !== flipGen) return;
        grid.style.transition = 'height 380ms cubic-bezier(0.16, 1, 0.3, 1)';
        grid.style.height = `${endHeight}px`;
      });
    });

    grid.addEventListener('transitionend', function onEnd(e) {
      if (e.target !== grid || e.propertyName !== 'height') return;
      grid.removeEventListener('transitionend', onEnd);
      if (gen !== flipGen) return;
      grid.style.height = 'auto';
      grid.style.overflow = '';
      grid.style.transition = '';
    });
  }

  document.querySelectorAll('.other-item').forEach(card => {
    const body = card.querySelector('.other-item-body');
    const inner = body ? body.firstElementChild : null;
    if (!body || !inner) return;
    const title = card.querySelector('.other-title');
    const icon = card.querySelector('.other-toggle-icon');

    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-expanded', 'false');
    if (title) card.setAttribute('aria-label', `${title.textContent.trim()} — meer info`);

    inner.style.opacity = '0';

    const spring = new Spring({
      value: 0, response: 0.36, damping: 0.86,
      onUpdate: (v) => {
        const o = Math.max(0, Math.min(1, v));
        const scale = 0.965 + 0.035 * o;
        const blur = (1 - o) * 6;
        const translate = (1 - o) * -8;
        inner.style.opacity = o;
        inner.style.transform = `translateY(${translate}px) scale(${scale})`;
        inner.style.filter = `blur(${blur}px)`;
        if (icon) icon.style.transform = `rotate(${o * 180}deg)`;
      }
    });

    function close() {
      card.classList.remove('active');
      card.setAttribute('aria-expanded', 'false');
      spring.setTarget(0);
    }

    function open() {
      card.classList.add('active');
      card.setAttribute('aria-expanded', 'true');
      spring.setTarget(1);
    }

    function toggle() {
      const isOpen = card.classList.contains('active');
      flipGridHeight(() => {
        if (isOpen) { close(); activeClose = null; return; }
        if (activeClose) activeClose();
        open();
        activeClose = close;
      });
    }

    card.addEventListener('click', toggle);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); toggle(); }
    });

    const link = inner.querySelector('.other-link');
    if (link) link.addEventListener('click', (e) => e.stopPropagation());
  });
}

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
