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
        initProductsSection();
        initNavigation();
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
    initCategoryControls();
    loadDashboardData();
    loadCategories();
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
            // Navigation logic can be added here in the future
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
    
    // Force canvas height before creating charts
    const revenueProfitCanvas = document.getElementById('revenueProfitChart');
    if (revenueProfitCanvas) {
        revenueProfitCanvas.style.height = '480px';
        revenueProfitCanvas.style.maxHeight = '480px';
        revenueProfitCanvas.style.minHeight = '480px';
    }
    
    const categorySalesCanvas = document.getElementById('categorySalesChart');
    if (categorySalesCanvas) {
        categorySalesCanvas.style.height = '480px';
        categorySalesCanvas.style.maxHeight = '480px';
        categorySalesCanvas.style.minHeight = '480px';
    }
    
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
    
    // Category Sales Chart
    const categorySalesCtx = document.getElementById('categorySalesChart');
    if (categorySalesCtx) {
        chartInstances.categorySalesChart = new Chart(categorySalesCtx, {
            type: 'pie',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#3498db', '#e74c3c', '#2ecc71', '#f39c12', 
                        '#9b59b6', '#1abc9c', '#34495e', '#e67e22'
                    ],
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 11,
                                weight: '500'
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = 'Qty: ' + new Intl.NumberFormat('id-ID').format(context.raw);
                                return label + ' - ' + value;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Overview Category Chart - Pie Chart for Category Sales Summary
    const overviewCategoryCtx = document.getElementById('overviewCategoryChart');
    if (overviewCategoryCtx) {
        chartInstances.overviewCategoryChart = new Chart(overviewCategoryCtx, {
            type: 'pie',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#3498db', '#e74c3c', '#2ecc71', '#f39c12', 
                        '#9b59b6', '#1abc9c', '#34495e', '#e67e22',
                        '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'
                    ],
                    borderColor: '#fff',
                    borderWidth: 3,
                    hoverBorderWidth: 4,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // Legend ditampilkan manual di HTML
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#fff',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = formatCurrency(context.raw);
                                const percentage = context.dataset.data.length > 0 ? 
                                    ((context.raw / context.dataset.data.reduce((a, b) => a + b, 0)) * 100).toFixed(1) : 0;
                                return [
                                    `${label}`,
                                    `Omset: ${value}`,
                                    `Persentase: ${percentage}%`
                                ];
                            }
                        }
                    }
                },
                elements: {
                    arc: {
                        borderJoinStyle: 'round'
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1000
                }
            }
        });
        
        // Load initial overview data
        loadOverviewCategoryData();
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

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Currency formatting function
function formatCurrency(amount) {
    if (amount === null || amount === undefined) return 'Rp 0';
    
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Number formatting function
function formatNumber(number) {
    if (number === null || number === undefined) return '0';
    
    return new Intl.NumberFormat('id-ID').format(number);
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
            revenueElement.textContent = formatCurrency(stats?.total_revenue || 0);
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
    
    // Initialize overview date range controls
    initOverviewDateRange();
}

function initOverviewDateRange() {
    const overviewStartDate = document.getElementById('overviewStartDate');
    const overviewEndDate = document.getElementById('overviewEndDate');
    const applyOverviewBtn = document.getElementById('applyOverviewDateRange');
    
    if (overviewStartDate && overviewEndDate && applyOverviewBtn) {
        // Set default date range (last 30 days for overview)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);
        
        overviewStartDate.value = startDate.toISOString().split('T')[0];
        overviewEndDate.value = endDate.toISOString().split('T')[0];
        
        // Add event listener for apply button
        applyOverviewBtn.addEventListener('click', function() {
            const start = overviewStartDate.value;
            const end = overviewEndDate.value;
            
            if (!start || !end) {
                showNotification('Pilih tanggal mulai dan selesai untuk overview', 'warning');
                return;
            }
            
            if (new Date(start) > new Date(end)) {
                showNotification('Tanggal mulai tidak boleh lebih besar dari tanggal selesai', 'error');
                return;
            }
            
            loadOverviewCategoryData(start, end);
            showNotification(`Memuat data overview dari ${start} sampai ${end}`, 'info');
        });
        
        // Add enter key support
        [overviewStartDate, overviewEndDate].forEach(input => {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    applyOverviewBtn.click();
                }
            });
        });
    }
}

