"""Develop the three restart concepts as font-independent SVG artwork."""

from functools import lru_cache
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

sys.path.insert(0, r"C:\Users\webbd\.codex\logo_tools")
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from PIL import ImageFont
import cairosvg

HERE = Path(__file__).resolve().parent
FONTS = Path(r"C:\Windows\Fonts")
MANROPE = HERE.parents[1] / "marketing-led-identity-2026-10-11/assets/Manrope-700.ttf"
LABEL = FONTS / "SourceSansPro_Regular.ttf"


@lru_cache(None)
def font_data(path):
    font = TTFont(path)
    return font.getGlyphSet(), font.getBestCmap(), font["head"].unitsPerEm


@lru_cache(None)
def metrics(path, size):
    return ImageFont.truetype(str(path), round(size * 20))


def lettering(value, x, baseline, size, path=LABEL, ink="#28282D", tracking=0, weight=0):
    glyphs, cmap, units = font_data(path)
    metric = metrics(path, size)
    scale = size / units
    chunks = []
    for i, char in enumerate(value):
        pen = SVGPathPen(glyphs)
        glyphs[cmap[ord(char)]].draw(pen)
        d = pen.getCommands()
        if d:
            offset = metric.getlength(value[:i]) / 20 + i * tracking
            stroke = f' stroke="{ink}" stroke-width="{weight / scale:.3f}" stroke-linejoin="round"' if weight else ""
            chunks.append(f'<path transform="translate({x + offset:.3f} {baseline}) scale({scale:.7f} {-scale:.7f})" d="{d}" fill="{ink}"{stroke}/>')
    width = metric.getlength(value) / 20 + max(0, len(value) - 1) * tracking
    return "".join(chunks), width


def txt(value, x, y, size=18, ink="#6F7075", tracking=0):
    return lettering(value, x, y, size, LABEL, ink, tracking)[0]


def examined(ink, accent):
    # Report lines enter an angular inspection aperture; the selected line
    # stays horizontal. Broad contours avoid a scanner or circular crosshair.
    return f'''<g>
      <path d="M6 18H58L69 29H6Z M6 91H69L58 102H6Z" fill="{ink}"/>
      <path d="M6 53H42V67H6Z" fill="{ink}"/>
      <path d="M74 29L109 60L74 91L39 60Z M74 44L57 60L74 76L91 60Z" fill="{ink}" fill-rule="evenodd"/>
      <path d="M62 55H86V65H62Z" fill="{accent}"/>
    </g>'''


def pathway(ink, accent):
    # One continuous ribbon traces an open R, then exits through its leg.
    # The open crossbar is deliberate: the route is not a sealed loop.
    return f'''<g fill="none" stroke-width="15" stroke-linecap="butt" stroke-linejoin="round">
      <path d="M16 112V20H64C88 20 100 31 100 47S88 73 64 73H42L100 112" stroke="{ink}"/>
      <path d="M55 81.74L100 112" stroke="{accent}"/>
    </g>'''


def record(ink, accent):
    # The records are negative spaces inside the body, not menu lines placed
    # in an outline. Offset right ends create a distinctive notched silhouette.
    return f'''<g>
      <path d="M112 8H36C17 8 6 19 6 38V82C6 101 17 112 36 112H112V90H38V30H112Z" fill="{ink}"/>
      <path d="M52 41H101V50H52Z M52 56H81V65H52Z M52 71H101V80H52Z" fill="{ink}"/>
      <path d="M87 56H101V65H87Z" fill="{accent}"/>
    </g>'''


CONCEPTS = [
    dict(id="01-examined-line", name="EXAMINED LINE", idea="Specific evidence, brought into focus.",
         ink="#352341", accent="#D14F3B", paper="#F6F1ED", font=FONTS / "Lora_Regular.ttf", size=65,
         tracking=-1.1, weight=.45, upper=False, mark=examined,
         type_label="Editorial serif / close spacing / shared cap height"),
    dict(id="02-open-pathway", name="OPEN PATHWAY", idea="A clear route from report to reviewed packet.",
         ink="#113F39", accent="#247D69", paper="#EFF5F0", font=MANROPE, size=63,
         tracking=-1.15, weight=0, upper=False, mark=pathway,
         type_label="Geometric sans / open counters / rounded rhythm"),
    dict(id="03-clear-record", name="CLEAR RECORD", idea="A clearer view of your credit record.",
         ink="#20252E", accent="#355BCD", paper="#F1F3F8", font=FONTS / "RobotoCondensed_Bold.ttf", size=66,
         tracking=.7, weight=0, upper=True, mark=record,
         type_label="Condensed grotesk / uppercase / measured spacing"),
]


def symbol(c, x=0, y=0, scale=1, ink=None, accent=None):
    return f'<g transform="translate({x} {y}) scale({scale})">' + c["mark"](ink or c["ink"], accent or c["accent"]) + '</g>'


