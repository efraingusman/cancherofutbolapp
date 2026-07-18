import json
import os

log_path = r'C:\Users\Cliente\.gemini\antigravity\brain\05b1021d-be35-446d-b4ca-f59c6b4176a3\.system_generated\logs\overview.txt'

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            content = str(data)
            # Look for lines like "150: " or "961: " which indicate view_file output
            if "150:" in content or "961:" in content or "709:" in content:
                print(f"--- STEP {data.get('step_index')} ({data.get('type')}) ---")
                if 'content' in data:
                    print(data['content'])
                elif 'tool_outputs' in data:
                    for out in data['tool_outputs']:
                        if 'content' in out:
                            print(out['content'])
                        elif 'output' in out:
                            print(out['output'])
                print("=" * 80)
        except:
            continue
