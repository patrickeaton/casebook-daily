#!/usr/bin/env node
// Generate Follow the Money cases and append them to puzzles/money.json.
//   node tools/gen-money.mjs 8
//
// Uses the nine-account layout from case #1 (two victims → shells / a fee-taking firm → three people) and
// varies the names, amounts, fee, split ratio, which transfers are missing, and whether a bank statement
// must be worked backwards from. Every case is checked with tools/verify-money.mjs before it's kept.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verify } from './verify-money.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'puzzles/money.json');
const N = +process.argv[2] || 8;

// a tiny seeded RNG so runs are repeatable
let seed = 7919;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = a => a[Math.floor(rnd() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const k = n => `£${n.toLocaleString('en-GB')}`;

// Names are kept to 16 characters or fewer so they fit the diagram's boxes on a phone.
const VICTIMS = [['Harbour Trust', 'Quayside Pension'], ['Lantern Hospice', 'Mill Lane School'], ['Rowing Club', 'Allotment Fund'],
  ['Lifeboat Fund', 'Town Library'], ['Cobble Church', 'Youth Club Fund'], ['Animal Rescue', 'Cricket Club'],
  ['Saltmarsh Choir', 'Scout Hut Fund'], ['Linden Care Home', 'Tarn Museum'], ['Food Bank', 'Beech Nursery']];
const SHELLS = ['Grey Gull Ltd', 'Brisk Holdings', 'Fenwick Holdings', 'Ashdown Trading', 'Corvid Capital', 'Larkspur Ltd', 'Hollow Oak Ltd', 'Pennant Assets',
  'Merrow Holdings', 'Black Fen Ltd', 'Quillon Partners', 'Starling Group', 'Tidewell Ltd', 'Rook & Vale', 'Dunlin Holdings', 'Marrow Lane Ltd'];
const FIRMS = ['Tallow & Co', 'Gable Consulting', 'Wexford Advisory', 'Pike & Sons', 'Hartley & Co', 'Calder & Finch', 'Brindle Advisory', 'Sable Consulting'];
const PEOPLE = ['Ines Marr', 'Odell Vane', 'Carys Penn', 'Hugo Breck', 'Mina Strand', 'Felix Orme', 'Rhea Calloway', 'Tobias Wren', 'Nell Hartigan',
  'Jasper Quayle', 'Ada Thorne', 'Silas Moor', 'Petra Lind', 'Edwin Faye', 'Lottie Crane', 'Bram Hollis', 'Della Shaw', 'Kit Mercer'];
const ROLES = ['treasurer of both funds', 'the accountant who audited both funds', 'a trustee of both funds', 'the bank manager who looked after both accounts',
  'the fundraiser who ran both appeals', 'the solicitor who handled both funds'];

const TITLES = ['The Quayside Job', 'The Lantern Ledger', 'The Riverside Skim', 'The Lifeboat Leak', 'The Collection Plate', 'The Rescue Fund',
  'The Choir Accounts', 'The Valley Vanishing', 'The Food Bank Fiddle'];

function makeCase(no, idx){
  const [v1, v2] = VICTIMS[idx % VICTIMS.length];
  const [gull, brisk, fenwick] = shuffle(SHELLS).slice(0, 3);
  const firm = pick(FIRMS);
  const [pA, pB, pC] = shuffle(PEOPLE).slice(0, 3);       // pA = the split's minor share, pB = from the firm, pC = the big winner
  const fee = pick([0.05, 0.1, 0.15, 0.2]);
  const split = pick([[0.6, 0.4], [0.7, 0.3], [0.75, 0.25], [0.8, 0.2]]);
  // amounts (thousands kept round; the fee and split are chosen to land on whole hundreds)
  for (let attempt = 0; attempt < 200; attempt++) {
    const V1 = 1000 * (40 + Math.floor(rnd() * 50)), V2 = 1000 * (20 + Math.floor(rnd() * 40));
    const gt = 1000 * (10 + Math.floor(rnd() * ((V1 / 1000) - 20)));          // gull → firm
    const gf = V1 - gt;                                                      // gull → fenwick
    const bf = V2 * split[0], bc = V2 * split[1];                            // brisk split
    if (bf % 100 || bc % 100) continue;
    const fin = gf + bf;
    const fi = 1000 * (5 + Math.floor(rnd() * ((fin / 1000) - 10)));          // fenwick → winner
    const ft = fin - fi;                                                     // fenwick → firm
    const tin = gt + ft, tout = tin * (1 - fee);
    if (tout % 100 || ft <= 0 || fi <= 0) continue;
    const tv = 1000 * (5 + Math.floor(rnd() * ((tout / 1000) - 8)));          // firm → pB
    const ti = tout - tv;                                                    // firm → winner
    if (ti <= 0 || tv <= 0) continue;
    const winner = fi + ti;
    if (!(winner > tv && winner > bc && winner > tin * fee)) continue;       // one clear biggest winner
    const nodes = [
      { id:'v1', name:v1, kind:'victim', x:95, y:36 },
      { id:'v2', name:v2, kind:'victim', x:265, y:36 },
      { id:'gull', name:gull, kind:'shell', x:95, y:142 },
      { id:'brisk', name:brisk, kind:'shell', x:265, y:142, split:{ 'brisk-fenwick':split[0], 'brisk-pa':split[1] } },
      { id:'fenwick', name:fenwick, kind:'shell', x:180, y:254 },
      { id:'firm', name:firm, kind:'firm', x:70, y:372, keep:fee },
      { id:'pa', name:pA, kind:'person', x:300, y:372 },
      { id:'pb', name:pB, kind:'person', x:70, y:486 },
      { id:'pc', name:pC, kind:'person', x:230, y:486 },
    ];
    const edges = [
      { id:'v1-gull', from:'v1', to:'gull', amount:V1 },
      { id:'v2-brisk', from:'v2', to:'brisk', amount:V2 },
      { id:'gull-fenwick', from:'gull', to:'fenwick', amount:gf },
      { id:'gull-firm', from:'gull', to:'firm', amount:gt },
      { id:'brisk-fenwick', from:'brisk', to:'fenwick', amount:bf },
      { id:'brisk-pa', from:'brisk', to:'pa', amount:bc },
      { id:'fenwick-pc', from:'fenwick', to:'pc', amount:fi },
      { id:'fenwick-firm', from:'fenwick', to:'firm', amount:ft },
      { id:'firm-pb', from:'firm', to:'pb', amount:tv },
      { id:'firm-pc', from:'firm', to:'pc', amount:ti },
    ];
    // Which transfers go missing. Variants: a backward start from a bank statement, or a forward-only trail.
    const variant = idx % 3;
    let hide, totals = {};
    if (variant === 0) { hide = ['v2-brisk', 'brisk-pa', 'brisk-fenwick', 'gull-fenwick', 'fenwick-firm', 'firm-pc']; totals = { pa: bc }; }
    else if (variant === 1) { hide = ['gull-firm', 'brisk-fenwick', 'brisk-pa', 'fenwick-firm', 'firm-pb', 'firm-pc']; totals = { pb: tv }; }
    else { hide = ['gull-fenwick', 'brisk-fenwick', 'brisk-pa', 'fenwick-pc', 'fenwick-firm', 'firm-pb']; totals = { pc: winner }; }   // backward from the winner's total
    edges.forEach(e => { if (hide.includes(e.id)) e.hidden = true; });
    nodes.forEach(n => { if (totals[n.id] != null) n.total = totals[n.id]; });
    const nameOf = id => nodes.find(n => n.id === id).name;
    const rules = [
      'Shell companies keep nothing: every pound that comes in goes straight back out.',
      `${firm} is a "consultancy". It keeps a ${Math.round(fee * 100)}% fee on everything it receives and passes on the rest.`,
      `A memo from ${brisk}: "Usual split. ${Math.round(split[0] * 100)}% to ${fenwick}, the rest to ${pA.split(' ')[1]}."`,
      'People keep everything they receive.',
      ...Object.entries(totals).map(([id, v]) => `${nameOf(id)}'s bank statement shows they ended up with exactly ${k(v)}.`),
    ];
    const lost = hide.includes('v2-brisk') ? `an unknown sum from the ${v2}` : `${k(V2)} from the ${v2}`;
    const c = {
      no, title: TITLES[idx % TITLES.length] === 'The Quayside Job' ? 'The Harbour Double' : TITLES[idx % TITLES.length],
      brief: `On the same night, ${k(V1)} vanished from the ${v1} and ${lost}. The money was pushed through shell companies and a dodgy consultancy to hide where it went. Rebuild the whole trail.`,
      rules, answer: pC, nodes, edges,
      story: `${gull} kept nothing: ${k(gf)} to ${fenwick} and ${k(gt)} to ${firm}. ${brisk} split the ${v2}'s ${k(V2)} ${Math.round(split[0] * 100)}/${Math.round(split[1] * 100)}: ${k(bf)} to ${fenwick} and ${k(bc)} to ${pA}. `
        + `${fenwick}, holding ${k(fin)}, sent ${k(fi)} to ${pC} and ${k(ft)} to ${firm}. ${firm} took its ${Math.round(fee * 100)}% cut of ${k(tin)} and passed on ${k(tout)}: ${k(tv)} to ${pB} and ${k(ti)} to ${pC}. `
        + `${pC}, ${pick(ROLES)}, walked away with ${k(winner)}.`,
    };
    // must verify, and any bank statement must be essential
    if (!verify(JSON.parse(JSON.stringify(c)), true)) continue;
    const noTotals = JSON.parse(JSON.stringify(c)); noTotals.nodes.forEach(n => delete n.total);
    if (Object.keys(totals).length && verify(noTotals, true)) continue;
    return c;
  }
  throw new Error(`couldn't build case ${no}`);
}

const cases = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const start = cases.length;
for (let i = 0; i < N; i++) {
  const c = makeCase(start + i + 1, start + i);
  cases.push(c);
  console.log(`✓ #${c.no} ${c.title}: ${c.edges.filter(e => e.hidden).length} missing, ${c.nodes.filter(n => n.total != null).length ? 'needs the bank statement' : 'forward only'}`);
}
fs.writeFileSync(FILE, JSON.stringify(cases, null, 2) + '\n');
