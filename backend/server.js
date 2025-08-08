const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const { start } = require('repl');

const app = express();
const PORT = 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Database configuration
const dbConfig = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'toko',
    charset: 'utf8'
};

// Database connection pool
let pool;

async function initDatabase() {
    try {
        pool = mysql.createPool({
            ...dbConfig,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        
        // Test connection
        const connection = await pool.getConnection();
        console.log('✅ Connected to MySQL database');
        connection.release();
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.log('🔄 Will use fallback data');
    }
}

// Simple in-memory cache
const queryCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Generate cache key from query and parameters
const generateCacheKey = (query, params = []) => {
    return `${query}|${JSON.stringify(params)}`;
};

// Get from cache if exists and not expired
const getFromCache = (cacheKey) => {
    const cached = queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('Cache hit:', cacheKey.substring(0, 50) + '...');
        return cached.data;
    }
    return null;
};

// Set cache with timestamp
const setCache = (cacheKey, data) => {
    queryCache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
    });
    
    // Clean old cache entries periodically
    if (queryCache.size > 100) {
        const now = Date.now();
        for (const [key, value] of queryCache.entries()) {
            if (now - value.timestamp > CACHE_DURATION) {
                queryCache.delete(key);
            }
        }
    }
};

// Helper function to execute queries safely with caching
async function executeQuery(query, params = []) {
    const cacheKey = generateCacheKey(query, params);
    
    // Check cache first
    const cachedResult = getFromCache(cacheKey);
    if (cachedResult) {
        return cachedResult;
    }
    
    const startTime = Date.now();
    
    try {
        if (!pool) {
            throw new Error('Database not initialized');
        }
        const [rows] = await pool.execute(query, params);
        
        const executionTime = Date.now() - startTime;
        console.log(`Query executed in ${executionTime}ms`);
        
        // Cache the results
        setCache(cacheKey, rows);
        
        return rows;
    } catch (error) {
        console.error('Query error:', error.message);
        throw error;
    }
}

// API Routes

// Revenue & Profit endpoint
app.get('/api/revenue-profit', async (req, res) => {
    try {
        const startDate = req.query.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = req.query.end_date || new Date().toISOString().split('T')[0];
        const kdCabang = req.query.kd_cabang; // Filter cabang baru
        
        console.log(`📊 Loading revenue-profit data from ${startDate} to ${endDate}${kdCabang ? ` for cabang ${kdCabang}` : ''}`);
        
        // Tambahkan kondisi WHERE untuk cabang dengan proper JOIN
        const cabangCondition = kdCabang ? ' AND pf.kd_cabang = ?' : '';
        const cabangParams = kdCabang ? [kdCabang] : [];
        
        const query = `
            SELECT 
                DATE_FORMAT(pf.tgl_jual, '%Y-%m') AS bulan,
                SUM(pd.total) AS total_omset,
                SUM((pd.netto - pd.h_beli) * (pd.jumlah - COALESCE(pd.retur, 0))) AS total_laba,
                COUNT(DISTINCT pf.no_faktur_jual) AS jumlah_faktur
            FROM penjualan_fix pf
            INNER JOIN penjualan_det pd ON pf.no_faktur_jual = pd.no_faktur_jual
            WHERE pf.tgl_jual BETWEEN ? AND ?${cabangCondition}
            AND pd.jumlah > 0
            GROUP BY DATE_FORMAT(pf.tgl_jual, '%Y-%m')
            ORDER BY bulan
        `;
        
        const params = [startDate, endDate, ...cabangParams];
        const results = await executeQuery(query, params);

        const totalRevenueQuery = `SELECT SUM(pf.grand_total) AS total_revenue FROM penjualan_fix pf WHERE pf.tgl_jual BETWEEN ? AND ?${cabangCondition}`;
        const totalRevenueParams = [startDate, endDate, ...cabangParams];
        const totalRevenueResult = await executeQuery(totalRevenueQuery, totalRevenueParams);
        const totalRevenue = totalRevenueResult[0]?.total_revenue || 0;

        
        let labels = [];
        let omsetData = [];
        let labaData = [];
        let notaData = [];
        
        if (results.length === 0) {
            console.log('⚠️  No data found for specified date range');
            // Return empty data when no real data exists
            labels = [];
            omsetData = [];
            labaData = [];
            notaData = [];
        } else {
            console.log(`✅ Found ${results.length} records`);
            results.forEach(row => {
                labels.push(row.bulan); // '2025-06', '2025-07', dll.
                omsetData.push(Math.round(row.total_omset || 0));
                labaData.push(Math.round(row.total_laba || 0));
                notaData.push(Math.round(row.jumlah_faktur || 0)); // Fixed: use jumlah_faktur instead of jumlah_nota
            });

        }
        
        res.json({
            total_revenue: totalRevenue,
            labels,
            omset: omsetData,
            laba: labaData,
            jumlah_nota: notaData,
            date_range: {
                start: startDate,
                end: endDate
            }
        });
    } catch (error) {
        console.error('Revenue profit API error:', error);
        // Return empty data on error
        res.status(500).json({
            success: false,
            error: 'Database error: ' + error.message,
            labels: [],
            omset: [],
            laba: [],
            jumlah_nota: [],
            total_revenue: 0
        });
    }
});

