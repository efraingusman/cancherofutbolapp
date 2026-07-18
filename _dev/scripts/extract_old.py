import os

log_path = r'C:\Users\Cliente\.gemini\antigravity\brain\909e89ae-52f9-4bf6-affc-54634458cf22\.system_generated\logs\overview.txt'

with open(log_path, 'r', encoding='utf-8') as f:
    content = f.read()
    
search_str = 'window.updateCityOptions = function()'
idx = content.find(search_str)
if idx != -1:
    print("FOUND!")
    # Read until the end of the string (roughly)
    print(content[idx:idx+5000])
else:
    print("NOT FOUND")
