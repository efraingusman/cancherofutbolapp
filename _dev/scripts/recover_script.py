import os
import json
import re

def find_script_js():
    brain_dir = r'C:\Users\Cliente\.gemini\antigravity\brain'
    best_content = ""
    max_len = 0
    
    for root, dirs, files in os.walk(brain_dir):
        if 'overview.txt' in files:
            path = os.path.join(root, 'overview.txt')
            print(f"Checking {path}")
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    if 'script.js' in line and ('ReplacementContent' in line or 'CodeContent' in line or 'output' in line):
                        # Try to extract the code
                        try:
                            # Use regex to find large strings that look like JS
                            matches = re.findall(r'"(?:ReplacementContent|CodeContent|output)":"(.*?)"', line)
                            for m in matches:
                                decoded = m.encode().decode('unicode_escape')
                                if len(decoded) > max_len:
                                    # Basic heuristic: does it have common Canchero strings?
                                    if 'userData' in decoded and 'init3DCardTilt' in decoded:
                                        max_len = len(decoded)
                                        best_content = decoded
                        except:
                            continue
    
    if best_content:
        with open(r'c:\Users\Cliente\Documents\canchero app\script_recovered.js', 'w', encoding='utf-8') as f:
            f.write(best_content)
        print(f"Recovered {len(best_content)} bytes to script_recovered.js")
    else:
        print("No content found")

find_script_js()