// Overview Category Data Functions - BACKEND TERHUBUNG
async function loadOverviewCategoryData(startDate = null, endDate = null) {
    try {
        const params = {};
        
        if (startDate && endDate) {
            params.start_date = startDate;
            params.end_date = endDate;
            console.log('Loading overview category data for date range:', startDate, 'to', endDate);
        } else {
            console.log('Loading overview category data with default date range (last 30 days)');
        }
        
        const data = await fetchAPI('category-sales-summary', params);
        
        if (data && data.categories && Array.isArray(data.categories)) {
            console.log('Received overview category data:', data);
            updateOverviewCategoryChart(data.categories);
            updateOverviewCategoryLegend(data.summary);
        } else {
            console.log('No valid overview category data received, using fallback');
            // Fallback data akan dihandle oleh API
        }
    } catch (error) {
        console.error('Error loading overview category data:', error);
        showNotification('Gagal memuat data overview kategori', 'error');
    }
}

function updateOverviewCategoryChart(categories) {
    const chart = chartInstances.overviewCategoryChart;
    const chartContainer = document.getElementById('overviewCategoryChart');
    if (!chart || !categories || categories.length === 0) {
        console.log('No chart instance or no category data to update');
        chart.data.labels = [];
        chart.data.datasets[0].data = [];
        chart.update('active');

        // Tambahkan pesan visual (opsional)
        chartContainer.innerHTML = `
            <div style="text-align:center; padding:2rem; color:#999;">
                Tidak ada data kategori untuk rentang tanggal ini.
            </div>
        `;

        return;
    }
    
    // Extract data for chart
    const labels = categories.map(cat => cat.kategori);
    const data = categories.map(cat => parseFloat(cat.total_omset) || 0);
    const colors = [
        '#3498db', '#e74c3c', '#2ecc71', '#f39c12', 
        '#9b59b6', '#1abc9c', '#34495e', '#e67e22',
        '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'
    ];
    
    // Update chart data
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.data.datasets[0].backgroundColor = colors.slice(0, labels.length);
    
    chart.update('active');
    
    console.log('Overview category chart updated with data:', { labels, data });
}

function updateOverviewCategoryLegend(summary) {
    if (!summary) {
        console.log('No summary data to update legend');
        return;
    }
    
    // Update legend stats
    const totalCategoriesElement = document.getElementById('totalCategories');
    const totalCategorySalesElement = document.getElementById('totalCategorySales');
    const topCategoryElement = document.getElementById('topCategory');
    
    if (totalCategoriesElement) {
        totalCategoriesElement.textContent = `Total Categories: ${summary.total_categories || 0}`;
    }
    
    if (totalCategorySalesElement) {
        summary.total_omset = formatCurrency(summary.total_omset || 0);
        totalCategorySalesElement.textContent = `Total Categories Sales: ` + `${summary.total_omset}`;
    }
    
    if (topCategoryElement && summary.top_category) {
        const topCat = summary.top_category;
        topCategoryElement.textContent = `Top Category: ${topCat.name} (${topCat.percentage}%)`;
    } else if (topCategoryElement) {
        topCategoryElement.textContent = 'Top Category: -';
    }
    
    console.log('Overview category legend updated:', summary);
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

function initCategoryControls() {
    const categorySelect = document.getElementById('categorySelect');
    const categoryStartDate = document.getElementById('categoryStartDate');
    const categoryEndDate = document.getElementById('categoryEndDate');
    const applyCategoryBtn = document.getElementById('applyCategoryFilter');
    
    if (categoryStartDate && categoryEndDate && applyCategoryBtn) {
        // Set default date range (last 7 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 7);
        
        categoryStartDate.value = startDate.toISOString().split('T')[0];
        categoryEndDate.value = endDate.toISOString().split('T')[0];
        
        // Add event listener for apply button
        applyCategoryBtn.addEventListener('click', function() {
            const selectedCategory = categorySelect.value;
            const start = categoryStartDate.value;
            const end = categoryEndDate.value;
            
            if (!selectedCategory) {
                showNotification('Pilih kategori terlebih dahulu', 'warning');
                return;
            }
            
            if (!start || !end) {
                showNotification('Pilih tanggal mulai dan selesai', 'warning');
                return;
            }
            
            if (new Date(start) > new Date(end)) {
                showNotification('Tanggal mulai tidak boleh lebih besar dari tanggal selesai', 'error');
                return;
            }
            
            loadCategorySalesData(selectedCategory, start, end);
            showNotification(`Memuat data kategori dari ${start} sampai ${end}`, 'info');
        });
        
        // Add enter key support
        [categoryStartDate, categoryEndDate].forEach(input => {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    applyCategoryBtn.click();
                }
            });
        });
    }
    
    // Initialize empty category sales table
    initCategorySalesTable();
}

