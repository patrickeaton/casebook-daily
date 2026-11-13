// Casebook core: the list of games and the daily rotation. No DOM work, so any page can load it in <head>.
//
// One case is published per day, rotating through the games in ROTATION order. Day 0 is LAUNCH.
// A game's "issue" is how many times it has come up so far; e.g. on day 5 Testimony is on its issue #2.
(() => {
  const LAUNCH = Date.UTC(2026, 9, 23);            // day 0 (23 Oct 2026). Set to the real launch date before going live.
  const DAY = 864e5;

  const GAMES = [
    { id:'forgery',   name:'Forgery',          tag:'Four words have been forged. Find them.',            path:'forgery/',          accent:'#b3261e' },
    { id:'testimony', name:'Testimony',        tag:'Set five witness statements straight.',              path:'testimony/',        accent:'#2e5fa3' },
    { id:'cooked',    name:'Cooked Books',     tag:'Someone padded the ledger. Find the fiddled entries.', path:'cooked-books/',   accent:'#2e7d4f' },
    { id:'money',     name:'Follow the Money', tag:'Trace stolen cash through the shell companies.',        path:'follow-the-money/', accent:'#c9a227' },
  ];
  const ROTATION = ['forgery', 'testimony', 'cooked', 'money'];

  // Day number in the reader's own calendar (local midnight), so the case changes at their midnight.
  const dayOf = (date = new Date()) => Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - LAUNCH) / DAY);
  const gameOn = day => GAMES.find(g => g.id === ROTATION[((day % ROTATION.length) + ROTATION.length) % ROTATION.length]);
  // How many issues of `id` have been published on or before `day` (0 if none yet).
  const issuesBy = (id, day) => {
    if (day < 0) return 0;
    const slot = ROTATION.indexOf(id), n = ROTATION.length;
    return slot > day ? 0 : Math.floor((day - slot) / n) + 1;
  };
  const dateOf = day => new Date(LAUNCH + day * DAY);

  // Load a game's case list and choose which case to show: ?issue=N (an archive link), else the latest
  // released issue. Unreleased issues are only reachable with ?preview=1.
  async function pickCase(id, url){
    const all = await (await fetch(url)).json();
    const day = dayOf(), released = Math.max(1, Math.min(all.length, issuesBy(id, day)));
    const q = new URLSearchParams(location.search), preview = q.has('preview');
    const want = parseInt(q.get('issue'), 10) || released;
    const issue = Math.max(1, Math.min(want, preview ? all.length : released));
    const c = all.find(x => x.no === issue) || all[issue - 1];
    return { case: c, issue, released, total: all.length, isToday: gameOn(day).id === id && issue === issuesBy(id, day) };
  }
  // The date a game's issue N came out (or comes out).
  const dateOfIssue = (id, n) => dateOf(ROTATION.indexOf(id) + (n - 1) * ROTATION.length);

  // Results are remembered in this browser (until there's a backend), so the archive can show solved / cold.
  const RKEY = (id, n) => `casebook:result:${id}:${n}`;
  const saveResult = (id, n, win, detail = '') => { if (!n) return; try { localStorage.setItem(RKEY(id, n), JSON.stringify({ win, detail, at: Date.now() })); } catch {} };
  const getResult = (id, n) => { try { return JSON.parse(localStorage.getItem(RKEY(id, n)) || 'null'); } catch { return null; } };

  // Link to a specific case of the current game, for sharing results.
  const shareUrl = issue => `${location.origin}${location.pathname}${issue ? `?issue=${issue}` : ''}`;

  window.Casebook = { shareUrl, saveResult, getResult, GAMES, ROTATION, LAUNCH, dayOf, gameOn, issuesBy, dateOf, dateOfIssue, pickCase, today: () => dayOf() };
})();
