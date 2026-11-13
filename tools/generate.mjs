#!/usr/bin/env node
// Generate Forgery puzzles with Claude, check them, and drop survivors in puzzles/pending/ for human review.
//
//   npm run generate -- --count 5
//   npm run generate -- --count 2 --genre "a ship's log" --difficulty hard
//
// Pipeline per puzzle:
//   1. Writer drafts the TRUE document + 4 forgeries (structured output).
//   2. Code applies the forgeries and runs structural checks (single words, distinct sentences, evidence quotes exist…).
//   3. A blind solver at high effort must find all 4 fakes, or the puzzle is rejected as unfair.
//   4. A blind solver at low effort gives a rough difficulty rating (how many it finds).
//   Anything the strong solver found suspicious besides the real fakes is flagged for the reviewer.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { checkPuzzle, plain } from './lib/puzzle.mjs';
import { assemble, score } from './lib/pipeline.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = { bank: path.join(ROOT, 'puzzles/bank.json'), pending: path.join(ROOT, 'puzzles/pending'), rejected: path.join(ROOT, 'puzzles/rejected') };
const MODEL = 'claude-opus-5-5';
const PRICE = { in: 4 / 1e6, out: 20 / 1e6 }; // $ per token for claude-opus-5-5
const CONCURRENCY = 3;
const ATTEMPTS = 2;

const GENRES = [
  "a lighthouse keeper's letter to family", "a ship's log over three days", "a museum night guard's incident report",
  "a handwritten family recipe card with notes", "a mountain hut logbook entry", "a village fete committee's minutes",
  "a train station's notice of timetable changes", "a teenager's diary page", "an expedition journal entry",
  "a lost-and-found report at a seaside hotel", "a letter from a boarding-school pupil home", "a bakery's order slip with a complaint",
  "a weather station's weekly summary", "a beekeeper's notebook", "a tenant's letter to a landlord about repairs",
  "a postcard sequence from a walking holiday", "a stable hand's report on a missing horse", "a theatre stage manager's show report",
  "a librarian's note about an overdue book", "a ferry captain's accident statement", "a chess club newsletter result report",
  "an allotment society dispute letter", "a zookeeper's daily feeding log", "a castle tour guide's script with notes",
];

// ---------- args ----------
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
  return acc;
}, []));
const COUNT = Number(args.count ?? 3);
if (!Number.isInteger(COUNT) || COUNT < 1) { console.error('--count must be a positive integer'); process.exit(1); }

// ---------- schemas ----------
const Draft = z.object({
  title: z.string().describe('Short in-world title, e.g. "Letter from Gull Rock"'),
  genre: z.string(),
  paragraphs: z.array(z.string()).describe('The TRUE document, one string per paragraph (greeting and sign-off lines count as paragraphs).'),
  forgeries: z.array(z.object({
    paragraph: z.number().int().describe('0-based index into paragraphs'),
    sentence: z.string().describe('The full sentence containing the word, copied verbatim from the TRUE paragraph'),
    original: z.string().describe('The true word, exactly as written'),
    fake: z.string().describe('The single replacement word'),
    evidence: z.array(z.string()).describe('2+ verbatim quotes from the TRUE text, outside this sentence, that pin down the original'),
    why: z.string().describe('Shown to players after they find it: one or two plain sentences pointing at the evidence'),
  })),
  red_herrings: z.array(z.string()).describe('Details that sound odd but are fully consistent'),
});

const Solution = z.object({
  suspects: z.array(z.object({
    word: z.string().describe('The forged word exactly as it appears in the document'),
    sentence: z.string().describe('The full sentence it appears in'),
    evidence: z.string(),
  })).describe('Exactly 4 suspects'),
  other_concerns: z.array(z.string()).describe('Anything else a careful player might reasonably accuse: accidental contradictions or ambiguities. Empty if none.'),
});