// Authentication removed - direct access to dashboard

// Categories endpoint
app.get('/api/categories', async (req, res) => {
    try {
        // Try to get categories from kategori table first
        let query = 'SELECT kd_kategori as id_kategori, nama_kategori FROM kategori ORDER BY nama_kategori';
        let results = await executeQuery(query);
        
        // If no results from kategori table, try to get unique categories from pecah_stok
        if (!results || results.length === 0) {
            query = 'SELECT DISTINCT kategori as nama_kategori, kategori as id_kategori FROM pecah_stok WHERE kategori IS NOT NULL AND kategori != "" ORDER BY kategori';
            results = await executeQuery(query);
        }
        
        console.log('Categories found:', results.length);
        res.json(results);
    } catch (error) {
        console.error('Categories API error:', error);
        // Fallback data
        res.json([
            { id_kategori: 'MAKANAN', nama_kategori: 'Makanan' },
            { id_kategori: 'MINUMAN', nama_kategori: 'Minuman' },
            { id_kategori: 'ATK', nama_kategori: 'Alat Tulis Kantor' },
            { id_kategori: 'ALAT LISTRIK', nama_kategori: 'Alat Listrik' },
            { id_kategori: 'SABUN', nama_kategori: 'Sabun & Detergen' }
        ]);
    }
});

