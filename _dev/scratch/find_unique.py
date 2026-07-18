# Check if script.js has any unique lines compared to www/script.js
with open('script.js', 'r', encoding='utf-8', errors='ignore') as f:
    s1_lines = f.readlines()

with open('www/script.js', 'r', encoding='utf-8', errors='ignore') as f:
    s2 = f.read()

unique_in_s1 = []
for i, line in enumerate(s1_lines, 1):
    stripped = line.strip()
    if len(stripped) > 20 and stripped not in s2:
        unique_in_s1.append((i, stripped))

print("Total unique lines in script.js (not in www/script.js):", len(unique_in_s1))
if len(unique_in_s1) > 0:
    print("First 20 unique lines:")
    for i, line in unique_in_s1[:20]:
        print(f"Line {i}: {line}")
