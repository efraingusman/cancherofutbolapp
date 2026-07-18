import os
import json
import re

def find_script_js():
    brain_dir = r'C:\Users\Cliente\.gemini\antigravity\brain'
    chunks = []
    
    for root, dirs, files in os.walk(brain_dir):
        if 'overview.txt' in files:
            path = os.path.join(root, 'overview.txt')
            print(f"Checking {path}")
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    # Find any large string in JSON
                    matches = re.findall(r'":"(.*?)"', line)
                    for m in matches:
                        if len(m) > 5000: # Any large string
                            try:
                                decoded = m.encode().decode('unicode_escape')
                                if len(decoded) > 5000:
                                    chunks.append((len(decoded), decoded, path))
                            except:
                                continue
    
    chunks.sort(key=lambda x: x[0], reverse=True)
    
    for i, (size, content, path) in enumerate(chunks[:10]):
        out_name = rf'c:\Users\Cliente\Documents\canchero app\chunk_{i}.js'
        with open(out_name, 'w', encoding='utf-8') as f:
            f.write(f"// SOURCE: {path}\n")
            f.write(content)
        print(f"Saved chunk_{i}.js ({size} bytes)")

find_script_js()