// Category Sales endpoint
app.get('/api/category-sales', async (req, res) => {
    try {
        const categoryId = req.query.category_id;
        const startDate = req.query.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = req.query.end_date || new Date().toISOString().split('T')[0];
        const kdCabang = req.query.kd_cabang; // Filter cabang baru
        
        if (!categoryId) {
            return res.status(400).json({
                error: 'Category ID is required'
            });
        }
        
        console.log(`📊 Loading category sales data for category "${categoryId}" from ${startDate} to ${endDate}${kdCabang ? ` for cabang ${kdCabang}` : ''}`);
        
        // Tambahkan kondisi WHERE untuk cabang dengan proper JOIN
        const cabangCondition = kdCabang ? ' AND pf.kd_cabang = ?' : '';
        const cabangParams = kdCabang ? [kdCabang] : [];
        
        // Query untuk mendapatkan data produk dalam kategori dengan proper JOIN
        const productsQuery = `
            SELECT 
                ps.kd_produk,
                ps.nama_produk,
                SUM(pd.jumlah - IFNULL(pd.retur, 0)) as total_qty,
                SUM(pd.total) as total_omset,
                SUM((pd.netto - pd.h_beli) * (pd.jumlah - IFNULL(pd.retur, 0))) as total_laba
            FROM pecah_stok ps
            LEFT JOIN penjualan_det pd ON ps.kd_produk = pd.kd_produk
            LEFT JOIN penjualan_fix pf ON pd.no_faktur_jual = pf.no_faktur_jual
            WHERE ps.kategori = ? 
            AND pf.tgl_jual BETWEEN ? AND ?${cabangCondition}
            AND pd.jumlah > 0
            GROUP BY ps.kd_produk, ps.nama_produk
            HAVING total_qty > 0
            ORDER BY total_omset DESC
        `;
        
        const productsParams = [categoryId, startDate, endDate, ...cabangParams];
        let productsResult = await executeQuery(productsQuery, productsParams);
        
        // Jika tidak ada hasil dari pecah_stok, coba langsung dari penjualan_det dengan proper JOIN
        if (!productsResult || productsResult.length === 0) {
            const alternativeQuery = `
                SELECT 
                    pd.kd_produk,
                    pd.nama_produk,
                    SUM(pd.jumlah - IFNULL(pd.retur, 0)) as total_qty,
                    SUM(pd.total) as total_omset,
                    SUM((pd.netto - pd.h_beli) * (pd.jumlah - IFNULL(pd.retur, 0))) as total_laba
                FROM penjualan_det pd
                LEFT JOIN penjualan_fix pf ON pd.no_faktur_jual = pf.no_faktur_jual
                WHERE pf.tgl_jual BETWEEN ? AND ?${cabangCondition}
                AND pd.jumlah > 0
                AND pd.nama_produk LIKE ?
                GROUP BY pd.kd_produk, pd.nama_produk
                HAVING total_qty > 0
                ORDER BY total_omset DESC
                LIMIT 20
            `;
            
            // Coba dengan pattern matching kategori
            const categoryPattern = `%${categoryId}%`;
            const altParams = [startDate, endDate, ...cabangParams, categoryPattern];
            productsResult = await executeQuery(alternativeQuery, altParams);
        }
        
        // Query untuk chart data (top 8 produk) with proper JOIN
        const chartQuery = `
            SELECT 
                ps.nama_produk,
                SUM(pd.jumlah - IFNULL(pd.retur, 0)) as total_qty
            FROM pecah_stok ps
            LEFT JOIN penjualan_det pd ON ps.kd_produk = pd.kd_produk
            LEFT JOIN penjualan_fix pf ON pd.no_faktur_jual = pf.no_faktur_jual
            WHERE ps.kategori = ? 
            AND pf.tgl_jual BETWEEN ? AND ?${cabangCondition}
            AND pd.jumlah > 0
            GROUP BY ps.kd_produk, ps.nama_produk
            HAVING total_qty > 0
            ORDER BY total_qty DESC
            LIMIT 8
        `;
        
        const chartParams = [categoryId, startDate, endDate, ...cabangParams];
        let chartResult = await executeQuery(chartQuery, chartParams);
        
        // Jika chart kosong, gunakan data dari products result
        if (!chartResult || chartResult.length === 0) {
            chartResult = productsResult.slice(0, 8).map(product => ({
                nama_produk: product.nama_produk,
                total_qty: product.total_qty
            }));
        }
        
        console.log(`Found ${productsResult.length} products, ${chartResult.length} chart items for category "${categoryId}"`);
        
        res.json({
            products: productsResult,
            chart_data: chartResult,
            date_range: {
                start: startDate,
                end: endDate
            },
            category_id: categoryId
        });
        
    } catch (error) {
        console.error('Category sales API error:', error);
        res.status(500).json({
            error: 'Failed to load category sales data: ' + error.message,
            products: [],
            chart_data: []
        });
    }
});

