#!/usr/bin/env node
// Check a Follow the Money case: every hidden transfer must be forced by the rules, solvable one step at a
// time (a chain, not a system of equations), and "who got the most" must have one answer.
// Rules understood:
//   shell  : passes on everything it receives (in = out)
//   firm   : keeps `keep` (e.g. 0.1 = 10%) of what it receives and passes on the rest
//   split  : { edgeId: fraction } on a node: once its incoming total is known, each listed outgoing edge = fraction × in
//   total  : a known final amount on a person ("bank statement"): incoming edges must add up to it
//   person / victim : end points
// Reads the CASE from the game page.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'follow-the-money/index.html'), 'utf8');
const CASE = eval('(' + html.match(/const CASE = (\{[\s\S]*?\n\});/)[1] + ')');
// NO_TOTALS=1 ignores bank statements, to prove a case really needs the backward step
if (process.env.NO_TOTALS) CASE.nodes.forEach(n => delete n.total);

const known = new Map(CASE.edges.filter(e => !e.hidden).map(e => [e.id, e.amount]));
const hidden = CASE.edges.filter(e => e.hidden);
const ins = n => CASE.edges.filter(e => e.to === n.id), outs = n => CASE.edges.filter(e => e.from === n.id);
const sum = es => es.reduce((a, e) => a + known.get(e.id), 0);
const passOn = n => n.kind === 'shell' ? 1 : n.kind === 'firm' ? 1 - n.keep : null;
const order = [];
const set = (e, v, why) => { known.set(e.id, Math.round(v * 100) / 100); order.push(`${e.id} = £${known.get(e.id).toLocaleString('en-GB')}  (${why})`); };

for (let progress = true; progress; ) {
  progress = false;
  for (const n of CASE.nodes) {
    const I = ins(n), O = outs(n);
    // splits forward: once everything coming in is known, each share follows
    if (n.split && I.every(e => known.has(e.id))) {
      for (const [id, f] of Object.entries(n.split)) if (!known.has(id)) { set(CASE.edges.find(e => e.id === id), sum(I) * f, `${n.name} split ${f * 100}%`); progress = true; }
    }
    // splits backward: one known share gives the total coming in, so a single unknown incoming edge follows
    if (n.split) {
      const share = Object.entries(n.split).find(([id]) => known.has(id)), unknownIn = I.filter(e => !known.has(e.id));
      if (share && unknownIn.length === 1) { const total = known.get(share[0]) / share[1]; set(unknownIn[0], total - sum(I.filter(e => known.has(e.id))), `${n.name}'s ${share[1] * 100}% share was £${known.get(share[0]).toLocaleString('en-GB')}, working backwards`); progress = true; }
    }
    // known end totals (bank statements): a single unknown incoming edge follows
    if (n.total != null) {
      const unknownIn = I.filter(e => !known.has(e.id));
      if (unknownIn.length === 1) { set(unknownIn[0], n.total - sum(I.filter(e => known.has(e.id))), `${n.name} ended with £${n.total.toLocaleString('en-GB')}`); progress = true; }
    }
    const k = passOn(n); if (k == null) continue;
    const unknown = [...I, ...O].filter(e => !known.has(e.id));
    if (unknown.length !== 1) continue;
    const u = unknown[0];
    if (O.includes(u)) set(u, sum(I) * k - sum(O.filter(e => e !== u)), `${n.name} passes on ${Math.round(k * 100)}%`);
    else set(u, sum(O) / k - sum(I.filter(e => e !== u)), `${n.name} passes on ${Math.round(k * 100)}%`);
    progress = true;
  }
}

let ok = true;
for (const e of hidden) {
  if (!known.has(e.id)) { console.log(`✗ ${e.id} can't be worked out`); ok = false; }
  else if (known.get(e.id) !== e.amount) { console.log(`✗ ${e.id}: rules give ${known.get(e.id)}, case says ${e.amount}`); ok = false; }
  else if (known.get(e.id) <= 0) { console.log(`✗ ${e.id} is not positive`); ok = false; }
}
for (const n of CASE.nodes) {
  const k = passOn(n); if (k == null) continue;
  const i = ins(n).reduce((a, e) => a + e.amount, 0), o = outs(n).reduce((a, e) => a + e.amount, 0);
  if (Math.abs(i * k - o) > 0.01) { console.log(`✗ ${n.name} doesn't balance: in ${i} × ${k} ≠ out ${o}`); ok = false; }
  if (n.split) for (const [id, f] of Object.entries(n.split)) if (Math.abs(CASE.edges.find(e => e.id === id).amount - i * f) > 0.01) { console.log(`✗ ${n.name} split for ${id} is off`); ok = false; }
}
for (const n of CASE.nodes) if (n.total != null && ins(n).reduce((a, e) => a + e.amount, 0) !== n.total) { console.log(`✗ ${n.name}'s known total doesn't match what flows in`); ok = false; }
const holds = CASE.nodes.filter(n => n.kind !== 'victim').map(n => {
  const i = ins(n).reduce((a, e) => a + e.amount, 0), o = outs(n).reduce((a, e) => a + e.amount, 0);
  return [n.name, i - o];
}).filter(h => h[1] > 0).sort((a, b) => b[1] - a[1]);
if (holds.length > 1 && holds[0][1] === holds[1][1]) { console.log('✗ "who ended up with the most" is a tie'); ok = false; }
if (holds[0][0] !== CASE.answer) { console.log(`✗ the most went to ${holds[0][0]}, case says ${CASE.answer}`); ok = false; }

console.log('Solve order:\n  ' + order.join('\n  '));
console.log('Who kept what: ' + holds.map(([n, v]) => `${n} £${v.toLocaleString('en-GB')}`).join(', '));
console.log(ok ? '✓ case is fair: every hidden amount is forced, one step at a time' : '✗ case has problems');
process.exit(ok ? 0 : 1);
