from pathlib import Path
import fitz

HERE=Path(__file__).resolve().parent
N="#142B3A"
C="#A57543"

marks={
"A / Indexed R":f'''<path d="M13 12H65C75 12 83 20 83 30V43C83 52 78 58 69 62H30V88H13Z" fill="{N}"/><path d="M30 28H64C67 28 68 30 68 33V42C68 45 66 47 63 47H30Z" fill="#fff"/><path d="M48 60H67L88 88H68Z" fill="{N}"/><rect x="61" y="47" width="15" height="15" fill="{C}"/>''',
"B / Indexed cut":f'''<path d="M13 12H65C77 12 84 21 84 32V44C84 54 77 61 66 61H30V88H13Z" fill="{N}"/><path d="M30 28H64C67 28 68 30 68 33V43C68 46 66 48 63 48H30Z" fill="#fff"/><path d="M46 61H63L87 88H67Z" fill="{N}"/><path d="M74 56H84V67H74Z" fill="#fff"/><path d="M74 46H84V56H74Z" fill="{C}"/>''',
"C / CR ligature":f'''<path d="M86 12H32C20 12 13 19 13 31V69C13 81 20 88 32 88H86V74H34C29 74 27 72 27 67V33C27 28 29 26 34 26H86Z" fill="{N}"/><path d="M39 38H63C73 38 79 43 79 51C79 59 73 64 63 64H39V53H60C65 53 67 52 67 50S65 48 60 48H50V72H39Z" fill="{N}"/><path d="M60 62L73 75" stroke="{C}" stroke-width="11" stroke-linecap="square"/>''',
"D / joined frames":f'''<path d="M11 11H73V26H26V72H11Z" fill="{N}"/><path d="M89 27V89H27V74H74V27Z" fill="{N}"/><path d="M26 48H54V36H69V51H54V63H26Z" fill="{C}"/>''',
}
body='<rect width="950" height="510" fill="#F6F5F0"/>'
for i,(name,mark) in enumerate(marks.items()):
    x=80+(i%2)*460;y=75+(i//2)*230
    body+=f'<rect x="{x-25}" y="{y-25}" width="170" height="170" fill="#fff"/><g transform="translate({x} {y}) scale(1.2)">{mark}</g>'
    body+=f'<text x="{x+160}" y="{y+66}" font-family="Arial" font-size="23" fill="{N}">{name}</text>'
svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="950" height="510" viewBox="0 0 950 510">{body}</svg>'
(HERE/'mark-studies.svg').write_text(svg,encoding='utf-8')
fitz.open(HERE/'mark-studies.svg')[0].get_pixmap(matrix=fitz.Matrix(1.5,1.5)).save(HERE/'mark-studies.png')