// Category Sales Summary endpoint - untuk overview pie chart
app.get('/api/category-sales-summary', async (req, res) => {
    try {
        const startDate = req.query.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = req.query.end_date || new Date().toISOString().split('T')[0];
        const kdCabang = req.query.kd_cabang; // Filter cabang baru
        
        console.log(`📊 Loading category sales summary from ${startDate} to ${endDate}${kdCabang ? ` for cabang ${kdCabang}` : ''}`);
        
        // Tambahkan kondisi WHERE untuk cabang dengan proper JOIN
        const cabangCondition = kdCabang ? ' AND pf.kd_cabang = ?' : '';
        const cabangParams = kdCabang ? [kdCabang] : [];
        
        // Query untuk mendapatkan total penjualan per kategori menggunakan metode yang sama dengan revenue-profit API
        const categorySummaryQuery = `
            SELECT 
                ps.kategori,
                COUNT(DISTINCT ps.kd_produk) as total_products,
                SUM(pd.jumlah - IFNULL(pd.retur, 0)) as total_qty,
                SUM(pd.total) as total_omset,
                SUM((pd.netto - pd.h_beli) * (pd.jumlah - IFNULL(pd.retur, 0))) as total_laba
            FROM pecah_stok ps
            LEFT JOIN penjualan_det pd ON ps.kd_produk = pd.kd_produk
            LEFT JOIN penjualan_fix pf ON pd.no_faktur_jual = pf.no_faktur_jual
            WHERE pf.tgl_jual BETWEEN ? AND ?${cabangCondition}
            AND pd.jumlah > 0
            AND ps.kategori IS NOT NULL 
            AND ps.kategori != ''
            GROUP BY ps.kategori
            HAVING total_omset > 0
            ORDER BY total_omset DESC
        `;
        
        // Query untuk mendapatkan total revenue dengan metode yang sama seperti card omset
        const totalRevenueQuery = `SELECT SUM(pf.grand_total) AS total_revenue FROM penjualan_fix pf WHERE pf.tgl_jual BETWEEN ? AND ?${cabangCondition}`;
        const totalRevenueParams = [startDate, endDate, ...cabangParams];
        const totalRevenueResult = await executeQuery(totalRevenueQuery, totalRevenueParams);
        const grandTotalRevenue = totalRevenueResult[0]?.total_revenue || 0;
        
        const params = [startDate, endDate, ...cabangParams];
        let categoryResults = await executeQuery(categorySummaryQuery, params);
        
        // Jika tidak ada data dari pecah_stok, coba dari penjualan_det langsung
        if (!categoryResults || categoryResults.length === 0) {
            const alternativeQuery = `
                SELECT 
                    'UMUM' as kategori,
                    COUNT(DISTINCT pd.kd_produk) as total_products,
                    SUM(pd.jumlah - IFNULL(pd.retur, 0)) as total_qty,
                    SUM(pd.total) as total_omset,
                    SUM((pd.netto - pd.h_beli) * (pd.jumlah - IFNULL(pd.retur, 0))) as total_laba
                FROM penjualan_det pd
                LEFT JOIN penjualan_fix pf ON pd.no_faktur_jual = pf.no_faktur_jual
                WHERE pf.tgl_jual BETWEEN ? AND ?${cabangCondition}
                AND pd.jumlah > 0
                GROUP BY 'UMUM'
                HAVING total_omset > 0
            `;
            
            categoryResults = await executeQuery(alternativeQuery, params);
        }
        
        // Hitung total keseluruhan dari kategori
        const categoryTotalOmset = categoryResults.reduce((sum, cat) => sum + (parseFloat(cat.total_omset) || 0), 0);
        const totalQty = categoryResults.reduce((sum, cat) => sum + (parseInt(cat.total_qty) || 0), 0);
        const totalLaba = categoryResults.reduce((sum, cat) => sum + (parseFloat(cat.total_laba) || 0), 0);
        
        // Format data untuk chart
        const chartData = categoryResults.map(cat => ({
            kategori: cat.kategori,
            total_omset: parseFloat(cat.total_omset) || 0,
            total_qty: parseInt(cat.total_qty) || 0,
            total_laba: parseFloat(cat.total_laba) || 0,
            total_products: parseInt(cat.total_products) || 0,
            // Hitung persentase berdasarkan grand total revenue (konsisten dengan Omset card)
            percentage: grandTotalRevenue > 0 ? ((parseFloat(cat.total_omset) / grandTotalRevenue) * 100).toFixed(1) : 0
        }));
        
        // Cari top 5 kategori dengan penjualan tertinggi
        const topCategories = chartData.slice(0, 5).map(cat => ({
            name: cat.kategori,
            total_omset: cat.total_omset,
            percentage: cat.percentage
        }));
        
        const topCategory = chartData.length > 0 ? chartData[0] : null;
        
        console.log(`Found ${categoryResults.length} categories. Category total: Rp ${categoryTotalOmset.toLocaleString('id-ID')}, Grand total: Rp ${grandTotalRevenue.toLocaleString('id-ID')}`);
        
        res.json({
            categories: chartData,
            summary: {
                total_categories: categoryResults.length,
                total_omset: grandTotalRevenue, // Gunakan grand total revenue untuk konsistensi
                category_omset: categoryTotalOmset, // Total dari kategori untuk referensi
                total_qty: totalQty,
                total_laba: totalLaba,
                top_categories: topCategories, // Top 5 categories
                top_category: topCategory ? {
                    name: topCategory.kategori,
                    omset: topCategory.total_omset,
                    percentage: topCategory.percentage
                } : null
            },
            date_range: {
                start: startDate,
                end: endDate
            }
        });
        
    } catch (error) {
        console.error('Category sales summary API error:', error);
        res.status(500).json({
            error: 'Failed to load category sales summary: ' + error.message,
            categories: [],
            summary: {
                total_categories: 0,
                total_omset: 0,
                category_omset: 0,
                total_qty: 0,
                total_laba: 0,
                top_categories: [],
                top_category: null
            }
        });
    }
});

