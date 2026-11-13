// Casebook side panel: a right-hand drawer for a game's clues/rules/evidence.
//
// In the page:
//   <div data-side-buttons></div>                              ← where the sticky button bar goes
//   <section data-side="clues" data-side-label="What we know" data-side-note="Always true."> …cards… </section>
// Each [data-side] section is moved into the panel as a tab. The button shows a count of [data-n] cards in it.
// The panel is non-modal: the puzzle stays usable while it's open. Wide screens open it by default.
(() => {
  const sections = [...document.querySelectorAll('[data-side]')];
  const slot = document.querySelector('[data-side-buttons]');
  if (!sections.length || !slot) return;

  const css = `
  .sp-bar{position:sticky;top:var(--cb-head-h,0px);z-index:30;display:flex;gap:8px;padding:10px 0;margin:4px 0 6px;background:var(--bg2, var(--sp-bar-bg,#1b1d22));box-shadow:0 0 0 100vmax var(--bg2, var(--sp-bar-bg,#1b1d22));clip-path:inset(0 -100vmax)}
  .sp-btn{font:700 13px "Courier Prime",monospace;letter-spacing:.06em;background:rgba(255,255,255,.08);color:inherit;border:1px solid rgba(255,255,255,.22);
    border-radius:20px;padding:8px 14px;cursor:pointer;display:inline-flex;align-items:center;gap:7px}
  .sp-btn:hover{background:rgba(255,255,255,.14)}
  .sp-btn b{background:#c0392b;color:#fff;border-radius:10px;padding:0 7px;font-size:11px;line-height:18px}
  .sp-btn.on{background:#ece8de;color:#1f2328}
  .sp{position:fixed;top:0;right:0;bottom:0;width:min(400px,100vw);background:var(--sp-bg,#15171c);color:#ece8de;z-index:40;transform:translateX(102%);
    transition:transform .25s ease-out;box-shadow:-10px 0 30px rgba(0,0,0,.45);display:flex;flex-direction:column}
  body.sp-on .sp{transform:none}
  @media (max-width:640px){.sp{width:100vw}}   /* phones: always full width */
  .sp-head{display:flex;align-items:center;justify-content:space-between;padding:calc(14px + env(safe-area-inset-top)) 14px 10px 16px;border-bottom:1px solid rgba(255,255,255,.1)}
  .sp-tabs{display:flex;gap:4px}
  .sp-tabs button{font:700 12px "Courier Prime",monospace;letter-spacing:.14em;text-transform:uppercase;background:transparent;color:#a3a7b0;
    border:1px solid transparent;border-radius:4px;padding:7px 10px;cursor:pointer}
  .sp-tabs button[aria-selected="true"]{color:#ece8de;border-color:rgba(255,255,255,.25);background:rgba(255,255,255,.06)}
  .sp-x{border:0;background:none;color:#ece8de;font-size:28px;line-height:1;cursor:pointer;padding:2px 8px}
  .sp-body{overflow-y:auto;padding:12px 16px calc(24px + env(safe-area-inset-bottom));flex:1}
  .sp-note{font:12px "Courier Prime",monospace;letter-spacing:.08em;color:#9aa0aa;margin:2px 0 12px}
  .sp .wrap-in{display:grid;gap:8px}
  /* On wide screens make room by sliding the body's right padding to the panel's width. Unlike switching
     margin:auto to a fixed value, padding animates, so the page glides over in step with the panel. */
  body{transition:padding-right .25s ease-out}
  @media (min-width:1000px){body.sp-on{padding-right:400px}}`;
  document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);

  const tabs = sections.map(s => ({ id: s.dataset.side, label: s.dataset.sideLabel || s.dataset.side, note: s.dataset.sideNote || '', el: s }));
  slot.className = 'sp-bar';
  slot.innerHTML = tabs.map(t => `<button class="sp-btn" data-sp-open="${t.id}">${t.label} <b data-sp-count="${t.id}"></b></button>`).join('');

  const panel = document.createElement('aside');
  panel.className = 'sp'; panel.setAttribute('aria-hidden', 'true'); panel.setAttribute('aria-label', tabs.map(t => t.label).join(' and '));
  panel.innerHTML = `<div class="sp-head"><div class="sp-tabs" role="tablist">${tabs.map(t => `<button role="tab" data-sp-tab="${t.id}">${t.label}</button>`).join('')}</div>
    <button class="sp-x" aria-label="Close panel">×</button></div><div class="sp-body"></div>`;
  const body = panel.querySelector('.sp-body');
  for (const t of tabs) {
    const pane = document.createElement('section'); pane.dataset.spPane = t.id; pane.hidden = true;
    if (t.note) pane.insertAdjacentHTML('beforeend', `<p class="sp-note">${t.note}</p>`);
    t.el.querySelectorAll('h2').forEach(h => h.remove());   // the tab label replaces the section heading
    while (t.el.firstChild) pane.appendChild(t.el.firstChild);
    t.el.remove(); body.appendChild(pane);
  }
  document.body.appendChild(panel);
  if (tabs.length === 1) panel.querySelector('.sp-tabs').innerHTML = `<button role="tab" aria-selected="true" tabindex="-1">${tabs[0].label}</button>`;

  let open = null;
  const show = id => {
    open = id; document.body.classList.add('sp-on'); panel.setAttribute('aria-hidden', 'false');
    panel.querySelectorAll('[data-sp-tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.spTab === id));
    panel.querySelectorAll('[data-sp-pane]').forEach(p => p.hidden = p.dataset.spPane !== id);
    slot.querySelectorAll('[data-sp-open]').forEach(b => b.classList.toggle('on', b.dataset.spOpen === id));
  };
  const hide = () => { open = null; document.body.classList.remove('sp-on'); panel.setAttribute('aria-hidden', 'true'); slot.querySelectorAll('.sp-btn').forEach(b => b.classList.remove('on')); };
  slot.addEventListener('click', e => { const b = e.target.closest('[data-sp-open]'); if (b) (open === b.dataset.spOpen ? hide() : show(b.dataset.spOpen)); });
  panel.querySelector('.sp-tabs').addEventListener('click', e => { const b = e.target.closest('[data-sp-tab]'); if (b) show(b.dataset.spTab); });
  panel.querySelector('.sp-x').onclick = hide;
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && open && !document.body.classList.contains('cb-on')) hide(); });

  // Counts update whenever the cards inside change (pages render them after this script runs).
  const count = () => tabs.forEach(t => { const n = panel.querySelectorAll(`[data-sp-pane="${t.id}"] [data-n]`).length; const b = slot.querySelector(`[data-sp-count="${t.id}"]`); b.textContent = n; b.hidden = !n; });
  new MutationObserver(count).observe(body, { childList: true, subtree: true }); count();

  if (matchMedia('(min-width:1000px)').matches) show(tabs[0].id);
  window.CasebookSide = { show, hide };
})();
