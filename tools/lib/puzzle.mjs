// Shared puzzle helpers. The sentence and word rules here MUST match tokenize() in index.html,
// or the game's amber/grey shading won't line up with what the checks assumed.

export const WORD_RE = /[A-Za-z0-9'’-]+/g;
export const SINGLE_WORD_RE = /^[A-Za-z0-9'’-]+$/;
export const MARK_RE = /\[\[([^|\]]+)\|([^|\]]+)\|([^\]]+)\]\]/g;

/** Split a paragraph into sentences the same way the game does: end after . ! ? or ; (plus closing quotes/brackets). */
export function splitSentences(text) {
  const out = [];
  const re = /[^.!?;]*[.!?;]+["”’)]*|[^.!?;]+$/g;
  for (const m of text.matchAll(re)) {
    const s = m[0].trim();
    if (s) out.push(s);
  }
  return out;
}

export const words = text => text.match(WORD_RE) ?? [];
export const plain = para => para.replace(MARK_RE, (_, shown) => shown);
export const truthOf = para => para.replace(MARK_RE, (_, _shown, orig) => orig);

/** Pull the forgeries back out of a marked-up puzzle. */
export function forgeriesOf(puzzle) {
  const out = [];
  puzzle.paras.forEach((para, p) => {
    for (const m of para.matchAll(MARK_RE)) out.push({ p, fake: m[1], original: m[2], why: m[3] });
  });
  return out;
}

/** Locate each forgery's sentence (paragraph index + sentence index), using the forged text. */
export function sentenceIdsOf(puzzle) {
  const ids = [];
  puzzle.paras.forEach((para, p) => {
    // Swap markers for a sentinel so we can find which sentence they land in.
    let k = 0;
    const tagged = para.replace(MARK_RE, (_, shown) => `${shown}\u0000${k++}\u0000`);
    splitSentences(tagged).forEach((s, si) => {
      for (const m of s.matchAll(/\u0000(\d+)\u0000/g)) ids.push({ p, s: si });
    });
  });
  return ids;
}

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const wholeWord = w => new RegExp(`(?<![A-Za-z0-9'’-])${escapeRe(w)}(?![A-Za-z0-9'’-])`, 'g');

/** Structural checks on a finished, marked-up puzzle. Returns a list of problems (empty = pass). */
export function checkPuzzle(puzzle, { minWords = 110, maxWords = 230, fakes = 4 } = {}) {
  const errs = [];
  const { title, paras } = puzzle;
  if (!title || typeof title !== 'string') errs.push('missing title');
  if (!Array.isArray(paras) || paras.length < 3 || paras.length > 9) errs.push(`expected 3–9 paragraphs, got ${paras?.length}`);
  if (errs.length) return errs;

  const forged = paras.map(plain).join('\n');
  const n = words(forged).length;
  if (n < minWords || n > maxWords) errs.push(`length ${n} words, want ${minWords}–${maxWords}`);

  // Abbreviations with periods would split sentences in the wrong place.
  const abbr = forged.match(/\b(Mr|Mrs|Ms|Dr|St|Mt|Capt|Lt|Sgt|No|vs|etc|a\.m|p\.m|e\.g|i\.e)\./gi);
  if (abbr) errs.push(`abbreviation with a period breaks sentence splitting: ${[...new Set(abbr)].join(', ')}`);
  if (/[|\[\]]/.test(forged)) errs.push('stray markup characters in text');

  const fs = forgeriesOf(puzzle);
  if (fs.length !== fakes) errs.push(`expected ${fakes} forgeries, got ${fs.length}`);
  for (const f of fs) {
    if (!SINGLE_WORD_RE.test(f.fake)) errs.push(`fake "${f.fake}" is not a single word`);
    if (!SINGLE_WORD_RE.test(f.original)) errs.push(`original "${f.original}" is not a single word`);
    if (f.fake.toLowerCase() === f.original.toLowerCase()) errs.push(`fake "${f.fake}" equals original`);
    if (!f.why || f.why.length < 20) errs.push(`forgery "${f.fake}" has no real explanation`);
  }
  const ids = sentenceIdsOf(puzzle).map(x => `${x.p}:${x.s}`);
  if (new Set(ids).size !== ids.length) errs.push('two forgeries share a sentence (warm/grey feedback gets muddy)');
  return errs;
}