function initCategorySalesTable() {
    const tableBody = document.querySelector('#CategorySalesTable tbody');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Pilih kategori untuk melihat detail penjualan</td></tr>';
    }
}

async function loadCategories() {
    try {
        const data = await fetchAPI('categories');
        const categorySelect = document.getElementById('categorySelect');
        
        if (categorySelect && data && Array.isArray(data)) {
            // Clear existing options except the first one
            categorySelect.innerHTML = '<option value="">Pilih Kategori...</option>';
            
            data.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id_kategori || category.id;
                option.textContent = category.nama_kategori || category.nama;
                categorySelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        showNotification('Gagal memuat data kategori', 'error');
    }
}

async function loadCategorySalesData(categoryId, startDate = null, endDate = null) {
    try {
        const params = { category_id: categoryId };
        
        if (startDate && endDate) {
            params.start_date = startDate;
            params.end_date = endDate;
        }
        
        const data = await fetchAPI('category-sales', params);
        
        if (data) {
            updateCategorySalesChart(data.chart_data || []);
            updateCategorySalesTable(data.products || []);
        }
    } catch (error) {
        console.error('Error loading category sales data:', error);
        showNotification('Gagal memuat data penjualan kategori', 'error');
    }
}

function updateCategorySalesChart(chartData) {
    const chart = chartInstances.categorySalesChart;
    if (!chart || !chartData.length) return;
    
    const labels = chartData.map(item => item.nama_produk || item.name);
    const data = chartData.map(item => parseFloat(item.total_qty || item.qty || 0));
    
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update('active');
    
    console.log('Category sales chart updated with data:', { labels, data });
}

function updateCategorySalesTable(products) {
    const tableBody = document.querySelector('#CategorySalesTable tbody');
    if (!tableBody) {
        console.log('Category sales table not found');
        return;
    }
    
    tableBody.innerHTML = '';
    
    if (!products || products.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Tidak ada data untuk kategori yang dipilih</td></tr>';
        return;
    }
    
    products.forEach(product => {
        const kode = product.kd_produk || '-';
        const nama = product.nama_produk || '-';
        const qty = parseInt(product.total_qty) || 0;
        const total = parseFloat(product.total_omset) || 0;
        const laba = parseFloat(product.total_laba) || 0;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${kode}</td>
            <td>${nama}</td>
            <td class="text-center">${qty}</td>
            <td>${formatCurrency(total)}</td>
            <td>${formatCurrency(laba)}</td>
        `;
        tableBody.appendChild(tr);
    });
    
    console.log(`Category sales table updated with ${products.length} products`);
}

// Navigation Functions
function initNavigation() {
    const menuItems = document.querySelectorAll('.menu-item a');
    
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all menu items
            document.querySelectorAll('.menu-item').forEach(menu => {
                menu.classList.remove('active');
            });
            
            // Add active class to clicked menu item
            this.parentElement.classList.add('active');
        });
    });
}

// Products Management Functions (placeholder for future use)
function initProductsSection() {
    // Products section initialization will be added here in the future
    console.log('Products section initialized');
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
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutUp 0.3s ease-in';
            setTimeout(() => {
                notification.remove();
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
    
    .notification {
        position: fixed !important;
        z-index: 999999 !important;
    }
    
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
    // Load initial revenue profit table data
    loadRevenueProfitDataTabels();
});