def wordmark(c, x=0, y=0, ink=None, scale=1):
    first, second = ("CREDIT", "REGULATOR PRO") if c["upper"] else ("Credit", "Regulator Pro")
    ink = ink or c["ink"]
    a, w1 = lettering(first, 0, 55, c["size"], c["font"], ink, c["tracking"], c["weight"])
    b, w2 = lettering(second, 0, 126, c["size"], c["font"], ink, c["tracking"], c["weight"])
    return f'<g transform="translate({x} {y}) scale({scale})">{a}{b}</g>', max(w1, w2)


def lockup(c, ink=None, accent=None):
    word, width = wordmark(c, 190, 28, ink)
    body = symbol(c, 24, 28, 1.15, ink, accent) + word
    return body, 214 + width, 195


def svg(width, height, body, title):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="{title}"><title>{title}</title>{body}</svg>'


def save(name, width, height, body, title, raster=True):
    content = svg(width, height, body, title)
    path = HERE / f"{name}.svg"
    path.write_text(content, encoding="utf-8")
    ET.parse(path)
    if raster:
        cairosvg.svg2png(bytestring=content.encode(), write_to=str(HERE / f"{name}.png"))


def presentation(c):
    ink, accent, paper = c["ink"], c["accent"], c["paper"]
    b = f'<rect width="1480" height="424" rx="8" fill="{paper}"/>'
    b += txt(c["id"][:2] + "  /  " + c["name"], 45, 42, 19, ink, 1.8)
    b += f'<line x1="45" y1="64" x2="1435" y2="64" stroke="{ink}" stroke-opacity=".14"/>'
    b += symbol(c, 65, 124, 1.47)
    words, _ = wordmark(c, 270, 118)
    b += words
    b += txt(c["idea"], 270, 287, 22, ink)
    b += txt(c["type_label"], 270, 316, 17, "#66666B")
    # Three practical applications at the same relative scale across concepts.
    b += f'<line x1="1036" y1="95" x2="1036" y2="339" stroke="{ink}" stroke-opacity=".14"/>'
    b += '<rect x="1080" y="112" width="92" height="92" rx="16" fill="#FFFFFF"/>'
    b += symbol(c, 1100, 127, .47, ink, ink)
    b += f'<rect x="1200" y="112" width="92" height="92" rx="16" fill="{ink}"/>'
    b += symbol(c, 1220, 127, .47, "#FFFFFF", "#FFFFFF")
    b += txt("ONE COLOR", 1080, 232, 15, ink, .7)
    b += txt("REVERSE", 1200, 232, 15, ink, .7)
    b += symbol(c, 1095, 263, 24/128, ink, ink)
    b += symbol(c, 1145, 257, 32/128, ink, ink)
    b += symbol(c, 1212, 245, 48/128, ink, ink)
    b += txt("24 / 32 / 48 PX", 1080, 327, 15, ink, .6)
    b += f'<rect x="45" y="354" width="1390" height="40" fill="#FFFFFF" fill-opacity=".65"/>'
    b += symbol(c, 60, 359, .22, ink, ink)
    name = "CREDIT REGULATOR PRO" if c["upper"] else "Credit Regulator Pro"
    b += lettering(name, 96, 382, 23, c["font"], ink, -.3 if not c["upper"] else .3, c["weight"] / 2)[0]
    b += txt("COMPACT HEADER STUDY", 1128, 380, 14, ink, .8)
    return b


def build():
    board = '<rect width="1480" height="1480" fill="#FFFFFF"/>'
    board += txt("CREDIT REGULATOR PRO", 45, 45, 21, "#20252E", 2)
    board += txt("Three developed identities", 45, 81, 30, "#20252E")
    board += txt("DESIGN RESTART / OCT 11, 2026", 1124, 47, 14, "#64666D", .7)
    for index, c in enumerate(CONCEPTS):
        body, w, h = lockup(c)
        save(c["id"] + "-primary", round(w + 24), h, body, "Credit Regulator Pro " + c["name"] + " logo")
        mono, _, _ = lockup(c, "#202020", "#202020")
        save(c["id"] + "-one-color", round(w + 24), h, mono, "Credit Regulator Pro " + c["name"] + " one color logo")
        inverse, _, _ = lockup(c, "#FFFFFF", "#FFFFFF")
        save(c["id"] + "-inverse", round(w + 24), h, inverse, "Credit Regulator Pro " + c["name"] + " inverse logo", False)
        save(c["id"] + "-symbol", 128, 128, symbol(c, 4, 1), "Credit Regulator Pro " + c["name"] + " symbol")
        for pixels in (24, 32, 48):
            cairosvg.svg2png(url=str(HERE / (c["id"] + "-symbol.svg")), write_to=str(HERE / f'{c["id"]}-symbol-{pixels}.png'), output_width=pixels, output_height=pixels)
        card = presentation(c)
        save(c["id"] + "-presentation", 1480, 424, card, c["name"] + " developed identity")
        board += f'<g transform="translate(0 {115 + index * 446})">{card}</g>'
    save("developed-concepts-board", 1480, 1480, board, "Three developed Credit Regulator Pro identities")
    print("Created three identity families and comparison board; all lettering outlined.")


if __name__ == "__main__":
    build()
