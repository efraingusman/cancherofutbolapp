def trace_divs(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    stack = []
    
    for idx in range(1315, 1420):
        line = lines[idx]
        line_num = idx + 1
        import re
        tags = re.findall(r'<(/?[a-zA-Z0-9\-]+)(?:\s+[^>]*?)?>', line)
        for tag in tags:
            name = tag.lstrip('/').lower()
            if name == 'div':
                if not tag.startswith('/'):
                    id_match = re.search(r'id=["\'](.*?)["\']', line)
                    id_str = f' (id={id_match.group(1)})' if id_match else ''
                    print(f"Line {line_num}: Open div{id_str}")
                    stack.append((line_num, id_str))
                else:
                    if stack:
                        pop_line, pop_id = stack.pop()
                        print(f"Line {line_num}: Close div (opened at {pop_line}{pop_id})")
                    else:
                        print(f"Line {line_num}: Close div ERROR - Stack empty!")
    
    print(f"Final stack: {stack}")

trace_divs(r"c:\Users\Cliente\Documents\canchero app\index.html")
