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
            updateCategorySalesTable(data.products || [], categoryId);
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

function updateCategorySalesTable(products, categoryId) {
    const tableBody = document.querySelector('#CategorySalesTable tbody');
    const tableTitle = document.getElementById('categoryTableTitle');
    
    if (!tableBody) return;
    
    // Update table title
    const categorySelect = document.getElementById('categorySelect');
    const selectedCategoryName = categorySelect.options[categorySelect.selectedIndex].text;
    if (tableTitle) {
        tableTitle.textContent = `Detail Penjualan Kategori: ${selectedCategoryName}`;
    }
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    if (!products || products.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Tidak ada data untuk kategori ini</td></tr>';
        return;
    }
    
    products.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.kode_produk || product.kode || '-'}</td>
            <td>${product.nama_produk || product.nama || '-'}</td>
            <td>${new Intl.NumberFormat('id-ID').format(product.total_qty || product.qty || 0)}</td>
            <td>${formatCurrency(product.total_omset || product.total || 0)}</td>
            <td>${formatCurrency(product.total_laba || product.laba || 0)}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Navigation Functions
function initNavigation() {
    const menuItems = document.querySelectorAll('.menu-item a');
    
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1); // Remove #
            
            // Remove active class from all menu items
            document.querySelectorAll('.menu-item').forEach(menu => {
                menu.classList.remove('active');
            });
            
            // Add active class to clicked menu item
            this.parentElement.classList.add('active');
            
            // Show/hide sections
            showSection(target);
        });
    });
}

function showSection(sectionName) {
    // Hide all sections
    const sections = ['dashboard-content', 'products-section'];
    sections.forEach(section => {
        const element = document.getElementById(section) || document.querySelector(`.${section}`);
        if (element) {
            element.style.display = 'none';
        }
    });
    
    // Show target section
    switch(sectionName) {
        case 'overview':
            const dashboardContent = document.querySelector('.dashboard-content');
            if (dashboardContent) {
                dashboardContent.style.display = 'block';
            }
            break;
        case 'products':
            const productsSection = document.getElementById('products-section');
            if (productsSection) {
                productsSection.style.display = 'block';
                loadProducts(); // Load products when section is shown
            }
            break;
        default:
            const defaultSection = document.querySelector('.dashboard-content');
            if (defaultSection) {
                defaultSection.style.display = 'block';
            }
    }
}

// Products Management Functions
let currentProductsPage = 1;
let currentProductsFilters = {
    search: '',
    category: '',
    lowStock: false
};

