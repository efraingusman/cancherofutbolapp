import re

def extract_functions(filepath):
    funcs = {}
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Match window.xxxx = function(...)
    matches = re.finditer(r'window\.(\w+)\s*=\s*function', content)
    for m in matches:
        name = m.group(1)
        funcs[name] = ('window', m.start())
        
    # Match function xxxx(...)
    matches2 = re.finditer(r'function\s+(\w+)\s*\(', content)
    for m in matches2:
        name = m.group(1)
        funcs[name] = ('standard', m.start())
        
    return funcs

root_funcs = extract_functions('script.js')
www_funcs = extract_functions('www/script.js')

print("=== In www/script.js but NOT in root script.js ===")
for f in sorted(www_funcs.keys()):
    if f not in root_funcs:
        print(f"  {f} ({www_funcs[f][0]})")

print("\n=== In root script.js but NOT in www/script.js ===")
for f in sorted(root_funcs.keys()):
    if f not in www_funcs:
        print(f"  {f} ({root_funcs[f][0]})")
