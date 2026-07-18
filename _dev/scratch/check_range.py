def print_tags_range(filepath, start_line, end_line):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    for i in range(start_line - 1, end_line):
        line = lines[i]
        line_num = i + 1
        if '<' in line:
            import re
            tags = re.findall(r'<(/?[a-zA-Z0-9\-]+)(?:\s+[^>]*?)?>', line)
            # Check if opening tag with ID
            for tag in tags:
                if not tag.startswith('/'):
                    # Search for id attribute
                    id_match = re.search(r'id=["\'](.*?)["\']', line)
                    id_str = f' id="{id_match.group(1)}"' if id_match else ''
                    class_match = re.search(r'class=["\'](.*?)["\']', line)
                    class_str = f' class="{class_match.group(1)}"' if class_match else ''
                    print(f"Line {line_num}: <{tag}{id_str}{class_str}>")

print_tags_range(r"c:\Users\Cliente\Documents\canchero app\index.html", 1310, 1420)
