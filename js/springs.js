/* ==========================================================================
   Milan Kemp — Portfolio: spring physics engine
   Shared by every page. No CSS transitions for hover/click — everything here
   is a real spring simulation (response/damping -> stiffness/damping),
   interruptible, and respects prefers-reduced-motion.
   ========================================================================== */

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function springConstants(response, dampingRatio, mass = 1) {
  const w0 = (2 * Math.PI) / response;
  return { stiffness: mass * w0 * w0, damping: 2 * mass * dampingRatio * w0, mass };
}

class Spring {
  constructor({ value = 0, response = 0.4, damping = 1.0, onUpdate = () => {}, onSettle = () => {} }) {
    const c = springConstants(response, damping);
    this.stiffness = c.stiffness; this.damping = c.damping; this.mass = c.mass;
    this.value = value; this.target = value; this.velocity = 0;
    this.onUpdate = onUpdate; this.onSettle = onSettle; this.running = false;
    this._tick = this._tick.bind(this);
  }
  setTarget(target) {
    this.target = target;
    if (REDUCED_MOTION) { this.value = target; this.velocity = 0; this.onUpdate(this.value); this.onSettle(); return; }
    if (!this.running) { this.running = true; this.last = performance.now(); requestAnimationFrame(this._tick); }
  }
  jumpTo(value) { this.value = value; this.target = value; this.velocity = 0; this.onUpdate(this.value); }
  _tick(t) {
    // retarget reads the live value — never snaps, always interruptible
    const dt = Math.min((t - this.last) / 1000, 0.032);
    this.last = t;
    const force = -this.stiffness * (this.value - this.target) - this.damping * this.velocity;
    this.velocity += (force / this.mass) * dt;
    this.value += this.velocity * dt;
    this.onUpdate(this.value);
    if (Math.abs(this.value - this.target) < 0.0009 && Math.abs(this.velocity) < 0.0009) {
      this.value = this.target; this.velocity = 0; this.onUpdate(this.value);
      this.running = false; this.onSettle(); return;
    }
    requestAnimationFrame(this._tick);
  }
}

/* Reveal a single element: opacity + translateY driven by a spring */
function springReveal(el, delay = 0) {
  const s = new Spring({
    value: 0, response: 0.6, damping: 1.0,
    onUpdate: (v) => { el.style.opacity = v; el.style.transform = `translateY(${(1 - v) * 20}px)`; }
  });
  setTimeout(() => s.setTarget(1), delay);
  return s;
}

/* Staggered spring entrance, e.g. for the hero on load */
function revealStagger(elements, baseDelay = 80, step = 70) {
  elements.forEach((el, i) => springReveal(el, baseDelay + i * step));
}

/* Scroll-triggered reveal via IntersectionObserver for below-the-fold sections */
function observeReveal(selector = '.observe', { threshold = 0.15, stagger = 60 } = {}) {
  const elements = document.querySelectorAll(selector);
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry, order) => {
      if (entry.isIntersecting) {
        springReveal(entry.target, order * stagger);
        io.unobserve(entry.target);
      }
    });
  }, { threshold });
  elements.forEach(el => { el.classList.add('reveal'); io.observe(el); });
  return io;
}

/* Reveal a whole group in DOM order once its container enters view — for grids
   where individual items would otherwise cross the intersection threshold in
   the same batch and reveal together instead of cascading one by one. */
function observeStaggerGroup(containerSelector, itemSelector, { threshold = 0.15, stagger = 60, baseDelay = 0 } = {}) {
  const containers = document.querySelectorAll(containerSelector);
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const items = entry.target.querySelectorAll(itemSelector);
      items.forEach((item, i) => springReveal(item, baseDelay + i * stagger));
      io.unobserve(entry.target);
    });
  }, { threshold });
  containers.forEach(container => {
    container.querySelectorAll(itemSelector).forEach(item => item.classList.add('reveal'));
    io.observe(container);
  });
  return io;
}

/* Bounded scroll parallax: offsets an element by its distance from the
   viewport center, spring-smoothed and clamped so it never drifts far —
   used for the ambient mesh blobs and the flagship project card. */
