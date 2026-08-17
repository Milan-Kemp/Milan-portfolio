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
  setupJobAlertCard();
  setupDotNav();
  setupEmailCopyButtons();
});

/* Copies the email address instead of relying on mailto: (which does
   nothing for visitors without a default mail client configured), with a
   short "Gekopieerd ✓" confirmation. Falls back to mailto: if clipboard
   access fails for any reason. */
function setupEmailCopyButtons() {
  document.querySelectorAll('.footer-email-btn').forEach(btn => {
    const original = btn.textContent;
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.email);
        btn.textContent = 'Gekopieerd ✓';
        setTimeout(() => { btn.textContent = original; }, 1800);
      } catch {
        window.location.href = `mailto:${btn.dataset.email}`;
      }
    });
  });
}

/* "Overig werk" cards never change size — only .active (border/color)
   toggles, exactly like .stage.active on the pipeline pages. One shared
   #other-detail panel below the grid swaps its content per click, using
   the identical panelSpring/contentSpring swapDetail() pattern that
   pipeline.js already uses for its own shared #detail panel: panelSpring
   drives the panel's own maxHeight/opacity/blur/scale (open/close),
   contentSpring drives a quick fade of the text/link inside it whenever
   the content swaps while already open. */
function setupOtherItems() {
  const detailEl = document.getElementById('other-detail');
  const detailInner = document.getElementById('other-detail-inner');
  const textEl = document.getElementById('other-detail-text');
  const linkEl = document.getElementById('other-detail-link');
  const cards = Array.from(document.querySelectorAll('.other-item'));
  if (!detailEl || !detailInner || !textEl || !linkEl || cards.length === 0) return;

  const otherData = [
    { text: "Marketingvideo's en contentproductie voor ReFurnity naast de automation-projecten, inclusief filmwerk en montage.", link: 'https://youtu.be/hMSgtAx6nCA' },
    { text: 'Journalistieke explainer video over hoe vooroordelen ontstaan in AI-systemen door scheve datasets, ontwikkeld voor VPRO Medialab.', link: 'https://youtu.be/aALKHxeAM2g' },
    { text: "Video's voor eigen kanalen, gericht op het oefenen van hooks, pacing en montagetechnieken in een korte-vorm format." },
    { text: 'Marketingcampagne uitgewerkt op basis van de Pirate Funnel: A/B-tests, doelgroepanalyse en contentstrategie.' },
    { text: "TikTok-video's en posters voor de Impact Fair, content bedacht en gemaakt met AI, gemonteerd in DaVinci Resolve." },
    { text: 'Complete merkidentiteit en social media-strategie voor een fictieve AI-kunstenaar, van visuele stijl tot contentplanning.' },
    { text: 'Website gebouwd in Wix, van wireframes tot eindproductie, gericht op gebruiksgemak.' },
    { text: 'Chatbot voor eerstelijns juridische hulp bij schulden, gebouwd in Voiceflow voor Schuldenburg. Eerste kennismaking met conversational AI.' }
  ];

  cards.forEach((card, i) => {
    const title = card.querySelector('.other-title');
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-expanded', 'false');
    if (title) card.setAttribute('aria-label', `${title.textContent.trim()} — meer info`);
  });

  // No blur here (unlike pipeline.js's own #detail): animating filter:blur()
  // alongside transform/opacity/max-height on the same element is a known
  // source of flicker on mobile GPUs, which is also why pipeline.js hides
  // its #detail entirely on mobile instead of risking it. This panel stays
  // visible on mobile, so it sticks to opacity/translateY/scale only.
  let panelTargetHeight = 240;
  const panelSpring = new Spring({
    value: 0, response: 0.36, damping: 0.86,
    onUpdate: (v) => {
      const o = Math.max(0, Math.min(1, v));
      const scale = 0.965 + 0.035 * o;
      const translate = (1 - o) * -8;
      detailEl.style.opacity = o;
      detailEl.style.transform = `translateY(${translate}px) scale(${scale})`;
      detailEl.style.maxHeight = v <= 0.001 ? '0px' : `${Math.min(v, 1) * panelTargetHeight}px`;
      detailEl.style.padding = v <= 0.02 ? '0px 32px' : '30px 32px';
      detailEl.style.pointerEvents = v > 0.5 ? 'auto' : 'none';
    }
  });
  detailEl.style.maxHeight = '0px';
  detailEl.style.opacity = '0';
  detailEl.style.overflow = 'hidden';

  const contentSpring = new Spring({
    value: 1, response: 0.22, damping: 1.0,
    onUpdate: (v) => { detailInner.style.opacity = v; }
  });

  function swapDetail(data, wasOpen) {
    const apply = () => {
      textEl.textContent = data.text;
      if (data.link) {
        linkEl.href = data.link;
        linkEl.style.display = 'inline-block';
      } else {
        linkEl.style.display = 'none';
      }
      // detailInner has no height constraint of its own (only the outer
      // panel clips via max-height), so its scrollHeight always reflects
      // the real content height for the current viewport width — a fixed
      // pixel cap would either clip longer entries or leave a gap under
      // shorter ones, especially once text wraps differently on mobile.
      panelTargetHeight = detailInner.scrollHeight + 60;
      contentSpring.jumpTo(0);
      contentSpring.setTarget(1);
    };
    if (wasOpen) { contentSpring.setTarget(0); setTimeout(apply, 90); }
    else { apply(); }
    panelSpring.setTarget(1);
  }

  let activeIndex = null;

  function toggle(i) {
    const isSame = activeIndex === i;
    cards.forEach(c => { c.classList.remove('active'); c.setAttribute('aria-expanded', 'false'); });
    if (isSame) { panelSpring.setTarget(0); activeIndex = null; return; }
    const wasOpen = activeIndex !== null;
    activeIndex = i;
    cards[i].classList.add('active');
    cards[i].setAttribute('aria-expanded', 'true');
    swapDetail(otherData[i], wasOpen);
  }

  cards.forEach((card, i) => {
    card.addEventListener('click', () => toggle(i));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); toggle(i); }
    });
  });

  linkEl.addEventListener('click', (e) => e.stopPropagation());

  document.querySelectorAll('.other-video-preview').forEach(el => {
    el.addEventListener('click', (e) => e.stopPropagation());
  });
}

