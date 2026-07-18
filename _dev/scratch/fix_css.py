import os

def append_css():
    path = r"c:\Users\Cliente\Documents\canchero app\style.css"
    with open(path, 'a', encoding='utf-8') as f:
        f.write("\n\n/* Mobile Optimization for Identity Editor */\n")
        f.write("@media (max-width: 768px) {\n")
        f.write("    .identity-editor-layout {\n")
        f.write("        flex-direction: column-reverse !important;\n")
        f.write("    }\n")
        f.write("    .identity-preview-sidebar {\n")
        f.write("        position: relative !important;\n")
        f.write("        top: 0 !important;\n")
        f.write("        width: 100% !important;\n")
        f.write("        margin-bottom: 20px;\n")
        f.write("    }\n")
        f.write("    .identity-controls {\n")
        f.write("        width: 100% !important;\n")
        f.write("        min-width: unset !important;\n")
        f.write("    }\n")
        f.write("}\n")
    print("style.css updated for mobile.")

append_css()