function attachScrollParallax(el, { factor = 0.06, max = 28, baseTransform = '' } = {}) {
  const spring = new Spring({
    value: 0, response: 0.9, damping: 1,
    onUpdate: v => { el.style.transform = baseTransform ? `${baseTransform} translateY(${v}px)` : `translateY(${v}px)`; }
  });
  const update = () => {
    if (REDUCED_MOTION) { spring.jumpTo(0); return; }
    const r = el.getBoundingClientRect();
    const centerOffset = (r.top + r.height / 2) - window.innerHeight / 2;
    const target = Math.max(-max, Math.min(max, -centerOffset * factor));
    spring.setTarget(target);
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
  return spring;
}

/* 3D magnetic tilt for project/skill cards — perspective + rotateX/rotateY
   follows the pointer, springs back to rest on pointerleave. Instant feedback
   on pointerdown, not just on release. */
function attachMagneticTilt(el, { maxTilt = 9, lift = -3, hoverScale = 1.02, downScale = 0.97, arrowEl = null } = {}) {
  let rx = 0, ry = 0, scale = 1, ty = 0;
  const apply = () => {
    // Opt-in escape hatch: a consumer that needs exclusive control of
    // el.style.transform for a moment (e.g. a position FLIP animation)
    // can set el._tiltSuspended = true and this stops overwriting it,
    // instead of the two silently fighting over the same property.
    if (el._tiltSuspended) return;
    el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(${ty}px) scale(${scale})`;
    el.classList.toggle('is-lifted', scale > 1.005);
    if (arrowEl) {
      // Base nudge toward the top-right as the card scales up on hover
      // (derived from the same scale spring, so it stays smooth — no jump),
      // plus a subtler wobble that tracks the pointer.
      const hoverT = Math.max(0, Math.min(1, (scale - 1) / (hoverScale - 1)));
      const hoverShift = hoverT * 4;
      arrowEl.style.transform = `translate(${ry * 0.7 + hoverShift}px, ${-rx * 0.7 - hoverShift}px)`;
    }
  };
  const rxSpring = new Spring({ value: 0, response: 0.32, damping: 1.0, onUpdate: v => { rx = v; apply(); } });
  const rySpring = new Spring({ value: 0, response: 0.32, damping: 1.0, onUpdate: v => { ry = v; apply(); } });
  const scaleSpring = new Spring({ value: 1, response: 0.3, damping: 1.0, onUpdate: v => { scale = v; apply(); } });
  const tySpring = new Spring({ value: 0, response: 0.3, damping: 1.0, onUpdate: v => { ty = v; apply(); } });

  // Touch has no hover state — a finger lifting isn't "still pointing at"
  // the card the way a mouse cursor is. reset() puts everything back to
  // rest instead of the mouse-only "hovering" state, so a tap never leaves
  // the card mid-tilt/mid-lift with no further event to un-stick it.
  const reset = () => {
    rxSpring.setTarget(0); rySpring.setTarget(0); scaleSpring.setTarget(1); tySpring.setTarget(0);
  };

  el.addEventListener('pointermove', (e) => {
    if (REDUCED_MOTION || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    const relX = (e.clientX - r.left) / r.width - 0.5;
    const relY = (e.clientY - r.top) / r.height - 0.5;
    rySpring.setTarget(relX * maxTilt);
    rxSpring.setTarget(-relY * maxTilt);
    scaleSpring.setTarget(hoverScale);
    tySpring.setTarget(lift);
  });
  el.addEventListener('pointerleave', reset);
  el.addEventListener('pointercancel', reset);
  el.addEventListener('pointerdown', () => { scaleSpring.setTarget(downScale); });
  el.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'touch') { reset(); }
    else { scaleSpring.setTarget(REDUCED_MOTION ? 1 : hoverScale); }
  });
}

/* Simple press feedback for buttons/links — instant on pointerdown */
function attachPressFeedback(el, { downScale = 0.96, hoverClass = 'is-hover' } = {}) {
  const spring = new Spring({ value: 1, response: 0.28, damping: 0.9, onUpdate: v => { el.style.transform = `scale(${v})`; } });
  el.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') el.classList.add(hoverClass); });
  el.addEventListener('pointerleave', () => { el.classList.remove(hoverClass); spring.setTarget(1); });
  el.addEventListener('pointercancel', () => { el.classList.remove(hoverClass); spring.setTarget(1); });
  el.addEventListener('pointerdown', () => spring.setTarget(downScale));
  el.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') el.classList.remove(hoverClass); spring.setTarget(1); });
}

/* Cursor-following radial glow behind a card — position and fade are both
   spring-driven (never a CSS transition). Relies on a ::before painted via
   the --mx/--my/--spot-o custom properties this sets on the element. */
function attachHoverSpotlight(el, { radius = 260, color = 'rgba(65,194,29,0.16)' } = {}) {
  if (REDUCED_MOTION) return;
  el.style.setProperty('--spot-radius', radius + 'px');
  el.style.setProperty('--spot-color', color);
  const xSpring = new Spring({ value: 50, response: 0.2, damping: 1.0, onUpdate: v => el.style.setProperty('--mx', v + '%') });
  const ySpring = new Spring({ value: 50, response: 0.2, damping: 1.0, onUpdate: v => el.style.setProperty('--my', v + '%') });
  const oSpring = new Spring({ value: 0, response: 0.35, damping: 1.0, onUpdate: v => el.style.setProperty('--spot-o', v) });

  el.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    xSpring.setTarget(((e.clientX - r.left) / r.width) * 100);
    ySpring.setTarget(((e.clientY - r.top) / r.height) * 100);
    oSpring.setTarget(1);
  });
  el.addEventListener('pointerleave', () => oSpring.setTarget(0));
  el.addEventListener('pointercancel', () => oSpring.setTarget(0));
}

/* Spring count-up for a number, e.g. hero stats — settles exactly on the
   integer target so it never gets stuck one off. */
function animateCount(el) {
  const target = parseInt(el.dataset.countTo, 10);
  if (REDUCED_MOTION) { el.textContent = target; return; }
  const spring = new Spring({
    value: 0, response: 0.9, damping: 1.0,
    onUpdate: v => { el.textContent = Math.round(v); },
    onSettle: () => { el.textContent = target; }
  });
  spring.setTarget(target);
}

/* Small hover "pop" for tech badges/chips — scale up on hover with a hint
   of overshoot (damping < 1), instant scale-down on pointerdown. */
function attachBadgePop(el, { hoverScale = 1.08, downScale = 0.94 } = {}) {
  const spring = new Spring({ value: 1, response: 0.28, damping: 0.75, onUpdate: v => { el.style.transform = `scale(${v})`; } });
  el.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') spring.setTarget(hoverScale); });
  el.addEventListener('pointerleave', () => spring.setTarget(1));
  el.addEventListener('pointercancel', () => spring.setTarget(1));
  el.addEventListener('pointerdown', () => spring.setTarget(downScale));
  el.addEventListener('pointerup', (e) => { spring.setTarget(e.pointerType === 'touch' ? 1 : hoverScale); });
}
