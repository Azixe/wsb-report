// Global variables
let sidebarOpen = false;
let chartInstances = {};
const API_BASE = 'http://localhost:3002/api'; // Base URL for Express.js API calls (backend server)

// API Helper Functions
async function fetchAPI(endpoint, params = {}) {
    try {
        const url = new URL(`${API_BASE}/${endpoint}`);
        
        // Add additional parameters
        Object.keys(params).forEach(key => {
            url.searchParams.append(key, params[key]);
        });
        
        console.log('Fetching:', url.toString());
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API Response for', endpoint, ':', data);
        return data;
    } catch (error) {
        console.error('Fetch API Error:', error);
        
        // Check if it's a network error (server not running)
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
            showNotification('Server Express.js tidak berjalan. Pastikan server telah dijalankan dengan "npm start"', 'warning');
        } else {
            showNotification('Gagal mengambil data dari server: ' + error.message, 'error');
        }
        return null;
    }
}

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

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.querySelector('.login-btn');
    
    if (!username || !password) {
        showNotification('Username dan password harus diisi!', 'error');
        return;
    }
    
    // Show loading state
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
    loginBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Store login state
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('userLevel', data.user.level);
            localStorage.setItem('userName', data.user.nama);
            
            showNotification('Login berhasil! Mengalihkan ke dashboard...', 'success');
            
            // Redirect to dashboard after short delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            showNotification(data.message || 'Username atau password salah!', 'error');
            
            // Shake animation for error
            const loginCard = document.querySelector('.login-card');
            loginCard.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                loginCard.style.animation = '';
            }, 500);
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Gagal terhubung ke server. Pastikan server berjalan.', 'error');
    } finally {
        // Reset button
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
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
    initDateRange();
    loadDashboardData();
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
    
    // Revenue & Profit Chart
    const revenueProfitCtx = document.getElementById('revenueProfitChart');
    if (revenueProfitCtx) {
        chartInstances.revenueProfitChart = new Chart(revenueProfitCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Omset',
                    data: [],
                    backgroundColor: '#3498db',
                    borderColor: '#2980b9',
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false,
                }, {
                    label: 'Laba',
                    data: [],
                    backgroundColor: '#2ecc71',
                    borderColor: '#27ae60',
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false,
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
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': Rp ' + 
                                       new Intl.NumberFormat('id-ID').format(context.raw);
                            }
                        }
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
                                return 'Rp ' + new Intl.NumberFormat('id-ID', {
                                    notation: 'compact',
                                    compactDisplay: 'short'
                                }).format(value);
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
        
        // Load initial data for revenue profit chart
        loadRevenueProfitData();
    }
}

function updateUserInfo() {
    const username = localStorage.getItem('username');
    const userName = localStorage.getItem('userName');
    const userLevel = localStorage.getItem('userLevel');
    const userNameElement = document.querySelector('.user-name');
    
    if (userNameElement) {
        // Use nama if available, otherwise use username
        const displayName = userName || username;
        userNameElement.textContent = displayName || 'User';
    }
    
    // Update user level if there's an element for it
    const userLevelElement = document.querySelector('.user-level');
    if (userLevelElement) {
        userLevelElement.textContent = userLevel || 'User';
    }
}

function logout() {
    // Clear login state
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    localStorage.removeItem('userName');
    localStorage.removeItem('userLevel');
    
    showNotification('Logout berhasil', 'success');
    
    // Redirect to login page
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

function startRealTimeUpdates() {
    // Simulate real-time data updates every 30 seconds
    setInterval(() => {
        // Add any real-time update logic here if needed
        console.log('Real-time update check...');
    }, 30000);
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

function formatCurrency(value) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value);
}

// Functions to load and handle dashboard data
async function loadDashboardData(startDate = null, endDate = null) {
    try {
        console.log('Loading dashboard data...');
        showNotification('Memuat data dari database...', 'info');

        const params = {};
        if (startDate && endDate) {
            params.start_date = startDate;
            params.end_date = endDate;
        }
        
        // Load revenue profit data
        const stats = await fetchAPI('revenue-profit', params);
        
        console.log('Data loaded, updating UI...');
        
        // Update UI with real data or fallback
        updateStatsCards(stats);
        
        // Load initial revenue/profit data
        await loadRevenueProfitData(startDate, endDate);
        
        console.log('Dashboard data loading completed');
        showNotification('Data berhasil dimuat!', 'success');
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Menggunakan data demo karena: ' + error.message, 'warning');
    }
}

