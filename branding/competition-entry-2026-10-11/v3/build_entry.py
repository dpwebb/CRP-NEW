"""Build the Credit Regulator Pro Indexed R identity.

The final SVG artwork uses outlined lettering and has no runtime font dependency.
"""

from pathlib import Path
import sys
import xml.etree.ElementTree as ET

import fitz
from PIL import ImageFont

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import build_logo as base

NAVY = "#142B3A"
COPPER = "#A57543"
PAPER = "#F6F5F0"
WHITE = "#FFFFFF"
LIGHT_COPPER = "#DDB787"
SANS = Path(r"C:\Windows\Fonts\SourceSansPro_Regular.ttf")


def set_font():
    base.FONT_PATH = SANS
    base.FONT = base.TTFont(SANS)
    base.GLYPHS = base.FONT.getGlyphSet()
    base.CMAP = base.FONT.getBestCmap()
    base.UNITS = base.FONT["head"].unitsPerEm


def letters(value, x, y, size, color=NAVY, tracking=0, stroke=0):
    return base.glyphs(value, x, y, size, color, tracking, stroke)


def indexed_r(x=0, y=0, scale=1, ink=NAVY, accent=COPPER, bg=WHITE):
    """A report record turns through an indexed joint into an action leg."""
    # The bowl and leg share a copper knee. The one-color silhouette is identical.
    return f'''<g transform="translate({x} {y}) scale({scale})">
      <path d="M13 12H65C75 12 83 20 83 30V43C83 52 78 58 69 62H30V88H13Z" fill="{ink}"/>
      <path d="M30 28H64C67 28 68 30 68 33V42C68 45 66 47 63 47H30Z" fill="{bg}"/>
      <path d="M48 60H67L88 88H68Z" fill="{ink}"/>
      <path d="M61 47H76V62H61Z" fill="{accent}"/>
    </g>'''


def indexed_r_knockout(x=0, y=0, scale=1, ink=NAVY, accent=COPPER, bg=WHITE):
    return indexed_r(x, y, scale, ink, accent, bg)


def svg(w, h, body, title):
    return base.svg(w, h, body, title)


def save(name, w, h, body, title):
    path = HERE / name
    path.write_text(svg(w, h, body, title), encoding="utf-8")
    ET.parse(path)
    return path


def lockup(ink=NAVY, accent=COPPER, bg=WHITE):
    # At 210 CSS px, the wordmark has a 15 px x-height range and every word remains readable.
    words, width = letters("Credit Regulator Pro", 133, 98, 65, ink, tracking=-0.65, stroke=0.45)
    body = indexed_r_knockout(32, 30, 1, ink, accent, bg) + words
    return body, int(133 + width + 30)


def render(source, dest, scale, alpha=True):
    doc = fitz.open(HERE / source)
    doc[0].get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=alpha).save(HERE / dest)


def board(primary_width):
    w, h = 1600, 1320
    body = f'<rect width="{w}" height="{h}" fill="{PAPER}"/>'
    title, _ = letters("CREDIT REGULATOR PRO", 90, 101, 27, NAVY, tracking=2.6)
    sub, _ = letters("THE INDEXED R", 90, 151, 16, COPPER, tracking=3)
    body += title + sub
    body += '<line x1="90" y1="187" x2="1510" y2="187" stroke="#D7D9D5" stroke-width="2"/>'

    label, _ = letters("01  PRIMARY", 90, 245, 17, NAVY, tracking=1.8)
    body += label + '<rect x="90" y="274" width="1420" height="188" fill="#FFFFFF"/>'
    primary, _ = lockup()
    body += f'<g transform="translate(107 279) scale(1.12)">{primary}</g>'

    label, _ = letters("02  REVERSE", 90, 524, 17, NAVY, tracking=1.8)
    body += label + f'<rect x="90" y="553" width="1420" height="188" fill="{NAVY}"/>'
    inverse, _ = lockup(WHITE, LIGHT_COPPER, NAVY)
    body += f'<g transform="translate(107 558) scale(1.12)">{inverse}</g>'

    label, _ = letters("03  MONOGRAM", 90, 802, 17, NAVY, tracking=1.8)
    body += label
    body += '<rect x="90" y="833" width="160" height="160" fill="#FFFFFF"/>'
    body += indexed_r_knockout(116, 859, 1.42)
    body += f'<rect x="275" y="833" width="160" height="160" fill="{NAVY}"/>'
    body += indexed_r_knockout(301, 859, 1.42, WHITE, LIGHT_COPPER, NAVY)
    body += '<rect x="460" y="833" width="160" height="160" fill="#FFFFFF"/>'
    body += indexed_r_knockout(486, 859, 1.42, NAVY, NAVY)

    body += '<line x1="90" y1="1049" x2="1510" y2="1049" stroke="#D7D9D5" stroke-width="2"/>'
    label, _ = letters("04  IN USE", 90, 1104, 17, NAVY, tracking=1.8)
    body += label
    # Real-size product contexts are presented here at 2x, then exported separately at 1x.
    body += '<rect x="90" y="1135" width="460" height="111" rx="6" fill="#FFFFFF"/>'
    body += '<g transform="translate(103 1138) scale(.47)">' + primary + '</g>'
    body += '<rect x="596" y="1135" width="914" height="111" fill="#FFFFFF"/>'
    body += '<g transform="translate(608 1140) scale(.53)">' + primary + '</g>'
    save("credit-regulator-pro-indexed-r-board.svg", w, h, body,
         "Credit Regulator Pro Indexed R logo presentation")


def build():
    set_font()
    primary, width = lockup()
    save("credit-regulator-pro-indexed-r-primary.svg", width, 148, primary,
         "Credit Regulator Pro primary logo")
    inverse, _ = lockup(WHITE, LIGHT_COPPER, NAVY)
    save("credit-regulator-pro-indexed-r-inverse.svg", width, 148, inverse,
         "Credit Regulator Pro inverse logo")
    mono, _ = lockup(NAVY, NAVY)
    save("credit-regulator-pro-indexed-r-one-color.svg", width, 148, mono,
         "Credit Regulator Pro single ink logo")
    save("credit-regulator-pro-indexed-r-symbol.svg", 100, 100, indexed_r_knockout(),
         "Credit Regulator Pro Indexed R symbol")
    save("credit-regulator-pro-indexed-r-symbol-one-color.svg", 100, 100,
         indexed_r_knockout(ink=NAVY, accent=NAVY),
         "Credit Regulator Pro Indexed R single ink symbol")
    board(width)
    render("credit-regulator-pro-indexed-r-board.svg", "credit-regulator-pro-indexed-r-board.png", 1.5, False)
    render("credit-regulator-pro-indexed-r-primary.svg", "credit-regulator-pro-indexed-r-primary.png", 2)
    for size in (16, 24, 32, 64):
        render("credit-regulator-pro-indexed-r-symbol.svg",
               f"credit-regulator-pro-indexed-r-symbol-{size}.png", size / 100)
    (HERE / "credit-regulator-pro-indexed-r-board.pdf").write_bytes(
        fitz.open(HERE / "credit-regulator-pro-indexed-r-board.svg").convert_to_pdf()
    )


if __name__ == "__main__":
    build()
