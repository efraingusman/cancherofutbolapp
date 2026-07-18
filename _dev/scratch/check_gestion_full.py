def check_gestion(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    stack = []
    in_gestion = False
    
    for idx in range(930, 1420):
        line = lines[idx]
        line_num = idx + 1
        import re
        tags = re.findall(r'<(/?[a-zA-Z0-9\-]+)(?:\s+[^>]*?)?>', line)
        for tag in tags:
            name = tag.lstrip('/').lower()
            if name == 'div':
                if not tag.startswith('/'):
                    if 'id="jugador-club-gestion"' in line:
                        in_gestion = True
                    if in_gestion:
                        stack.append(line_num)
                else:
                    if in_gestion:
                        if stack:
                            stack.pop()
                            if len(stack) == 0:
                                print(f"jugador-club-gestion closed at line {line_num}")
                                return
                        else:
                            print(f"Error at {line_num}: Extra closing div!")
    
    print(f"jugador-club-gestion NEVER CLOSED! Unclosed divs opened at: {stack}")

check_gestion(r"c:\Users\Cliente\Documents\canchero app\index.html")
