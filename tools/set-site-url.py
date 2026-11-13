#!/usr/bin/env python3
"""Write the link-preview tags (Open Graph / Twitter / canonical) into every page for a given site address.

Preview images and URLs must be absolute, so re-run this when the site moves to its own domain:
    python3 tools/set-site-url.py https://patrickeaton.github.io/casebook-daily/
    python3 tools/set-site-url.py https://casebook.games/
It replaces everything between <!-- link preview --> and <!-- /link preview --> (or adds the block after <title>).
"""
import html, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PAGES = [  # file, path on the site, card image, title, description
    ('index.html', '', 'home', 'Casebook: a new mystery every day',
     'Four daily detective games: spot the forged words, set the witnesses straight, catch the cooked books, or follow the money.'),
    ('forgery/index.html', 'forgery/', 'forgery', 'Forgery · Casebook',
     "Four words in today's document have been forged, and every fake is contradicted by the text itself. Can you find them?"),
    ('testimony/index.html', 'testimony/', 'testimony', 'Testimony · Casebook',
     'Five witness statements. Some words have been flipped to their opposites. Set them straight and solve the case.'),
    ('cooked-books/index.html', 'cooked-books/', 'cooked', 'Cooked Books · Casebook',
     "Someone padded the ledger. Use the bank's totals and the clues to find the cooked entries."),
    ('follow-the-money/index.html', 'follow-the-money/', 'money', 'Follow the Money · Casebook',
     'Stolen cash has gone through shell companies and a consultancy taking a cut. Rebuild the trail.'),
    ('archive/index.html', 'archive/', 'archive', 'Archive · Casebook',
     'Every past Casebook case, still open. Catch up on the ones you missed.'),
]


def block(base, path, card, title, desc):
    a = lambda s: html.escape(s, quote=True)
    url, img = base + path, f'{base}shared/cards/{card}.png'
    return f'''<!-- link preview -->
<meta name="description" content="{a(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Casebook">
<meta property="og:title" content="{a(title)}">
<meta property="og:description" content="{a(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{a(title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{a(title)}">
<meta name="twitter:description" content="{a(desc)}">
<meta name="twitter:image" content="{img}">
<!-- /link preview -->
'''


if __name__ == '__main__':
    if len(sys.argv) != 2 or not sys.argv[1].startswith('http'):
        sys.exit(__doc__)
    base = sys.argv[1].rstrip('/') + '/'
    for f, path, card, title, desc in PAGES:
        p = os.path.join(ROOT, f); s = open(p).read()
        new = block(base, path, card, title, desc)
        if '<!-- link preview -->' in s:
            s = re.sub(r'<!-- link preview -->\n[\s\S]*?<!-- /link preview -->\n', lambda m: new, s, count=1)
        else:
            s = re.sub(r'(<title>[^<]*</title>\n)', lambda m: m.group(1) + new, s, count=1)
        open(p, 'w').write(s)
        print('✓', f, '→', base + path)
