import difflib

with open('script.js', 'r', encoding='utf-8') as f:
    root_lines = f.readlines()

with open('www/script.js', 'r', encoding='utf-8') as f:
    www_lines = f.readlines()

prefix_diff = list(difflib.unified_diff(
    [f"{i+1}: {l.strip()}" for i, l in enumerate(root_lines[:682])],
    [f"{i+1}: {l.strip()}" for i, l in enumerate(www_lines[:596])],
    n=0
))

for line in prefix_diff[:50]:
    print(line)
