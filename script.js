// Global variables
let sidebarOpen = false;
let chartInstances = {};

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on login page or dashboard
    if (document.querySelector('.login-page')) {
        initLoginPage();
    } else if (document.querySelector('.dashboard-page')) {
        initDashboard();
    }
});

// Login Page Functions
function initLoginPage() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Add animation to login card
    const loginCard = document.querySelector('.login-card');
    if (loginCard) {
        loginCard.classList.add('fade-in');
    }
}

function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.querySelector('.login-btn');
    
    // Simple validation (in real app, this would be server-side)
    if (username === 'admin' && password === 'admin123') {
        // Show loading state
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
        loginBtn.disabled = true;
        
        // Simulate login delay
        setTimeout(() => {
            // Store login state (in real app, use proper session management)
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('username', username);
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        }, 1500);
    } else {
        showNotification('Username atau password salah!', 'error');
        
        // Shake animation for error
        const loginCard = document.querySelector('.login-card');
        loginCard.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            loginCard.style.animation = '';
        }, 500);
    }
}

function togglePassword() {
    const passwordInput = document.getElementById('password');
    const passwordIcon = document.getElementById('passwordIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        passwordIcon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        passwordIcon.className = 'fas fa-eye';
    }
}

// Dashboard Functions
function initDashboard() {
    // Check if user is logged in
    if (!localStorage.getItem('isLoggedIn')) {
        window.location.href = 'index.html';
        return;
    }
    
    // Initialize dashboard components
    initSidebar();
    initCharts();
    updateUserInfo();
    startRealTimeUpdates();
    
    // Add animations
    animateElements();
}

function initSidebar() {
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const menuItems = document.querySelectorAll('.menu-item a');
    
    // Sidebar toggle for mobile
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            sidebarOpen = !sidebarOpen;
        });
    }
    
    // Menu item interactions
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all items
            document.querySelectorAll('.menu-item').forEach(mi => mi.classList.remove('active'));
            
            // Add active class to clicked item
            item.parentElement.classList.add('active');
            
            // Close sidebar on mobile after selection
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
                sidebarOpen = false;
            }
            
            // You can add navigation logic here
            showNotification(`Navigasi ke ${item.querySelector('span').textContent}`, 'info');
        });
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebarOpen && 
            !sidebar.contains(e.target) && 
            !sidebarToggle.contains(e.target)) {
            sidebar.classList.remove('active');
            sidebarOpen = false;
        }
    });
}

