from pathlib import Path
import fitz

HERE=Path(__file__).resolve().parent
N="#142B3A"
C="#A57543"

marks={
"A / direct index":f'''<path d="M10 10H69V24H24V68H10Z" fill="{N}"/><path d="M90 32V90H31V76H76V32Z" fill="{N}"/><path d="M24 44H76V57H24Z" fill="{C}"/>''',
"B / notched index":f'''<path d="M10 10H69V24H24V68H10Z" fill="{N}"/><path d="M90 32V90H31V76H76V32Z" fill="{N}"/><path d="M24 43H48V57H24ZM53 43H76V57H53Z" fill="{C}"/>''',
"C / vertical index":f'''<path d="M10 10H69V24H24V68H10Z" fill="{N}"/><path d="M90 32V90H31V76H76V32Z" fill="{N}"/><path d="M44 24H57V76H44Z" fill="{C}"/>''',
"D / aligned rails":f'''<path d="M10 10H72V24H24V67H10Z" fill="{N}"/><path d="M90 33V90H28V76H76V33Z" fill="{N}"/><path d="M24 39H76V51H24Z" fill="{C}"/><path d="M24 58H76V70H24Z" fill="{C}"/>''',
}
body='<rect width="950" height="510" fill="#F6F5F0"/>'
for i,(name,mark) in enumerate(marks.items()):
    x=80+(i%2)*460;y=75+(i//2)*230
    body+=f'<rect x="{x-25}" y="{y-25}" width="170" height="170" fill="#fff"/><g transform="translate({x} {y}) scale(1.2)">{mark}</g>'
    body+=f'<text x="{x+160}" y="{y+66}" font-family="Arial" font-size="23" fill="{N}">{name}</text>'
svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="950" height="510" viewBox="0 0 950 510">{body}</svg>'
(HERE/'mark-studies.svg').write_text(svg,encoding='utf-8')
fitz.open(HERE/'mark-studies.svg')[0].get_pixmap(matrix=fitz.Matrix(1.5,1.5)).save(HERE/'mark-studies.png')
