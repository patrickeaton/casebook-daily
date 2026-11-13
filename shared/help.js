// Casebook "how to play": a ? button in the page header that opens the game's instructions, and shows them
// automatically the first time someone opens that game in this browser.
//   <template data-howto data-title="Forgery"> …instructions HTML… </template>
//   <script src="../shared/help.js" data-game="forgery"></script>   (after menu.js, with modal.js loaded)
(() => {
  const me = document.currentScript;
  const tpl = document.querySelector('template[data-howto]');
  if (!tpl || !window.CasebookModal) return;
  const KEY = `casebook:help-seen:${me.dataset.game || location.pathname}`;

  document.head.insertAdjacentHTML('beforeend', `<style>
    .cb-right{display:flex;align-items:center;gap:12px;margin-left:auto}
    .cb-help{width:34px;height:34px;flex:none;border-radius:50%;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.06);color:inherit;
      font:700 17px "Courier Prime",monospace;cursor:pointer;display:grid;place-items:center;padding:0}
    .cb-help:hover{background:rgba(255,255,255,.15)}
    .cb-help:focus-visible{outline:3px solid #6fa0e0;outline-offset:2px}
  </style>`);

  // Put the button at the right-hand end of the header, keeping whatever was already there beside it.
  const header = document.querySelector('header');
  const btn = document.createElement('button');
  btn.className = 'cb-help'; btn.type = 'button'; btn.textContent = '?'; btn.setAttribute('aria-label', 'How to play');
  if (header) {
    const right = document.createElement('div'); right.className = 'cb-right';
    const last = header.lastElementChild;
    if (last && !last.classList.contains('cb-brand')) right.appendChild(last);
    right.appendChild(btn); header.appendChild(right);
  }

  const show = () => CasebookModal.open({ heading:'HOW TO PLAY', title: tpl.dataset.title || '', html: tpl.innerHTML, closeLabel:'Got it' });
  btn.addEventListener('click', show);

  // First visit to this game in this browser: show it once. Storage can be unavailable (private mode), so guard it.
  let seen = false;
  try { seen = localStorage.getItem(KEY) === '1'; } catch {}
  if (!seen) {
    setTimeout(show, 450);
    try { localStorage.setItem(KEY, '1'); } catch {}
  }
  window.CasebookHelp = { show };
})();
