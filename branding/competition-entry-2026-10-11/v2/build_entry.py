"""Build the Credit Regulator Pro Cross-Reference identity.

All final SVG wordmarks are outlined and have no runtime font dependency.
"""

from pathlib import Path
import sys
import xml.etree.ElementTree as ET

import fitz

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import build_logo as base
TTFont = base.TTFont

INK = "#142B3A"
COPPER = "#A57543"
IVORY = "#F7F5EE"
WHITE = "#FFFFFF"
REVERSE_COPPER = "#D9AC73"
SANS = Path(r"C:\Windows\Fonts\SourceSansPro_Regular.ttf")
SERIF = Path(r"C:\Windows\Fonts\VesperLibre_Regular.ttf")


def set_font(path):
    base.FONT_PATH = path
    base.FONT = TTFont(path)
    base.GLYPHS = base.FONT.getGlyphSet()
    base.CMAP = base.FONT.getBestCmap()
    base.UNITS = base.FONT["head"].unitsPerEm


def sans(text, x, baseline, size, color, tracking=0, stroke=0):
    set_font(SANS)
    return base.glyphs(text, x, baseline, size, color, tracking, stroke)


def serif(text, x, baseline, size, color, tracking=0, stroke=0):
    set_font(SERIF)
    return base.glyphs(text, x, baseline, size, color, tracking, stroke)


def mark(x, y, s=1, dark=INK, accent=COPPER):
    """Two offset source frames identify one bounded point of comparison."""
    return f'''<g transform="translate({x} {y}) scale({s})">
      <path d="M8 8H70V22H22V70H8Z" fill="{dark}"/>
      <path d="M92 30V92H30V78H78V30Z" fill="{dark}"/>
      <rect x="43" y="43" width="14" height="14" fill="{accent}"/>
    </g>'''


def lockup(dark=INK, accent=COPPER):
    credit, _ = sans("CREDIT", 201, 103, 31, dark, tracking=3.4, stroke=0.25)
    name, width = serif("Regulator Pro", 199, 187, 88, dark, tracking=-1.1)
    body = mark(43, 66, 1.17, dark, accent) + credit + name
    return body, int(199 + width + 39)


def wrap(width, height, body, label):
    return base.svg(width, height, body, label)


def save(name, width, height, body, label):
    path = HERE / name
    path.write_text(wrap(width, height, body, label), encoding="utf-8")
    ET.parse(path)
    return path


def build():
    primary, width = lockup()
    save("crp-cross-reference-primary.svg", width, 245, primary, "Credit Regulator Pro Cross-Reference primary logo")
    inverse, _ = lockup(WHITE, REVERSE_COPPER)
    save("crp-cross-reference-inverse.svg", width, 245, inverse, "Credit Regulator Pro Cross-Reference inverse logo")
    save("crp-cross-reference-on-navy.svg", width, 245,
         f'<rect width="{width}" height="245" fill="{INK}"/>' + inverse,
         "Credit Regulator Pro Cross-Reference logo on navy")
    one_color, _ = lockup(INK, INK)
    save("crp-cross-reference-one-color.svg", width, 245, one_color, "Credit Regulator Pro Cross-Reference one-color logo")
    save("crp-cross-reference-symbol.svg", 100, 100, mark(0, 0), "Credit Regulator Pro Cross-Reference symbol")
    save("crp-cross-reference-symbol-one-color.svg", 100, 100, mark(0, 0, 1, INK, INK),
         "Credit Regulator Pro Cross-Reference one-color symbol")
    board(width)
    render("crp-cross-reference-board.svg", "crp-cross-reference-board.png", 1.5, alpha=False)
    render("crp-cross-reference-primary.svg", "crp-cross-reference-primary.png", 2)
    for size in (16, 24, 32, 64):
        render("crp-cross-reference-symbol.svg", f"crp-cross-reference-symbol-{size}.png", size / 100)
    (HERE / "crp-cross-reference-board.pdf").write_bytes(
        fitz.open(HERE / "crp-cross-reference-board.svg").convert_to_pdf()
    )


def board(primary_width):
    body = f'<rect width="1600" height="1120" fill="{IVORY}"/>'
    heading, _ = sans("CREDIT REGULATOR PRO", 96, 104, 27, INK, tracking=3.2)
    sub, _ = sans("CROSS-REFERENCE", 96, 151, 17, COPPER, tracking=3.1)
    p_label, _ = sans("01 / PRIMARY", 96, 249, 18, INK, tracking=1.5)
    r_label, _ = sans("02 / REVERSE", 96, 562, 18, INK, tracking=1.5)
    s_label, _ = sans("03 / SYMBOL AND SINGLE-INK", 96, 876, 18, INK, tracking=1.5)
    body += heading + sub + p_label + r_label + s_label
    body += '<line x1="96" y1="187" x2="1504" y2="187" stroke="#D9D9D0" stroke-width="2"/>'
    body += '<rect x="96" y="281" width="1408" height="230" fill="#FFFFFF"/>'
    primary, _ = lockup()
    body += f'<g transform="translate(121 273) scale(.91)">{primary}</g>'
    body += f'<rect x="96" y="594" width="1408" height="230" fill="{INK}"/>'
    inverse, _ = lockup(WHITE, REVERSE_COPPER)
    body += f'<g transform="translate(121 586) scale(.91)">{inverse}</g>'
    body += '<rect x="96" y="909" width="147" height="147" fill="#FFFFFF"/>'
    body += mark(119, 932, 1.0)
    body += f'<rect x="269" y="909" width="147" height="147" fill="{INK}"/>'
    body += mark(292, 932, 1.0, WHITE, REVERSE_COPPER)
    body += '<rect x="442" y="909" width="147" height="147" fill="#FFFFFF"/>'
    body += mark(465, 932, 1.0, INK, INK)
    name, _ = sans("NAVY  /  COPPER  /  ONE COLOR", 646, 996, 23, INK, tracking=1.4)
    body += name
    body += '<line x1="96" y1="1092" x2="1504" y2="1092" stroke="#D9D9D0" stroke-width="2"/>'
    save("crp-cross-reference-board.svg", 1600, 1120, body, "Credit Regulator Pro Cross-Reference logo presentation")


def render(svg_name, png_name, scale, alpha=True):
    doc = fitz.open(HERE / svg_name)
    doc[0].get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=alpha).save(HERE / png_name)


if __name__ == "__main__":
    build()
