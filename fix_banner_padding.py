import os
import re

directory = r"c:\Users\victo\Desktop\Gemini Projects\interview-ready\app\(tabs)"

for filename in os.listdir(directory):
    if not filename.endswith('.tsx') or filename == 'ask-ai.tsx':
        continue
        
    filepath = os.path.join(directory, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if '<AdBanner' not in content:
        continue

    print(f"Processing {filename}...")

    # 1. Import useSafeAreaInsets if missing
    if 'useSafeAreaInsets' not in content:
        # insert it after the last import
        import_match = list(re.finditer(r'^import .*;$', content, re.MULTILINE))
        if import_match:
            last_import = import_match[-1]
            content = content[:last_import.end()] + "\nimport { useSafeAreaInsets } from 'react-native-safe-area-context';" + content[last_import.end():]
    
    # 2. Add bottomNavPadding inside the component
    # We'll look for "export default function" or similar and insert it after the first curly brace
    if 'bottomNavPadding' not in content:
        comp_match = re.search(r'export default function.*?\{', content)
        if comp_match:
            insert_pos = comp_match.end()
            content = content[:insert_pos] + "\n  const bottomNavPadding = useSafeAreaInsets().bottom + 72;" + content[insert_pos:]
            
    # 3. Replace {!isPro && <AdBanner />}
    # Some might be slightly different like {!isPro && <AdBanner />} or { !isPro && <AdBanner /> }
    content = re.sub(r'\{!isPro\s*&&\s*<AdBanner\s*/>\}', r'{!isPro ? <AdBanner /> : <View style={{ height: bottomNavPadding }} />}', content)

    # 4. Fix paddingBottom in StyleSheet
    content = re.sub(r'paddingBottom:\s*(?:120|140|130|insets\.bottom\s*\+\s*120|140\s*\+\s*insets\.bottom)(?![0-9])', r'paddingBottom: Spacing.xl', content)

    # 5. Make sure Spacing is imported if we just used it
    if 'Spacing' not in content:
        content = re.sub(r"import\s+\{(.*?)\}\s+from\s+'../../src/theme'", r"import {\1, Spacing} from '../../src/theme'", content)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
print("Done!")
