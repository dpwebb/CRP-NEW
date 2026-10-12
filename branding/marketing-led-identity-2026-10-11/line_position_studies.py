from pathlib import Path
import fitz

HERE=Path(__file__).resolve().parent
I="#17332F"; A="#B4D34B"
base=f'<path d="M83 19A39 39 0 1 0 83 81" fill="none" stroke="{I}" stroke-width="15" stroke-linecap="butt"/>'
marks={
"center":base+f'<path d="M45 50H94" stroke="{A}" stroke-width="12"/>',
"lower":base+f'<path d="M37 64H94" stroke="{A}" stroke-width="12"/>',
"lower tipped":base+f'<path d="M35 64H79V57H94" fill="none" stroke="{A}" stroke-width="12" stroke-linejoin="miter"/>',
"bottom path":base+f'<path d="M55 79H94" stroke="{A}" stroke-width="12"/>',
}
body='<rect width="1040" height="340" fill="#F7F8F0"/>'
for j,(name,mark) in enumerate(marks.items()):
    x=38+j*250
    body+=f'<rect x="{x}" y="40" width="208" height="208" fill="#fff"/><g transform="translate({x+33} 70) scale(1.4)">{mark}</g>'
    body+=f'<text x="{x}" y="295" font-family="Arial" font-size="22" fill="{I}">{name}</text>'
svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="340">{body}</svg>'
(HERE/'line-position-studies.svg').write_text(svg,encoding='utf-8')
fitz.open(HERE/'line-position-studies.svg')[0].get_pixmap(matrix=fitz.Matrix(1.5,1.5)).save(HERE/'line-position-studies.png')
