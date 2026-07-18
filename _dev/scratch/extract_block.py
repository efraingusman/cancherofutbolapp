with open('www/script.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(589, 829):
    if i < len(lines):
        print(f"{i+1}: {lines[i].rstrip()}")
