def find_unclosed_in_club_gestion(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    stack = []
    in_gestion = False
    
    for idx, line in enumerate(lines):
        line_num = idx + 1
        
        # Simple scanner for HTML tags
        import re
        tags = re.findall(r'<(/?[a-zA-Z0-9\-]+)(?:\s+[^>]*?)?>', line)
        for tag in tags:
            is_close = tag.startswith('/')
            name = tag.lstrip('/').lower()
            if name in ['div', 'section', 'main']:
                if not is_close:
                    if 'id="jugador-club-gestion"' in line:
                        in_gestion = True
                        print(f"Entering jugador-club-gestion at line {line_num}")
                        stack = [] # Reset stack to trace this section
                    if in_gestion:
                        stack.append((name, line_num))
                else:
                    if in_gestion:
                        if stack:
                            pop_name, pop_line = stack.pop()
                            if len(stack) == 0 and pop_name == 'div' and pop_line == 938:
                                print(f"jugador-club-gestion closed correctly at line {line_num}!")
                                in_gestion = False
                        else:
                            print(f"Error: Closed tag under gestion at line {line_num} but stack is empty!")

find_unclosed_in_club_gestion(r"c:\Users\Cliente\Documents\canchero app\index.html")
