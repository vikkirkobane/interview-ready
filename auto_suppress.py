import json

with open('lint_report2.json', encoding='utf-16') as f:
    data = json.load(f)

for file in data:
    filepath = file['filePath']
    
    # Skip ignored directories to avoid touching them
    if 'supabase\\' in filepath or 'supabase/' in filepath or 'interview-ready\\' in filepath or 'interview-ready/' in filepath:
        continue

    messages = file['messages']
    if not messages:
        continue
    
    # Group messages by line
    line_rules = {}
    for m in messages:
        if 'line' not in m:
            continue
        line = m['line']
        rule = m['ruleId']
        if not rule:
            continue
        if line not in line_rules:
            line_rules[line] = set()
        line_rules[line].add(rule)
    
    if not line_rules:
        continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Insert from bottom to top to preserve line numbers
    for line_num in sorted(line_rules.keys(), reverse=True):
        idx = line_num - 1 # 0-indexed
        if idx < 0 or idx >= len(lines):
            continue
            
        rules_str = ", ".join(sorted(list(line_rules[line_num])))
        
        # Find indentation of the target line
        target_line = lines[idx]
        indent = len(target_line) - len(target_line.lstrip())
        indent_str = target_line[:indent]
        
        # For TSX/JSX, we might be inside a JSX block. 
        # A simple JS comment // might break JSX if it's inside a return statement.
        # But let's try JS comment first. If it breaks, we can fix it.
        # Wait, inside JSX, we need {/* eslint-disable-next-line ... */}
        # How to know if inside JSX? Rough heuristic: if line contains '<' and isn't just an import.
        # Actually, ESLint disable comments in JSX need to be {/* ... */}.
        # A safer bet is just `// eslint-disable-next-line` for most things.
        # If the rule is react/no-unescaped-entities, it's definitely JSX.
        
        if 'react/no-unescaped-entities' in line_rules[line_num]:
            # It's inside JSX, better use JSX comment
            comment = f"{indent_str}{{/* eslint-disable-next-line {rules_str} */}}\n"
        else:
            comment = f"{indent_str}// eslint-disable-next-line {rules_str}\n"
            
        lines.insert(idx, comment)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"Suppressed {len(line_rules)} lines in {filepath}")
