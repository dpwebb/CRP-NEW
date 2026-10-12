"""Create fixed weights from the OFL Manrope variable source for vector outlining."""

from pathlib import Path
import sys

sys.path.insert(0, r"C:\Users\webbd\.codex\logo_tools")
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

HERE = Path(__file__).resolve().parent
source = HERE / "Manrope-variable.ttf"

for weight in (500, 600, 700, 800):
    font = TTFont(source)
    fixed = instantiateVariableFont(font, {"wght": weight}, inplace=False)
    fixed.save(HERE / f"Manrope-{weight}.ttf")
