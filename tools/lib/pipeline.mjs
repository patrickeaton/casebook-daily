// Turning a writer draft into a marked-up puzzle, and scoring a blind solver against it.
import { splitSentences, wholeWord, plain, words, forgeriesOf } from './puzzle.mjs';

// ---------- assembly ----------
export function assemble(d) {
  const errs = [];
  const paras = d.paragraphs.slice();
  const truth = d.paragraphs.join('\n');
  for (const f of d.forgeries) {
    const p = paras[f.paragraph];
    if (p == null) { errs.push(`forgery "${f.fake}" points at missing paragraph ${f.paragraph}`); continue; }
    if (!p.includes(f.sentence)) { errs.push(`sentence for "${f.original}" not found verbatim in paragraph ${f.paragraph}`); continue; }
    const hits = f.sentence.match(wholeWord(f.original))?.length ?? 0;
    if (hits !== 1) { errs.push(`"${f.original}" appears ${hits}× in its sentence (need exactly 1)`); continue; }
    const why = f.why.replace(/[|\]]/g, '');
    // function replacers, so a "$" in the text can't be read as a replacement pattern
    const forged = f.sentence.replace(wholeWord(f.original), () => `[[${f.fake}|${f.original}|${why}]]`);
    paras[f.paragraph] = p.replace(f.sentence, () => forged);
    const good = f.evidence.filter(q => q.trim() && truth.includes(q) && !f.sentence.includes(q));
    if (good.length < 2) errs.push(`forgery "${f.original}→${f.fake}" has ${good.length} verbatim evidence quote(s) outside its sentence (need 2)`);
  }
  return { puzzle: { title: d.title, genre: d.genre, paras, redHerrings: d.red_herrings }, errs };
}

// ---------- solver scoring ----------
const norm = s => words(s.toLowerCase()).join(' ');
export function score(puzzle, sol) {
  const doc = puzzle.paras.map(plain).join(' ');
  const fakes = forgeriesOf(puzzle);
  const found = [], missed = [];
  for (const f of fakes) {
    const sentence = splitSentences(puzzle.paras[f.p].replace(/\[\[([^|\]]+)\|[^\]]+\]\]/g, '$1'))
      .find(s => wholeWord(f.fake).test(s)) ?? '';
    const ambiguous = (doc.match(wholeWord(f.fake))?.length ?? 0) > 1;
    const hit = sol.suspects.some(s => s.word.trim().toLowerCase() === f.fake.toLowerCase()
      && (!ambiguous || norm(sentence).includes(norm(s.sentence).slice(0, 40)) || norm(s.sentence).includes(norm(sentence).slice(0, 40))));
    (hit ? found : missed).push(f.fake);
  }
  return { found: found.length, missed, wrong: sol.suspects.map(s => s.word).filter(w => !fakes.some(f => f.fake.toLowerCase() === w.toLowerCase())), concerns: sol.other_concerns };
}

