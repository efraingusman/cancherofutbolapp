def trace_all(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    stack = []
    
    for idx in range(235, 1600):
        line = lines[idx]
        line_num = idx + 1
        import re
        tags = re.findall(r'<(/?[a-zA-Z0-9\-]+)(?:\s+[^>]*?)?>', line)
        for tag in tags:
            name = tag.lstrip('/').lower()
            if name in ['div', 'section', 'main']:
                if not tag.startswith('/'):
                    id_match = re.search(r'id=["\'](.*?)["\']', line)
                    id_str = f' (id={id_match.group(1)})' if id_match else ''
                    class_match = re.search(r'class=["\'](.*?)["\']', line)
                    class_str = f' (class={class_match.group(1)})' if class_match else ''
                    stack.append((name, line_num, f"{id_str}{class_str}"))
                else:
                    if stack:
                        pop_name, pop_line, pop_attrs = stack.pop()
                        if pop_name != name:
                            print(f"Line {line_num}: ERROR! Tried to close {name}, but top of stack is {pop_name} (from line {pop_line})")
                    else:
                        print(f"Line {line_num}: Close {name} ERROR - Stack empty!")
    
    print("Unclosed tags at the end of view-jugador:")
    for tag in stack:
        print(f"  {tag[0]} opened at line {tag[1]}{tag[2]}")

trace_all(r"c:\Users\Cliente\Documents\canchero app\index.html")