// User Sales endpoint - untuk analisis performa operator
app.get('/api/user-sales', async (req, res) => {
    try {
        const startDate = req.query.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = req.query.end_date || new Date().toISOString().split('T')[0];
        const kdCabang = req.query.kd_cabang; // Filter cabang baru
        
        console.log(`📊 Loading user sales data from ${startDate} to ${endDate}${kdCabang ? ` for cabang ${kdCabang}` : ''}`);
        
        // Tambahkan kondisi WHERE untuk cabang jika ada
        const cabangCondition = kdCabang ? ' AND pf.kd_cabang = ?' : '';
        const cabangParams = kdCabang ? [kdCabang] : [];
        
        // Query untuk mendapatkan total penjualan per operator
        const userSalesQuery = `
            SELECT 
                pf.operator,
                COUNT(DISTINCT pf.no_faktur_jual) as total_transactions,
                SUM(pd.total) as total_sales
            FROM penjualan_fix pf
            LEFT JOIN penjualan_det pd ON pf.no_faktur_jual = pd.no_faktur_jual
            WHERE pf.tgl_jual BETWEEN ? AND ?${cabangCondition}
            AND pf.operator IS NOT NULL 
            AND pf.operator != ''
            AND pd.total > 0
            GROUP BY pf.operator
            ORDER BY total_sales DESC
        `;
        
        const params = [startDate, endDate, ...cabangParams];
        const userSalesResults = await executeQuery(userSalesQuery, params);
        
        // Format data untuk response
        const formattedData = userSalesResults.map(row => ({
            operator: row.operator,
            total_sales: parseFloat(row.total_sales) || 0,
            total_transactions: parseInt(row.total_transactions) || 0
        }));
        
        console.log(`✅ Found ${formattedData.length} operators with sales data`);
        
        res.json({
            users: formattedData,
            date_range: {
                start: startDate,
                end: endDate
            },
            summary: {
                total_operators: formattedData.length,
                total_sales: formattedData.reduce((sum, user) => sum + user.total_sales, 0),
                total_transactions: formattedData.reduce((sum, user) => sum + user.total_transactions, 0)
            }
        });
        
    } catch (error) {
        console.error('User sales API error:', error);
        res.status(500).json({
            error: 'Failed to load user sales data: ' + error.message
        });
    }
});

app.get('/api/user-individual-sales', async (req, res) => {
    try {
        const operator1 = req.query.operator;
        const startDate = req.query.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = req.query.end_date || new Date().toISOString().split('T')[0];
        const kdCabang = req.query.kd_cabang;

        const cabangCondition = kdCabang ? ' AND pf.kd_cabang = ?' : '';
        const cabangParams = kdCabang ? [kdCabang] : [];
        
        console.log(`📊 Loading user sales data from ${startDate} to ${endDate}`);

        let formattedData1 = [];

        if (operator1) {
            const userSaleQuery = `
            SELECT 
                pd.nama_produk,
                COUNT(DISTINCT pf.no_faktur_jual) as total_transactions,
                SUM(pd.total) as total_sales
            FROM penjualan_fix pf
            LEFT JOIN penjualan_det pd ON pf.no_faktur_jual = pd.no_faktur_jual
            WHERE pf.operator = ? 
            AND pf.tgl_jual BETWEEN ? AND ?${cabangCondition}
            AND pd.total > 0
            GROUP BY pd.barcode, pd.nama_produk
            ORDER BY total_sales DESC
        `;

        let userSaleQueryResults = await executeQuery(userSaleQuery, [operator1, startDate, endDate, ...cabangParams]);
        
        console.log(`✅ Found ${formattedData1.length} operators with sales data`);
        
        res.json({
            operator_1 : operator1,
            operatorIndividually: userSaleQueryResults,
            date_range: {
                start: startDate,
                end: endDate
            }
        });
    }
    } catch (error) {
        console.error('User sales API error:', error);
        res.status(500).json({
            error: 'Failed to load user sales data: ' + error.message
        });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        // Try to get user from penjualan_fix table first
        const kdCabang = req.query.kd_cabang;
        const cabangCondition = kdCabang ? ' WHERE kd_cabang = ?' : '';
        const cabangParams = kdCabang ? [kdCabang] : [];
        let query = `SELECT DISTINCT operator FROM penjualan_fix${cabangCondition} ORDER BY operator`;
        let results = await executeQuery(query, [...cabangParams]);
        
        console.log('User found:', results.length);
        res.json(results);
    } catch (error) {
        console.error('Users API error:', error);
        // Fallback data
        res.json([
            { operators: 'Users'}
        ]);
    }
});

