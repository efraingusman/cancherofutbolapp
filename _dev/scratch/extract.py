import re

def extract():
    path = r"c:\Users\Cliente\Documents\canchero app\script.js"
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    match = re.search(r'window\.viewClubProfile = function\([^)]*\)\s*\{([\s\S]*?)(?=window\.\w+ = function|// ===)', content)
    if match:
        print(match.group(0))

extract()
