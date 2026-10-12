from pathlib import Path
import fitz

HERE=Path(__file__).resolve().parent
I="#17332F"; A="#B4D34B"
marks={
"lower terminal":f'<path d="M82 20A38 38 0 1 0 77 80" fill="none" stroke="{I}" stroke-width="15"/><path d="M77 80H94" stroke="{A}" stroke-width="15"/>',
"upper terminal":f'<path d="M76 20A38 38 0 1 0 79 80" fill="none" stroke="{I}" stroke-width="15"/><path d="M76 20H94" stroke="{A}" stroke-width="15"/>',
"square C":f'<path d="M86 13H28C19 13 13 19 13 28V72C13 81 19 87 28 87H72V72H32C29 72 28 71 28 68V32C28 29 29 28 32 28H86Z" fill="{I}"/><path d="M72 72H92V87H72Z" fill="{A}"/>',
"underline C":f'<path d="M81 20A38 38 0 1 0 77 80" fill="none" stroke="{I}" stroke-width="15"/><path d="M77 80H94" stroke="{A}" stroke-width="15"/><path d="M22 97H94" stroke="{A}" stroke-width="4"/>',
}
body='<rect width="1040" height="340" fill="#F7F8F0"/>'
for j,(name,mark) in enumerate(marks.items()):
    x=38+j*250
    body+=f'<rect x="{x}" y="40" width="208" height="208" fill="#fff"/><g transform="translate({x+33} 70) scale(1.4)">{mark}</g>'
    body+=f'<text x="{x}" y="295" font-family="Arial" font-size="22" fill="{I}">{name}</text>'
svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="340">{body}</svg>'
(HERE/'terminal-c-studies.svg').write_text(svg,encoding='utf-8')
fitz.open(HERE/'terminal-c-studies.svg')[0].get_pixmap(matrix=fitz.Matrix(1.5,1.5)).save(HERE/'terminal-c-studies.png')
