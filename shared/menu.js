// Casebook: the shared games menu. Each game page includes:
//   <script src="<root>/shared/menu.js" data-root="<root>" data-game="<id>"></script>
// It adds a menu button to the page's <header> and a slide-out drawer listing every game.
(() => {
  const me = document.currentScript;
  const root = (me.dataset.root || '.').replace(/\/$/, '');
  const current = me.dataset.game;

  const ICONS = {
    // a document with one word struck through in red
    forgery: `<svg viewBox="0 0 48 48"><rect x="6" y="4" width="36" height="40" rx="3" fill="#f4ecda"/><rect x="6" y="4" width="36" height="40" rx="3" fill="none" stroke="#b9a988" stroke-width="2"/>
      <rect x="12" y="13" width="24" height="3" rx="1.5" fill="#8a7d6c"/><rect x="12" y="21" width="9" height="3" rx="1.5" fill="#8a7d6c"/><rect x="24" y="21" width="12" height="3" rx="1.5" fill="#b3261e"/>
      <path d="M22 26.5 L38 18.5" stroke="#b3261e" stroke-width="2.5" stroke-linecap="round"/><rect x="12" y="29" width="20" height="3" rx="1.5" fill="#8a7d6c"/><rect x="12" y="37" width="14" height="3" rx="1.5" fill="#8a7d6c"/></svg>`,
    // three statement cards marked green / yellow / red
    testimony: `<svg viewBox="0 0 48 48"><rect x="4" y="5" width="40" height="11" rx="2" fill="#f6f1e4"/><rect x="4" y="5" width="5" height="11" rx="1.5" fill="#2e7d4f"/>
      <rect x="4" y="19" width="40" height="11" rx="2" fill="#f6f1e4"/><rect x="4" y="19" width="5" height="11" rx="1.5" fill="#d19a12"/>
      <rect x="4" y="33" width="40" height="11" rx="2" fill="#f6f1e4"/><rect x="4" y="33" width="5" height="11" rx="1.5" fill="#b3261e"/>
      <rect x="13" y="9.5" width="22" height="2.5" rx="1" fill="#8a8270"/><rect x="13" y="23.5" width="16" height="2.5" rx="1" fill="#8a8270"/><rect x="13" y="37.5" width="25" height="2.5" rx="1" fill="#8a8270"/></svg>`,
    // a ledger grid with one cell circled in red
    cooked: `<svg viewBox="0 0 48 48"><rect x="5" y="6" width="38" height="36" rx="3" fill="#f7f5ec" stroke="#9fb5a6" stroke-width="2"/>
      <path d="M5 16H43M5 24.5H43M5 33H43M18 6V42M30.5 6V42" stroke="#c4d4c8" stroke-width="1.5"/><rect x="5" y="6" width="38" height="10" rx="3" fill="#2e7d4f" opacity=".85"/>
      <ellipse cx="24.2" cy="28.7" rx="8.5" ry="5.6" fill="none" stroke="#b3261e" stroke-width="2.4" transform="rotate(-8 24 29)"/></svg>`,
    // accounts joined by arrows, ending in a gold pound sign
    money: `<svg viewBox="0 0 48 48"><rect x="16" y="3" width="16" height="10" rx="2" fill="#f6e0dd" stroke="#b3261e" stroke-width="1.5"/>
      <rect x="3" y="19" width="16" height="10" rx="2" fill="#f4f1e8" stroke="#5a5346" stroke-width="1.5" stroke-dasharray="3 2"/><rect x="29" y="19" width="16" height="10" rx="2" fill="#f4f1e8" stroke="#5a5346" stroke-width="1.5" stroke-dasharray="3 2"/>
      <path d="M21 13L13 19M27 13L35 19M14 29L21 36M34 29L27 36" stroke="#c9a227" stroke-width="2" stroke-linecap="round"/>
      <circle cx="24" cy="39.5" r="7" fill="#c9a227"/><text x="24" y="43.5" text-anchor="middle" font-size="11" font-weight="700" font-family="Georgia,serif" fill="#221f1a">£</text></svg>`,
    archive: `<svg viewBox="0 0 48 48"><rect x="5" y="12" width="38" height="30" rx="3" fill="#c9bfa8"/><rect x="5" y="8" width="17" height="8" rx="2" fill="#c9bfa8"/><rect x="5" y="16" width="38" height="26" rx="3" fill="#ddd4bf"/></svg>`,
    record: `<svg viewBox="0 0 48 48"><circle cx="24" cy="21" r="13" fill="#d8c48a"/><circle cx="24" cy="21" r="8.5" fill="#e9dcae"/><path d="M17 32 L13 44 L19 41 L22 46 L24 34 Z M31 32 L35 44 L29 41 L26 46 L24 34 Z" fill="#b3261e"/></svg>`,
  };

  // Game list and schedule come from shared/casebook.js (loaded in each page's <head>).
  const CB = window.Casebook;
  const todayId = CB ? CB.gameOn(CB.today()).id : null;
  const GAMES = (CB ? CB.GAMES : []).map(g => ({ ...g, href:`${root}/${g.path}` }));
  ICONS.home = `<svg viewBox="0 0 48 48"><rect x="8" y="10" width="32" height="30" rx="3" fill="#f6f1e4" stroke="#8a8270" stroke-width="2"/>
      <rect x="8" y="10" width="32" height="8" rx="3" fill="#1f2328"/><text x="24" y="16.6" text-anchor="middle" font-size="6" font-weight="700" font-family="Courier Prime,monospace" fill="#f6f1e4" letter-spacing="1">CASE</text>
      <rect x="14" y="23" width="20" height="3" rx="1.5" fill="#b3261e"/><rect x="14" y="29" width="14" height="3" rx="1.5" fill="#8a8270"/><rect x="14" y="35" width="17" height="3" rx="1.5" fill="#8a8270"/></svg>`;
  if (CB) CB.ICONS = ICONS;
  const SOON = [
    { id:'record',  name:'Case Record', tag:'Streaks, stats and badges. Coming soon.' },
  ];

  const css = `
  .cb-brand{display:flex;align-items:center;gap:12px;min-width:0}
  .cb-titles{display:flex;flex-direction:column;gap:3px;min-width:0}
  .cb-titles h1{line-height:1.1}
  .cb-subline{margin:0!important;font-size:11.5px!important;letter-spacing:.1em!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  /* sticky toolbar: a solid full-width band behind the header */
  /* iOS: tapping buttons quickly shouldn't zoom (pinch-zoom still works) */
  html{touch-action:manipulation}
  button,[data-num],a{touch-action:manipulation}
  /* what shows when iOS rubber-bands past the top (header colour) or bottom (page colour) */
  /* iOS Safari colours its bottom toolbar from the page's solid background colour (gradients don't count),
     so set a solid colour under the gradients on both html and body */
  html{background-color:var(--bg, #1b1d22);background-image:linear-gradient(to bottom, var(--bg2, var(--bg, #1b1d22)) 0 50%, var(--bg, #1b1d22) 50% 100%)}
  body{background-color:var(--bg, #1b1d22)}
  header.cb-top{position:sticky;top:0;z-index:35;padding-top:calc(10px + env(safe-area-inset-top))!important;padding-bottom:10px!important;margin-top:0!important;margin-bottom:6px;
    flex-wrap:nowrap!important;align-items:center!important;
    background:var(--bg2, var(--bg, #1b1d22));
    /* full-width band + a 1px divider underneath, both as shadows so nothing widens the page */
    box-shadow:0 0 0 100vmax var(--bg2, var(--bg, #1b1d22)), 0 1px 0 100vmax rgba(255,255,255,.1);
    clip-path:inset(0 -100vmax -1px)}
  @media (max-width:520px){header.cb-top h1{font-size:18px;letter-spacing:.2em}.cb-subline{letter-spacing:.02em!important;font-size:11px!important}}
  .cb-open{width:38px;height:38px;border-radius:6px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);cursor:pointer;
    display:grid;place-items:center;padding:0;flex:none}
  .cb-open span,.cb-open span:before,.cb-open span:after{display:block;width:18px;height:2px;background:currentColor;border-radius:1px;position:relative;content:""}
  .cb-open{color:inherit}
  .cb-open span:before{position:absolute;top:-6px}.cb-open span:after{position:absolute;top:6px}
  .cb-open:hover{background:rgba(255,255,255,.14)}
  .cb-shade{position:fixed;inset:0;background:rgba(10,10,14,.5);opacity:0;pointer-events:none;transition:opacity .2s;z-index:50}
  .cb-drawer{position:fixed;top:0;left:0;bottom:0;width:min(380px,86vw);background:#f6f3ec;color:#1f2328;z-index:51;transform:translateX(-102%);
    transition:transform .22s ease-out;box-shadow:8px 0 30px rgba(0,0,0,.35);display:flex;flex-direction:column;overflow-y:auto}
  .cb-on .cb-shade{opacity:1;pointer-events:auto}.cb-on .cb-drawer{transform:none}
  .cb-head{display:flex;justify-content:space-between;align-items:center;padding:calc(22px + env(safe-area-inset-top)) 22px 14px}
  .cb-head b{font:700 22px "Courier Prime",monospace;letter-spacing:.3em}
  .cb-head b i{font-style:normal;color:#b3261e}
  .cb-x{border:0;background:none;font-size:30px;line-height:1;cursor:pointer;color:#1f2328;padding:4px 8px}
  .cb-sub{font:12px "Courier Prime",monospace;letter-spacing:.14em;color:#8a8270;padding:0 22px 10px}
  .cb-list{list-style:none;margin:0;padding:6px 0}
  .cb-list>li>a,.cb-list>li>div{display:flex;gap:14px;align-items:center;padding:12px 22px;color:inherit;text-decoration:none;border-left:4px solid transparent}
  .cb-list a:hover{background:rgba(31,35,40,.06)}
  .cb-list .cb-cur{border-left-color:#b3261e;background:rgba(179,38,30,.06)}
  .cb-list svg{width:46px;height:46px;flex:none;filter:drop-shadow(0 2px 2px rgba(0,0,0,.15))}
  .cb-name{font:700 15px "Courier Prime",monospace;letter-spacing:.18em;text-transform:uppercase}
  .cb-tag{font:13.5px "Libre Baskerville",Georgia,serif;color:#6f6a5f;margin-top:3px;line-height:1.4}
  .cb-soon{opacity:.55}
  .cb-today{display:inline-block;font:700 10px "Courier Prime",monospace;letter-spacing:.1em;background:#b3261e;color:#fff;border-radius:9px;padding:1px 7px;margin-left:8px;vertical-align:2px}
  .cb-rule{border:0;border-top:1px solid #ddd5c4;margin:6px 0}
  .cb-foot{margin-top:auto;padding:16px 22px 22px;font:12px "Courier Prime",monospace;color:#8a8270;letter-spacing:.06em}`;
  document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);

  const item = (g, live) => {
    const badge = g.id === todayId ? '<span class="cb-today">TODAY</span>' : '';
    const inner = `${ICONS[g.id]}<span><div class="cb-name">${g.name}${badge}</div><div class="cb-tag">${g.tag}</div></span>`;
    return live
      ? `<li><a href="${g.href}" class="${g.id === current ? 'cb-cur' : ''}"${g.id === current ? ' aria-current="page"' : ''}>${inner}</a></li>`
      : `<li><div class="cb-soon" aria-disabled="true">${inner}</div></li>`;
  };
  document.body.insertAdjacentHTML('beforeend', `
    <div class="cb-shade" data-cb-close></div>
    <nav class="cb-drawer" aria-label="Casebook games" id="cb-drawer">
      <div class="cb-head"><b>CASEBOO<i>K</i></b><button class="cb-x" data-cb-close aria-label="Close menu">×</button></div>
      <div class="cb-sub">DAILY MYSTERIES</div>
      <ul class="cb-list">${item({ id:'home', name:'Home', tag:"Today's case and every game.", href:`${root}/` }, true)}</ul>
      <hr class="cb-rule">
      <ul class="cb-list">${GAMES.map(g => item(g, true)).join('')}</ul>
      <ul class="cb-list">${item({ id:'archive', name:'Archive', tag:'Every past case, newest first.', href:`${root}/archive/` }, true)}</ul>
      <hr class="cb-rule">
      <ul class="cb-list">${SOON.map(g => item(g, false)).join('')}</ul>
      <div class="cb-foot">One new case every day, rotating through the games.</div>
    </nav>`);

  // Header: menu button, then the title with the page's subtitle (case number, issue or date) tucked underneath.
  // The whole header sticks to the top of the screen; its height is published as --cb-head-h so other
  // sticky bars (e.g. the side-panel buttons) can sit just below it.
  const header = document.querySelector('header');
  const title = header?.querySelector('h1');
  if (title) {
    const sub = [...header.children].find(el => el !== title);
    const brand = document.createElement('div'); brand.className = 'cb-brand';
    brand.innerHTML = '<button class="cb-open" aria-label="Open games menu" aria-controls="cb-drawer" aria-expanded="false"><span></span></button><div class="cb-titles"></div>';
    title.replaceWith(brand);
    brand.querySelector('.cb-titles').appendChild(title);
    if (sub) { sub.classList.add('cb-subline'); brand.querySelector('.cb-titles').appendChild(sub); }
    header.classList.add('cb-top');   // not 'cb-head': that's the drawer's own header
    // No gap above the header: drop the top padding of whatever wraps it (e.g. .wrap's 22px).
    if (header.parentElement !== document.body && header.parentElement.firstElementChild === header) header.parentElement.style.paddingTop = '0';
    const publish = () => document.documentElement.style.setProperty('--cb-head-h', header.offsetHeight + 'px');
    publish(); new ResizeObserver(publish).observe(header);
  }
  const btn = document.querySelector('.cb-open');
  const set = on => { document.body.classList.toggle('cb-on', on); btn?.setAttribute('aria-expanded', on); if (on) document.querySelector('.cb-x').focus(); else btn?.focus(); };
  btn?.addEventListener('click', () => set(true));
  document.querySelectorAll('[data-cb-close]').forEach(el => el.addEventListener('click', () => set(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('cb-on')) set(false); });
})();