// Cabang endpoint - untuk mendapatkan daftar cabang
app.get('/api/cabang', async (req, res) => {
    try {
        const query = 'SELECT kd_cabang, nama_cabang FROM cabang ORDER BY kd_cabang';
        const results = await executeQuery(query);
        
        console.log('Cabang found:', results.length);
        res.json(results);
    } catch (error) {
        console.error('Cabang API error:', error);
        // Fallback data
        res.json([
            { kd_cabang: 1, nama_cabang: 'WSB Pusat' },
            { kd_cabang: 2, nama_cabang: 'WSB Cabang' }
        ]);
    }
});

// Daily Sales Trend endpoint
app.get('/api/daily-sales-trend', async (req, res) => {
    try {
        const startDate = req.query.start_date;
        const endDate = req.query.end_date;
        const kdCabang = req.query.kd_cabang; // Filter cabang baru
        let days = parseInt(req.query.days) || 30;

        console.log(`📈 Loading daily sales trend for ${days} days or date range ${startDate} - ${endDate}${kdCabang ? ` for cabang ${kdCabang}` : ''}`);

        // Tambahkan kondisi WHERE untuk cabang jika ada
        const cabangCondition = kdCabang ? ' AND pf.kd_cabang = ?' : '';
        const cabangParams = kdCabang ? [kdCabang] : [];

        let query, params;

        if (startDate && endDate) {
            // Use custom date range with proper JOIN
            query = `
                SELECT 
                    DATE(pf.tgl_jual) as tanggal,
                    SUM(pd.total) as total_omset,
                    COUNT(DISTINCT pf.no_faktur_jual) as jumlah_transaksi,
                    SUM(pd.jumlah - IFNULL(pd.retur, 0)) as total_qty
                FROM penjualan_fix pf
                LEFT JOIN penjualan_det pd ON pf.no_faktur_jual = pd.no_faktur_jual
                WHERE DATE(pf.tgl_jual) BETWEEN ? AND ?${cabangCondition}
                AND pd.jumlah > 0
                GROUP BY DATE(pf.tgl_jual)
                ORDER BY tanggal ASC
            `;
            params = [startDate, endDate, ...cabangParams];
        } else {
            // Use days parameter with proper JOIN
            query = `
                SELECT 
                    DATE(pf.tgl_jual) as tanggal,
                    SUM(pd.total) as total_omset,
                    COUNT(DISTINCT pf.no_faktur_jual) as jumlah_transaksi,
                    SUM(pd.jumlah - IFNULL(pd.retur, 0)) as total_qty
                FROM penjualan_fix pf
                LEFT JOIN penjualan_det pd ON pf.no_faktur_jual = pd.no_faktur_jual
                WHERE pf.tgl_jual >= DATE_SUB(CURDATE(), INTERVAL ? DAY)${cabangCondition}
                AND pd.jumlah > 0
                GROUP BY DATE(pf.tgl_jual)
                ORDER BY tanggal ASC
            `;
            params = [days, ...cabangParams];
        }

        const results = await executeQuery(query, params);

        // Format data untuk Chart.js
        const trendData = results.map(row => ({
            tanggal: row.tanggal,
            total_omset: parseFloat(row.total_omset) || 0,
            jumlah_transaksi: parseInt(row.jumlah_transaksi) || 0,
            total_qty: parseInt(row.total_qty) || 0
        }));

        console.log(`✅ Daily trend data loaded: ${trendData.length} days`);

        res.json(trendData);

    } catch (error) {
        console.error('Daily sales trend API error:', error);
        res.status(500).json({
            error: 'Failed to load daily sales trend: ' + error.message
        });
    }
});