function initProductsSection() {
    // Search input
    const searchInput = document.getElementById('productSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            currentProductsFilters.search = this.value;
            currentProductsPage = 1;
            loadProducts();
        }, 500));
    }
    
    // Category filter
    const categoryFilter = document.getElementById('productCategoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function() {
            currentProductsFilters.category = this.value;
            currentProductsPage = 1;
            loadProducts();
        });
        
        // Load categories for filter
        loadProductCategories();
    }
    
    // Low stock filter
    const lowStockFilter = document.getElementById('lowStockFilter');
    if (lowStockFilter) {
        lowStockFilter.addEventListener('click', function() {
            currentProductsFilters.lowStock = !currentProductsFilters.lowStock;
            this.classList.toggle('active');
            currentProductsPage = 1;
            loadProducts();
        });
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshProducts');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadProducts();
        });
    }
    
    // Pagination
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', function() {
            if (currentProductsPage > 1) {
                currentProductsPage--;
                loadProducts();
            }
        });
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', function() {
            currentProductsPage++;
            loadProducts();
        });
    }
    
    // Modal close
    const modal = document.getElementById('productModal');
    const closeModal = document.getElementById('closeModal');
    
    if (closeModal) {
        closeModal.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    if (modal) {
        window.addEventListener('click', function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
}

async function loadProductCategories() {
    try {
        const categoriesData = await fetchAPI('categories');
        if (categoriesData) {
            const categoryFilter = document.getElementById('productCategoryFilter');
            if (categoryFilter) {
                // Clear existing options except first one
                categoryFilter.innerHTML = '<option value="">Semua Kategori</option>';
                
                categoriesData.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id_kategori || category.nama_kategori;
                    option.textContent = category.nama_kategori;
                    categoryFilter.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadProducts() {
    try {
        const productsTable = document.getElementById('ProductsTable');
        const tbody = productsTable.querySelector('tbody');
        
        // Show loading
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center">
                    <div class="loading">
                        <i class="fas fa-spinner fa-spin"></i>
                        Memuat data produk...
                    </div>
                </td>
            </tr>
        `;
        
        const params = {
            page: currentProductsPage,
            limit: 20,
            ...currentProductsFilters
        };
        
        // Remove empty params
        Object.keys(params).forEach(key => {
            if (params[key] === '' || params[key] === false) {
                delete params[key];
            }
        });
        
        const data = await fetchAPI('products', params);
        
        if (data && data.products) {
            displayProducts(data.products);
            updateProductsPagination(data.pagination);
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center">
                        Tidak ada data produk yang ditemukan
                    </td>
                </tr>
            `;
        }
        
    } catch (error) {
        console.error('Error loading products:', error);
        const tbody = document.querySelector('#ProductsTable tbody');
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center">
                    Gagal memuat data produk: ${error.message}
                </td>
            </tr>
        `;
    }
}

function displayProducts(products) {
    const tbody = document.querySelector('#ProductsTable tbody');
    
    if (products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center">
                    Tidak ada produk yang ditemukan
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = products.map(product => {
        const stockStatusClass = product.stock_status || 'normal';
        const stockStatusText = stockStatusClass === 'low' ? 'Menipis' : 
                               stockStatusClass === 'out' ? 'Habis' : 'Normal';
        
        const margin = product.margin ? `${product.margin}%` : '-';
        
        return `
            <tr>
                <td><strong>${product.kd_produk}</strong></td>
                <td>
                    <div class="product-name">${product.nama_produk}</div>
                    ${product.barcode ? `<small class="text-muted">Barcode: ${product.barcode}</small>` : ''}
                </td>
                <td>
                    <span class="category-badge">${product.kategori || '-'}</span>
                    ${product.sub_kategori ? `<br><small>${product.sub_kategori}</small>` : ''}
                </td>
                <td>
                    <div class="stock-info">
                        <strong>${product.total_stok || 0}</strong>
                        ${product.stok_minimal > 0 ? `<small>/ Min: ${product.stok_minimal}</small>` : ''}
                    </div>
                </td>
                <td>${product.satuan || '-'}</td>
                <td>${formatCurrency(product.harga_beli || 0)}</td>
                <td>${formatCurrency(product.harga_jual_umum || 0)}</td>
                <td class="margin-cell ${product.margin && product.margin > 0 ? 'positive' : ''}">${margin}</td>
                <td>
                    <span class="stock-status ${stockStatusClass}">${stockStatusText}</span>
                </td>
                <td>
                    <button class="action-btn view" onclick="showProductDetail('${product.kd_produk}')">
                        <i class="fas fa-eye"></i>
                        Detail
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function updateProductsPagination(pagination) {
    if (!pagination) return;
    
    // Update pagination info
    const paginationInfo = document.getElementById('paginationInfo');
    if (paginationInfo) {
        const startItem = ((pagination.current_page - 1) * pagination.items_per_page) + 1;
        const endItem = Math.min(pagination.current_page * pagination.items_per_page, pagination.total_items);
        paginationInfo.textContent = `Menampilkan ${startItem}-${endItem} dari ${pagination.total_items} produk`;
    }
    
    // Update pagination buttons
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    if (prevBtn) {
        prevBtn.disabled = !pagination.has_prev;
    }
    
    if (nextBtn) {
        nextBtn.disabled = !pagination.has_next;
    }
    
    // Update page numbers
    const pageNumbers = document.getElementById('pageNumbers');
    if (pageNumbers) {
        pageNumbers.innerHTML = generatePageNumbers(pagination);
    }
}

function generatePageNumbers(pagination) {
    const current = pagination.current_page;
    const total = pagination.total_pages;
    const maxVisible = 5;
    
    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = Math.min(total, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1);
    }
    
    let html = '';
    
    // First page
    if (start > 1) {
        html += `<span class="page-number" onclick="goToPage(1)">1</span>`;
        if (start > 2) {
            html += `<span class="page-ellipsis">...</span>`;
        }
    }
    
    // Page numbers
    for (let i = start; i <= end; i++) {
        html += `<span class="page-number ${i === current ? 'active' : ''}" onclick="goToPage(${i})">${i}</span>`;
    }
    
    // Last page
    if (end < total) {
        if (end < total - 1) {
            html += `<span class="page-ellipsis">...</span>`;
        }
        html += `<span class="page-number" onclick="goToPage(${total})">${total}</span>`;
    }
    
    return html;
}

function goToPage(page) {
    currentProductsPage = page;
    loadProducts();
}

async function showProductDetail(productId) {
    const modal = document.getElementById('productModal');
    const loadingDiv = modal.querySelector('.product-detail-loading');
    const contentDiv = modal.querySelector('.product-detail-content');
    
    // Show modal and loading state
    modal.style.display = 'block';
    loadingDiv.style.display = 'block';
    contentDiv.style.display = 'none';
    
    try {
        const productData = await fetchAPI(`products/${productId}`);
        
        if (productData) {
            // Fill modal with product data
            document.getElementById('modalProductCode').textContent = productData.kd_produk || '-';
            document.getElementById('modalBarcode').textContent = productData.barcode || '-';
            document.getElementById('modalProductName').textContent = productData.nama_produk || '-';
            document.getElementById('modalCategory').textContent = productData.kategori || '-';
            document.getElementById('modalSubCategory').textContent = productData.sub_kategori || '-';
            document.getElementById('modalUnit').textContent = productData.satuan || '-';
            
            document.getElementById('modalStockToko').textContent = productData.stok_toko || 0;
            document.getElementById('modalStockGudang').textContent = productData.stok_gudang || 0;
            document.getElementById('modalTotalStock').textContent = productData.total_stok || 0;
            document.getElementById('modalMinStock').textContent = productData.stok_minimal || 0;
            
            document.getElementById('modalBuyPrice').textContent = formatCurrency(productData.harga_beli || 0);
            document.getElementById('modalSellPrice').textContent = formatCurrency(productData.harga_jual_umum || 0);
            document.getElementById('modalMemberPrice').textContent = formatCurrency(productData.harga_jual_member || 0);
            document.getElementById('modalWholesalePrice').textContent = formatCurrency(productData.harga_jual_grosir || 0);
            document.getElementById('modalMargin').textContent = productData.margin ? `${productData.margin}%` : '-';
            
            if (productData.sales_analytics) {
                document.getElementById('modalTotalSold').textContent = productData.sales_analytics.total_sold_30_days || 0;
                document.getElementById('modalAvgDaily').textContent = productData.sales_analytics.avg_daily_sales || 0;
                document.getElementById('modalDaysOfStock').textContent = 
                    productData.sales_analytics.days_of_stock ? `${productData.sales_analytics.days_of_stock} hari` : '-';
            }
            
            // Show content and hide loading
            loadingDiv.style.display = 'none';
            contentDiv.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error loading product detail:', error);
        loadingDiv.innerHTML = `
            <div style="color: red;">
                <i class="fas fa-exclamation-triangle"></i>
                Gagal memuat detail produk: ${error.message}
            </div>
        `;
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
                // Search logic can be implemented here in the future
                console.log('Search query:', query);
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
