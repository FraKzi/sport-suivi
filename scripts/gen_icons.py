"""Génère les icônes PWA (192x192, 512x512, 180x180 apple) depuis zéro."""
from PIL import Image, ImageDraw
from pathlib import Path

OUT = Path(__file__).parent.parent / "public"
OUT.mkdir(exist_ok=True)

BG = (11, 13, 16, 255)        # #0b0d10
ACCENT = (91, 141, 239, 255)  # #5b8def


def draw_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), BG)
    d = ImageDraw.Draw(img)

    # arrière-plan arrondi : carré plein avec coins doux (radius ~22% pour iOS look)
    radius = int(size * 0.22)
    rect = [(0, 0), (size, size)]
    d.rounded_rectangle(rect, radius=radius, fill=BG)

    # haltère stylisée : 2 disques + barre horizontale
    cx, cy = size / 2, size / 2
    bar_h = size * 0.10
    bar_w = size * 0.42
    disc_w = size * 0.12
    disc_h = size * 0.32
    plate_w = size * 0.07
    plate_h = size * 0.45

    # barre centrale
    d.rounded_rectangle(
        [cx - bar_w / 2, cy - bar_h / 2, cx + bar_w / 2, cy + bar_h / 2],
        radius=int(bar_h / 4), fill=ACCENT,
    )

    # disques gauche
    d.rounded_rectangle(
        [cx - bar_w / 2 - disc_w, cy - disc_h / 2, cx - bar_w / 2, cy + disc_h / 2],
        radius=int(disc_w / 3), fill=ACCENT,
    )
    d.rounded_rectangle(
        [cx - bar_w / 2 - disc_w - plate_w, cy - plate_h / 2,
         cx - bar_w / 2 - disc_w, cy + plate_h / 2],
        radius=int(plate_w / 3), fill=ACCENT,
    )

    # disques droite
    d.rounded_rectangle(
        [cx + bar_w / 2, cy - disc_h / 2, cx + bar_w / 2 + disc_w, cy + disc_h / 2],
        radius=int(disc_w / 3), fill=ACCENT,
    )
    d.rounded_rectangle(
        [cx + bar_w / 2 + disc_w, cy - plate_h / 2,
         cx + bar_w / 2 + disc_w + plate_w, cy + plate_h / 2],
        radius=int(plate_w / 3), fill=ACCENT,
    )

    return img


for sz, name in [(192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-icon.png"), (32, "favicon-32.png")]:
    img = draw_icon(sz)
    img.save(OUT / name, "PNG")
    print(f"  OK {name} ({sz}x{sz})")
