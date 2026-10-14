"""Create a nearest-neighbor sheet for checking the symbol at small sizes."""

from pathlib import Path
import sys

import fitz

sys.path.insert(0, r"C:\Users\webbd\.codex\logo_tools")
from PIL import Image, ImageDraw

here = Path(__file__).resolve().parent
sheet = Image.new("RGB", (950, 850), "#F7F8F0")
draw = ImageDraw.Draw(sheet)
draw.text((72, 28), "COLOR", fill="#17332F")
draw.text((492, 28), "ONE COLOR", fill="#17332F")

for col, filename in enumerate(("credit-regulator-pro-symbol.svg",
                                "credit-regulator-pro-symbol-one-color.svg")):
    for row, size in enumerate((24, 32, 48)):
        pix = fitz.open(here / filename)[0].get_pixmap(
            matrix=fitz.Matrix(size / 120, size / 120), alpha=True)
        img = Image.frombytes("RGBA", (pix.width, pix.height), pix.samples)
        img = img.resize((size * 6, size * 6), Image.Resampling.NEAREST)
        bg = Image.new("RGB", img.size, "#F7F8F0")
        bg.paste(img, mask=img.getchannel("A"))
        y = (69, 259, 519)[row]
        sheet.paste(bg, (72 + 420 * col, y))
        draw.text((8 + 420 * col, y + 8), str(size), fill="#17332F")

sheet.save(here / "symbol-size-check.png")
