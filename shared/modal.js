// Casebook result pop-up, shown when a case is solved.
//   CasebookModal.open({ stamp:'CASE CLOSED', heading:'WHAT HAPPENED', html:'<p>…</p>', share:'TESTIMONY #1 …' })
// Also used for help: CasebookModal.open({ heading:'HOW TO PLAY', title:'Forgery', html:'…', closeLabel:'Got it' })
// The game keeps its own inline summary too, so the story is still there after the pop-up is closed.
(() => {
  const css = `
  .cbm-shade{position:fixed;inset:0;z-index:70;background:rgba(8,8,12,.62);display:grid;place-items:center;padding:max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));opacity:0;transition:opacity .2s}
  .cbm-shade.on{opacity:1}
  .cbm{background:#fdfbf5;color:#1f2328;width:min(460px,100%);max-height:88vh;border-radius:6px;position:relative;overflow:hidden;
    display:flex;flex-direction:column;
    box-shadow:0 24px 60px rgba(0,0,0,.55);transform:translateY(14px) scale(.97);transition:transform .25s cubic-bezier(.2,.8,.3,1.1)}
  /* header and footer stay put; only the middle scrolls */
  .cbm-head{flex:none;padding:22px 22px 12px;position:relative;border-bottom:1px solid #e6dfcf}
  .cbm-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;padding:16px 22px 6px;overscroll-behavior:contain}
  .cbm-foot{flex:none;padding:12px 22px 14px;border-top:1px solid #e6dfcf;background:#f7f3e8}
  .cbm-shade.on .cbm{transform:none}
  .cbm-stamp{display:inline-block;font:700 20px "Courier Prime",monospace;letter-spacing:.14em;padding:5px 14px;border:3px solid #2e7d4f;color:#2e7d4f;
    border-radius:6px;transform:rotate(-5deg);margin:0 0 14px 2px}
  .cbm-stamp.lose{border-color:#b3261e;color:#b3261e}
  .cbm-shade.on .cbm-stamp{animation:cbm-thump .45s .12s both}
  @keyframes cbm-thump{0%{transform:rotate(-5deg) scale(2);opacity:0}70%{transform:rotate(-5deg) scale(.95);opacity:1}100%{transform:rotate(-5deg) scale(1)}}
  .cbm h3{margin:0 0 4px;font:700 13px "Courier Prime",monospace;letter-spacing:.2em;color:#6f6a5f}
  .cbm .cbm-body{font:15px/1.7 "Libre Baskerville",Georgia,serif}
  .cbm .cbm-body p{margin:0 0 10px}
  .cbm pre{background:#1d1f26;color:#ece8de;border-radius:4px;padding:12px;font:14px "Courier Prime",monospace;white-space:pre-wrap;margin:6px 0 10px}
  .cbm-btns{display:flex;gap:10px;flex-wrap:wrap}
  .cbm-btns button{font:700 14px "Courier Prime",monospace;border-radius:3px;padding:11px 16px;cursor:pointer;border:1px solid #1f2328}
  .cbm-copy{background:#1f2328;color:#fff}
  .cbm-close{background:transparent;color:#1f2328}
  .cbm-x{position:absolute;right:8px;top:6px;border:0;background:none;font-size:28px;line-height:1;cursor:pointer;color:#1f2328;padding:4px 8px}
  .cbm-title{font:700 24px "Courier Prime",monospace;letter-spacing:.2em;text-transform:uppercase;margin:2px 0 0}
  .cbm .cbm-body ul,.cbm .cbm-body ol{margin:0 0 12px;padding-left:20px}
  .cbm .cbm-body li{margin-bottom:8px;font-size:14.5px;line-height:1.6}
  .cbm .cbm-body h4{font:700 12px "Courier Prime",monospace;letter-spacing:.18em;color:#6f6a5f;margin:14px 0 6px}
  .cbm .key{display:inline-block;width:12px;height:12px;border-radius:2px;vertical-align:-1px;margin-right:3px}
  .cbm-note{font:13px "Courier Prime",monospace;color:#2e7d4f;min-height:0;margin-top:6px}
  .cbm-note:empty{display:none}`;
  let styled = false, lastFocus = null;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  function close(){
    const shade = document.querySelector('.cbm-shade'); if (!shade) return;
    shade.classList.remove('on');
    setTimeout(() => shade.remove(), 200);
    document.removeEventListener('keydown', onKey);
    lastFocus?.focus?.();
  }
  function onKey(e){
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {   // keep focus inside the pop-up
      const f = [...document.querySelectorAll('.cbm button')]; if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  }
  function open({ stamp = '', tone = 'win', title = '', heading = '', html = '', share = '', closeLabel = 'Close' } = {}){
    if (!styled) { document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`); styled = true; }
    document.querySelector('.cbm-shade')?.remove();
    lastFocus = document.activeElement;
    const shade = document.createElement('div');
    shade.className = 'cbm-shade';
    shade.innerHTML = `<div class="cbm" role="dialog" aria-modal="true" aria-labelledby="cbm-h">
      <div class="cbm-head">
        <button class="cbm-x" aria-label="Close">×</button>
        ${stamp ? `<div class="cbm-stamp${tone === 'lose' ? ' lose' : ''}">${esc(stamp)}</div>` : ''}
        <h3 id="cbm-h">${esc(heading)}</h3>${title ? `<div class="cbm-title">${esc(title)}</div>` : ''}
      </div>
      <div class="cbm-scroll">
        <div class="cbm-body">${html}</div>
        ${share ? `<pre>${esc(share)}</pre>` : ''}
      </div>
      <div class="cbm-foot">
        <div class="cbm-btns">${share ? '<button class="cbm-copy">Copy result</button>' : ''}<button class="cbm-close">${esc(closeLabel)}</button></div>
        <div class="cbm-note" aria-live="polite"></div>
      </div></div>`;
    document.body.appendChild(shade);
    shade.addEventListener('click', e => { if (e.target === shade) close(); });
    shade.querySelector('.cbm-x').onclick = close;
    shade.querySelector('.cbm-close').onclick = close;
    shade.querySelector('.cbm-copy')?.addEventListener('click', () => {
      const note = shade.querySelector('.cbm-note');
      navigator.clipboard?.writeText(share).then(() => note.textContent = 'Copied to clipboard.', () => note.textContent = 'Copy failed. Select the text above.');
    });
    document.addEventListener('keydown', onKey);
    (shade.querySelector('.cbm-copy') || shade.querySelector('.cbm-close')).focus();
    requestAnimationFrame(() => shade.classList.add('on'));   // next frame, so the fade/pop-in transition runs
  }
  window.CasebookModal = { open, close };
})();
