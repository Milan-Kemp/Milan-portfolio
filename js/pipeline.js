/* ==========================================================================
   Milan Kemp — Portfolio: case-study pipeline renderer
   Shared by every page under /projects/.

   Mobile (<=780px): the stage grid renders and each card is its own
   accordion — tapping opens the detail content (same materialize spring:
   blur + scale + opacity) directly under that card and pushes the rest of
   the list down.

   Desktop (>780px): if the page provides a .canvas (currently only the
   offerte case study), the stage grid is replaced entirely by an N8N-style
   canvas diagram — a handful of nodes connected by self-drawing bezier
   curves — and node clicks drive the single shared #detail panel below it.
   Pages without .canvas keep the original 6-card grid + shared panel on
   desktop, unchanged (the LinkedIn case study).
   ========================================================================== */

function initPipeline(stagesData, { openIndex = 0, diagramData = null } = {}) {
  const stagesEl = document.getElementById('stages');
  const detailEl = document.getElementById('detail');
  const detailInner = document.getElementById('detail-inner');
  const headingEl = document.getElementById('detail-heading');
  const textEl = document.getElementById('detail-text');
  const badgesEl = document.getElementById('detail-badges');

  const mobileQuery = window.matchMedia('(max-width: 780px)');
  const hasDiagram = !!document.querySelector('.canvas');
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
    document.querySelectorAll('.node').forEach(n => n.classList.remove('active'));
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
    const wrap = document.querySelector('.canvas');
    if (!wrap || !diagramData) return;

    const svg = wrap.querySelector('.canvas-svg');
    const nodes = Array.from(wrap.querySelectorAll('.node'));
    nodes.forEach((node, i) => {
      attachMagneticTilt(node, { maxTilt: 6, lift: -2, hoverScale: 1.02, downScale: 0.97 });
      node.addEventListener('click', () => openDiagramNode(node, diagramData[i]));
    });

    // Connector paths can't be hardcoded: .canvas-svg spans the canvas's
    // padding-box (absolute, width:100%) while .nodes-row spans its
    // content-box (normal flow), so a fixed viewBox never lines up with
    // real port positions. Instead measure ports live and draw straight
    // into the SVG's own pixel space every time layout can change.
    let drawn = false;
    let drawSprings = [];

    function buildConnectors() {
      svg.querySelectorAll('.conn').forEach(p => p.remove());
      if (mobileQuery.matches) return [];
      const svgRect = svg.getBoundingClientRect();
      if (!svgRect.width || !svgRect.height) return [];
      svg.setAttribute('viewBox', `0 0 ${svgRect.width} ${svgRect.height}`);

      const paths = [];
      for (let i = 0; i < nodes.length - 1; i++) {
        const outPort = nodes[i].querySelector('.port-out');
        const inPort = nodes[i + 1].querySelector('.port-in');
        if (!outPort || !inPort) continue;
        const r1 = outPort.getBoundingClientRect();
        const r2 = inPort.getBoundingClientRect();
        const x1 = r1.left + r1.width / 2 - svgRect.left;
        const y1 = r1.top + r1.height / 2 - svgRect.top;
        const x2 = r2.left + r2.width / 2 - svgRect.left;
        const y2 = r2.top + r2.height / 2 - svgRect.top;
        const midX = (x1 + x2) / 2;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'conn');
        path.setAttribute('d', `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`);
        svg.appendChild(path);
        paths.push(path);
      }
      return paths;
    }

    function layout() {
      const paths = buildConnectors();
      drawSprings = paths.map(path => {
        const len = path.getTotalLength();
        if (drawn) {
          path.style.strokeDasharray = 'none';
          path.style.strokeDashoffset = '0';
        } else {
          path.style.strokeDasharray = String(len);
          path.style.strokeDashoffset = String(len);
        }
        return {
          path, len,
          spring: new Spring({
            value: drawn ? 1 : 0, response: 0.65, damping: 1,
            onUpdate: v => { path.style.strokeDashoffset = String(len * (1 - Math.max(0, Math.min(1, v)))); }
          })
        };
      });
    }

    layout();
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      if (mobileQuery.matches) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(layout, 120);
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        drawn = true;
        drawSprings.forEach((s, i) => setTimeout(() => s.spring.setTarget(1), i * 140));
        io.unobserve(entry.target);
      });
    }, { threshold: 0.35 });
    io.observe(wrap);

    if (nodes.length) openDiagramNode(nodes[0], diagramData[0]);
  })();
}
