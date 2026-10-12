from pathlib import Path
import sys
import fitz

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import build_logo as b
from fontTools.ttLib import TTFont


def set_font(path):
    b.FONT_PATH = Path(path)
    b.FONT = TTFont(path)
    b.GLYPHS = b.FONT.getGlyphSet()
    b.CMAP = b.FONT.getBestCmap()
    b.UNITS = b.FONT["head"].unitsPerEm


def mark(x, y, s=1):
    return f'''<g transform="translate({x} {y}) scale({s})">
      <path d="M8 8H70V22H22V70H8Z" fill="{b.INK}"/>
      <path d="M92 30V92H30V78H78V30Z" fill="{b.INK}"/>
      <rect x="43" y="43" width="14" height="14" fill="{b.BRASS}"/>
    </g>'''


body = f'<rect width="1400" height="690" fill="{b.CREAM}"/>'
fonts = [
    ("SOURCE SANS PRO", r"C:\Windows\Fonts\SourceSansPro_Regular.ttf"),
    ("VESPER LIBRE", r"C:\Windows\Fonts\VesperLibre_Regular.ttf"),
    ("GEORGIA", r"C:\Windows\Fonts\georgia.ttf"),
]
for i, (label, path) in enumerate(fonts):
    yy = 40 + i * 220
    set_font(r"C:\Windows\Fonts\SourceSansPro_Regular.ttf")
    label_path, _ = b.glyphs(label, 78, yy, 18, b.INK, tracking=2)
    body += label_path
    body += f'<rect x="78" y="{yy+20}" width="1244" height="160" fill="#FFFFFF"/>'
    body += mark(116, yy+47, 1.05)
    top, _ = b.glyphs("CREDIT", 260, yy+104, 29, b.INK, tracking=3.4)
    body += top
    set_font(path)
    bottom, _ = b.glyphs("Regulator Pro", 260, yy+173, 74, b.INK, tracking=-0.8)
    body += bottom

path = HERE / "font-studies.svg"
path.write_text(b.svg(1400, 690, body, "Credit Regulator Pro font studies"), encoding="utf-8")
fitz.open(path)[0].get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(HERE / "font-studies.png")