function updateStatsCards(stats) {
    console.log('Updating stats cards with:', stats);
    
    // Update revenue card (separate element)
    const revenueCard = document.querySelector('.revenue-card');
    if (revenueCard) {
        const revenueElement = revenueCard.querySelector('h3');
        if (revenueElement) {
            revenueElement.textContent = formatCurrency(stats?.total_revenue || 125450000);
        }
    }
    
    // Update other stat cards
    const statCards = document.querySelectorAll('.stats-grid .stat-card');
    
    if (statCards[0]) {
        const productsElement = statCards[0].querySelector('h3');
        if (productsElement) {
            productsElement.textContent = stats?.total_products || 0;
        }
    }
    
    if (statCards[1]) {
        const ordersElement = statCards[1].querySelector('h3');
        if (ordersElement) {
            ordersElement.textContent = stats?.today_orders || 0;
        }
    }
    
    if (statCards[2]) {
        const lowStockElement = statCards[2].querySelector('h3');
        if (lowStockElement) {
            lowStockElement.textContent = stats?.low_stock || 0;
        }
    }
}

function initDateRange() {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const applyBtn = document.getElementById('applyDateRange');
    
    if (startDateInput && endDateInput && applyBtn) {
        // Set default date range (last 7 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 7);
        
        startDateInput.value = startDate.toISOString().split('T')[0];
        endDateInput.value = endDate.toISOString().split('T')[0];
        
        // Add event listener for apply button
        applyBtn.addEventListener('click', function() {
            const start = startDateInput.value;
            const end = endDateInput.value;
            
            if (!start || !end) {
                showNotification('Pilih tanggal mulai dan selesai', 'warning');
                return;
            }
            
            if (new Date(start) > new Date(end)) {
                showNotification('Tanggal mulai tidak boleh lebih besar dari tanggal selesai', 'error');
                return;
            }
            
            loadDashboardData(start, end);
            loadRevenueProfitData(start, end);
            loadRevenueProfitDataTabels(start, end);
            showNotification(`Memuat data dari ${start} sampai ${end}`, 'info');
        });
        
        // Add enter key support
        [startDateInput, endDateInput].forEach(input => {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    applyBtn.click();
                }
            });
        });
    }
}

// Revenue & Profit Data Functions
async function loadRevenueProfitData(startDate = null, endDate = null) {
    try {
        const params = {};
        
        if (startDate && endDate) {
            params.start_date = startDate;
            params.end_date = endDate;
            console.log('Loading revenue profit data for date range:', startDate, 'to', endDate);
        } else {
            console.log('Loading revenue profit data with default date range');
        }
        
        const data = await fetchAPI('revenue-profit', params);
        
        if (data && (data.labels || Array.isArray(data))) {
            console.log('Received revenue profit data:', data);
            updateRevenueProfitChart(data);
        } else {
            console.log('No valid revenue profit data received, using fallback');
            // You can add fallback data here if needed
        }
    } catch (error) {
        console.error('Error loading revenue profit data:', error);
        showNotification('Gagal memuat data chart Omset & Laba', 'error');
    }
}

function updateRevenueProfitChart(data) {
    const chart = chartInstances.revenueProfitChart;
    if (!chart) return;
    
    let labels, revenueData, profitData;
    
    // Handle different data formats
    if (data.labels && data.omset && data.laba) {
        // API response format
        labels = data.labels;
        revenueData = data.omset.map(val => parseFloat(val || 0));
        profitData = data.laba.map(val => parseFloat(val || 0));
    } else if (Array.isArray(data)) {
        // Fallback array format
        labels = data.map(item => {
            if (item.date) {
                const date = new Date(item.date);
                return date.toLocaleDateString('id-ID', { 
                    month: 'short', 
                    day: 'numeric' 
                });
            }
            return item.period || item.label || 'N/A';
        });
        revenueData = data.map(item => parseFloat(item.revenue || item.omset || 0));
        profitData = data.map(item => parseFloat(item.profit || item.laba || 0));
    } else {
        console.error('Invalid data format for revenue profit chart:', data);
        return;
    }
    
    // Update chart data
    chart.data.labels = labels;
    chart.data.datasets[0].data = revenueData;
    chart.data.datasets[1].data = profitData;
    
    chart.update('active');
    
    console.log('Revenue profit chart updated with data:', { labels, revenueData, profitData });
}

