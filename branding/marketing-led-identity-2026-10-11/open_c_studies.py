from pathlib import Path
import fitz

HERE=Path(__file__).resolve().parent
I="#17332F"
L="#B4D34B"
common=f'<path d="M83 19A39 39 0 1 0 83 81" fill="none" stroke="{I}" stroke-width="15" stroke-linecap="butt"/>'
variants={
"A  floating":common+f'<path d="M45 50H94" stroke="{L}" stroke-width="12" stroke-linecap="square"/>',
"B  joined":common+f'<path d="M22 50H94" stroke="{L}" stroke-width="12" stroke-linecap="square"/>',
"C  through":common+f'<path d="M10 50H94" stroke="{L}" stroke-width="12" stroke-linecap="square"/>',
"D  tab":common+f'<path d="M22 44H71V57H22Z" fill="{L}"/><path d="M71 39H94V62H71Z" fill="{L}"/>',
}
body='<rect width="1040" height="340" fill="#F7F8F0"/>'
for j,(name,mark) in enumerate(variants.items()):
    x=38+j*250
    body+=f'<rect x="{x}" y="40" width="208" height="208" fill="#fff"/>'
    body+=f'<g transform="translate({x+33} 70) scale(1.4)">{mark}</g>'
    body+=f'<text x="{x}" y="295" font-family="Arial" font-size="22" fill="{I}">{name}</text>'
svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="340">{body}</svg>'
(HERE/'open-c-studies.svg').write_text(svg,encoding='utf-8')
fitz.open(HERE/'open-c-studies.svg')[0].get_pixmap(matrix=fitz.Matrix(1.5,1.5)).save(HERE/'open-c-studies.png')
