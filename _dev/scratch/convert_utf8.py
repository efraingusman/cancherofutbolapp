import os

def convert_to_utf8(path):
    if not os.path.exists(path):
        print(f"{path} does not exist")
        return
    with open(path, 'rb') as f:
        data = f.read()
    
    # Try different encodings
    for encoding in ['utf-16', 'utf-16-le', 'utf-16-be', 'utf-8-sig', 'latin-1', 'cp1252']:
        try:
            text = data.decode(encoding)
            # Re-encode to clean utf-8
            with open(path, 'w', encoding='utf-8') as f:
                f.write(text)
            print(f"Successfully converted {path} using {encoding}")
            return
        except Exception:
            continue
    print(f"Failed to convert {path}")

convert_to_utf8(r"c:\Users\Cliente\Documents\canchero app\index.html")
convert_to_utf8(r"c:\Users\Cliente\Documents\canchero app\script.js")
convert_to_utf8(r"c:\Users\Cliente\Documents\canchero app\style.css")
