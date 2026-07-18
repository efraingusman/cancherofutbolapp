import os

path = r'c:\Users\Cliente\Documents\canchero app\script.js'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix the broken part at the end
# We need to find where the corruption starts.
# Line 1000 is window.openEditProfile = function() {
# But it was already defined at line 806.

new_lines = []
for i, line in enumerate(lines):
    if i >= 999: # Line 1000 (0-indexed)
        break
    new_lines.append(line)

# Now we close the init3DCardTilt properly (which started at 976)
# Let's check where it was at 998
# 998:                     duration: 0.5,
# 999:                     ease: 'power2.out'

# Wait, init3DCardTilt starts at 976.
# 983: container.addEventListener('mousemove', (e) => {
# 995: gsap.to(wrapper, {

# I'll rewrite init3DCardTilt completely from 976 to the end of my fixed block.

final_lines = []
for i, line in enumerate(lines):
    if i == 975: # Line 976
        break
    final_lines.append(line)

final_lines.append("""function init3DCardTilt() {
    const containers = document.querySelectorAll('.fut-card-3d-container');
    
    containers.forEach(container => {
        const wrapper = container.querySelector('.fut-card-wrapper') || container.querySelector('.mini-fut-wrapper');
        if (!wrapper) return;
        
        container.addEventListener('mousemove', (e) => {
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;
            
            if (typeof gsap !== 'undefined') {
                gsap.to(wrapper, {
                    rotateX: rotateX,
                    rotateY: rotateY,
                    duration: 0.5,
                    ease: 'power2.out'
                });
            }
        });
        
        container.addEventListener('mouseleave', () => {
            if (typeof gsap !== 'undefined') {
                gsap.to(wrapper, {
                    rotateX: 0,
                    rotateY: 0,
                    duration: 0.5,
                    ease: 'power2.out'
                });
            }
        });
    });
}
""")

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(final_lines)

print("Fixed script.js syntax.")
