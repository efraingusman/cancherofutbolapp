# Patch script.js using correct block from www/script.js

with open('script.js', 'r', encoding='utf-8') as f:
    root_lines = f.readlines()

with open('www/script.js', 'r', encoding='utf-8') as f:
    www_lines = f.readlines()

# Correct block is www/script.js lines 576 to 915 (1-indexed)
# In Python, that is indices 575 to 915 (end index is exclusive)
correct_block = www_lines[575:915]

# Corrupted block in root is lines 683 to 843 (1-indexed)
# In Python, indices 682 to 843
new_root_lines = root_lines[:682] + correct_block + root_lines[843:]

with open('script.js', 'w', encoding='utf-8') as f:
    f.writelines(new_root_lines)

print("Patch complete! script.js size now:", len(new_root_lines), "lines.")
