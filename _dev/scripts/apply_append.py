import os

path = r'c:\Users\Cliente\Documents\canchero app\script.js'
append_path = r'c:\Users\Cliente\Documents\canchero app\append_logic.js'

with open(append_path, 'r', encoding='utf-8') as f:
    append_content = f.read()

# Extract the code between `const code = \`` and `\`;`
import re
match = re.search(r'const code = `([\s\S]*?)`;', append_content)
if match:
    code_to_append = match.group(1)
    # Fix the double backslashes which were for the JS string
    code_to_append = code_to_append.replace('\\\\\\', '\\')
    
    with open(path, 'a', encoding='utf-8') as f:
        f.write('\n\n' + code_to_append)
    print("Appended logic from append_logic.js")
else:
    print("Could not find code block in append_logic.js")
