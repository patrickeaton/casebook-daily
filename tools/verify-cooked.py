#!/usr/bin/env python3
"""Check Cooked Books cases (puzzles/cooked.json) each have exactly one answer.

A set of cells is a valid answer if it explains every row and column gap with all changes positive (every
change made an expense bigger) and the original values it implies satisfy all the case's clue rules.

Clue rules (in each case's "rules"):
  {"type":"fixed",   "col":c, "value":v}   every entry in column c was really v
  {"type":"same",    "col":c}              column c was the same every month
  {"type":"lowest",  "col":c, "row":r}     row r had the strictly lowest value in column c
  {"type":"highest", "col":c, "row":r}     row r had the strictly highest value in column c
  {"type":"genuine", "row":r, "col":c}     that entry was not changed

  python3 tools/verify-cooked.py            # check every case
  python3 tools/verify-cooked.py 3          # just case #3, with detail
Also importable: solve(case) -> (answers, row_gaps, col_gaps), check(case)
"""
import itertools, json, os, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')


def shown_of(case):
    shown = [row[:] for row in case["truth"]]
    for key, v in case["cooked"].items():
        r, c = map(int, key.split(","))
        shown[r][c] = v
    return shown


def rule_ok(rule, orig, shown):
    t, R = rule["type"], len(orig)
    if t == "fixed":   return all(orig[r][rule["col"]] == rule["value"] for r in range(R))
    if t == "same":    return len({orig[r][rule["col"]] for r in range(R)}) == 1
    if t == "lowest":  c, x = rule["col"], rule["row"]; return all(orig[x][c] < orig[r][c] for r in range(R) if r != x)
    if t == "highest": c, x = rule["col"], rule["row"]; return all(orig[x][c] > orig[r][c] for r in range(R) if r != x)
    if t == "genuine": return orig[rule["row"]][rule["col"]] == shown[rule["row"]][rule["col"]]
    raise ValueError(f"unknown rule type {t}")


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


def solve(case, rules=None):
    rules = case.get("rules", []) if rules is None else rules
    truth, shown = case["truth"], shown_of(case)
    R, C = len(truth), len(truth[0])
    gap_r = [sum(shown[r]) - sum(truth[r]) for r in range(R)]
    gap_c = [sum(shown[r][c] for r in range(R)) - sum(truth[r][c] for r in range(R)) for c in range(C)]
    rows = [r for r in range(R) if gap_r[r]]; cols = [c for c in range(C) if gap_c[c]]
    cells = [(r, c) for r in rows for c in cols]
    answers = []
    for S in itertools.combinations(cells, len(case["cooked"])):
        if any(not any(s[0] == r for s in S) for r in rows): continue
        if any(not any(s[1] == c for s in S) for c in cols): continue
        for deltas in split(S, gap_r, gap_c):
            orig = [row[:] for row in shown]
            for (r, c), d in zip(S, deltas): orig[r][c] -= d
            if all(rule_ok(rule, orig, shown) for rule in rules):
                answers.append((S, deltas))
    return answers, gap_r, gap_c


def check(case, verbose=False):
    """Fair = exactly one answer, it's the intended one, the gaps alone allow several, and each clue's role is known."""
    probs = []
    answers, gr, gc = solve(case)
    intended = sorted(tuple(map(int, k.split(","))) for k in case["cooked"])
    if len(answers) != 1: probs.append(f"{len(answers)} answers with the clues")
    elif sorted(answers[0][0]) != intended: probs.append("the unique answer isn't the intended one")
    loose = len(solve(case, rules=[])[0])
    if loose < 2: probs.append("the gaps alone already give the answer (clues don't matter)")
    useful = []
    for i in range(len(case.get("rules", []))):
        without = len(solve(case, rules=[x for j, x in enumerate(case["rules"]) if j != i])[0])
        useful.append(without > 1)
    if verbose:
        print(f"  gaps: rows {gr}  cols {gc}")
        print(f"  answers from the gaps alone: {loose}; with clues: {len(answers)}")
        for rule, u in zip(case.get("rules", []), useful): print(f"  rule {rule}: {'needed' if u else 'red herring'}")
    return probs, loose, useful


if __name__ == "__main__":
    cases = json.load(open(os.path.join(ROOT, "puzzles", "cooked.json")))
    only = int(sys.argv[1]) if len(sys.argv) > 1 else None
    bad = 0
    for case in cases:
        if only and case["no"] != only: continue
        probs, loose, useful = check(case, verbose=bool(only))
        print(f"{'✓' if not probs else '✗'} #{case['no']} {case['title']}: {loose} answers from the gaps alone, "
              f"{sum(useful)} clue(s) needed{'' if not probs else ' — ' + '; '.join(probs)}")
        bad += bool(probs)
    sys.exit(1 if bad else 0)
