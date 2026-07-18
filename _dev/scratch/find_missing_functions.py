import re

def extract_functions(filepath):
    funcs = set()
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Match window.name = function or function name(
    patterns = [
        r'window\.(\w+)\s*=\s*function',
        r'function\s+(\w+)\s*\('
    ]
    for p in patterns:
        for m in re.finditer(p, content):
            funcs.add(m.group(1))
    return funcs

funcs_s1 = extract_functions('script.js')
funcs_s2 = extract_functions('www/script.js')

print("Functions in script.js:", len(funcs_s1))
print("Functions in www/script.js:", len(funcs_s2))

missing_in_s1 = funcs_s2 - funcs_s1
print("Missing in script.js (but present in www/script.js):", missing_in_s1)

extra_in_s1 = funcs_s1 - funcs_s2
print("Extra in script.js (not in www/script.js):", extra_in_s1)
