"""Generate the site-wide Open Graph / Twitter share card.

Produces public/og-image.png at 1200x630 (the size Facebook, LinkedIn, X,
WhatsApp and Google Discover expect). Run manually and commit the output:

    python scripts/make_og_image.py

Not wired into build:web on purpose - the PNG is a committed asset, so the
Vercel build never needs fonts or Pillow.
"""
from PIL import Image, ImageDraw, ImageFont
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "og-image.png")
ICON = os.path.join(ROOT, "public", "icon_padded.png")

W, H = 1200, 630

# Brand blue -> deep navy, matching the app's --brand (#0055FF) and theme color.
TOP = (0, 85, 255)      # #0055FF
BOT = (14, 33, 74)      # #0E214A
ACCENT = (255, 214, 92)  # warm highlight for the underline

FONT_CANDIDATES = [
    ("bold", [r"C:\Windows\Fonts\arialbd.ttf", r"C:\Windows\Fonts\segoeuib.ttf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]),
    ("regular", [r"C:\Windows\Fonts\arial.ttf", r"C:\Windows\Fonts\segoeui.ttf",
                 "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]),
]


def load_font(kind, size):
    for path in dict(FONT_CANDIDATES)[kind]:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def main():
    img = Image.new("RGB", (W, H))
    px = img.load()
    for y in range(H):
        # Vertical gradient only: keeps the left side dark enough for text.
        for x in range(W):
            t = (y / H) * 0.75 + (x / W) * 0.25
            px[x, y] = lerp(TOP, BOT, t)

    d = ImageDraw.Draw(img, "RGBA")

    # Decorative shapes, echo the blog cover language.
    d.ellipse([W - 320, -220, W + 120, 220], fill=(255, 255, 255, 20))
    d.ellipse([-200, H - 260, 200, H + 140], fill=(255, 255, 255, 16))

    # App icon badge, top-left.
    icon_size = 112
    try:
        icon = Image.open(ICON).convert("RGBA").resize((icon_size, icon_size), Image.LANCZOS)
        d.rounded_rectangle([72, 66, 72 + icon_size, 66 + icon_size], radius=26, fill=(255, 255, 255, 235))
        img.paste(icon, (72, 66), icon)
    except Exception as exc:  # pragma: no cover - asset should exist
        print("icon skipped:", exc)

    f_title = load_font("bold", 84)
    f_sub = load_font("regular", 36)
    f_domain = load_font("bold", 28)

    d.text((72, 236), "Interview Ready", fill=(255, 255, 255, 255), font=f_title)
    d.rounded_rectangle([74, 344, 74 + 150, 352], radius=4, fill=ACCENT)

    d.text((72, 388), "ATS-optimised resumes, cover letters", fill=(226, 236, 255, 255), font=f_sub)
    d.text((72, 436), "and interview prep in seconds.", fill=(226, 236, 255, 255), font=f_sub)
    d.text((72, 540), "appinterviewready.top", fill=(255, 255, 255, 210), font=f_domain)

    img.save(OUT, "PNG", optimize=True)
    print("saved", OUT, os.path.getsize(OUT), "bytes", img.size)


if __name__ == "__main__":
    main()
