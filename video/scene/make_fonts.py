"""Crea instancias estáticas de Rocinante Titling (variable) para usarlas en canvas."""
import os
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "..", "brand", "fonts", "RocinanteTitling-Variable.otf")
OUT = os.path.join(ROOT, "build", "fonts")
os.makedirs(OUT, exist_ok=True)
for name, wght, slnt in [("Rocinante-BlackOblique", 900, 12), ("Rocinante-Black", 900, 0),
                         ("Rocinante-LightOblique", 300, 12), ("Rocinante-MediumOblique", 500, 12)]:
    f = instantiateVariableFont(TTFont(SRC), {"wght": wght, "slnt": slnt})
    f.save(os.path.join(OUT, name + ".otf"))
    print(name)
