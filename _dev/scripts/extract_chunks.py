import json
import os

log_path = r'C:\Users\Cliente\.gemini\antigravity\brain\05b1021d-be35-446d-b4ca-f59c6b4176a3\.system_generated\logs\overview.txt'
output_path = r'c:\Users\Cliente\Documents\canchero app\script_recovered_v2.js'

with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        if 'replace_file_content' in line and 'ReplacementContent' in line:
            try:
                # Find the largest ReplacementContent
                data = json.loads(line)
                if 'tool_calls' in data:
                    for call in data['tool_calls']:
                        if 'args' in call and 'ReplacementContent' in call['args']:
                            content = call['args']['ReplacementContent']
                            if len(content) > 10000: # Large enough to be a chunk
                                with open(output_path, 'a', encoding='utf-8') as out:
                                    out.write(f"\n--- CHUNK ---\n{content}\n")
            except:
                continue

print("Done extracting chunks.")
