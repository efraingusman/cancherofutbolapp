# Compare script.js and www/script.js
with open('script.js', 'r', encoding='utf-8', errors='ignore') as f:
    s1 = f.read()

with open('www/script.js', 'r', encoding='utf-8', errors='ignore') as f:
    s2 = f.read()

print("script.js len:", len(s1))
print("www/script.js len:", len(s2))

# Find first difference
min_len = min(len(s1), len(s2))
diff_idx = -1
for i in range(min_len):
    if s1[i] != s2[i]:
        diff_idx = i
        break

if diff_idx != -1:
    print("First difference at index:", diff_idx)
    # Print context around diff_idx
    print("script.js context:")
    print(s1[max(0, diff_idx-50):diff_idx+200])
    print("\nwww/script.js context:")
    print(s2[max(0, diff_idx-50):diff_idx+200])
else:
    print("Files are identical up to min_len")
