# Casebook

A collection of daily mystery puzzles, linked by a shared slide-out menu (`shared/menu.js`).

| Game | Path | Idea |
| --- | --- | --- |
| Forgery | `/forgery/` | A forger changed 4 words in a document. Find them. See [DESIGN.md](DESIGN.md). |
| Testimony | `/testimony/` | Flip words in five witness statements until they all fit the evidence. See [testimony/DESIGN.md](testimony/DESIGN.md). |
| Cooked Books | `/cooked-books/` | Find the inflated ledger entries using the bank's row and column totals. Check a case with `python3 tools/verify-cooked.py`. |
| Follow the Money | `/follow-the-money/` | Fill in missing transfers through shell companies (money in = money out) and name who got the most. Check a case with `node tools/verify-money.mjs`. |

The home page (`/`) shows today's case, the next few days and every game.

**Daily rotation:** one case a day, cycling Forgery → Testimony → Cooked Books → Follow the Money. The game list, launch date and rotation all live in `shared/casebook.js` (set `LAUNCH` to the real start date before going live). A game's issue number is how many times it has come up so far.

**Shared pieces** in `shared/`:
- `casebook.js`: game list and schedule. Every page loads it in `<head>`.
- `menu.js`: the slide-out games menu, with Home and a TODAY badge.
- `side.js`: the right-hand panel for clues and rules. Mark a section with `data-side` plus a `data-side-buttons` placeholder. Testimony still has its own version of this panel.

To add a game: give it a folder, add it to `GAMES` and `ROTATION` in `shared/casebook.js`, add an icon in `shared/menu.js`, and load `casebook.js` in the page's `<head>` and `menu.js` at the end.

## Play locally

```bash
npm install
npm run serve        # http://localhost:5191, also reachable from your phone on the same Wi-Fi; never cached
```

The game loads `puzzles/bank.json`. One puzzle unlocks per day from the launch date (`EPOCH` in `index.html`). Before launch, the whole bank is visible so it can be play-tested.

## Making puzzles

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm run generate -- --count 5                                  # random document types
npm run generate -- --count 2 --genre "a ship's log" --difficulty hard
npm run review                                                 # approve or reject what's pending
npm run check                                                  # offline sanity check of the bank
```

Each puzzle goes through four steps:

1. **Writer** (Claude Opus 5.5, high effort) writes the *true* document, then picks 4 forgeries. Each comes with its evidence quotes and the player-facing "why".
2. **Structural checks** in code run on the result:
   - Each swap is a single word, and each forgery sits in its own sentence.
   - The forged word appears exactly once in that sentence.
   - Each forgery has at least 2 verbatim evidence quotes from *outside* its sentence.
   - The length is in range, and there are no abbreviations like "Dr." that would break sentence splitting.

   On a failure, the writer retries once with the errors fed back.
3. **Blind solver at high effort** gets only the forged text. If it can't find all 4 fakes, the puzzle is rejected to `puzzles/rejected/` as likely unfair. Anything *else* it found suspicious is flagged for review.
4. **Blind solver at low effort** gives a rough difficulty rating: 4/4 found is easy, 2–3 is medium, 0–1 is hard.

Survivors land in `puzzles/pending/`. `npm run review` shows each one with its fakes highlighted, the solver's concerns, and a link to play it in the browser (`/forgery/?file=../puzzles/pending/…`). Approving adds it to the bank with the next number.

Rough cost: three Opus calls per attempt, roughly $0.10–0.40 per puzzle. The generator prints the actual token spend at the end of each run.

Requests use `fallbacks: "default"` (server-side refusal fallback). If Opus declines a request, the API retries it on a fallback model inside the same call.
