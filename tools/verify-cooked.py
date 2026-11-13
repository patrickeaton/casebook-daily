#!/usr/bin/env python3
"""Check a Cooked Books case has exactly one answer.

Brute-forces every set of N cells. A set is a valid answer if it can explain the gap between the
ledger and the bank totals, with every change making an expense bigger (positive), and the
original values satisfy the case's clue rules. Prints all valid answers; a fair case has one.
"""
import itertools, json, sys

def solve(case):
    rows, cols = len(case["truth"]), len(case["truth"][0])
    shown = [row[:] for row in case["truth"]]
    for key, v in case["cooked"].items():
        r, c = map(int, key.split(","))
        shown[r][c] = v
    bank_r = [sum(r) for r in case["truth"]]
    bank_c = [sum(case["truth"][r][c] for r in range(rows)) for c in range(cols)]
    gap_r = [sum(shown[r]) - bank_r[r] for r in range(rows)]
    gap_c = [sum(shown[r][c] for r in range(rows)) - bank_c[c] for c in range(cols)]
    cells = [(r, c) for r in range(rows) for c in range(cols)]
    answers = []
    for S in itertools.combinations(cells, len(case["cooked"])):
        # Rows/cols with a gap must contain a changed cell; clean ones must not (changes are all positive).
        if any((gap_r[r] > 0) != any(s[0] == r for s in S) for r in range(rows)): continue
        if any((gap_c[c] > 0) != any(s[1] == c for s in S) for c in range(cols)): continue
        # Solve for the deltas: try every split that fits row and column gaps (small integer search).
        for deltas in split(S, gap_r, gap_c):
            orig = [row[:] for row in shown]
            for (r, c), d in zip(S, deltas): orig[r][c] -= d
            if all(rule(orig) for rule in case["rules"]):
                answers.append((S, deltas))
    return answers, gap_r, gap_c

def split(S, gap_r, gap_c, step=5):
    """Yield delta tuples (all > 0, multiples of `step`) matching every row and column gap."""
    def rec(i, acc, rem_r, rem_c):
        if i == len(S):
            if all(v == 0 for v in rem_r) and all(v == 0 for v in rem_c): yield tuple(acc)
            return
        r, c = S[i]
        for d in range(step, min(rem_r[r], rem_c[c]) + 1, step):
            rem_r[r] -= d; rem_c[c] -= d
            yield from rec(i + 1, acc + [d], rem_r, rem_c)
            rem_r[r] += d; rem_c[c] += d
    yield from rec(0, [], gap_r[:], gap_c[:])

# ---- Case #1: the Marlow Bakery (must match cooked-books/index.html) ------------------------
ROWS, COLS = ["Jan", "Feb", "Mar", "Apr", "May"], ["Rent", "Wages", "Flour", "Dairy", "Fuel"]
CASE = {
    "truth": [[800, 1240, 420, 180, 160], [800, 1180, 385, 180, 165], [800, 1310, 450, 180, 175],
              [800, 1260, 410, 180, 150], [800, 1290, 430, 180, 140]],
    "cooked": {"1,2": 505, "2,3": 300, "3,1": 1560, "4,4": 260},
    "rules": [
        lambda o: all(o[r][0] == 800 for r in range(5)),                  # rent is always 800
        lambda o: len({o[r][3] for r in range(5)}) == 1,                  # the dairy bill is the same every month
        lambda o: o[4][4] < min(o[r][4] for r in range(4)),               # May had the lowest fuel bill
    ],
}

if __name__ == "__main__":
    answers, gr, gc = solve(CASE)
    print("row gaps:", dict(zip(ROWS, gr)), " col gaps:", dict(zip(COLS, gc)))
    # also show what the case would allow WITHOUT the clue rules, to prove the clues matter
    loose, _, _ = solve({**CASE, "rules": []})
    print(f"answers without clues: {len(loose)}")
    for S, d in loose: print("   ", [f"{ROWS[r]} {COLS[c]} +{x}" for (r, c), x in zip(S, d)])
    print(f"answers with clues:    {len(answers)}")
    for S, d in answers: print("   ", [f"{ROWS[r]} {COLS[c]} +{x}" for (r, c), x in zip(S, d)])
    sys.exit(0 if len(answers) == 1 else 1)
