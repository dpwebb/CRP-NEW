from pathlib import Path
import sys
import fitz

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent))
import build_logo as base

FONTS=[
    ("Source Sans Pro",r"C:\Windows\Fonts\SourceSansPro_Regular.ttf",0.7),
    ("Segoe UI Semibold",r"C:\Windows\Fonts\seguisb.ttf",0),
    ("PT Sans Bold",r"C:\Windows\Fonts\PT_Sans_Web_Bold.ttf",0),
    ("Candara Bold",r"C:\Windows\Fonts\Candarab.ttf",0),
    ("Muli",r"C:\Windows\Fonts\Muli_Regular.ttf",0.8),
]

body='<rect width="1600" height="700" fill="#F6F5F0"/>'
for i,(label,font,stroke) in enumerate(FONTS):
    base.FONT_PATH=Path(font)
    base.FONT=base.TTFont(font)
    base.GLYPHS=base.FONT.getGlyphSet()
    base.CMAP=base.FONT.getBestCmap()
    base.UNITS=base.FONT["head"].unitsPerEm
    y=115+i*125
    body+=f'<text x="60" y="{y-54}" font-family="Arial" font-size="22" fill="#A57543">{label}</text>'
    glyph,_=base.glyphs('Credit Regulator Pro',70,y,69,'#142B3A',tracking=-0.5,stroke=stroke)
    body+=glyph
svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="700" viewBox="0 0 1600 700">{body}</svg>'
(HERE/'wordmark-studies.svg').write_text(svg,encoding='utf-8')
fitz.open(HERE/'wordmark-studies.svg')[0].get_pixmap(matrix=fitz.Matrix(1.2,1.2)).save(HERE/'wordmark-studies.png')
