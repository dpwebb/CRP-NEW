from pathlib import Path
import sys
import fitz

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent))
import build_logo as b
from fontTools.ttLib import TTFont

path=Path(r"C:\Windows\Fonts\VesperLibre_Regular.ttf")
b.FONT_PATH=path
b.FONT=TTFont(path)
b.GLYPHS=b.FONT.getGlyphSet()
b.CMAP=b.FONT.getBestCmap()
b.UNITS=b.FONT["head"].unitsPerEm

letter,w=b.glyphs("R",110,330,280,b.INK)
body=f'<rect width="700" height="420" fill="{b.CREAM}"/>'+letter
body+='<path d="M110 330H450M110 50V360" stroke="#DDC6AB" stroke-width="1"/>'
svg=b.svg(700,420,body,"R glyph study")
(HERE/"r-study.svg").write_text(svg,encoding="utf-8")
fitz.open(HERE/"r-study.svg")[0].get_pixmap().save(HERE/"r-study.png")
