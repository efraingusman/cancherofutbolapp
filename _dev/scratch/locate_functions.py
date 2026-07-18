import re

with open('www/script.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

content = "".join(lines)

functions_to_find = [
    'toggleAvail',
    'updatePhotoPreview',
    'renderDashboardHome',
    'toggleMobileMoreMenu',
    'handleRegister'
]

# Find matches for window.NAME = function(...)
for func in functions_to_find:
    pattern = r'window\.' + func + r'\s*=\s*function'
    matches = list(re.finditer(pattern, content))
    for m in matches:
        start_char = m.start()
        # find line number
        line_num = content[:start_char].count('\n') + 1
        print(f"Function {func} starts at line {line_num}")
        # print first 5 lines of definition
        start_line = max(1, line_num - 2)
        end_line = line_num + 15
        print(f"--- lines {start_line} to {end_line} in www/script.js ---")
        for i in range(start_line - 1, min(len(lines), end_line)):
            print(f"{i+1}: {lines[i].rstrip()}")
        print("\n")
