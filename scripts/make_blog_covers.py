"""Generate branded blog cover images for Interview Ready blog posts.

Creates three 1200x630 JPGs (OG card size) with a violet gradient,
decorative geometric shapes, and a subtle title band. Text-light so they
read well at small sizes; final title text is handled by the post header.
"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = r"C:\Users\user\interview-ready\public\blog\images"
W, H = 1200, 630

FONT_PATHS = [
    r"C:\Windows\Fonts\arialbd.ttf",
    r"C:\Windows\Fonts\arial.ttf",
    r"C:\Windows\Fonts\segoeuib.ttf",
    r"C:\Windows\Fonts\segoeui.ttf",
]

def load_font(size):
    for p in FONT_PATHS:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return None

# Violet brand gradient: #6B46FE (top-left) -> #4C1D95 (bottom-right)
def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

TOP = (107, 70, 254)    # #6B46FE
BOT = (76, 29, 149)     # #4C1D95
ACCENT = (255, 255, 255)

def make_image(slug, label, accent):
    img = Image.new("RGB", (W, H))
    px = img.load()
    for y in range(H):
        for x in range(W):
            t = (x / W + y / H) / 2
            px[x, y] = lerp(TOP, BOT, t)

    d = ImageDraw.Draw(img, "RGBA")
    # Decorative translucent circles (abstract, no text reliance)
    d.ellipse([-180, -180, 340, 340], fill=(255, 255, 255, 24))
    d.ellipse([W - 260, H - 300, W + 60, H + 40], fill=(255, 255, 255, 18))
    d.ellipse([W - 420, -160, W - 60, 190], fill=(255, 255, 255, 14))
    # Rounded accent bar near top-left (Interview Ready visual cue)
    d.rounded_rectangle([80, 80, 240, 104], radius=12, fill=(255, 255, 255, 210))

    # Load fonts: title (bold) + small label
    title_font = load_font(44)
    label_font = load_font(26)

    # Draw Interview Ready wordmark and per-post accent label
    if title_font:
        d.text((80, 130), "Interview Ready", fill=(255, 255, 255, 255), font=title_font)
    if label_font:
        # Distinctive subtitle using a per-post accent color
        d.text((80, 200), label, fill=accent, font=label_font)
        # thin accent underline
        d.rectangle([80, 245, 80 + len(label) * 12, 249], fill=accent)

    out_path = os.path.join(OUT, f"{slug}.jpg")
    img.save(out_path, "JPEG", quality=84)
    print("saved", out_path, os.path.getsize(out_path), "bytes")

if __name__ == "__main__":
    # Per-post accent tints (RGB tuples) so each cover is visually distinct
    make_image("choose-your-lane-specialization-growth", "Choose your lane. Go deep.", (196, 181, 253))
    make_image("ai-mock-interview-practice-guide", "Practice smarter, land the offer.", (167, 243, 208))
    make_image("free-ats-resume-checker-guide", "Pass the ATS. Get noticed.", (253, 230, 138))
    make_image("tell-me-about-yourself-freshers", "Own the first question.", (147, 197, 253))
    make_image("record-yourself-speaking-daily", "Three minutes a day.", (196, 181, 253))
    print("done")
