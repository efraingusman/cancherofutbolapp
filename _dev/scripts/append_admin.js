const fs = require('fs');

const adminLogic = `
// ============================================================
// ADMIN CRM LOGIC
// ============================================================
window.switchAdminTab = function(tabId, el) {
    const section = document.getElementById('view-admin');
    if(!section) return;

    section.querySelectorAll('.admin-tab-content').forEach(tab => {
        tab.style.display = 'none';
    });

    const target = document.getElementById('admin-' + tabId);
    if(target) target.style.display = 'block';

    if (el) {
        section.querySelectorAll('.sidebar-menu .menu-item').forEach(item => item.classList.remove('active'));
        el.classList.add('active');
    }
};

let adminRevenueChartInstance = null;

window.renderAdminDashboard = function() {
    // Generate fake stats or read from simulated DB
    const allUsers = Object.keys(localStorage).filter(k => k.startsWith('canchero_user_') || k === 'canchero_user');
    
    document.getElementById('admin-stat-comp').innerText = "5"; // Mock
    document.getElementById('admin-stat-jug').innerText = "120"; // Mock
    document.getElementById('admin-stat-mrr').innerText = "$1,500"; // Mock

    // Render complexes
    const compList = document.getElementById('admin-complex-list');
    if(compList) {
        compList.innerHTML = \`
            <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h4 style="margin:0; color:var(--accent);">Maracaná F5</h4>
                    <span style="font-size:12px; color:#888;">Dueño: Carlos Silva - RUT: 219999990012</span>
                </div>
                <div>
                    <button class="btn btn-primary btn-sm">APROBAR</button>
                    <button class="btn btn-glass btn-sm" style="color:#ff4444; border-color:#ff4444;">RECHAZAR</button>
                </div>
            </div>
        \`;
    }

    // Chart.js
    const ctx = document.getElementById('adminRevenueChart');
    if(ctx) {
        if(adminRevenueChartInstance) adminRevenueChartInstance.destroy();
        adminRevenueChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
                datasets: [{
                    label: 'Ingresos MRR ($)',
                    data: [200, 400, 800, 1000, 1200, 1500],
                    borderColor: '#baff00',
                    backgroundColor: 'rgba(186, 255, 0, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { 
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }
};
`;

fs.appendFileSync('c:/Users/Cliente/Documents/canchero app/script.js', adminLogic);
console.log('Appended admin logic successfully');
