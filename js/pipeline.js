/* ==========================================================================
   Milan Kemp — Portfolio: case-study pipeline renderer
   Shared by every page under /projects/.

   Mobile (<=780px): the stage grid renders and each card is its own
   accordion — tapping opens the detail content (same materialize spring:
   blur + scale + opacity) directly under that card and pushes the rest of
   the list down.

   Desktop (>780px): if the page provides a .diagram-wrap (currently only
   the offerte case study), the stage grid is replaced entirely by a small
   architecture diagram — a handful of nodes connected by a self-drawing
   SVG line — and node clicks drive the single shared #detail panel below
   it. Pages without .diagram-wrap keep the original 6-card grid + shared
   panel on desktop, unchanged (the LinkedIn case study).
   ========================================================================== */

function initPipeline(stagesData, { openIndex = 0, diagramData = null } = {}) {
  const stagesEl = document.getElementById('stages');
  const detailEl = document.getElementById('detail');
  const detailInner = document.getElementById('detail-inner');
  const headingEl = document.getElementById('detail-heading');
  const textEl = document.getElementById('detail-text');
  const badgesEl = document.getElementById('detail-badges');

  const mobileQuery = window.matchMedia('(max-width: 780px)');
  const hasDiagram = !!document.querySelector('.diagram-wrap');
  const stageEls = [];

  function onStageClick(i) {
    if (mobileQuery.matches) toggleMobileStage(i);
    else if (!hasDiagram) toggleStageDesktop(i);
    // desktop + hasDiagram: the grid is display:none (CSS), unreachable.
  }

  stagesData.forEach((stage, i) => {
    const el = document.createElement('div');
    el.className = 'stage';
    el.innerHTML = `
      <div class="stage-num">${String(i + 1).padStart(2, '0')}</div>
      <div class="stage-title">${stage.title}</div>
      <div class="stage-sub">${stage.sub}</div>
    `;
    attachMagneticTilt(el, { maxTilt: 9, lift: -3, hoverScale: 1.02, downScale: 0.97 });
    el.addEventListener('click', () => onStageClick(i));
    stagesEl.appendChild(el);
    stageEls.push(el);
  });

  /* ---------- Mobile: per-card accordion ---------- */

  let mobileActiveIndex = null;
  let mobilePanel = null;
  let mobileSpring = null;

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

  function toggleMobileStage(i) {
    const isSame = mobileActiveIndex === i;
    stageEls.forEach(el => el.classList.remove('active'));
    if (mobileActiveIndex !== null) closeMobilePanel();
    if (isSame) { mobileActiveIndex = null; return; }
    mobileActiveIndex = i;
    stageEls[i].classList.add('active');
    openMobilePanel(i);
  }

  mobileQuery.addEventListener('change', () => {
    stageEls.forEach(el => el.classList.remove('active'));
    if (mobilePanel) { mobilePanel.remove(); mobilePanel = null; mobileSpring = null; }
    mobileActiveIndex = null;
    activeIndex = null;
    panelSpring.jumpTo(0);
    document.querySelectorAll('.diagram-node').forEach(n => n.classList.remove('active'));
  });

  /* ---------- Shared #detail panel ---------- */

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

  function swapDetail(data, wasOpen) {
    const apply = () => {
      headingEl.childNodes[headingEl.childNodes.length - 1].textContent = data.heading;
      textEl.textContent = data.text;
      badgesEl.innerHTML = data.badges.map(b => `<span class="badge">${b}</span>`).join('');
      contentSpring.jumpTo(0);
      contentSpring.setTarget(1);
    };
    if (wasOpen) { contentSpring.setTarget(0); setTimeout(apply, 90); }
    else { apply(); }
    panelSpring.setTarget(1);
  }

  // Which .stage (by index) currently owns the shared panel — only reached
  // on desktop pages WITHOUT a diagram (the diagram hides the stage grid).
  let activeIndex = null;

  function toggleStageDesktop(i) {
    const isSame = activeIndex === i;
    stageEls.forEach(el => el.classList.remove('active'));
    if (isSame) { panelSpring.setTarget(0); activeIndex = null; return; }
    const wasOpen = activeIndex !== null;
    activeIndex = i;
    stageEls[i].classList.add('active');
    swapDetail(stagesData[i], wasOpen);
  }

  if (mobileQuery.matches) {
    if (openIndex !== null) toggleMobileStage(openIndex);
  } else if (!hasDiagram && openIndex !== null) {
    toggleStageDesktop(openIndex);
  }

  /* ---------- Desktop: architecture diagram ---------- */

  let diagramActiveNode = null;

  function openDiagramNode(node, data) {
    const isSame = diagramActiveNode === node;
    document.querySelectorAll('.diagram-node').forEach(n => n.classList.remove('active'));
    if (isSame) { panelSpring.setTarget(0); diagramActiveNode = null; return; }
    const wasOpen = diagramActiveNode !== null;
    diagramActiveNode = node;
    node.classList.add('active');
    swapDetail(data, wasOpen);
  }

  (function initDiagram() {
    const wrap = document.querySelector('.diagram-wrap');
    if (!wrap || !diagramData) return;

    const nodes = Array.from(wrap.querySelectorAll('.diagram-node'));
    nodes.forEach((node, i) => {
      attachMagneticTilt(node, { maxTilt: 6, lift: -2, hoverScale: 1.02, downScale: 0.97 });
      node.addEventListener('click', () => openDiagramNode(node, diagramData[i]));
    });

    const paths = Array.from(wrap.querySelectorAll('.diagram-path'));
    const pulse = wrap.querySelector('.diagram-pulse');

    if (paths.length) {
      const lengths = paths.map(p => p.getTotalLength());
      paths.forEach((p, i) => {
        p.style.strokeDasharray = String(lengths[i]);
        p.style.strokeDashoffset = String(lengths[i]);
      });

      let pendingSprings = 0;
      const drawSprings = paths.map((p, i) => new Spring({
        value: 0, response: 0.65, damping: 1,
        onUpdate: v => { p.style.strokeDashoffset = String(lengths[i] * (1 - Math.max(0, Math.min(1, v)))); },
        onSettle: () => { pendingSprings--; if (pendingSprings <= 0) runPulseOnce(); }
      }));

      function runPulseOnce() {
        if (REDUCED_MOTION || !pulse) return;
        const totalLen = lengths.reduce((a, b) => a + b, 0);
        const duration = 1300;
        let start = null;
        pulse.style.opacity = '1';
        function frame(t) {
          if (!start) start = t;
          const elapsed = t - start;
          const progressLen = Math.min(elapsed / duration, 1) * totalLen;
          let acc = 0, segIndex = 0, localLen = 0;
          for (let i = 0; i < lengths.length; i++) {
            const segEnd = acc + lengths[i];
            if (progressLen <= segEnd || i === lengths.length - 1) {
              segIndex = i;
              localLen = Math.max(0, Math.min(progressLen - acc, lengths[i]));
              break;
            }
            acc = segEnd;
          }
          const pt = paths[segIndex].getPointAtLength(localLen);
          pulse.setAttribute('cx', pt.x);
          pulse.setAttribute('cy', pt.y);
          if (elapsed < duration) requestAnimationFrame(frame);
          else pulse.style.opacity = '0';
        }
        requestAnimationFrame(frame);
      }

      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          pendingSprings = drawSprings.length;
          drawSprings.forEach((s, i) => setTimeout(() => s.setTarget(1), i * 140));
          io.unobserve(entry.target);
        });
      }, { threshold: 0.35 });
      io.observe(wrap);
    }

    if (nodes.length) openDiagramNode(nodes[0], diagramData[0]);
  })();
}
