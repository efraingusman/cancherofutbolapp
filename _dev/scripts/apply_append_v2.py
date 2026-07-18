import os

with open('append_logic.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

code_lines = []
capturing = False
for line in lines:
    if 'const code = `' in line:
        capturing = True
        continue
    if '`;' in line and capturing:
        capturing = False
        break
    if capturing:
        # Fix the escaped sequences used in the JS string
        fixed = line.replace('\\\\\\', '\\')
        fixed = fixed.replace('\\${', '${')
        code_lines.append(fixed)

with open('script.js', 'a', encoding='utf-8') as f:
    f.write('\n\n// RECOVERED LOGIC\n')
    f.writelines(code_lines)

print("Recovered logic from append_logic.js")
