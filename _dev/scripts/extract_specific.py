import json

log_path = r'C:\Users\Cliente\.gemini\antigravity\brain\05b1021d-be35-446d-b4ca-f59c6b4176a3\.system_generated\logs\overview.txt'

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        if 'switchClubGestionTab' in line:
            try:
                data = json.loads(line)
                print(f"Step {data.get('step_index')}")
                # Print the tool call or response
                if 'tool_calls' in data:
                    for call in data['tool_calls']:
                        if 'ReplacementContent' in str(call):
                            print("FOUND IN TOOL CALL ARGS")
                            # Extract the replacement content
                            # We can just print the whole call if it's not too big
                            print(json.dumps(call, indent=2))
                if 'tool_outputs' in data:
                    print("FOUND IN TOOL OUTPUT")
            except:
                continue