function initCharts() {
    // Destroy existing charts to prevent memory leaks and height issues
    Object.values(chartInstances).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    chartInstances = {};
    
    // Sales Chart
    const salesCtx = document.getElementById('salesChart');
    if (salesCtx) {
        chartInstances.salesChart = new Chart(salesCtx, {
            type: 'line',
            data: {
                labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
                datasets: [{
                    label: 'Penjualan (Juta Rp)',
                    data: [12, 19, 15, 25, 22, 18, 20],
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#3498db',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return 'Rp ' + value + 'M';
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                elements: {
                    point: {
                        hoverBackgroundColor: '#2980b9'
                    }
                }
            }
        });
    }
    
    // Category Chart
    const categoryCtx = document.getElementById('categoryChart');
    if (categoryCtx) {
        chartInstances.categoryChart = new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: ['Elektronik', 'Fashion', 'Aksesoris', 'Olahraga', 'Lainnya'],
                datasets: [{
                    data: [35, 25, 20, 15, 5],
                    backgroundColor: [
                        '#3498db',
                        '#2ecc71',
                        '#f39c12',
                        '#e74c3c',
                        '#9b59b6'
                    ],
                    borderWidth: 0,
                    hoverBorderWidth: 2,
                    hoverBorderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }
    
    // Monthly Comparison Chart
    const monthlyCtx = document.getElementById('monthlyChart');
    if (monthlyCtx) {
        chartInstances.monthlyChart = new Chart(monthlyCtx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
                datasets: [{
                    label: 'Bulan Ini',
                    data: [120, 150, 180, 200, 170, 190],
                    backgroundColor: '#3498db',
                }, {
                    label: 'Bulan Lalu',
                    data: [100, 130, 160, 180, 160, 170],
                    backgroundColor: '#95a5a6',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return 'Rp ' + value + 'M';
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    // Top Products Chart
    const topProductsCtx = document.getElementById('topProductsChart');
    if (topProductsCtx) {
        chartInstances.topProductsChart = new Chart(topProductsCtx, {
            type: 'bar',
            data: {
                labels: ['Headphone', 'Sepatu', 'Kemeja', 'Smartphone Case', 'Tas Ransel'],
                datasets: [{
                    label: 'Penjualan',
                    data: [157, 134, 112, 98, 76],
                    backgroundColor: ['#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6'],
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true
                    },
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // Stock Analysis Chart
    const stockCtx = document.getElementById('stockAnalysisChart');
    if (stockCtx) {
        chartInstances.stockChart = new Chart(stockCtx, {
            type: 'pie',
            data: {
                labels: ['Stok Normal', 'Stok Menipis', 'Stok Habis', 'Overstock'],
                datasets: [{
                    data: [60, 25, 10, 5],
                    backgroundColor: ['#2ecc71', '#f39c12', '#e74c3c', '#3498db']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    }
    
    // Sales period change handler
    const salesPeriod = document.getElementById('salesPeriod');
    if (salesPeriod) {
        salesPeriod.addEventListener('change', (e) => {
            showNotification(`Periode laporan diubah ke: ${e.target.options[e.target.selectedIndex].text}`, 'info');
            // Here you would typically update the chart data
        });
    }
    
    // Monthly comparison change handler
    const monthlyComparison = document.getElementById('monthlyComparison');
    if (monthlyComparison) {
        monthlyComparison.addEventListener('change', (e) => {
            showNotification(`Tampilan diubah ke: ${e.target.options[e.target.selectedIndex].text}`, 'info');
        });
    }
}

function updateUserInfo() {
    const username = localStorage.getItem('username');
    const userNameElement = document.querySelector('.user-name');
    
    if (userNameElement && username) {
        userNameElement.textContent = username;
    }
}

function startRealTimeUpdates() {
    // Simulate real-time data updates
    setInterval(() => {
        updateNotificationBadge();
        updateStockAlerts();
    }, 30000); // Update every 30 seconds
}

function updateNotificationBadge() {
    const badge = document.querySelector('.notification-badge');
    if (badge) {
        const currentCount = parseInt(badge.textContent);
        const newCount = Math.max(0, currentCount + Math.floor(Math.random() * 3) - 1);
        badge.textContent = newCount;
        
        if (newCount === 0) {
            badge.style.display = 'none';
        } else {
            badge.style.display = 'block';
        }
    }
}

function updateStockAlerts() {
    const stockCard = document.querySelector('.stat-icon.stock').parentElement;
    const stockCount = stockCard.querySelector('h3');
    const currentStock = parseInt(stockCount.textContent);
    const newStock = Math.max(0, currentStock + Math.floor(Math.random() * 5) - 2);
    
    stockCount.textContent = newStock;
    
    if (newStock > 50) {
        stockCard.querySelector('.stat-change').textContent = 'Normal';
        stockCard.querySelector('.stat-change').className = 'stat-change positive';
    } else if (newStock > 20) {
        stockCard.querySelector('.stat-change').textContent = 'Perlu Perhatian';
        stockCard.querySelector('.stat-change').className = 'stat-change neutral';
    } else {
        stockCard.querySelector('.stat-change').textContent = 'Kritis';
        stockCard.querySelector('.stat-change').className = 'stat-change negative';
    }
}

function animateElements() {
    // Animate stats cards
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('fade-in');
        }, index * 100);
    });
    
    // Animate tables
    const tableContainers = document.querySelectorAll('.table-container');
    tableContainers.forEach((table, index) => {
        setTimeout(() => {
            table.classList.add('fade-in');
        }, 500 + index * 200);
    });
}

// Utility Functions
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${getNotificationIcon(type)}"></i>
        <span>${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add notification styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        min-width: 300px;
        animation: slideInRight 0.3s ease-out;
    `;
    
    // Add notification to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

function getNotificationColor(type) {
    switch (type) {
        case 'success': return '#27ae60';
        case 'error': return '#e74c3c';
        case 'warning': return '#f39c12';
        default: return '#3498db';
    }
}

// Search functionality
function initSearch() {
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            
            if (query.length > 2) {
                // Simulate search results
                setTimeout(() => {
                    showNotification(`Mencari: "${query}"`, 'info');
                }, 300);
            }
        });
    }
}

// Handle logout
function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    showNotification('Berhasil keluar', 'success');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// Responsive handling
function handleResize() {
    const sidebar = document.querySelector('.sidebar');
    
    if (window.innerWidth > 768) {
        sidebar.classList.remove('active');
        sidebarOpen = false;
    }
}

window.addEventListener('resize', handleResize);

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        opacity: 0.7;
        transition: opacity 0.3s ease;
    }
    
    .notification-close:hover {
        opacity: 1;
    }
`;
document.head.appendChild(style);

// Initialize search when DOM is ready
document.addEventListener('DOMContentLoaded', initSearch);

// Export functionality
function showExportOptions() {
    const exportModal = `
        <div class="export-modal" onclick="closeExportModal(event)">
            <div class="export-content">
                <div class="export-header">
                    <h3>Export Laporan</h3>
                    <button onclick="closeExportModal()" class="close-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="export-options">
                    <div class="export-option" onclick="exportReport('pdf')">
                        <i class="fas fa-file-pdf"></i>
                        <div>
                            <h4>PDF Report</h4>
                            <p>Ekspor laporan dalam format PDF</p>
                        </div>
                    </div>
                    <div class="export-option" onclick="exportReport('excel')">
                        <i class="fas fa-file-excel"></i>
                        <div>
                            <h4>Excel Spreadsheet</h4>
                            <p>Ekspor data dalam format Excel</p>
                        </div>
                    </div>
                    <div class="export-option" onclick="exportReport('csv')">
                        <i class="fas fa-file-csv"></i>
                        <div>
                            <h4>CSV Data</h4>
                            <p>Ekspor data mentah dalam format CSV</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', exportModal);
}

function closeExportModal(event) {
    if (!event || event.target.classList.contains('export-modal') || event.target.classList.contains('close-btn') || event.target.classList.contains('fa-times')) {
        const modal = document.querySelector('.export-modal');
        if (modal) {
            modal.remove();
        }
    }
}

function exportReport(format) {
    closeExportModal();
    
    const formatNames = {
        'pdf': 'PDF',
        'excel': 'Excel',
        'csv': 'CSV'
    };
    
    showNotification(`Mengekspor laporan dalam format ${formatNames[format]}...`, 'info');
    
    // Simulate export process
    setTimeout(() => {
        showNotification(`Laporan ${formatNames[format]} berhasil diunduh!`, 'success');
    }, 2000);
}