// Weekly Sales Trend endpoint
app.get('/api/weekly-sales-trend', async (req, res) => {
    try {
        const weeks = parseInt(req.query.weeks) || 8;
        const kdCabang = req.query.kd_cabang; // Filter cabang baru

        console.log(`📊 Loading weekly sales trend for ${weeks} weeks${kdCabang ? ` for cabang ${kdCabang}` : ''}`);

        // Tambahkan kondisi WHERE untuk cabang dengan proper JOIN
        const cabangCondition = kdCabang ? ' AND pf.kd_cabang = ?' : '';
        const cabangParams = kdCabang ? [kdCabang] : [];

        const query = `
            SELECT 
                YEARWEEK(pf.tgl_jual, 1) as week_number,
                CONCAT('Minggu ', WEEK(MIN(pf.tgl_jual), 1) + 1, ' (', 
                       DATE_FORMAT(MIN(pf.tgl_jual), '%d %b'), ' - ', 
                       DATE_FORMAT(MAX(pf.tgl_jual), '%d %b'), ')') as minggu,
                SUM(pd.total) as total_omset,
                COUNT(DISTINCT pf.no_faktur_jual) as jumlah_transaksi,
                ROUND(SUM(pd.total) / COUNT(DISTINCT DATE(pf.tgl_jual)), 2) as rata_rata_harian,
                SUM(pd.jumlah - IFNULL(pd.retur, 0)) as total_qty
            FROM penjualan_fix pf
            LEFT JOIN penjualan_det pd ON pf.no_faktur_jual = pd.no_faktur_jual
            WHERE pf.tgl_jual >= DATE_SUB(CURDATE(), INTERVAL ? WEEK)${cabangCondition}
            AND pd.jumlah > 0
            GROUP BY YEARWEEK(pf.tgl_jual, 1)
            ORDER BY week_number ASC
        `;

        const params = [weeks, ...cabangParams];
        const results = await executeQuery(query, params);

        // Format data untuk Chart.js
        const weeklyData = results.map(row => ({
            week_number: row.week_number,
            minggu: row.minggu,
            total_omset: parseFloat(row.total_omset) || 0,
            jumlah_transaksi: parseInt(row.jumlah_transaksi) || 0,
            rata_rata_harian: parseFloat(row.rata_rata_harian) || 0,
            total_qty: parseInt(row.total_qty) || 0
        }));

        console.log(`✅ Weekly trend data loaded: ${weeklyData.length} weeks`);

        res.json(weeklyData);

    } catch (error) {
        console.error('Weekly sales trend API error:', error);
        res.status(500).json({
            error: 'Failed to load weekly sales trend: ' + error.message
        });
    }
});

