# -*- coding: utf-8 -*-
"""Generate ONLY the perseverance-change-direction cover image."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_blog_covers import make_image

make_image("perseverance-change-direction", "Quit the goal, not yourself.", (253, 230, 138))
print("done: only new cover generated")
