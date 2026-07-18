# Find blocks of code in www/script.js missing in script.js
with open('script.js', 'r', encoding='utf-8', errors='ignore') as f:
    s1 = f.read()

with open('www/script.js', 'r', encoding='utf-8', errors='ignore') as f:
    s2 = f.read()

# Let's check sections of 50 lines in s2 and see if they are in s1
s2_lines = s2.splitlines()
missing_blocks = []
current_missing = []

for idx, line in enumerate(s2_lines):
    stripped = line.strip()
    if len(stripped) > 20 and stripped not in s1:
        current_missing.append((idx + 1, line))
    else:
        if len(current_missing) > 0:
            missing_blocks.append(current_missing)
            current_missing = []

if len(current_missing) > 0:
    missing_blocks.append(current_missing)

print("Total missing blocks of lines:", len(missing_blocks))
for i, block in enumerate(missing_blocks[:10]):
    print(f"\nBlock {i+1} (starts at line {block[0][0]} in www/script.js):")
    print(f"Length: {len(block)}")
    print("First 5 lines:")
    for idx, line in block[:5]:
        print(f"  {idx}: {line}")
