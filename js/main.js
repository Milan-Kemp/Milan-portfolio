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
   switches instantly, with no transition of its own.

   flipAll() below is the classic FLIP pattern (First/Last/Invert/Play)
   applied to the WHOLE grid at once, not just the container:
     - .other-grid's own height (so the page below doesn't jump), and
     - every .other-item's (top, left), since a card whose own row didn't
       change size can still be pushed up/down by an EARLIER row growing
       or shrinking — e.g. closing a row-1 card while opening a row-2
       card shifts row 2 (and beyond) as a net result of both changes.
   Measuring/animating each card individually (instead of only the
   container) is what makes those cards visibly slide to their new spot
   instead of teleporting there the instant the container's height
   settles.

   Every getBoundingClientRect() read below happens in one of two clean
   batches — all "before" reads, then (after the single mutate() write)
   all "after" reads — never alternated with a write in between. Only
   ONE reflow is forced for the whole invert step, by reading
   grid.getBoundingClientRect() once after every card's transform has
   already been written. Interleaving read-write-read-write per card is
   exactly what forces a separate synchronous layout on every iteration
   (layout thrashing) and is why this is deliberately structured as
   measure-all / mutate / measure-all / write-all / reflow-once instead.

   DURATION is shared by all three animation systems running at once —
   the container-height transition, every moved card's transform
   transition, and the content-fade Spring below — so they read as one
   motion instead of the Spring visibly trailing after the CSS
   transitions have already settled. FLIP_RESPONSE is tuned so the
   Spring converges in roughly the same window: a Spring's settle time
   isn't a simple multiple of its response value (this one's damping is
   under 1, so it's underdamped and overshoots slightly before
   settling) — 0.2 was found by simulating Spring._tick() directly with
   a fixed timestep until value/velocity hold within tolerance, which
   lands its real settle time around 275ms for FLIP_DURATION's 260ms.

   attachMagneticTilt() also writes this same .other-item's transform on
   hover/tilt; a FLIP in flight briefly owns that property instead, and
   normal tilt control returns the moment the FLIP's own transform is
   cleared at the end. */
const FLIP_DURATION = 260;
const FLIP_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const FLIP_RESPONSE = 0.2;

function setupOtherItems() {
  const grid = document.querySelector('.other-grid');
  let activeClose = null;
  let flipGen = 0;

  function flipAll(mutate) {
    if (!grid || REDUCED_MOTION) { mutate(); return; }

    const cards = Array.from(grid.querySelectorAll('.other-item'));

    // Pass 1 (read-only): every "before" position, in one batch.
    const startHeight = grid.getBoundingClientRect().height;
    const firstRects = new Map(cards.map(c => [c, c.getBoundingClientRect()]));

    // Single write batch: the DOM mutation itself.
    mutate();

    // Pass 2 (read-only): every "after" position, in one batch — no
    // writes happen between this and Pass 1, so this reuses the one
    // reflow that mutate() invalidated instead of forcing N more.
    const endHeight = grid.getBoundingClientRect().height;
    const lastRects = new Map(cards.map(c => [c, c.getBoundingClientRect()]));

    const heightChanged = Math.abs(endHeight - startHeight) >= 0.5;
    const moved = [];
    cards.forEach(card => {
      const first = firstRects.get(card);
      const last = lastRects.get(card);
      const dx = first.left - last.left;
      const dy = first.top - last.top;
      if (Math.abs(dx) >= 0.5 || Math.abs(dy) >= 0.5) moved.push({ card, dx, dy });
    });

    if (!heightChanged && moved.length === 0) return;

    const gen = ++flipGen;
    const TRANSITION = `transform ${FLIP_DURATION}ms ${FLIP_EASE}`;

    // Invert (write-only batch): lock the container at its old height
    // and every moved card at its old position — same frame as the
    // mutation, so nothing is visible yet.
    if (heightChanged) {
      grid.style.transition = 'none';
      grid.style.overflow = 'hidden';
      grid.style.height = `${startHeight}px`;
    }
    moved.forEach(({ card, dx, dy }) => {
      // attachMagneticTilt() writes this same card's transform on every
      // pointer-driven spring tick, including the down/up bump from the
      // very click that triggered this flip — suspend it for the
      // duration so the two don't overwrite each other mid-flight.
      card._tiltSuspended = true;
      card.style.transition = 'none';
      card.style.transform = `translate(${dx}px, ${dy}px)`;
    });

    grid.getBoundingClientRect(); // the ONE forced reflow for this whole step

    // Play: on the next frame, transition everything to its real end state.
    requestAnimationFrame(() => {
      if (gen !== flipGen) return;
      requestAnimationFrame(() => {
        if (gen !== flipGen) return;
        if (heightChanged) {
          grid.style.transition = `height ${FLIP_DURATION}ms ${FLIP_EASE}`;
          grid.style.height = `${endHeight}px`;
        }
        moved.forEach(({ card }) => {
          card.style.transition = TRANSITION;
          card.style.transform = 'translate(0, 0)';
        });
      });
    });

    let pending = (heightChanged ? 1 : 0) + moved.length;
    function settle() {
      pending -= 1;
      if (pending > 0 || gen !== flipGen) return;
      if (heightChanged) {
        grid.style.height = 'auto';
        grid.style.overflow = '';
        grid.style.transition = '';
      }
      moved.forEach(({ card }) => {
        card.style.transform = '';
        card.style.transition = '';
        card._tiltSuspended = false;
      });
    }

    if (heightChanged) {
      grid.addEventListener('transitionend', function onGridEnd(e) {
        if (e.target !== grid || e.propertyName !== 'height') return;
        grid.removeEventListener('transitionend', onGridEnd);
        settle();
      });
    }
    moved.forEach(({ card }) => {
      card.addEventListener('transitionend', function onCardEnd(e) {
        if (e.target !== card || e.propertyName !== 'transform') return;
        card.removeEventListener('transitionend', onCardEnd);
        settle();
      });
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
      value: 0, response: FLIP_RESPONSE, damping: 0.86,
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
      flipAll(() => {
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
