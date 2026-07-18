import re

def fix_depts():
    path = r"c:\Users\Cliente\Documents\canchero app\index.html"
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    depts = [
        "Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno", 
        "Flores", "Florida", "Lavalleja", "Maldonado", "Montevideo", 
        "Paysandú", "Río Negro", "Rivera", "Rocha", "Salto", 
        "San José", "Soriano", "Tacuarembó", "Treinta y Tres"
    ]
    
    # Simple options
    simple_opts = "\n".join([f"                                      <option>{d}</option>" for d in depts])
    
    # Value options
    value_opts = "\n".join([f"                      <option value=\"{d}, Uruguay\">{d}</option>" for d in depts])

    # Replace the blocks. The simple ones look like:
    # <option>Montevideo</option>...<option>Paysandú</option>
    
    simple_regex = re.compile(r'<option>Montevideo</option>\s*<option>Canelones</option>\s*<option>Maldonado</option>\s*<option>Salto</option>\s*<option>Paysand[^<]*</option>')
    content = simple_regex.sub(simple_opts.strip(), content)

    value_regex = re.compile(r'<option value="Montevideo, Uruguay">Montevideo</option>\s*<option value="Canelones, Uruguay">Canelones</option>\s*<option value="Maldonado, Uruguay">Maldonado</option>\s*<option value="Salto, Uruguay">Salto</option>\s*<option value="Paysand[^<]*, Uruguay">Paysand[^<]*</option>')
    content = value_regex.sub(value_opts.strip(), content)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
        print("Departments updated.")

fix_depts()
