// Casebook calculator: a plain pocket calculator for the side panel.
// Put <div data-calc></div> anywhere (usually inside a data-side section); this fills it in.
// Works like a pocket calculator (each operator applies to the running total), with % for fees and splits:
//   200 + 10 % = 220      (adds 10% of 200)      200 × 10 % = 20      30,000 × 70 % = 21,000
(() => {
  const css = `
  .calc{display:flex;flex-direction:column;gap:10px;max-width:340px}
  .calc-screen{background:#0e1013;border:1px solid rgba(255,255,255,.12);border-radius:6px;padding:10px 12px;text-align:right;font-family:"Courier Prime",monospace}
  .calc-pending{min-height:16px;font-size:12px;color:#8e96a3;letter-spacing:.04em}
  .calc-out{font-size:28px;font-weight:700;color:#f2efe6;overflow-x:auto;white-space:nowrap}
  .calc-keys{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
  .calc-keys button{font:700 18px "Courier Prime",monospace;height:50px;border-radius:6px;border:0;cursor:pointer;background:#e9e5da;color:#1f2328;
    box-shadow:0 3px 0 #b9b3a3;transition:transform .06s,box-shadow .06s}
  .calc-keys button:active{transform:translateY(3px);box-shadow:none}
  .calc-keys button.op{background:#c9a227;color:#1f2328;box-shadow:0 3px 0 #8d7119}
  .calc-keys button.fn{background:#3a3f4a;color:#f2efe6;box-shadow:0 3px 0 #23262d}
  .calc-keys button.eq{background:#2e7d4f;color:#fff;box-shadow:0 3px 0 #1d5233}
  .calc-keys button.wide{grid-column:span 2}
  .calc-keys button:focus-visible{outline:3px solid #6fa0e0;outline-offset:2px}
  .calc-tape{font:13px "Courier Prime",monospace;color:#b7bdc8;list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:3px}
  .calc-tape li{display:flex;justify-content:space-between;gap:10px;border-bottom:1px dashed rgba(255,255,255,.1);padding:3px 0}
  .calc-tape b{color:#f2efe6}
  .calc-hint{font:12px "Courier Prime",monospace;color:#8e96a3;line-height:1.5}
  .calc-out.flash{animation:calc-flash .45s ease-out}
  @keyframes calc-flash{0%{color:#c9a227;transform:scale(1.06)}100%{color:#f2efe6;transform:none}}
  /* while the calculator is open, numbers on the page can be tapped to enter them */
  body.calc-open [data-num]{cursor:copy}
  body.calc-open [data-num]:not(g):hover{outline:2px solid #c9a227;outline-offset:-2px;border-radius:3px}
  body.calc-open g[data-num]:hover rect{stroke:#c9a227;stroke-width:2.5}
  /* phones / narrow windows: the panel covers the page, so "pick" mode hides it while you tap a number */
  .calc-pickbtn{font:700 13px "Courier Prime",monospace;letter-spacing:.04em;background:transparent;color:#f2efe6;border:1.5px dashed #c9a227;
    border-radius:6px;padding:10px 12px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px}
  .calc-pickbtn:hover{background:rgba(201,162,39,.12)}
  @media (min-width:1000px){.calc-pickbtn{display:none}}
  body.calc-picking [data-num]:not(g){outline:2px dashed #c9a227;outline-offset:-2px;border-radius:3px;cursor:copy}
  body.calc-picking g[data-num]{cursor:copy}
  body.calc-picking g[data-num] rect{stroke:#c9a227;stroke-width:2.5;stroke-dasharray:4 3}
  .calc-pickbar{position:fixed;left:0;right:0;bottom:0;z-index:60;background:#1f2328;color:#f2efe6;display:flex;align-items:center;gap:12px;
    padding:14px 16px calc(14px + env(safe-area-inset-bottom));box-shadow:0 -8px 24px rgba(0,0,0,.4);font:700 14px "Courier Prime",monospace}
  .calc-pickbar span{flex:1;line-height:1.4}
  .calc-pickbar b{color:#c9a227}
  .calc-pickbar button{font:700 14px "Courier Prime",monospace;background:#ece8de;color:#1f2328;border:0;border-radius:4px;padding:10px 14px;cursor:pointer}`;
  document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);

  const SYM = { '+':'+', '-':'−', '*':'×', '/':'÷' };
  const fmt = n => {
    if (!Number.isFinite(n)) return 'Error';
    const r = Math.round(n * 1e6) / 1e6;
    return r.toLocaleString('en-GB', { maximumFractionDigits: 6 });
  };
  const apply = (a, op, b) => op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : b === 0 ? NaN : a / b;

  function mount(el){
    let acc = null, op = null, cur = '0', fresh = true, lastLine = '';
    const tape = [];
    el.className = 'calc';
    el.innerHTML = `<div class="calc-screen" aria-live="polite"><div class="calc-pending"></div><div class="calc-out">0</div></div>
      <button class="calc-pickbtn" type="button">⌖ Tap a number on the page</button>
      <div class="calc-keys">
        <button class="fn" data-k="C" aria-label="Clear">C</button><button class="fn" data-k="back" aria-label="Backspace">⌫</button><button class="fn" data-k="%" aria-label="Percent">%</button><button class="op" data-k="/" aria-label="Divide">÷</button>
        <button data-k="7">7</button><button data-k="8">8</button><button data-k="9">9</button><button class="op" data-k="*" aria-label="Times">×</button>
        <button data-k="4">4</button><button data-k="5">5</button><button data-k="6">6</button><button class="op" data-k="-" aria-label="Minus">−</button>
        <button data-k="1">1</button><button data-k="2">2</button><button data-k="3">3</button><button class="op" data-k="+" aria-label="Plus">+</button>
        <button class="wide" data-k="0">0</button><button data-k=".">.</button><button class="eq" data-k="=" aria-label="Equals">=</button>
      </div>
      <ul class="calc-tape" aria-label="Recent sums"></ul>
      <div class="calc-hint">Numbers on the page can be tapped to enter them here.<br>% works like a pocket calculator: 46,000 × 10 % = 4,600 · 46,000 − 10 % = 41,400</div>`;
    const out = el.querySelector('.calc-out'), pend = el.querySelector('.calc-pending'), tapeEl = el.querySelector('.calc-tape');
    const num = () => parseFloat(cur);
    const show = () => {
      // while typing, keep exactly what was typed (with thousands commas); after an operation, show the tidied number
      const [i, d] = cur.split('.');
      out.textContent = cur === 'Error' ? 'Error' : fresh ? fmt(num()) : fmt(parseFloat(i || '0')) + (cur.includes('.') ? '.' + d : '');
      pend.textContent = op ? `${fmt(acc)} ${SYM[op]}` : lastLine;
      tapeEl.innerHTML = tape.map(t => `<li><span>${t[0]}</span><b>${t[1]}</b></li>`).join('');
    };
    const press = k => {
      if (cur === 'Error' && k !== 'C') { acc = null; op = null; cur = '0'; fresh = true; }
      if (/^[0-9]$/.test(k)) { cur = fresh || cur === '0' ? k : cur.length < 15 ? cur + k : cur; fresh = false; lastLine = ''; }
      else if (k === '.') { if (fresh) { cur = '0.'; fresh = false; } else if (!cur.includes('.')) cur += '.'; }
      else if (k === 'back') { if (!fresh) cur = cur.length > 1 ? cur.slice(0, -1) : '0'; if (cur === '-') cur = '0'; }
      else if (k === 'C') { acc = null; op = null; cur = '0'; fresh = true; lastLine = ''; }
      else if (k === '%') {
        const v = num();
        // pocket-calculator percent: with + or −, a percentage of the running total; otherwise just ÷ 100
        cur = String(op === '+' || op === '-' ? acc * v / 100 : v / 100); fresh = true;
      }
      else if (SYM[k]) {
        if (op && !fresh) { acc = apply(acc, op, num()); cur = String(acc); }
        else if (!op) acc = num();
        op = k; fresh = true;
      }
      else if (k === '=') {
        if (!op) return show();
        const b = num(), r = apply(acc, op, b);
        const line = `${fmt(acc)} ${SYM[op]} ${fmt(b)}`;
        tape.unshift([line + ' =', fmt(r)]); if (tape.length > 5) tape.pop();
        lastLine = line + ' ='; cur = Number.isFinite(r) ? String(r) : 'Error'; acc = null; op = null; fresh = true;
      }
      show();
    };
    // Enter a number picked from the page (it replaces whatever is being typed, like recalling memory).
    const enter = n => {
      if (cur === 'Error') { acc = null; op = null; }
      cur = String(n); fresh = true; lastLine = '';
      show(); out.classList.remove('flash'); void out.offsetWidth; out.classList.add('flash');
    };
    const isOpen = () => !!el.offsetParent && document.body.classList.contains('sp-on');
    window.CasebookCalc = { enter, isOpen };
    // Keep a body class in step with whether the calculator is on screen, for the tap-to-enter cue.
    const sync = () => document.body.classList.toggle('calc-open', isOpen());
    new MutationObserver(sync).observe(document.body, { attributes:true, attributeFilter:['class'], subtree:true, attributeOldValue:false, childList:false });
    new MutationObserver(sync).observe(document.documentElement, { attributes:true, subtree:true, attributeFilter:['hidden'] });
    // Pick mode (for phones, where the open panel covers the page): hide the panel, outline every tappable
    // number, and send the first one tapped to the calculator before bringing it back.
    let picking = false, bar = null;
    const startPick = () => {
      picking = true; document.body.classList.add('calc-picking');
      window.CasebookSide?.hide();
      bar = document.createElement('div'); bar.className = 'calc-pickbar'; bar.setAttribute('role', 'status');
      bar.innerHTML = '<span>Tap a <b>number</b> to add it to the calculator</span><button type="button">Cancel</button>';
      bar.querySelector('button').onclick = () => endPick();
      document.body.appendChild(bar);
    };
    const endPick = n => {
      picking = false; document.body.classList.remove('calc-picking'); bar?.remove(); bar = null;
      window.CasebookSide?.show('calc');
      if (n != null) setTimeout(() => enter(n), 120);   // after the panel starts sliding back, so the flash is seen
    };
    el.querySelector('.calc-pickbtn').addEventListener('click', startPick);
    document.addEventListener('keydown', e => { if (picking && e.key === 'Escape') { e.stopPropagation(); endPick(); } }, true);

    // Taps on [data-num] go to the calculator while it's open (or while picking). Capture phase, so the
    // game's own click (marking a cell, etc.) doesn't also fire.
    document.addEventListener('click', e => {
      if (picking) {
        if (bar?.contains(e.target)) return;
        e.preventDefault(); e.stopPropagation();       // nothing else on the page reacts while picking
        const t = e.target.closest('[data-num]'); if (t) endPick(parseFloat(t.dataset.num));
        return;
      }
      if (!isOpen()) return;
      const t = e.target.closest('[data-num]'); if (!t || el.contains(t)) return;
      e.preventDefault(); e.stopPropagation(); enter(parseFloat(t.dataset.num));
    }, true);
    el.querySelector('.calc-keys').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) press(b.dataset.k); });
    // keyboard, but only while the calculator is on screen and the player isn't typing somewhere else
    document.addEventListener('keydown', e => {
      if (!el.offsetParent || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.closest('input, textarea, [contenteditable]')) return;
      const map = { Enter:'=', '=':'=', Backspace:'back', Escape:null, Delete:'C', c:'C', C:'C', x:'*', X:'*' };
      const k = e.key in map ? map[e.key] : /^[0-9.%+\-*/]$/.test(e.key) ? e.key : null;
      if (!k) return;
      e.preventDefault(); press(k);
    });
    show();
  }
  document.querySelectorAll('[data-calc]').forEach(mount);
})();
