#!/usr/bin/env python3
"""Generate Cooked Books cases and append them to puzzles/cooked.json.

Each case: a 5×5 expenses ledger where four entries were padded. One big padding sits alone; the other three
share an amount, so the totals alone allow 6 answers. Two true clues, each needed, cut that to one; a "fixed"
clue is added as a red herring. Every case is checked with tools/verify-cooked.py before it's kept.

    python3 tools/gen-cooked.py 8          # add 8 cases (numbered after the existing ones)
"""
import itertools, json, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib.util
spec = importlib.util.spec_from_file_location("vc", os.path.join(os.path.dirname(os.path.abspath(__file__)), "verify-cooked.py"))
vc = importlib.util.module_from_spec(spec); spec.loader.exec_module(vc)

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

# Each column: (name, base, spread, kind). kind: fixed = same set amount every month (the red-herring clue);
# steady = the same every month, used by a "never changes" clue; vary = moves month to month.
THEMES = [
    dict(business="Pell's Garage", who="Dora Pell's office manager, Ray Kettle", culprit="Ray Kettle", role="office manager",
         cols=[("Rent", 950, 0, "fixed", "the lease"), ("Wages", 2100, 160, "vary"), ("Parts", 640, 90, "vary"), ("Power", 210, 0, "steady", "is on a fixed tariff"), ("Alarm", 180, 0, "steady", "contract is paid at a set monthly rate")],
         excuse='paid to himself as "garage sundries"'),
    dict(business="Harbourside Café", who="the café's manager, Lena Voss", culprit="Lena Voss", role="manager",
         cols=[("Rent", 1200, 0, "fixed", "the lease"), ("Wages", 1850, 140, "vary"), ("Coffee", 420, 60, "vary"), ("Milk", 160, 0, "steady", "order is the same every week"), ("Laundry", 90, 25, "vary")],
         excuse='paid out as "cash tips"'),
    dict(business="Ferris Books", who="the bookshop's assistant, Owen Hale", culprit="Owen Hale", role="assistant",
         cols=[("Rent", 1100, 0, "fixed", "the lease"), ("Wages", 1400, 120, "vary"), ("Stock", 900, 150, "vary"), ("Heating", 140, 45, "vary"), ("Cleaning", 120, 0, "steady", "contract is a set fee")],
         excuse='moved into a "stock float" that only he could reach'),
    dict(business="Lowmoor Riding School", who="the yard's bookkeeper, Gwen Archer", culprit="Gwen Archer", role="bookkeeper",
         cols=[("Rent", 700, 0, "fixed", "the field lease"), ("Wages", 1600, 130, "vary"), ("Feed", 530, 80, "vary"), ("Farrier", 260, 0, "steady", "visits on a fixed monthly fee"), ("Vet", 190, 70, "vary")],
         excuse='paid to a "tack supplier" that turned out to be her sister'),
    dict(business="Kettle & Rose Florist", who="the shop's driver, Sam Ainsley", culprit="Sam Ainsley", role="driver",
         cols=[("Rent", 850, 0, "fixed", "the lease"), ("Wages", 1300, 110, "vary"), ("Flowers", 980, 160, "vary"), ("Van", 230, 60, "vary"), ("Phone", 45, 0, "steady", "contract is a set monthly fee")],
         excuse='claimed back as "van expenses"'),
    dict(business="Orchard Lane Surgery", who="the practice manager, Neil Brandt", culprit="Neil Brandt", role="practice manager",
         cols=[("Rent", 1800, 0, "fixed", "the lease"), ("Wages", 3400, 220, "vary"), ("Supplies", 610, 90, "vary"), ("Cleaning", 300, 0, "steady", "contract is a set fee"), ("Postage", 85, 30, "vary")],
         excuse='paid to a "medical supplies" account he controlled'),
    dict(business="The Copper Pot", who="the pub's cellar manager, Ivy Marsh", culprit="Ivy Marsh", role="cellar manager",
         cols=[("Rent", 1500, 0, "fixed", "the brewery lease"), ("Wages", 2600, 180, "vary"), ("Beer", 1450, 200, "vary"), ("Food", 820, 120, "vary"), ("Glasses", 60, 0, "steady", "hire is a set monthly fee")],
         excuse='taken as "breakages" from the till'),
    dict(business="Wexley Print", who="the print shop's foreman, Colin Dace", culprit="Colin Dace", role="foreman",
         cols=[("Rent", 1000, 0, "fixed", "the lease"), ("Wages", 1950, 150, "vary"), ("Paper", 520, 90, "vary"), ("Ink", 340, 70, "vary"), ("Repairs", 150, 0, "steady", "contract is a set monthly fee")],
         excuse='paid to a "repairs" firm that was really his own account'),
]

r5 = lambda x: int(round(x / 5.0)) * 5


def make_truth(theme, rng):
    cols = theme["cols"]; truth = [[0] * 5 for _ in range(5)]
    for c, col in enumerate(cols):
        base, spread, kind = col[1], col[2], col[3]
        if kind in ("fixed", "steady"):
            for r in range(5): truth[r][c] = base
        else:
            vals = set()
            while len(vals) < 5: vals.add(r5(base + rng.uniform(-spread, spread)))
            vals = list(vals); rng.shuffle(vals)
            for r in range(5): truth[r][c] = vals[r]
    return truth


def true_rules(truth, theme):
    """Every clue that's true of the real ledger, in data form."""
    out = []
    for c, col in enumerate(theme["cols"]):
        colvals = [truth[r][c] for r in range(5)]
        if col[3] == "fixed": out.append({"type": "fixed", "col": c, "value": colvals[0]})
        elif col[3] == "steady": out.append({"type": "same", "col": c})
        else:
            lo, hi = min(colvals), max(colvals)
            if colvals.count(lo) == 1: out.append({"type": "lowest", "col": c, "row": colvals.index(lo)})
            if colvals.count(hi) == 1: out.append({"type": "highest", "col": c, "row": colvals.index(hi)})
    return out


