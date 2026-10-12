"""Build the Credit Regulator Pro Evidence Axis identity as outlined SVGs.

Requires fonttools for generation. The finished SVG files contain paths only.
"""

from pathlib import Path
import sys
import xml.etree.ElementTree as ET

from PIL import ImageFont
import fitz

sys.path.insert(0, r"C:\Users\webbd\.codex\logo_tools")
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont


HERE = Path(__file__).resolve().parent
FONT_PATH = Path(r"C:\Windows\Fonts\SourceSansPro_Regular.ttf")
FONT = TTFont(FONT_PATH)
GLYPHS = FONT.getGlyphSet()
CMAP = FONT.getBestCmap()
UNITS = FONT["head"].unitsPerEm
INK = "#142B3A"
BRASS = "#A57543"
CREAM = "#F7F5EE"
PALE = "#F9F8F3"
REVERSE_BRASS = "#D9AC73"


def glyphs(text, x, baseline, size, color, tracking=0, stroke=0):
    """Return fully outlined text and its visual advance in SVG units."""
    font = ImageFont.truetype(str(FONT_PATH), size)
    scale = size / UNITS
    parts = []
    for i, char in enumerate(text):
        name = CMAP[ord(char)]
        pen = SVGPathPen(GLYPHS)
        GLYPHS[name].draw(pen)
        d = pen.getCommands()
        if d:
            xx = x + font.getlength(text[:i]) + i * tracking
            attr = f' fill="{color}"'
            if stroke:
                attr += f' stroke="{color}" stroke-width="{stroke / scale:.2f}" stroke-linejoin="round"'
            parts.append(
                f'<path transform="translate({xx:.3f} {baseline:.3f}) scale({scale:.7f} {-scale:.7f})" '
                f'd="{d}"{attr}/>'
            )
    return "".join(parts), font.getlength(text) + max(0, len(text) - 1) * tracking


def mark(x, y, scale=1, ink=INK, brass=BRASS):
    """The custom CR monogram: source frame and a highlighted review stroke."""
    return f'''<g transform="translate({x} {y}) scale({scale})">
      <path d="M84 12H28C21 12 17 17 17 24V76C17 83 21 88 28 88H84" fill="none" stroke="{ink}" stroke-width="9" stroke-linejoin="miter"/>
      <path d="M43 71V32H63C75 32 81 36 81 44C81 52 75 56 64 56H43" fill="none" stroke="{ink}" stroke-width="8.5" stroke-linecap="square" stroke-linejoin="miter"/>
      <path d="M60 56L74 70" fill="none" stroke="{brass}" stroke-width="8.5" stroke-linecap="square"/>
    </g>'''


def svg(width, height, body, description):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
            f'viewBox="0 0 {width} {height}" role="img" aria-label="{description}">'
            f'<title>{description}</title>{body}</svg>')


def save_svg(name, content):
    path = HERE / name
    path.write_text(content, encoding="utf-8")
    ET.fromstring(content)
    return path


def png_from_svg(source, target, scale=2, alpha=True):
    doc = fitz.open(source)
    pix = doc[0].get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=alpha)
    pix.save(target)


def primary():
    title, tw = glyphs("Credit Regulator", 193, 140, 82, INK, tracking=-0.8, stroke=0.35)
    pro, pw = glyphs("Pro", 193 + tw + 13, 140, 82, INK, tracking=-0.8, stroke=0.35)
    width = int(193 + tw + 13 + pw + 35)
    body = mark(39, 56, 1.12) + title + pro
    return save_svg("credit-regulator-pro-primary.svg", svg(width, 197, body, "Credit Regulator Pro primary logo"))


def reverse():
    title, tw = glyphs("Credit Regulator", 193, 140, 82, PALE, tracking=-0.8, stroke=0.35)
    pro, pw = glyphs("Pro", 193 + tw + 13, 140, 82, PALE, tracking=-0.8, stroke=0.35)
    width = int(193 + tw + 13 + pw + 35)
    body = f'<rect width="{width}" height="197" fill="{INK}"/>' + mark(39, 56, 1.12, PALE, REVERSE_BRASS) + title + pro
    return save_svg("credit-regulator-pro-reverse.svg", svg(width, 197, body, "Credit Regulator Pro reverse logo"))


def inverse_transparent():
    title, tw = glyphs("Credit Regulator", 193, 140, 82, PALE, tracking=-0.8, stroke=0.35)
    pro, pw = glyphs("Pro", 193 + tw + 13, 140, 82, PALE, tracking=-0.8, stroke=0.35)
    width = int(193 + tw + 13 + pw + 35)
    body = mark(39, 56, 1.12, PALE, REVERSE_BRASS) + title + pro
    return save_svg("credit-regulator-pro-inverse-transparent.svg", svg(width, 197, body, "Credit Regulator Pro inverse transparent logo"))


