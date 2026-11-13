// Casebook core: the list of games and the daily rotation. No DOM work, so any page can load it in <head>.
//
// One case is published per day, rotating through the games in ROTATION order. Day 0 is LAUNCH.
// A game's "issue" is how many times it has come up so far; e.g. on day 5 Testimony is on its issue #2.
(() => {
  const LAUNCH = Date.UTC(2026, 10, 13);           // day 0 (13 Nov 2026). Set to the real launch date before going live.
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

  window.Casebook = { GAMES, ROTATION, LAUNCH, dayOf, gameOn, issuesBy, dateOf, today: () => dayOf() };
})();