def clue_text(rule, theme, months):
    col = theme["cols"][rule["col"]]; name = col[0]; low = name.lower()
    if rule["type"] == "fixed": return f"{name} is fixed by {col[4]}: £{rule['value']:,} every month."
    if rule["type"] == "same": return f"The {low} {col[4]}, so the {low} bill never changes."
    if rule["type"] == "lowest": return f"The {low} supplier's statement shows {months[rule['row']]} was the smallest {low} bill of the five months."
    if rule["type"] == "highest": return f"The {low} supplier's statement shows {months[rule['row']]} was the biggest {low} bill of the five months."
    if rule["type"] == "genuine": return f"The auditors checked the {months[rule['row']]} {low} bill against the receipt: it's genuine."


def giveaway(rule, theme, months):
    name = theme["cols"][rule["col"]][0].lower()
    if rule["type"] == "same": return f"the {name} bill never changes, so the one month that differed was cooked"
    if rule["type"] == "lowest": return f"{months[rule['row']]}'s {name} was meant to be the smallest bill of the five, and the padding broke that"
    if rule["type"] == "highest": return f"{months[rule['row']]}'s genuine {name} was the biggest of the five, which only works one way round"
    if rule["type"] == "genuine": return f"the audited {months[rule['row']]} {name} receipt ruled out the other arrangement"


def build(no, theme, rng, tries=4000):
    for _ in range(tries):
        start = rng.randrange(0, 8); months = MONTHS[start:start + 5]; long_months = MONTH_NAMES[start:start + 5]
        truth = make_truth(theme, rng)
        fixed_c = next(c for c, col in enumerate(theme["cols"]) if col[3] == "fixed")
        others = [c for c in range(5) if c != fixed_c]
        big_c = rng.choice(others); trio_c = rng.sample([c for c in others if c != big_c], 3)
        rows = rng.sample(range(5), 4); big_r, trio_r = rows[0], rows[1:]
        big_d = rng.choice([200, 240, 300, 360, 420]); d = rng.choice([60, 75, 90, 120, 150])
        cooked = {f"{big_r},{big_c}": truth[big_r][big_c] + big_d}
        for r, c in zip(trio_r, trio_c): cooked[f"{r},{c}"] = truth[r][c] + d
        case = {"truth": truth, "cooked": cooked}
        if len(vc.solve(case, rules=[])[0]) < 4: continue
        pool = true_rules(truth, theme)
        # genuine-cell clues inside the ambiguous block, at most one per case (they're the bluntest)
        block = [(r, c) for r in trio_r for c in trio_c if f"{r},{c}" not in cooked]
        pool += [{"type": "genuine", "row": r, "col": c} for r, c in rng.sample(block, min(2, len(block)))]
        herring = next(x for x in pool if x["type"] == "fixed")
        pairs = [p for p in itertools.combinations([x for x in pool if x["type"] != "fixed"], 2)
                 if sum(x["type"] == "genuine" for x in p) <= 1 and len({x["col"] for x in p}) == 2]
        rng.shuffle(pairs)
        for pair in pairs:
            rules = [herring, *pair]
            if len(vc.solve(case, rules=rules)[0]) != 1: continue
            if any(len(vc.solve(case, rules=[herring, x])[0]) == 1 for x in pair): continue   # each clue must be needed
            case.update(no=no, rules=rules)
            if vc.check(case)[0]: continue
            pad = sorted(((int(k.split(',')[0]), int(k.split(',')[1]), v - truth[int(k.split(',')[0])][int(k.split(',')[1])]) for k, v in cooked.items()))
            total = sum(p[2] for p in pad)
            items = [f"{long_months[r]}'s {theme['cols'][c][0].lower()} by £{x:,}" for r, c, x in pad]
            story = (f"{theme['culprit']} padded {', '.join(items[:-1])} and {items[-1]}: £{total:,} in all, {theme['excuse']}. "
                     f"Two things gave it away: {giveaway(pair[0], theme, long_months)}, and {giveaway(pair[1], theme, long_months)}.")
            case.update({
                "title": theme["business"],
                "brief": f"{theme['business']} suspects {theme['who']}, of padding the expenses. Four entries in the ledger were inflated and the difference pocketed. The TOTAL figures show where the ledger and the bank disagree. Work out which entries were cooked.",
                "ledgerTitle": f"{theme['business'].upper()} · EXPENSES LEDGER (£)",
                "rows": months, "cols": [col[0] for col in theme["cols"]],
                "clues": ["Exactly four entries were changed, and every change made an expense bigger."] + [clue_text(x, theme, long_months) for x in rules],
                "story": story,
            })
            order = ["no", "title", "brief", "ledgerTitle", "rows", "cols", "truth", "cooked", "clues", "rules", "story"]
            return {k: case[k] for k in order}
    raise RuntimeError(f"couldn't build a fair case for {theme['business']}")


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 8
    path = os.path.join(ROOT, "puzzles", "cooked.json")
    cases = json.load(open(path))
    rng = random.Random(20261113)
    themes = THEMES[:]; rng.shuffle(themes)
    for i in range(n):
        case = build(len(cases) + 1, themes[i % len(themes)], rng)
        cases.append(case)
        probs, loose, useful = vc.check(case)
        print(f"✓ #{case['no']} {case['title']}: {loose} answers from the totals alone, clues needed: {sum(useful)}")
    json.dump(cases, open(path, "w"), indent=2); open(path, "a").write("\n")