def symbol():
    body = mark(0, 0, 1.0)
    return save_svg("credit-regulator-pro-symbol.svg", svg(100, 100, body, "Credit Regulator Pro CR monogram"))


def mono():
    title, tw = glyphs("Credit Regulator", 193, 140, 82, INK, tracking=-0.8, stroke=0.35)
    pro, pw = glyphs("Pro", 193 + tw + 13, 140, 82, INK, tracking=-0.8, stroke=0.35)
    width = int(193 + tw + 13 + pw + 35)
    body = mark(39, 56, 1.12, INK, INK) + title + pro
    return save_svg("credit-regulator-pro-one-color.svg", svg(width, 197, body, "Credit Regulator Pro one color logo"))


def compact():
    first, _ = glyphs("Credit", 198, 112, 75, INK, tracking=-0.7, stroke=0.35)
    second, sw = glyphs("Regulator Pro", 198, 184, 75, INK, tracking=-0.7, stroke=0.35)
    body = mark(40, 56, 1.2) + first + second
    return save_svg("credit-regulator-pro-compact.svg", svg(int(198 + sw + 40), 226, body, "Credit Regulator Pro compact logo"))


def board():
    header, _ = glyphs("CREDIT REGULATOR PRO", 92, 108, 29, INK, tracking=3.0)
    kicker, _ = glyphs("THE CR MONOGRAM", 92, 151, 16, BRASS, tracking=3.1)
    h1, _ = glyphs("01 / PRIMARY", 92, 248, 18, INK, tracking=1.6)
    h2, _ = glyphs("02 / REVERSE", 92, 540, 18, INK, tracking=1.6)
    h3, _ = glyphs("03 / SYMBOL", 92, 832, 18, INK, tracking=1.6)
    body = f'<rect width="1600" height="1100" fill="{CREAM}"/>'
    body += header + kicker + h1 + h2 + h3
    body += '<line x1="92" y1="183" x2="1508" y2="183" stroke="#D9D9D0" stroke-width="2"/>'
    body += '<rect x="92" y="280" width="1416" height="197" fill="#FFFFFF"/>'
    body += '<g transform="translate(110 280) scale(.86)">' + primary_svg_body() + '</g>'
    body += f'<rect x="92" y="572" width="1416" height="197" fill="{INK}"/>'
    body += '<g transform="translate(110 572) scale(.86)">' + reverse_svg_body() + '</g>'
    body += '<rect x="92" y="867" width="138" height="138" fill="#FFFFFF"/>'
    body += mark(111, 886, 1.0)
    body += f'<rect x="254" y="867" width="138" height="138" fill="{INK}"/>'
    body += mark(273, 886, 1.0, PALE, REVERSE_BRASS)
    caption, _ = glyphs("NAVY  /  COPPER", 440, 938, 26, INK, tracking=1.2)
    body += caption
    body += '<line x1="92" y1="1041" x2="1508" y2="1041" stroke="#D9D9D0" stroke-width="2"/>'
    return save_svg("credit-regulator-pro-entry-board.svg", svg(1600, 1100, body, "Credit Regulator Pro logo competition entry board"))


def primary_svg_body():
    title, tw = glyphs("Credit Regulator", 193, 140, 82, INK, tracking=-0.8, stroke=0.35)
    pro, _ = glyphs("Pro", 193 + tw + 13, 140, 82, INK, tracking=-0.8, stroke=0.35)
    return mark(39, 56, 1.12) + title + pro


def reverse_svg_body():
    title, tw = glyphs("Credit Regulator", 193, 140, 82, PALE, tracking=-0.8, stroke=0.35)
    pro, _ = glyphs("Pro", 193 + tw + 13, 140, 82, PALE, tracking=-0.8, stroke=0.35)
    return mark(39, 56, 1.12, PALE, REVERSE_BRASS) + title + pro


if __name__ == "__main__":
    for build in (primary, reverse, inverse_transparent, symbol, mono, compact, board):
        build()
    png_from_svg(HERE / "credit-regulator-pro-entry-board.svg", HERE / "credit-regulator-pro-entry-board.png", 1.5, alpha=False)
    png_from_svg(HERE / "credit-regulator-pro-symbol.svg", HERE / "credit-regulator-pro-symbol-24.png", .24)
    png_from_svg(HERE / "credit-regulator-pro-symbol.svg", HERE / "credit-regulator-pro-symbol-16.png", .16)
    png_from_svg(HERE / "credit-regulator-pro-symbol.svg", HERE / "credit-regulator-pro-symbol-32.png", .32)
    png_from_svg(HERE / "credit-regulator-pro-primary.svg", HERE / "credit-regulator-pro-primary.png", 2)
    png_from_svg(HERE / "credit-regulator-pro-compact.svg", HERE / "credit-regulator-pro-compact.png", 1.4)
    (HERE / "credit-regulator-pro-entry-board.pdf").write_bytes(
        fitz.open(HERE / "credit-regulator-pro-entry-board.svg").convert_to_pdf()
    )
