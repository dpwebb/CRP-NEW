from pathlib import Path
import sys
import fitz

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from build_logo import glyphs, svg, INK, BRASS, CREAM


def mark(x, y, s=1):
    return f'''<g transform="translate({x} {y}) scale({s})">
      <path d="M8 8H70V22H22V70H8Z" fill="{INK}"/>
      <path d="M92 30V92H30V78H78V30Z" fill="{INK}"/>
      <rect x="43" y="43" width="14" height="14" fill="{BRASS}"/>
    </g>'''


body = f'<rect width="1400" height="690" fill="{CREAM}"/>'
for yy, label in ((40, "A / SINGLE LINE"), (260, "B / EDITORIAL"), (480, "C / TWO LINE")):
    label_path, _ = glyphs(label, 78, yy, 19, INK, tracking=2)
    body += label_path
    body += f'<rect x="78" y="{yy+20}" width="1244" height="160" fill="#FFFFFF"/>'
    body += mark(116, yy+47, 1.05)

word, _ = glyphs("Credit Regulator Pro", 260, 157, 70, INK, tracking=-0.7, stroke=0.4)
body += word
top, _ = glyphs("CREDIT", 260, 344, 32, INK, tracking=3.5, stroke=0.3)
bottom, _ = glyphs("Regulator Pro", 260, 412, 77, INK, tracking=-0.8, stroke=0.65)
body += top + bottom
top2, _ = glyphs("Credit", 260, 562, 68, INK, tracking=-0.7, stroke=0.5)
bottom2, _ = glyphs("Regulator Pro", 260, 631, 68, INK, tracking=-0.7, stroke=0.5)
body += top2 + bottom2

path = HERE / "type-studies.svg"
path.write_text(svg(1400, 690, body, "Credit Regulator Pro logo typography studies"), encoding="utf-8")
fitz.open(path)[0].get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(HERE / "type-studies.png")
