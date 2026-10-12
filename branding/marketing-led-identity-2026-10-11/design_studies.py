"""Marketing-first symbol studies for Credit Regulator Pro."""

from pathlib import Path
import sys
import fitz

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "competition-entry-2026-10-11"))
import build_logo as b

FOREST = "#17332F"
LIME = "#D7ED94"
CREAM = "#F7F8F0"
MUTED = "#65756E"
FONTS = HERE / "assets"


def letter(value, x, baseline, size, weight, color, tracking=0):
    path = FONTS / f"Manrope-{weight}.ttf"
    b.FONT_PATH = path
    b.FONT = b.TTFont(path)
    b.GLYPHS = b.FONT.getGlyphSet()
    b.CMAP = b.FONT.getBestCmap()
    b.UNITS = b.FONT["head"].unitsPerEm
    return b.glyphs(value, x, baseline, size, color, tracking)


def open_c(x, y, s=1):
    return f'''<g transform="translate({x} {y}) scale({s})">
      <path d="M83 19A39 39 0 1 0 83 81" fill="none" stroke="{FOREST}" stroke-width="15" stroke-linecap="butt"/>
      <path d="M45 50H94" stroke="{LIME}" stroke-width="12" stroke-linecap="square"/>
    </g>'''


def report_line(x, y, s=1):
    return f'''<g transform="translate({x} {y}) scale({s})">
      <path d="M78 12H18V88H78" fill="none" stroke="{FOREST}" stroke-width="11" stroke-linejoin="round"/>
      <path d="M35 35H65M35 51H59" stroke="{FOREST}" stroke-width="8" stroke-linecap="square"/>
      <path d="M35 69H92" stroke="{LIME}" stroke-width="12" stroke-linecap="square"/>
    </g>'''


def chosen_corner(x, y, s=1):
    return f'''<g transform="translate({x} {y}) scale({s})">
      <path d="M86 15H27C20 15 15 20 15 27V73C15 80 20 85 27 85H65V70H33C31 70 30 69 30 67V33C30 31 31 30 33 30H86Z" fill="{FOREST}"/>
      <path d="M68 70H86V85H68Z" fill="{LIME}"/>
    </g>'''


concepts = [
    ("A  /  YOUR LINE", open_c, "Your report. Your call.",
     "A selected line moves beyond the C: the consumer chooses what happens next."),
    ("B  /  FIND THE FACT", report_line, "See the facts. Choose your next step.",
     "A report becomes understandable through one marked record."),
    ("C  /  THE CONSUMER'S MARK", chosen_corner, "Your report. Your decision.",
     "The open C ends in a deliberate, consumer-owned selection."),
]


body = f'<rect width="1600" height="1260" fill="{CREAM}"/>'
title, _ = letter("CREDIT REGULATOR PRO", 90, 101, 27, 700, FOREST, tracking=2)
sub, _ = letter("MARKETING-LED IDENTITY STUDIES", 90, 151, 16, 700, MUTED, tracking=2.5)
body += title + sub
body += '<line x1="90" y1="188" x2="1510" y2="188" stroke="#D0DBD1" stroke-width="2"/>'

for i, (label, mark, headline, explanation) in enumerate(concepts):
    y = 220 + i * 335
    body += f'<rect x="90" y="{y}" width="1420" height="300" rx="8" fill="#FFFFFF"/>'
    body += f'<rect x="1120" y="{y}" width="390" height="300" fill="{FOREST}"/>'
    cap, _ = letter(label, 128, y + 45, 17, 700, MUTED, tracking=1.4)
    body += cap
    body += mark(131, y + 94, 1.1)
    name, width = letter("Credit Regulator Pro", 263, y + 167, 61, 700, FOREST, tracking=-1)
    body += name
    kicker, _ = letter(headline, 263, y + 212, 29, 700, FOREST)
    body += kicker
    desc, _ = letter(explanation, 1150, y + 100, 18, 500, CREAM)
    body += desc

svg = b.svg(1600, 1260, body, "Credit Regulator Pro marketing identity studies")
(HERE / "marketing-identity-studies.svg").write_text(svg, encoding="utf-8")
fitz.open(HERE / "marketing-identity-studies.svg")[0].get_pixmap(
    matrix=fitz.Matrix(1.5, 1.5), alpha=False
).save(HERE / "marketing-identity-studies.png")
