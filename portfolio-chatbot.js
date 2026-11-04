/*
 * Portfolio RAG chatbot widget — vanilla JS, no dependencies.
 *
 * Embed on your site with one line:
 *
 *   <script src="portfolio-chatbot.js"
 *           data-api="https://your-api-host.example.com"></script>
 *
 * data-api  = base URL of the FastAPI service (no trailing slash).
 * data-title (optional) = header text, default "Vraag het mijn portfolio".
 *
 * The script injects its own styles and a floating button in the bottom
 * right. Everything is scoped under the .prc- class prefix.
 */
(function () {
  "use strict";

  var self = document.currentScript;
  var API = (self && self.dataset.api ? self.dataset.api : "").replace(/\/$/, "");
  var TITLE = (self && self.dataset.title) || "Vraag het mijn portfolio";

  if (!API) {
    console.error("[portfolio-chatbot] missing data-api attribute on script tag");
    return;
  }

  /* ---------- styles ---------- */
  var css = `
  /* Gebruikt de design-tokens van de site (--accent, --border, --shadow-*,
     --display/--body/--mono); de waarden na de komma zijn fallbacks voor als
     de widget op een pagina zonder styles.css staat. */
  .prc-btn{--prc-ico:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z'/%3E%3C/svg%3E");
    position:fixed;right:20px;bottom:20px;z-index:2147483000;
    width:56px;height:56px;padding:0;border-radius:50%;border:none;cursor:pointer;
    display:flex;align-items:center;justify-content:center;font-size:0;
    background:linear-gradient(135deg,var(--accent,#41c21d),var(--accent2-text,#0f8f81));
    box-shadow:0 10px 24px rgba(65,194,29,.32),var(--shadow-sm,0 3px 12px rgba(30,60,10,.05));
    transition:transform .25s cubic-bezier(.16,1,.3,1),box-shadow .25s ease;
    touch-action:manipulation;-webkit-tap-highlight-color:transparent}
  .prc-btn::before{content:"";width:24px;height:24px;background:#fff;
    -webkit-mask:var(--prc-ico) center/contain no-repeat;mask:var(--prc-ico) center/contain no-repeat}
  .prc-btn:hover{transform:scale(1.06);
    box-shadow:0 14px 30px rgba(65,194,29,.4),var(--shadow-sm,0 3px 12px rgba(30,60,10,.05))}
  .prc-btn:active{transform:scale(.95)}
  .prc-btn:focus-visible,.prc-close:focus-visible,.prc-send:focus-visible{outline:none;
    box-shadow:0 0 0 3px rgba(65,194,29,.45)}

  .prc-panel{position:fixed;right:20px;bottom:88px;z-index:2147483000;
    width:360px;max-width:calc(100vw - 40px);height:520px;
    max-height:calc(100vh - 120px);max-height:calc(100dvh - 120px);
    display:none;flex-direction:column;
    background:linear-gradient(155deg,#fff,var(--surface-solid,#fffefb) 60%,rgba(45,212,191,.05));
    color:var(--text,#1d1d1f);
    border:1px solid var(--border,rgba(0,0,0,.065));border-radius:22px;overflow:hidden;
    box-shadow:var(--shadow-lg,0 28px 68px rgba(30,60,10,.15),0 10px 24px rgba(30,60,10,.07));
    font:14px/1.5 var(--body,-apple-system,BlinkMacSystemFont,"SF Pro Text","Inter",sans-serif);
    letter-spacing:-.004em;-webkit-font-smoothing:antialiased}
  .prc-panel.prc-open{display:flex;animation:prc-in .3s cubic-bezier(.16,1,.3,1)}
  @keyframes prc-in{from{opacity:0;transform:translateY(8px) scale(.965)}to{opacity:1;transform:none}}

  .prc-head{padding:14px 14px 14px 18px;background:var(--bg,#f4f3ef);
    border-bottom:1px solid var(--border,rgba(0,0,0,.065));
    display:flex;justify-content:space-between;align-items:center}
  .prc-head span{display:flex;align-items:center;gap:8px;
    font:600 14.5px/1.3 var(--display,-apple-system,BlinkMacSystemFont,"SF Pro Display","Inter",sans-serif);
    letter-spacing:-.012em}
  .prc-head span::before{content:"";width:6px;height:6px;border-radius:50%;
    background:var(--accent,#41c21d);flex-shrink:0}
  .prc-close{width:28px;height:28px;border-radius:50%;background:none;border:none;
    font-size:20px;line-height:1;cursor:pointer;color:var(--text-faint,#98989d);
    display:flex;align-items:center;justify-content:center;padding:0}
  .prc-close:hover{background:rgba(0,0,0,.05);color:var(--text,#1d1d1f)}

  .prc-log{flex:1;overflow-y:auto;overscroll-behavior:contain;padding:16px;
    display:flex;flex-direction:column;gap:10px}
  .prc-msg{max-width:85%;padding:10px 13px;border-radius:16px;font-size:13.5px;line-height:1.55;
    white-space:pre-wrap;word-wrap:break-word}
  .prc-user{align-self:flex-end;color:#fff;border-bottom-right-radius:5px;
    background:linear-gradient(135deg,var(--accent,#41c21d),var(--accent2-text,#0f8f81));
    box-shadow:0 6px 16px rgba(65,194,29,.22)}
  .prc-bot{align-self:flex-start;background:var(--surface-solid,#fffefb);
    color:var(--text,#1d1d1f);border:1px solid var(--border,rgba(0,0,0,.065));
    border-bottom-left-radius:5px;box-shadow:var(--shadow-sm,0 3px 12px rgba(30,60,10,.05))}
  .prc-sources{align-self:flex-start;max-width:85%;margin-top:-4px;
    font:11px/1.4 var(--mono,ui-monospace,"SF Mono","Menlo",monospace);
    color:var(--text-faint,#98989d)}
  .prc-sources span{display:inline-block;margin:3px 4px 0 0;padding:3px 8px;border-radius:8px;
    color:var(--text,#1d1d1f);font-size:10.5px;
    background:linear-gradient(135deg,rgba(65,194,29,.1),rgba(45,212,191,.08));
    border:1px solid var(--border,rgba(0,0,0,.065))}
  .prc-hint{align-self:center;text-align:center;padding:0 8px;
    font:11.5px/1.5 var(--mono,ui-monospace,"SF Mono","Menlo",monospace);
    color:var(--text-faint,#98989d)}
  .prc-dots{align-self:flex-start;padding:12px 14px;border-radius:16px;border-bottom-left-radius:5px;
    background:var(--surface-solid,#fffefb);border:1px solid var(--border,rgba(0,0,0,.065))}
  .prc-dots i{display:inline-block;width:6px;height:6px;margin:0 2px;border-radius:50%;
    background:var(--accent,#41c21d);animation:prc-b 1.2s infinite ease-in-out both}
  .prc-dots i:nth-child(2){animation-delay:.16s}
  .prc-dots i:nth-child(3){animation-delay:.32s}
  @keyframes prc-b{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}

  .prc-form{display:flex;gap:8px;padding:12px;border-top:1px solid var(--border,rgba(0,0,0,.065));
    background:rgba(255,255,255,.55)}
  .prc-input{flex:1;min-width:0;padding:10px 13px;border-radius:12px;font:inherit;outline:none;
    color:var(--text,#1d1d1f);background:var(--surface-solid,#fffefb);
    border:1px solid var(--border-strong,rgba(0,0,0,.11))}
  .prc-input::placeholder{color:var(--text-faint,#98989d)}
  .prc-input:focus{border-color:var(--accent,#41c21d);box-shadow:0 0 0 3px rgba(65,194,29,.2)}
  .prc-input:disabled{opacity:.6}
  .prc-send{border:none;color:#fff;border-radius:12px;padding:0 16px;cursor:pointer;
    font:inherit;font-weight:600;touch-action:manipulation;
    background:linear-gradient(135deg,var(--accent,#41c21d),var(--accent2-text,#0f8f81));
    box-shadow:0 6px 16px rgba(65,194,29,.25);transition:transform .2s cubic-bezier(.16,1,.3,1)}
  .prc-send:active{transform:scale(.96)}
  .prc-send:disabled{opacity:.45;cursor:not-allowed;transform:none}

  /* De site toont boven 980px een vaste dot-nav rechts (28 tot 37px van de rand);
     schuif knop en paneel daarvoor op zodat het geopende paneel hem niet bedekt. */
  @media (min-width:981px){.prc-btn,.prc-panel{right:60px}}
  /* 16px voorkomt dat iOS Safari inzoomt zodra je in het invoerveld tikt. */
  @media (max-width:640px){.prc-input{font-size:16px}}
  @media (prefers-reduced-motion:reduce){
    .prc-panel.prc-open,.prc-dots i{animation:none}
    .prc-btn,.prc-send{transition:none}
  }`;
  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  /* ---------- DOM ---------- */
  var btn = el("button", "prc-btn", { title: TITLE });
  btn.textContent = "💬";

  var panel = el("div", "prc-panel");
  panel.innerHTML =
    '<div class="prc-head"><span></span><button class="prc-close" aria-label="Sluiten">×</button></div>' +
    '<div class="prc-log"></div>' +
    '<form class="prc-form">' +
    '<input class="prc-input" type="text" placeholder="Stel een vraag over een project…" ' +
    'maxlength="500" autocomplete="off">' +
    '<button class="prc-send" type="submit">Stuur</button>' +
    "</form>";
  panel.querySelector(".prc-head span").textContent = TITLE;

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  var log = panel.querySelector(".prc-log");
  var form = panel.querySelector(".prc-form");
  var input = panel.querySelector(".prc-input");
  var sendBtn = panel.querySelector(".prc-send");

  addHint(
    "Antwoorden komen uitsluitend uit Milans eigen projectteksten, met bronvermelding."
  );

  /* ---------- behaviour ---------- */
  btn.addEventListener("click", function () {
    panel.classList.toggle("prc-open");
    if (panel.classList.contains("prc-open")) input.focus();
  });
  panel.querySelector(".prc-close").addEventListener("click", function () {
    panel.classList.remove("prc-open");
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var q = input.value.trim();
    if (!q || sendBtn.disabled) return;
    input.value = "";
    addMsg(q, "prc-user");
    ask(q);
  });

  function ask(question) {
    setBusy(true);
    var dots = el("div", "prc-dots");
    dots.innerHTML = "<i></i><i></i><i></i>";
    log.appendChild(dots);
    scroll();

    fetch(API + "/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question }),
    })
      .then(function (r) {
        return r.json().then(function (data) {
          if (!r.ok) {
            var e = new Error(data.detail || "HTTP " + r.status);
            e.rateLimited = r.status === 429;
            throw e;
          }
          return data;
        });
      })
      .then(function (data) {
        dots.remove();
        addMsg(data.answer || "(geen antwoord)", "prc-bot");
        if (data.sources && data.sources.length) addSources(data.sources);
      })
      .catch(function (err) {
        dots.remove();
        addMsg(
          err.rateLimited
            ? err.message
            : "Er ging iets mis bij het ophalen van een antwoord. Probeer het later opnieuw.",
          "prc-bot"
        );
      })
      .finally(function () {
        setBusy(false);
        input.focus();
      });
  }

  function setBusy(b) {
    sendBtn.disabled = b;
    input.disabled = b;
  }

  /* ---------- helpers ---------- */
  function addMsg(text, cls) {
    var m = el("div", "prc-msg " + cls);
    m.textContent = text;
    log.appendChild(m);
    scroll();
  }
  function addSources(list) {
    var s = el("div", "prc-sources");
    s.appendChild(document.createTextNode("Bron: "));
    list.forEach(function (src) {
      var tag = document.createElement("span");
      tag.textContent = src;
      s.appendChild(tag);
    });
    log.appendChild(s);
    scroll();
  }
  function addHint(text) {
    var h = el("div", "prc-hint");
    h.textContent = text;
    log.appendChild(h);
  }
  function el(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function scroll() {
    log.scrollTop = log.scrollHeight;
  }
})();
