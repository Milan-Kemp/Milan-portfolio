/* ==========================================================================
   Milan Kemp — Portfolio: case-study pipeline renderer
   Shared by every page under /projects/. Renders the stage grid from a data
   array and drives the detail panel with a materialize animation
   (blur + scale + opacity together, not just a fade).

   Desktop (>780px): one shared #detail panel below the stage row.
   Mobile (<=780px): each stage is its own accordion — a single panel glued
   to the bottom of a 6-item list reads as "attached to the wrong card" once
   you've scrolled past card 1, so the detail content opens directly under
   the tapped card instead and pushes the rest of the list down.
   ========================================================================== */

function initPipeline(stagesData, { openIndex = 0 } = {}) {
  const stagesEl = document.getElementById('stages');
  const detailEl = document.getElementById('detail');
  const detailInner = document.getElementById('detail-inner');
  const headingEl = document.getElementById('detail-heading');
  const textEl = document.getElementById('detail-text');
  const badgesEl = document.getElementById('detail-badges');

  const mobileQuery = window.matchMedia('(max-width: 780px)');

  let activeIndex = null;       // desktop shared-panel state
  let mobileActiveIndex = null; // mobile accordion state
  let mobilePanel = null;
  let mobileSpring = null;

  const stageEls = [];

  stagesData.forEach((stage, i) => {
    const el = document.createElement('div');
    el.className = 'stage';
    el.innerHTML = `
      <div class="stage-num">${String(i + 1).padStart(2, '0')}</div>
      <div class="stage-title">${stage.title}</div>
      <div class="stage-sub">${stage.sub}</div>
    `;
    attachMagneticTilt(el, { maxTilt: 9, lift: -3, hoverScale: 1.02, downScale: 0.97 });
    el.addEventListener('click', () => toggleStage(i));
    stagesEl.appendChild(el);
    stageEls.push(el);
  });

  /* ---------- Desktop: shared panel ---------- */

  const panelSpring = new Spring({
    value: 0, response: 0.36, damping: 0.86,
    onUpdate: (v) => {
      const o = Math.max(0, Math.min(1, v));
      const scale = 0.965 + 0.035 * o;
      const blur = (1 - o) * 6;
      const translate = (1 - o) * -8;
      detailEl.style.opacity = o;
      detailEl.style.transform = `translateY(${translate}px) scale(${scale})`;
      detailEl.style.filter = `blur(${blur}px)`;
      detailEl.style.maxHeight = v <= 0.001 ? '0px' : `${Math.min(v, 1) * 360}px`;
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

  function toggleStageDesktop(i) {
    const isSame = activeIndex === i;
    stageEls.forEach(el => el.classList.remove('active'));
    syncArchNodes(isSame ? null : i);

    if (isSame) { panelSpring.setTarget(0); activeIndex = null; return; }

    const wasOpen = activeIndex !== null;
    activeIndex = i;
    stageEls[i].classList.add('active');

    const data = stagesData[i];
    const swapContent = () => {
      headingEl.childNodes[headingEl.childNodes.length - 1].textContent = data.heading;
      textEl.textContent = data.text;
      badgesEl.innerHTML = data.badges.map(b => `<span class="badge">${b}</span>`).join('');
      contentSpring.jumpTo(0);
      contentSpring.setTarget(1);
    };

    if (wasOpen) { contentSpring.setTarget(0); setTimeout(swapContent, 90); }
    else { swapContent(); }

    panelSpring.setTarget(1);
  }

  /* ---------- Mobile: per-card accordion ---------- */

  function mobilePanelMarkup(data) {
    return `
      <div class="detail-inner">
        <div>
          <div class="detail-heading"><span></span>${data.heading}</div>
          <div class="detail-text">${data.text}</div>
        </div>
        <div>
          <div class="detail-heading" style="color:var(--text-faint)"><span style="background:var(--text-faint)"></span>Tech</div>
          <div class="badges">${data.badges.map(b => `<span class="badge">${b}</span>`).join('')}</div>
        </div>
      </div>
    `;
  }

  function closeMobilePanel() {
    if (!mobileSpring) return;
    mobileSpring.setTarget(0);
    mobilePanel = null;
    mobileSpring = null;
  }

  function openMobilePanel(i) {
    const data = stagesData[i];
    const panel = document.createElement('div');
    panel.className = 'detail';
    panel.innerHTML = mobilePanelMarkup(data);
    panel.style.overflow = 'hidden';
    panel.style.maxHeight = '0px';
    panel.style.opacity = '0';
    stageEls[i].insertAdjacentElement('afterend', panel);

    const targetHeight = panel.scrollHeight;
    const spring = new Spring({
      value: 0, response: 0.36, damping: 0.86,
      onUpdate: (v) => {
        const o = Math.max(0, Math.min(1, v));
        const scale = 0.965 + 0.035 * o;
        const blur = (1 - o) * 6;
        const translate = (1 - o) * -8;
        panel.style.opacity = o;
        panel.style.transform = `translateY(${translate}px) scale(${scale})`;
        panel.style.filter = `blur(${blur}px)`;
        panel.style.maxHeight = v <= 0.001 ? '0px' : `${Math.min(v, 1) * targetHeight}px`;
      },
      onSettle: () => { if (spring.target === 0) panel.remove(); }
    });

    mobilePanel = panel;
    mobileSpring = spring;
    requestAnimationFrame(() => spring.setTarget(1));
  }

  function toggleStageMobile(i) {
    const isSame = mobileActiveIndex === i;
    stageEls.forEach(el => el.classList.remove('active'));

    if (mobileActiveIndex !== null) closeMobilePanel();

    if (isSame) { mobileActiveIndex = null; return; }

    mobileActiveIndex = i;
    stageEls[i].classList.add('active');
    openMobilePanel(i);
  }

  function toggleStage(i) {
    if (mobileQuery.matches) toggleStageMobile(i);
    else toggleStageDesktop(i);
  }

  // Crossing the breakpoint mid-session (devtools resize, tablet rotation)
  // — reset hard rather than trying to carry accordion/panel state across.
  mobileQuery.addEventListener('change', () => {
    stageEls.forEach(el => el.classList.remove('active'));
    if (mobilePanel) { mobilePanel.remove(); mobilePanel = null; mobileSpring = null; }
    mobileActiveIndex = null;
    activeIndex = null;
    panelSpring.jumpTo(0);
    syncArchNodes(null);
  });

  /* ---------- Optional desktop architecture diagram ---------- */
  // Present only on pages that include the .arch-diagram markup (currently
  // the offerte case study); a no-op everywhere else.

  function syncArchNodes(i) {
    const nodes = document.querySelectorAll('.arch-node');
    if (!nodes.length) return;
    nodes.forEach(n => n.classList.toggle('active', i !== null && parseInt(n.dataset.stage, 10) === i));
  }

  (function initArchDiagram() {
    const wrap = document.querySelector('.arch-diagram');
    if (!wrap) return;
    const path = document.getElementById('archPath');
    const pulse = document.getElementById('archPulse');
    if (!path || !pulse) return;

    const len = path.getTotalLength();
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = String(len);
    pulse.style.opacity = '0';

    const drawSpring = new Spring({
      value: 0, response: 1.1, damping: 1,
      onUpdate: v => { path.style.strokeDashoffset = String(len * (1 - Math.max(0, Math.min(1, v)))); }
    });

    let pulseRAF = null;
    function startPulse() {
      if (REDUCED_MOTION || pulseRAF) return;
      const duration = 3200;
      let start = null;
      pulse.style.opacity = '1';
      const frame = (t) => {
        if (!start) start = t;
        const progress = ((t - start) % duration) / duration;
        const pt = path.getPointAtLength(progress * len);
        pulse.setAttribute('cx', pt.x);
        pulse.setAttribute('cy', pt.y);
        pulseRAF = requestAnimationFrame(frame);
      };
      pulseRAF = requestAnimationFrame(frame);
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        drawSpring.setTarget(1);
        setTimeout(startPulse, 900);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    io.observe(wrap);

    wrap.querySelectorAll('.arch-node').forEach(node => {
      const idx = parseInt(node.dataset.stage, 10);
      attachMagneticTilt(node, { maxTilt: 5, lift: -2, hoverScale: 1.03, downScale: 0.96 });
      node.addEventListener('click', () => {
        toggleStage(idx);
        stagesEl.scrollIntoView({ behavior: REDUCED_MOTION ? 'auto' : 'smooth', block: 'center' });
      });
    });
  })();

  if (openIndex !== null) toggleStage(openIndex);
}
