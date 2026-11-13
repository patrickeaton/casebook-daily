#!/usr/bin/env node
// Walk through puzzles/pending/ one by one: read it, optionally play it in the browser, then approve or reject.
//   npm run review
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { MARK_RE, checkPuzzle } from './lib/puzzle.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BANK = path.join(ROOT, 'puzzles/bank.json');
const PENDING = path.join(ROOT, 'puzzles/pending');
const REJECTED = path.join(ROOT, 'puzzles/rejected');
const C = { red: s => `\x1b[31m${s}\x1b[0m`, green: s => `\x1b[32m${s}\x1b[0m`, dim: s => `\x1b[2m${s}\x1b[0m`, bold: s => `\x1b[1m${s}\x1b[0m`, yellow: s => `\x1b[33m${s}\x1b[0m` };

const files = fs.existsSync(PENDING) ? fs.readdirSync(PENDING).filter(f => f.endsWith('.json')).sort() : [];
if (!files.length) { console.log('Nothing pending. Run: npm run generate -- --count 5'); process.exit(0); }

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
let approved = 0, rejected = 0;

for (const [i, file] of files.entries()) {
  const full = path.join(PENDING, file);
  const { puzzle, report } = JSON.parse(fs.readFileSync(full, 'utf8'));
  console.log('\n' + '═'.repeat(72));
  console.log(C.bold(`${i + 1}/${files.length}  ${puzzle.title}`) + C.dim(`  (${puzzle.genre})`));
  console.log(`Difficulty: ${report.difficulty}   strong solver ${report.strong.found}/4   quick solver ${report.weak.found}/4`);
  console.log('─'.repeat(72));
  const notes = [];
  for (const para of puzzle.paras) {
    console.log(para.replace(MARK_RE, (_, fake, orig, why) => { notes.push({ fake, orig, why }); return `${C.red(fake)}→${C.green(orig)}`; }) + '\n');
  }
  console.log(C.bold('Why each fake is catchable:'));
  notes.forEach((n, k) => console.log(`  ${k + 1}. ${C.red(n.fake)}→${C.green(n.orig)}: ${n.why}`));
  if (puzzle.redHerrings?.length) console.log(C.dim(`Red herrings: ${puzzle.redHerrings.join(' | ')}`));
  if (report.strong.concerns?.length) {
    console.log(C.yellow('⚠ The solver also found these suspicious (possible unfairness):'));
    report.strong.concerns.forEach(c => console.log(C.yellow(`  - ${c}`)));
  }
  const errs = checkPuzzle(puzzle);
  if (errs.length) console.log(C.red(`Checks now failing: ${errs.join('; ')}`));
  console.log(C.dim(`Play it: http://localhost:5191/forgery/?file=../puzzles/pending/${encodeURIComponent(file)}`));

  const ans = (await rl.question('[a]pprove  [r]eject  [s]kip  [q]uit > ')).trim().toLowerCase();
  if (ans === 'q') break;
  if (ans === 'a') {
    const bank = JSON.parse(fs.readFileSync(BANK, 'utf8'));
    const no = Math.max(0, ...bank.map(p => p.no)) + 1;
    bank.push({ no, title: puzzle.title, genre: puzzle.genre, difficulty: report.difficulty, paras: puzzle.paras });
    fs.writeFileSync(BANK, JSON.stringify(bank, null, 2) + '\n');
    fs.rmSync(full);
    approved++; console.log(C.green(`Added to the bank as #${no}.`));
  } else if (ans === 'r') {
    const reason = (await rl.question('Reason (optional) > ')).trim() || 'rejected in review';
    fs.mkdirSync(REJECTED, { recursive: true });
    fs.writeFileSync(path.join(REJECTED, file), JSON.stringify({ puzzle, report, reason }, null, 2) + '\n');
    fs.rmSync(full);
    rejected++; console.log(C.red('Rejected.'));
  }
}
rl.close();
console.log(`\n${approved} approved, ${rejected} rejected.`);
