import re

with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

# Let's find the view-admin section starting and ending
start_idx = text.find('id="view-admin"')
if start_idx != -1:
    # Find the section start tag before the id
    tag_start = text.rfind('<section', 0, start_idx)
    # Find the closing </section> tag
    # Since there might be nested sections/divs, let's match carefully. Or just take 50 lines.
    print("view-admin content:")
    print(text[tag_start:tag_start+5000])

start_club = text.find('id="view-club"')
if start_club != -1:
    tag_start = text.rfind('<section', 0, start_club)
    print("\n\nview-club content:")
    print(text[tag_start:tag_start+5000])
