def check_html_balancing(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    stack = []
    for line_num, line in enumerate(lines, 1):
        # We want to find divs and sections
        # A simple scanner for tags
        import re
        tags = re.findall(r'<(/?[a-zA-Z0-9\-]+)(?:\s+[^>]*?)?>', line)
        for tag in tags:
            is_close = tag.startswith('/')
            name = tag.lstrip('/').lower()
            if name in ['div', 'section', 'main']:
                if is_close:
                    if not stack:
                        print(f"Error: Closed {name} at line {line_num} but stack is empty!")
                    else:
                        pop_name, pop_line = stack.pop()
                        if pop_name != name:
                            print(f"Mismatch: Closed {name} at line {line_num}, but expected {pop_name} (opened at line {pop_line})")
                else:
                    stack.append((name, line_num))
                    
    print("Remaining open tags in stack:")
    for name, line_num in stack:
        print(f"  {name} opened at line {line_num}")

check_html_balancing(r"c:\Users\Cliente\Documents\canchero app\index.html")
