def check_gestion_perfil(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    stack = []
    in_perfil = False
    
    for idx in range(1370, 1420):
        line = lines[idx]
        line_num = idx + 1
        import re
        tags = re.findall(r'<(/?[a-zA-Z0-9\-]+)(?:\s+[^>]*?)?>', line)
        for tag in tags:
            name = tag.lstrip('/').lower()
            if name == 'div':
                if not tag.startswith('/'):
                    if 'id="gestion-perfil"' in line:
                        in_perfil = True
                    if in_perfil:
                        stack.append(line_num)
                else:
                    if in_perfil:
                        if stack:
                            stack.pop()
                            if len(stack) == 0:
                                print(f"gestion-perfil closed at line {line_num}")
                                return
                        else:
                            print(f"Error at {line_num}: Extra closing div!")
    
    print(f"gestion-perfil NEVER CLOSED! Unclosed divs opened at: {stack}")

check_gestion_perfil(r"c:\Users\Cliente\Documents\canchero app\index.html")
