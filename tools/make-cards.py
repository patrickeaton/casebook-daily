#!/usr/bin/env python3
"""Render the link-preview images (1200x630) into shared/cards/, reusing the game icons from shared/menu.js.

    python3 tools/make-cards.py        (needs rsvg-convert: brew install librsvg)
"""
import os, re, subprocess

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'shared', 'cards')
os.makedirs(OUT, exist_ok=True)

menu = open(os.path.join(ROOT, 'shared', 'menu.js')).read()
ICONS = {k: v for k, v in re.findall(r"\n\s+(\w+): `(<svg[\s\S]*?</svg>)`", menu)}
ICONS['home'] = re.search(r"ICONS\.home = `(<svg[\s\S]*?</svg>)`", menu).group(1)

def icon(name, x, y, size):
    """Place a 48x48 menu icon at (x, y), scaled to `size`."""
    return ICONS[name].replace('<svg viewBox="0 0 48 48">', f'<svg x="{x}" y="{y}" width="{size}" height="{size}" viewBox="0 0 48 48">', 1)

MONO = "'Courier New', Courier, monospace"
SERIF = "Georgia, 'Times New Roman', serif"

def wordmark(x, y, size, fill='#ece8de'):
    return (f'<text x="{x}" y="{y}" font-family="{MONO}" font-weight="700" font-size="{size}" letter-spacing="{size*0.32}" fill="{fill}">'
            f'CASEBOO<tspan fill="#d9534f">K</tspan></text>')

def frame(bg, bg2, body):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><radialGradient id="g" cx="50%" cy="0%" r="90%"><stop offset="0" stop-color="{bg2}"/><stop offset="1" stop-color="{bg}"/></radialGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
{body}
</svg>'''

GAMES = [
    ('forgery', 'Forgery', '#b3261e', '#26211d', '#352e28', ['Four words have been forged.', 'Every fake is contradicted by', 'the text itself. Find them.']),
    ('testimony', 'Testimony', '#2e5fa3', '#1b2230', '#26314a', ['Five witness statements.', 'Some words have been flipped.', 'Set them straight.']),
    ('cooked', 'Cooked Books', '#2e7d4f', '#13241d', '#1d3a2e', ['Someone padded the ledger.', 'Use the totals and the clues', 'to find the cooked entries.']),
    ('money', 'Follow the Money', '#c9a227', '#1a1814', '#2c2820', ['Stolen cash, shell companies,', 'a consultancy taking a cut.', 'Rebuild the trail.']),
]

cards = {}

# home: wordmark, tagline, and all four games
tiles = ''
for i, (gid, name, accent, *_r) in enumerate(GAMES):
    x = 90 + i * 262
    tiles += (f'<rect x="{x}" y="380" width="236" height="170" rx="10" fill="#f6f3ec"/><rect x="{x}" y="380" width="10" height="170" rx="4" fill="{accent}"/>'
              f'{icon(gid, x + 88, 400, 74)}'
              f'<text x="{x + 123}" y="515" text-anchor="middle" font-family="{MONO}" font-weight="700" font-size="19" letter-spacing="2" fill="#1f2328">{name.upper()}</text>')
# the app icon (folder + magnifying glass) as the brand mark
APP = open(os.path.join(ROOT, 'shared', 'icons', 'icon.svg')).read().replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">', '<svg x="90" y="92" width="120" height="120" viewBox="0 0 512 512">', 1)
cards['home'] = frame('#17161b', '#2f2c3a', f'''  {APP}
  {wordmark(240, 168, 76)}
  <text x="242" y="222" font-family="{SERIF}" font-size="32" fill="#cfc9bb">A new mystery every day.</text>
  <text x="90" y="330" font-family="{MONO}" font-weight="700" font-size="20" letter-spacing="5" fill="#a29c8c">FOUR DAILY DETECTIVE GAMES</text>
  {tiles}''')

# one card per game
for gid, name, accent, bg, bg2, lines in GAMES:
    text = ''.join(f'<text x="470" y="{300 + i * 52}" font-family="{SERIF}" font-size="38" fill="#e9e4d8">{t}</text>' for i, t in enumerate(lines))
    cards[gid] = frame(bg, bg2, f'''  <rect x="0" y="0" width="18" height="630" fill="{accent}"/>
  {wordmark(470, 120, 40, '#cfc9bb')}
  <rect x="100" y="150" width="300" height="300" rx="28" fill="#f6f3ec"/>
  {icon(gid, 130, 180, 240)}
  <text x="470" y="215" font-family="{MONO}" font-weight="700" font-size="{64 if len(name) < 12 else 52}" letter-spacing="6" fill="#ffffff">{name.upper()}</text>
  {text}
  <text x="470" y="520" font-family="{MONO}" font-weight="700" font-size="22" letter-spacing="4" fill="{accent}">A NEW CASE EVERY DAY</text>''')

# archive
cards['archive'] = frame('#17161b', '#2f2c3a', f'''  {icon('archive', 90, 150, 300)}
  {wordmark(470, 120, 40, '#cfc9bb')}
  <text x="470" y="250" font-family="{MONO}" font-weight="700" font-size="72" letter-spacing="8" fill="#ffffff">ARCHIVE</text>
  <text x="470" y="320" font-family="{SERIF}" font-size="38" fill="#e9e4d8">Every past case, still open.</text>
  <text x="470" y="372" font-family="{SERIF}" font-size="38" fill="#e9e4d8">Catch up on the ones you missed.</text>''')

for name, svg in cards.items():
    svg_path = os.path.join(OUT, f'{name}.svg'); png_path = os.path.join(OUT, f'{name}.png')
    open(svg_path, 'w').write(svg)
    subprocess.run(['rsvg-convert', '-w', '1200', '-h', '630', svg_path, '-o', png_path], check=True)
    os.remove(svg_path)
    print('✓', os.path.relpath(png_path, ROOT), os.path.getsize(png_path) // 1024, 'KB')
