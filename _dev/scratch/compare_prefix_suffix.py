import difflib

# Read script.js root and www/script.js
with open('script.js', 'r', encoding='utf-8') as f:
    root_lines = f.readlines()

with open('www/script.js', 'r', encoding='utf-8') as f:
    www_lines = f.readlines()

print(f"Root script.js: {len(root_lines)} lines")
print(f"www/script.js: {len(www_lines)} lines")

# Let's compare the prefix of root (up to line 682) with www (up to line 596)
# Note 1-based indexing in python: line 682 is index 681. line 596 is index 595.
prefix_diff = list(difflib.unified_diff(
    [l.strip() for l in root_lines[:682]],
    [l.strip() for l in www_lines[:596]],
    n=0
))
print(f"Prefix diff lines count: {len(prefix_diff)}")

# Let's look at the suffix of root (from line 844 to end) with www (from line 917 to end)
suffix_diff = list(difflib.unified_diff(
    [l.strip() for l in root_lines[843:]],
    [l.strip() for l in www_lines[916:]],
    n=0
))
print(f"Suffix diff lines count: {len(suffix_diff)}")
# Print first 20 lines of suffix diff if any
if suffix_diff:
    print("--- Suffix Diff Samples ---")
    for line in suffix_diff[:30]:
        print(line)