// Product detail endpoint
app.get('/api/product/:productId', async (req, res) => {
    try {
        const productId = req.params.productId;
        
        console.log(`📦 Loading product detail for: ${productId}`);
        
        // Query untuk detail produk dengan sales history
        const productQuery = `
            SELECT 
                ps.barcode,
                ps.kd_produk,
                ps.nama_produk,
                ps.satuan,
                ps.nilai_satuan_dasar,
                ps.kategori,
                ps.sub_kategori,
                ps.deskripsi,
                ps.rak,
                ps.departement,
                ps.harga_beli,
                ps.harga_beli_ppn,
                ps.harga_jual_umum,
                ps.harga_jual_member,
                ps.harga_jual_grosir,
                ps.harga_jual_grosir_member,
                ps.harga_jual_cabang,
                ps.harga_jual_reseller,
                IFNULL(p.stok_toko, 0) as stok_toko,
                IFNULL(p.stok_gudang, 0) as stok_gudang,
                IFNULL(p.stok_gudang_2, 0) as stok_gudang_2,
                IFNULL(p.stok_minimal, 0) as stok_minimal,
                (IFNULL(p.stok_toko, 0) + IFNULL(p.stok_gudang, 0) + IFNULL(p.stok_gudang_2, 0)) as total_stok,
                ps.kd_dsb as distributor_code,
                ps.last_update,
                ps.persen_margin,
                ps.cash_back,
                ps.point,
                ps.reward_kasir
            FROM pecah_stok ps
            LEFT JOIN produk p ON ps.kd_produk = p.kd_produk
            WHERE ps.kd_produk = ? OR ps.barcode = ?
        `;
        
        // Query untuk sales history (30 hari terakhir)
        const salesQuery = `
            SELECT 
                DATE(pd.tgl_jual) as tgl_jual,
                SUM(pd.jumlah - IFNULL(pd.retur, 0)) as qty_terjual,
                SUM(pd.total) as omset_harian,
                COUNT(DISTINCT pd.no_faktur_jual) as jumlah_transaksi
            FROM penjualan_det pd
            WHERE (pd.kd_produk = ? OR pd.barcode = ?)
            AND pd.tgl_jual >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY DATE(pd.tgl_jual)
            ORDER BY pd.qty_terjual ASC
        `;
        
        const [productResult, salesResult] = await Promise.all([
            executeQuery(productQuery, [productId, productId]),
            executeQuery(salesQuery, [productId, productId])
        ]);
        
        if (productResult.length === 0) {
            return res.status(404).json({
                error: 'Product not found'
            });
        }
        
        const product = productResult[0];
        
        // Calculate additional metrics
        const totalSold30Days = salesResult.reduce((sum, sale) => sum + sale.qty_terjual, 0);
        const avgDailySales = salesResult.length > 0 ? totalSold30Days / 30 : 0;
        const daysOfStock = avgDailySales > 0 ? Math.floor(product.total_stok / avgDailySales) : null;
        
        const productDetail = {
            ...product,
            stock_status: product.stok_minimal > 0 && product.total_stok < product.stok_minimal ? 'low' : 
                         product.total_stok === 0 ? 'out' : 'normal',
            margin: product.harga_jual_umum && product.harga_beli ? 
                   ((product.harga_jual_umum - product.harga_beli) / product.harga_beli * 100).toFixed(2) : null,
            sales_analytics: {
                total_sold_30_days: totalSold30Days,
                avg_daily_sales: parseFloat(avgDailySales.toFixed(2)),
                days_of_stock: daysOfStock,
                sales_history: salesResult
            }
        };
        
        console.log(`✅ Product detail loaded for: ${product.nama_produk}`);
        
        res.json(productDetail);
        
    } catch (error) {
        console.error('Product detail API error:', error);
        res.status(500).json({
            error: 'Failed to load product detail: ' + error.message
        });
    }
});

// Cache management endpoint
app.post('/api/cache/clear', (req, res) => {
    try {
        const cacheSize = queryCache.size;
        queryCache.clear();
        console.log(`Cache cleared. Removed ${cacheSize} entries.`);
        res.json({
            success: true,
            message: `Cache cleared successfully. Removed ${cacheSize} entries.`
        });
    } catch (error) {
        console.error('Error clearing cache:', error);
        res.status(500).json({
            error: 'Error clearing cache',
            details: error.message
        });
    }
});

// Get cache statistics
app.get('/api/cache/stats', (req, res) => {
    try {
        const now = Date.now();
        let activeEntries = 0;
        let expiredEntries = 0;
        
        for (const [key, value] of queryCache.entries()) {
            if (now - value.timestamp < CACHE_DURATION) {
                activeEntries++;
            } else {
                expiredEntries++;
            }
        }
        
        res.json({
            totalEntries: queryCache.size,
            activeEntries: activeEntries,
            expiredEntries: expiredEntries,
            cacheDurationMinutes: CACHE_DURATION / (60 * 1000)
        });
    } catch (error) {
        console.error('Error getting cache stats:', error);
        res.status(500).json({
            error: 'Error getting cache statistics',
            details: error.message
        });
    }
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dashboard.html'));
});

// Start server
async function startServer() {
    await initDatabase();
    
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📊 API available at http://localhost:${PORT}/api/`);
        console.log(`🌐 Dashboard available at http://localhost:${PORT}/`);
    });
}

startServer().catch(console.error);