/* Job Alert Automation card: same inline materialize pattern as the shared
   Overig werk panel (opacity/translateY/scale/max-height, no blur, height
   measured from the content instead of a fixed cap), just simplified for a
   single card with static content — no content-crossfade needed since
   there's nothing to swap between. */
function setupJobAlertCard() {
  const card = document.getElementById('job-alert-card');
  const detailEl = document.getElementById('job-alert-detail');
  const detailInner = document.getElementById('job-alert-detail-inner');
  const codeLink = document.getElementById('job-alert-code-link');
  if (!card || !detailEl || !detailInner) return;

  card.setAttribute('tabindex', '0');
  card.setAttribute('role', 'button');
  card.setAttribute('aria-expanded', 'false');
  const title = card.querySelector('.project-title');
  if (title) card.setAttribute('aria-label', `${title.textContent.trim()} — meer info`);

  let isOpen = false;
  let panelTargetHeight = 200;
  const measureHeight = () => detailInner.scrollHeight + 60;

  const panelSpring = new Spring({
    value: 0, response: 0.36, damping: 0.86,
    onUpdate: (v) => {
      const o = Math.max(0, Math.min(1, v));
      const scale = 0.965 + 0.035 * o;
      const translate = (1 - o) * -8;
      detailEl.style.opacity = o;
      detailEl.style.transform = `translateY(${translate}px) scale(${scale})`;
      detailEl.style.maxHeight = v <= 0.001 ? '0px' : `${Math.min(v, 1) * panelTargetHeight}px`;
      detailEl.style.padding = v <= 0.02 ? '0px 32px' : '30px 32px';
      detailEl.style.pointerEvents = v > 0.5 ? 'auto' : 'none';
    }
  });
  detailEl.style.maxHeight = '0px';
  detailEl.style.opacity = '0';
  detailEl.style.overflow = 'hidden';

  function toggle() {
    isOpen = !isOpen;
    card.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) panelTargetHeight = measureHeight();
    panelSpring.setTarget(isOpen ? 1 : 0);
  }

  card.addEventListener('click', toggle);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); toggle(); }
  });

  // Re-measures and re-applies max-height directly (bypassing the spring,
  // which has already settled at this point) whenever the open panel's
  // natural content height changes for a reason other than the toggle
  // itself — the screenshot finishing its load, or the viewport resizing
  // (e.g. a phone rotation) reflowing how the text wraps.
  function syncOpenHeight() {
    if (!isOpen) return;
    panelTargetHeight = measureHeight();
    detailEl.style.maxHeight = `${panelTargetHeight}px`;
  }

  const screenshot = detailInner.querySelector('img');
  if (screenshot) screenshot.addEventListener('load', syncOpenHeight);
  window.addEventListener('resize', syncOpenHeight);

  if (codeLink) codeLink.addEventListener('click', (e) => e.stopPropagation());
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
