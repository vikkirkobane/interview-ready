# -*- coding: utf-8 -*-
"""Replace the why-did-you-leave cover with the new AI-generated image.
Converts PNG to JPG, center-crops to 1200x630 (OG card spec), and removes
the old gradient banner by overwriting the same path.
"""
import os
from PIL import Image

SRC = r"C:\Users\user\Downloads\gpt-image-2.5-flare_b_A_young_African_prof.png"
DST = r"C:\Users\user\interview-ready\public\blog\images\why-did-you-leave.jpg"

img = Image.open(SRC)
print("source size:", img.size, "mode:", img.mode)

img = img.convert("RGB")

# Center-crop to a 1200x630 (1.905:1) OG card, then resize.
TARGET_W, TARGET_H = 1200, 630
target_ratio = TARGET_W / TARGET_H
w, h = img.size
src_ratio = w / h

if src_ratio > target_ratio:
    # too wide: crop sides
    new_w = int(h * target_ratio)
    left = (w - new_w) // 2
    img = img.crop((left, 0, left + new_w, h))
else:
    # too tall: crop top/bottom (bias slightly toward the top)
    new_h = int(w / target_ratio)
    top = int((h - new_h) * 0.35)
    img = img.crop((0, top, w, top + new_h))

img = img.resize((TARGET_W, TARGET_H), Image.LANCZOS)
img.save(DST, "JPEG", quality=88)
print("saved:", DST, os.path.getsize(DST), "bytes")
