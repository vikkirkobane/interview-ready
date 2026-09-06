# -*- coding: utf-8 -*-
"""Replace em-dashes (U+2014) in user-facing blog markdown with commas/punctuation."""
import io, os, glob

TARGETS = [
    r"C:\Users\user\blog",
    r"C:\Users\user\interview-ready\public\blog",
]

def clean(text):
    # Spaced em dash "x — y" -> "x, y"
    text = text.replace(" — ", ", ")
    # Unspaced em dash "x—y" -> "x, y"  (also handles "x— y")
    text = text.replace("—", ", ")
    # Clean artifacts: space before comma, double spaces, comma+period
    text = text.replace(" ,", ",")
    text = text.replace("  ", " ")
    text = text.replace(",.", ".")
    return text

total = 0
for base in TARGETS:
    for path in glob.glob(os.path.join(base, "*.md")):
        with io.open(path, encoding="utf-8") as f:
            content = f.read()
        if "\u2014" not in content:
            continue
        new = clean(content)
        with io.open(path, "w", encoding="utf-8", newline="") as f:
            f.write(new)
        before = content.count("\u2014")
        total += before
        print(f"cleaned {os.path.basename(path)}: removed {before} em-dashes")

print(f"\nTotal em-dashes removed: {total}")
