# Forgery — concept

> A forger changed a few words in today's document. Find them.

## Core loop

1. One short document a day (~120–180 words): a letter, a police report, a ship's log, a recipe, a diary page.
2. A forger has swapped **4 single words** for fakes.
3. Tap a word to accuse it.
   - **Forgery** → the word gets struck through, the original is written above it in red ink, and the reason goes into your case notes.
   - **Innocent word** → you lose one of 3 lives. The word turns bold, and its *whole sentence* gets shaded:
     - 🟨 **Amber**: an undiscovered forgery is in that sentence.
     - ⬛ **Grey**: the sentence is clean, and its words can't be tapped any more.
     - An amber sentence turns grey once its fake is found.
4. Find all 4 to authenticate the document. Run out of lives and the forger gets away, and every remaining fake is revealed.

This warm/cold feedback is the Wordle-ish part. A mistake isn't wasted, because it narrows the search.

## The fairness rule (the most important design constraint)

Every forgery must be **outvoted by the document itself**:

- It contradicts **at least two** other pieces of the text (two mentions, or a mention plus logic).
  That way the player can always tell *which* side of a contradiction is the fake. If "Tuesday" appears twice and "Thursday" once, Thursday is the liar.
- **No outside knowledge.** Everything you need is on the page.
- Swaps are **one word for one word of the same kind** (number for number, colour for colour, relation for relation), so the fake still reads naturally.
- Every document gets **red herrings**: details that sound odd but are consistent, so players can't just tap whatever feels strange.

## Player difficulty modes (same daily document for everyone)

Difficulty is how much of the page starts out already examined. The pre-shading is seeded by puzzle and mode, so everyone on Easy gets the same head start.

| Mode | Pre-shaded |
| --- | --- |
| Easy | half of the fake-holding sentences amber, 40% of clean sentences grey |
| Normal | 20% of clean sentences grey |
| Hard | nothing |

## Content difficulty ramp across the week

| Day | Feel |
| --- | --- |
| Mon | Blunt contradictions in neighbouring sentences ("each Tuesday… arrived on Thursday, as usual") |
| Wed | Contradictions span paragraphs; one needs arithmetic (times, counts) |
| Fri | One needs inference (who is related to whom, which direction, cause and effect) |
| Sun | Longer document, 5 forgeries, more red herrings |

## Scoring and sharing

Points count down from 100: 25 per fake, −10 per wrong guess, −15 for the magnifying glass. The share grid is your tap history:

```
FORGERY #2 · Normal
4/4 found · 75 pts
✅🟨🔍✅✅✅
```

## The magnifying glass (hint)

You get one per puzzle. Tap it, then tap a paragraph, and every sentence in that paragraph is shaded amber or grey. It costs no life, but it costs 15 points and shows up as 🔍 in your share.

## Content pipeline

The pipeline is built in `tools/`. See the README for how to run it. In short: Claude writes the true document and the forgeries, code checks the structure, a blind solver must find all 4 fakes, a quick solver rates difficulty, and a human approves each puzzle into `puzzles/bank.json`.

## Open questions / ideas to explore

- A weekly **case** layer, where each daily document is evidence in one ongoing mystery.
- Should cold misses cost less than warm ones?
- Archive mode for back-catalogue puzzles.
- Theming: forger "signatures" (a forger who always changes numbers, one who always changes names).