async function loadRevenueProfitDataTabels(startDate = null, endDate = null) {
    try {
        const params = {};
        
        if (startDate && endDate) {
            params.start_date = startDate;
            params.end_date = endDate;
            console.log('Loading revenue profit table data for date range:', startDate, 'to', endDate);
        } else {
            console.log('Loading revenue profit table data with default date range');
        }

        const data = await fetchAPI('revenue-profit', params);
        
        if (!data || !data.labels) {
            throw new Error('Invalid data format received');
        }

        const tableBody = document.querySelector('#RevenueProfitTable tbody');
        tableBody.innerHTML = '';

        data.labels.forEach((bulan, index) => {
            const omset = data.omset[index] || 0;
            const laba = data.laba[index] || 0;
            const nota = data.jumlah_nota[index] || 0;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${bulan}</td>
                <td>${formatCurrency(omset)}</td>
                <td>${formatCurrency(laba)}</td>
                <td>${nota}</td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (error) {
        console.error('Gagal mengambil data omset & laba:', error);
        const tableBody = document.querySelector('#RevenueProfitTable tbody');
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Gagal memuat data. Silahkan coba lagi nanti.</td></tr>';
    }
}

// Utility Functions
function showNotification(message, type = 'info') {
    console.log('Showing notification:', message, 'Type:', type);
    
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
        left: 50%;
        transform: translateX(-50%);
        background: ${getNotificationColor(type)};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        z-index: 99999;
        min-width: 320px;
        max-width: 500px;
        animation: slideInDown 0.3s ease-out;
        border: 2px solid rgba(255, 255, 255, 0.2);
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 14px;
        font-weight: 500;
    `;
    
    // Responsive positioning for mobile
    if (window.innerWidth <= 768) {
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 15px;
            right: 15px;
            transform: none;
            background: ${getNotificationColor(type)};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
            z-index: 99999;
            animation: slideInDown 0.3s ease-out;
            border: 2px solid rgba(255, 255, 255, 0.2);
            font-family: 'Inter', system-ui, sans-serif;
            font-size: 14px;
            font-weight: 500;
        `;
    }
    
    // Add notification to page
    document.body.appendChild(notification);
    console.log('Notification added to body:', notification);
    
    // Force a reflow to ensure the notification is rendered
    notification.offsetHeight;
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutUp 0.3s ease-in';
            setTimeout(() => {
                notification.remove();
                console.log('Notification removed');
            }, 300);
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

// Search functionality (placeholder for future use)
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
    @keyframes slideInDown {
        from { 
            transform: translateX(-50%) translateY(-100%); 
            opacity: 0; 
        }
        to { 
            transform: translateX(-50%) translateY(0); 
            opacity: 1; 
        }
    }
    
    @keyframes slideOutUp {
        from { 
            transform: translateX(-50%) translateY(0); 
            opacity: 1; 
        }
        to { 
            transform: translateX(-50%) translateY(-100%); 
            opacity: 0; 
        }
    }
    
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
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .notification-close:hover {
        opacity: 1;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 50%;
    }
    
    /* Make sure notification is on top of everything */
    .notification {
        position: fixed !important;
        z-index: 999999 !important;
    }
    
    /* Mobile specific animations */
    @media (max-width: 768px) {
        @keyframes slideInDown {
            from { 
                transform: translateY(-100%); 
                opacity: 0; 
            }
            to { 
                transform: translateY(0); 
                opacity: 1; 
            }
        }
        
        @keyframes slideOutUp {
            from { 
                transform: translateY(0); 
                opacity: 1; 
            }
            to { 
                transform: translateY(-100%); 
                opacity: 0; 
            }
        }
    }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize search functionality (if needed in future)
    initSearch();
    
    // Load initial revenue profit table data
    loadRevenueProfitDataTabels();
});
