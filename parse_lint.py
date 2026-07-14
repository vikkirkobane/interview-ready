import json
with open('lint_report2.json', encoding='utf-16') as f:
    data = json.load(f)
with open('lint_summary2.txt', 'w', encoding='utf-8') as out:
    for file in data:
        if file['errorCount'] > 0 or file['warningCount'] > 0:
            out.write(f"File: {file['filePath'].split('interview-ready-v2')[-1]}\n")
            for m in file['messages']:
                out.write(f"  Line {m.get('line', '?')}: {m.get('ruleId', '?')} - {m.get('message', '?')}\n")
