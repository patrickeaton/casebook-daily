# Testimony — concept

> Five witness statements. Some words have been flipped to their opposites. Put them right.

## Core loop

1. Each case has a short brief, **evidence** cards that are always true, and **5 statements**.
2. Each statement is entirely true apart from its **blue flip words** (2–3 per statement). Each flip word is either right or flipped to its opposite: up/down, before/after, wet/dry, in/out, front/back, left/stayed…
3. Tap a blue word to flip it. Nothing is checked until you press **Check statements**.
4. A check colours every statement:
   - 🟩 **green**: all its flip words are right
   - 🟨 **yellow**: some are right
   - 🟥 **red**: none are right
5. You have **4 checks**. All green closes the case and reveals what happened. The fewer checks you use, the better your score.

## The chain (the heart of the design)

Statements aren't independent. A case is built as a dependency chain:

- **Entry points:** one or two statements the evidence settles on its own.
- **Middle links:** statements that need a fact only a solved statement provides. For example, Rook's boots were *dry*, which tells you the wet visitor at 22:10 wasn't him.
- **The payoff:** the last statement, which only resolves once the others are fixed and effectively names the culprit.

In "The Ashby Ring":

```
Level 1 (evidence)   Lady Ashby: before, already    Rook: before    Mrs Dace: boots dry
                     Mrs Dace: the wet stranger went up *later*, at 22:10
                       (a stranger "dripping wet" at 21:20 is impossible: the rain started at 21:30)
Level 2 (Mrs Dace)   Lady Ashby: she was the *first* up the stairs
                     Rook: anyone accusing him is *lying* (dry boots, wet footprints)
                     Pell: the Major, the only one out of the library at 22:10, came back *wet*, so he *must* have been out
Level 3 (Pell)       Major Fenn: *no* umbrella, came in the *back* door → the thief
```

**Spotting the culprit early is fine.** The flips aren't a lock on the answer. They're how you rebuild the *whole* story. You might guess the thief halfway through; the satisfaction comes from making every statement fit. Each case is framed around three questions, filled in as the statements go green:

- **Who** did it
- **How** (the means: the route, the tool, the opportunity)
- **Why** (the motive)

These are the narrative device. The puzzle itself is getting every flip right.

### The case file (built)

Between the evidence and the statements sits a **case file** with three slots: Who, How and Why. Each slot lists the statements it relies on, with a coloured dot showing each one's last check result. A slot fills in (and stays filled) once a check shows all of its statements green. Winning fills any slots still open.

In "The Ashby Ring":
- **Who** needs Mrs Dace, Pell and Rook: the dripping 22:10 climber, the Major's absence, and Rook's dry boots.
- **How** needs Major Fenn, Lady Ashby and Mrs Dace: the garden, the back door, the back stairs.
- **Why** needs Pell: "the Major is *poor* these days", settled by evidence card 6 (a pawn ticket and a £400 gambling bill).

Because the slots fill at different times, they give a sense of progress between checks, and make an extra reason to fix statements in a sensible order.

## Authoring rules

- **Both versions must read naturally.** A flipped word can't give itself away through grammar.
- **Every flip word has exactly one defensible value**, given the evidence and the other statements' true values.
- **No outside knowledge.**
- **Mix dependency depths**, with at least 3 levels, so the chain is felt rather than everything falling straight out of the evidence.
- **Fixed text is always true.** That gives the author a lot of control: anything you don't want questioned, write outside the flip words.
- **Set the starting state deliberately.** Mix right and flipped words so the first check gives informative yellows, plus a red or two.

## Risks to tune

- **Brute force.** Each word has only two states, so the colour feedback alone could crack a short statement in a few checks. Fewer checks (3?), or rewarding a first-check solve heavily, keeps deduction the winning strategy.
- **Too obvious.** Words like "went *down* the stairs to the upstairs study" are free. Each case needs a few that require real inference.
- **Content cost.** Writing chained cases is harder than writing Forgery documents. The same generate → blind-solve → review pipeline should work, with the solver also reporting the deduction order to confirm there's a chain.

## Ideas

- Accuse a suspect before you're allowed to check: a bonus for naming the thief early.
- Statement portraits, and a weekly "detective rank" streak.
- A shared case universe with Forgery, where a forged document turns up as evidence.

## UI notes

- Flip words are raised "keys" with a small ⇅ marker. They start blue. After a check, each key takes its statement's result colour (green/yellow/red); any key flipped since then goes back to blue, so you can see exactly what you changed. Flipping it back restores the check colour. The colour is the *statement's* result, never the individual word's, so it leaks nothing.
- Each flip word is always as wide as the longer of its two options, so flipping never reflows the paragraph.
- Highlights tint backgrounds only. The text stays full-strength ink, for readability.
