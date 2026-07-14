import os
import re

directories = ['src', 'app']
pattern = re.compile(r'const\s+(\w+)\s*=\s*(?:React\.)?useRef\(new\s+Animated\.Value\(([^)]+)\)\)\.current;')

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = pattern.sub(r'const [\1] = useState(() => new Animated.Value(\2));', content)
    
    if new_content != content:
        # Check if useState is imported
        if 'useState' not in content:
            # Simple insertion at the top
            new_content = "import { useState } from 'react';\n" + new_content
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed Animated.Value in {filepath}")

for d in directories:
    for root, dirs, files in os.walk(d):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                fix_file(os.path.join(root, file))