// ---------- prompts ----------
const WRITER_SYSTEM = `You write documents for Forgery, a daily puzzle game. Players read a short in-world document in which a forger has changed exactly 4 single words. Every fake must be catchable from the text alone, and players should feel clever, not cheated.

Write the TRUE document first, then choose the 4 forgeries.

The document:
- 130–190 words over 4–7 paragraphs: a self-contained in-world document of the requested type. Fictional people and places only. Plain English with a little personality and texture; it should be pleasant to read even without the puzzle.
- No abbreviations that use a period (Mr., Dr., St., a.m., p.m.). Write times as 24-hour (21:30) or in words. Use semicolons only at a genuine clause boundary, because the game treats them as sentence breaks.
- Plant facts the text pins down more than once: counts, days, colours, directions, relationships, times, sequences, materials, who did what.
- Include 2 red herrings: details that sound odd or surprising but are fully consistent with everything else.

Each forgery must satisfy all of these:
1. Exactly one word replaced by exactly one different word of the same kind (number for number, colour for colour, day for day, relation for relation, direction for direction). Hyphenated numbers like "ninety-nine" count as one word. For a time like 15:00, forge only the hour or the minute part ("13" in 13:00), never the whole time, since the game treats each part as its own word.
2. The fake still reads naturally: grammatical, no a/an mismatch, nothing that gives it away by sounding wrong on its own.
3. Outvoted: at least two other places in the document (direct mentions, or a clear logical consequence) support the original, so the player can tell which side of the contradiction is the lie. Watch out for sums and time calculations: if the fake is one term of "40 + 20 = 60" or "06:00 plus nine hours = 15:00", a player can see the sum is wrong but not which number is the lie. Every other term must also be confirmed somewhere else, independently. Also make sure no alternative set of four changes would make the document just as consistent.
4. No outside knowledge: no real-world facts, trivia, or physics beyond everyday common sense.
5. Each forgery sits in a different sentence, spread across the document, and the forged word appears exactly once in its sentence.
6. A mix of kinds: at most two of the four are simple "stated twice" repeats; at least one needs arithmetic or a small inference (time differences, counts adding up, who is related to whom, direction of travel).
7. The true text contains no accidental inconsistencies anywhere.

"sentence" must be copied verbatim from the TRUE paragraph. "evidence" quotes must be verbatim from the TRUE text and must not come from the forged sentence itself.`;

const SOLVER_SYSTEM = `You are playing Forgery. In the document below, a forger changed exactly 4 words; each is a single word swapped for another single word. Every fake is contradicted by the document itself, and no outside knowledge is needed.

Find the 4 fakes. For each, give the word exactly as it appears, the full sentence it is in, and the in-text evidence against it.

Then, in other_concerns, list anything else in the document that is inconsistent or ambiguous enough that a careful player might reasonably accuse it. Leave the list empty if there is nothing.`;

// ---------- api ----------
const hasCreds = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE
  || fs.existsSync(path.join(process.env.HOME ?? '', '.config/anthropic'));
if (!hasCreds) {
  console.error('No Anthropic credentials found. Either:\n  export ANTHROPIC_API_KEY=sk-ant-...   (from https://platform.claude.com)\nor install the ant CLI and run: ant auth login');
  process.exit(1);
}
const client = new Anthropic();
const spend = { in: 0, out: 0 };

async function ask(system, user, schema, effort) {
  const res = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    thinking: { type: 'adaptive' },
    output_config: { effort, format: betaZodOutputFormat(schema) },
    system,
    messages: [{ role: 'user', content: user }],
  });
  spend.in += res.usage.input_tokens ?? 0;
  spend.out += res.usage.output_tokens ?? 0;
  if (res.stop_reason === 'refusal') throw new Error(`model declined (${res.stop_details?.category ?? 'no category'})`);
  if (res.stop_reason === 'max_tokens') throw new Error('hit max_tokens');
  if (!res.parsed_output) throw new Error('no parsed output');
  return res.parsed_output;
}

// ---------- one puzzle ----------
function existingTitles() {
  const titles = [];
  try { titles.push(...JSON.parse(fs.readFileSync(DIR.bank, 'utf8')).map(p => p.title)); } catch {}
  for (const f of fs.existsSync(DIR.pending) ? fs.readdirSync(DIR.pending) : []) {
    try { titles.push(JSON.parse(fs.readFileSync(path.join(DIR.pending, f), 'utf8')).puzzle.title); } catch {}
  }
  return titles;
}

