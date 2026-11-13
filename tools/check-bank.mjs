#!/usr/bin/env node
// Offline sanity check of every puzzle in the bank (no API calls).  npm run check
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkPuzzle } from './lib/puzzle.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'puzzles/bank.json'), 'utf8'));
let bad = 0;
const nos = new Set();
for (const p of bank) {
  const errs = checkPuzzle(p);
  if (nos.has(p.no)) errs.push(`duplicate puzzle number ${p.no}`);
  nos.add(p.no);
  if (errs.length) { bad++; console.log(`✗ #${p.no} ${p.title}\n   - ${errs.join('\n   - ')}`); }
  else console.log(`✓ #${p.no} ${p.title}`);
}
console.log(`\n${bank.length - bad}/${bank.length} puzzles pass.`);
process.exit(bad ? 1 : 0);
