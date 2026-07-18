import re

with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

sections = re.findall(r'<section\s+[^>]*id="([^"]+)"[^>]*>', text)
print("Sections:")
for s in sections:
    print(" - " + s)