async function makeOne(n, genre) {
  const tag = `[${n}] ${genre}`;
  let repair = '';
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const user = [
      `Document type: ${genre}.`,
      args.difficulty ? `Aim for ${args.difficulty} difficulty.` : '',
      `Avoid reusing these titles or settings: ${existingTitles().join('; ') || '(none yet)'}.`,
      repair,
    ].filter(Boolean).join('\n\n');

    console.log(`${tag}: drafting (attempt ${attempt})…`);
    const draft = await ask(WRITER_SYSTEM, user, Draft, 'high');
    const { puzzle, errs } = assemble(draft);
    errs.push(...checkPuzzle(puzzle));
    if (errs.length) {
      console.log(`${tag}: failed checks: ${errs.join('; ')}`);
      repair = `A previous attempt failed these checks, so avoid them:\n- ${errs.join('\n- ')}`;
      continue;
    }

    const docText = `${puzzle.title}\n\n${puzzle.paras.map(plain).join('\n\n')}`;
    console.log(`${tag}: "${puzzle.title}" passed checks; solving blind…`);
    const [strongSol, weakSol] = await Promise.all([
      ask(SOLVER_SYSTEM, docText, Solution, 'high'),
      ask(SOLVER_SYSTEM, docText, Solution, 'low'),
    ]);
    const strong = score(puzzle, strongSol), weak = score(puzzle, weakSol);
    const difficulty = weak.found >= 4 ? 'easy' : weak.found >= 2 ? 'medium' : 'hard';
    const report = { difficulty, strong, weak: { found: weak.found, missed: weak.missed }, model: MODEL, generatedAt: new Date().toISOString() };
    const file = `${new Date().toISOString().slice(0, 10)}-${slug(puzzle.title)}.json`;

    if (strong.found < 4) {
      writeJson(path.join(DIR.rejected, file), { puzzle, report, reason: `strong solver found only ${strong.found}/4 (missed: ${strong.missed.join(', ')})` });
      console.log(`${tag}: ✗ rejected — strong solver found ${strong.found}/4`);
      return 'rejected';
    }
    writeJson(path.join(DIR.pending, file), { puzzle, report });
    console.log(`${tag}: ✓ pending/${file} — ${difficulty}${strong.concerns.length ? `, ${strong.concerns.length} concern(s) flagged` : ''}`);
    return 'pending';
  }
  console.log(`${tag}: ✗ gave up after ${ATTEMPTS} attempts`);
  return 'failed';
}

// ---------- utils ----------
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
function writeJson(file, data) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n'); }
function pickGenres(n) {
  if (args.genre && args.genre !== true) return Array(n).fill(args.genre);
  const pool = GENRES.slice().sort(() => Math.random() - 0.5);
  return Array.from({ length: n }, (_, i) => pool[i % pool.length]);
}

async function pool(items, size, fn) {
  const results = []; let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) { const i = next++; results[i] = await fn(items[i], i).catch(e => { console.log(`[${i + 1}] error: ${e.message}`); return 'error'; }); }
  }));
  return results;
}

// ---------- main ----------
const genres = pickGenres(COUNT);
console.log(`Generating ${COUNT} puzzle(s) with ${MODEL}…\n`);
const results = await pool(genres, CONCURRENCY, (g, i) => makeOne(i + 1, g));
const tally = results.reduce((t, r) => (t[r] = (t[r] ?? 0) + 1, t), {});
const cost = spend.in * PRICE.in + spend.out * PRICE.out;
console.log(`\nDone: ${Object.entries(tally).map(([k, v]) => `${v} ${k}`).join(', ')}`);
console.log(`Tokens: ${spend.in.toLocaleString()} in / ${spend.out.toLocaleString()} out ≈ $${cost.toFixed(2)} (≈ $${(cost / COUNT).toFixed(2)} per attempt)`);
if (tally.pending) console.log('Next: npm run review');
