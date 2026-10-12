"""Build the Credit Regulator Pro Evidence Link identity.

The final SVG artwork uses outlined lettering and has no runtime font dependency.
"""

from pathlib import Path
import sys
import xml.etree.ElementTree as ET

import fitz

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import build_logo as base

NAVY = "#142B3A"
COPPER = "#A57543"
PAPER = "#F6F5F0"
WHITE = "#FFFFFF"
LIGHT_COPPER = "#DDB787"
SANS = Path(r"C:\Windows\Fonts\SourceSansPro_Regular.ttf")
WORDMARK = Path(r"C:\Windows\Fonts\PT_Sans_Web_Bold.ttf")


def set_font(path=SANS):
    base.FONT_PATH = path
    base.FONT = base.TTFont(path)
    base.GLYPHS = base.FONT.getGlyphSet()
    base.CMAP = base.FONT.getBestCmap()
    base.UNITS = base.FONT["head"].unitsPerEm


def letters(value, x, y, size, color=NAVY, tracking=0, stroke=0, font=SANS):
    set_font(font)
    return base.glyphs(value, x, y, size, color, tracking, stroke)


def evidence_link(x=0, y=0, scale=1, ink=NAVY, accent=COPPER):
    """Two source boundaries joined by one selected record line."""
    return f'''<g transform="translate({x} {y}) scale({scale})">
      <path d="M10 10H69V24H24V68H10Z" fill="{ink}"/>
      <path d="M90 32V90H31V76H76V32Z" fill="{ink}"/>
      <path d="M24 44H76V57H24Z" fill="{accent}"/>
    </g>'''


def svg(w, h, body, title):
    return base.svg(w, h, body, title)


def save(name, w, h, body, title):
    path = HERE / name
    path.write_text(svg(w, h, body, title), encoding="utf-8")
    ET.parse(path)
    return path


def lockup(ink=NAVY, accent=COPPER, bg=WHITE):
    # At 210 CSS px, the wordmark has a 15 px x-height range and every word remains readable.
    words, width = letters("Credit Regulator Pro", 133, 98, 65, ink,
                           tracking=-0.6, font=WORDMARK)
    body = evidence_link(32, 30, 1, ink, accent) + words
    return body, int(133 + width + 30)


def compact_lockup(ink=NAVY, accent=COPPER):
    first, _ = letters("Credit", 125, 67, 51, ink, tracking=-0.45,
                       font=WORDMARK)
    second, width = letters("Regulator Pro", 125, 116, 51, ink,
                            tracking=-0.45, font=WORDMARK)
    return evidence_link(20, 20, .92, ink, accent) + first + second, int(125 + width + 25)


def render(source, dest, scale, alpha=True):
    doc = fitz.open(HERE / source)
    doc[0].get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=alpha).save(HERE / dest)


def board(primary_width):
    w, h = 1600, 1320
    body = f'<rect width="{w}" height="{h}" fill="{PAPER}"/>'
    title, _ = letters("CREDIT REGULATOR PRO", 90, 101, 27, NAVY, tracking=2.6)
    sub, _ = letters("THE EVIDENCE LINK", 90, 151, 16, COPPER, tracking=3)
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

    label, _ = letters("03  SYMBOL", 90, 802, 17, NAVY, tracking=1.8)
    body += label
    body += '<rect x="90" y="833" width="160" height="160" fill="#FFFFFF"/>'
    body += evidence_link(116, 859, 1.42)
    body += f'<rect x="275" y="833" width="160" height="160" fill="{NAVY}"/>'
    body += evidence_link(301, 859, 1.42, WHITE, LIGHT_COPPER)
    body += '<rect x="460" y="833" width="160" height="160" fill="#FFFFFF"/>'
    body += evidence_link(486, 859, 1.42, NAVY, NAVY)

    body += '<line x1="90" y1="1049" x2="1510" y2="1049" stroke="#D7D9D5" stroke-width="2"/>'
    label, _ = letters("04  IN USE", 90, 1104, 17, NAVY, tracking=1.8)
    body += label
    # The two-line lockup protects readability in narrow spaces.
    body += '<rect x="90" y="1135" width="460" height="111" rx="6" fill="#FFFFFF"/>'
    compact, _ = compact_lockup()
    body += '<g transform="translate(103 1137) scale(.79)">' + compact + '</g>'
    body += '<rect x="596" y="1135" width="914" height="111" fill="#FFFFFF"/>'
    body += '<g transform="translate(608 1140) scale(.53)">' + primary + '</g>'
    save("credit-regulator-pro-evidence-link-board.svg", w, h, body,
         "Credit Regulator Pro Evidence Link logo presentation")


def build():
    set_font()
    primary, width = lockup()
    save("credit-regulator-pro-evidence-link-primary.svg", width, 148, primary,
         "Credit Regulator Pro primary logo")
    inverse, _ = lockup(WHITE, LIGHT_COPPER, NAVY)
    save("credit-regulator-pro-evidence-link-inverse.svg", width, 148, inverse,
         "Credit Regulator Pro inverse logo")
    mono, _ = lockup(NAVY, NAVY)
    save("credit-regulator-pro-evidence-link-one-color.svg", width, 148, mono,
         "Credit Regulator Pro single ink logo")
    compact, compact_width = compact_lockup()
    save("credit-regulator-pro-evidence-link-compact.svg", compact_width, 135, compact,
         "Credit Regulator Pro compact logo")
    save("credit-regulator-pro-evidence-link-symbol.svg", 100, 100, evidence_link(),
         "Credit Regulator Pro Evidence Link symbol")
    save("credit-regulator-pro-evidence-link-symbol-one-color.svg", 100, 100,
         evidence_link(ink=NAVY, accent=NAVY),
         "Credit Regulator Pro Evidence Link single ink symbol")
    board(width)
    render("credit-regulator-pro-evidence-link-board.svg", "credit-regulator-pro-evidence-link-board.png", 1.5, False)
    render("credit-regulator-pro-evidence-link-primary.svg", "credit-regulator-pro-evidence-link-primary.png", 2)
    render("credit-regulator-pro-evidence-link-compact.svg", "credit-regulator-pro-evidence-link-compact.png", 2)
    for size in (16, 24, 32, 64, 512):
        render("credit-regulator-pro-evidence-link-symbol.svg",
               f"credit-regulator-pro-evidence-link-symbol-{size}.png", size / 100)
    for width_px in (160, 220, 320):
        render("credit-regulator-pro-evidence-link-primary.svg",
               f"credit-regulator-pro-header-{width_px}.png", width_px / width, False)
    render("credit-regulator-pro-evidence-link-compact.svg",
           "credit-regulator-pro-compact-header-160.png", 160 / compact_width, False)
    (HERE / "credit-regulator-pro-evidence-link-board.pdf").write_bytes(
        fitz.open(HERE / "credit-regulator-pro-evidence-link-board.svg").convert_to_pdf()
    )


if __name__ == "__main__":
    build()
