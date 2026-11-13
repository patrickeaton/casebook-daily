#!/usr/bin/env node
// Merge Testimony draft files (puzzles/testimony-drafts-*.json) into puzzles/testimony.json, validating each case.
//   node tools/merge-testimony.mjs            # validate + merge
//   node tools/merge-testimony.mjs --check    # validate puzzles/testimony.json only
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAIN = path.join(ROOT, 'puzzles/testimony.json');
const checkOnly = process.argv.includes('--check');

function problems(c){
  const p = [];
  for (const k of ['no', 'title', 'brief', 'checks', 'evidence', 'statements', 'file', 'solution']) if (c[k] == null) p.push(`missing ${k}`);
  if (p.length) return p;
  if (c.statements.length !== 5) p.push(`${c.statements.length} statements (want 5)`);
  const speakers = c.statements.map(s => s.who);
  let flips = 0;
  for (const s of c.statements) {
    const fs_ = [...s.text.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1]);
    if (fs_.length < 2 || fs_.length > 3) p.push(`${s.who}: ${fs_.length} flips`);
    flips += fs_.length;
    const shown = fs_.map(f => f.split('|')).map(o => o[0].startsWith('*'));
    if (fs_.length && shown.every(Boolean)) p.push(`${s.who}: starts all right`);
    for (const f of fs_) {
      const o = f.split('|');
      if (o.length !== 2) p.push(`${s.who}: flip "${f}" needs exactly two options`);
      if (o.filter(x => x.startsWith('*')).length !== 1) p.push(`${s.who}: flip "${f}" needs exactly one *true option`);
    }
    if (/\b(Mr|Mrs|Ms|Dr|St)\./.test(s.text)) p.push(`${s.who}: abbreviation with a full stop`);
  }
  if (flips < 10 || flips > 14) p.push(`${flips} flips in total`);
  if (!c.statements.some(s => [...s.text.matchAll(/\[\[([^\]]+)\]\]/g)].every(m => !m[1].split('|')[0].startsWith('*')))) p.push('no statement starts all wrong');
  for (const f of c.file) for (const n of f.needs) if (!speakers.includes(n)) p.push(`case file ${f.key} needs unknown speaker "${n}"`);
  if (c.file.map(f => f.key).join() !== 'Who,How,Why') p.push('case file must be Who, How, Why');
  return p;
}

let cases = JSON.parse(fs.readFileSync(MAIN, 'utf8'));
if (!checkOnly) {
  const drafts = fs.readdirSync(path.join(ROOT, 'puzzles')).filter(f => /^testimony-drafts-.*\.json$/.test(f)).sort();
  for (const f of drafts) for (const c of JSON.parse(fs.readFileSync(path.join(ROOT, 'puzzles', f), 'utf8'))) {
    cases = cases.filter(x => x.no !== c.no).concat(c);
  }
  cases.sort((a, b) => a.no - b.no);
}
let bad = 0;
cases.forEach((c, i) => {
  const p = problems(c);
  if (c.no !== i + 1) p.push(`numbering gap: position ${i + 1} holds #${c.no}`);
  console.log(`${p.length ? '✗' : '✓'} #${c.no} ${c.title}${p.length ? '\n   - ' + p.join('\n   - ') : ''}`);
  bad += !!p.length;
});
if (bad) { console.log(`\n${bad} case(s) have problems; nothing written.`); process.exit(1); }
if (!checkOnly) { fs.writeFileSync(MAIN, JSON.stringify(cases, null, 2) + '\n'); console.log(`\nWrote ${cases.length} cases to puzzles/testimony.json`); }
