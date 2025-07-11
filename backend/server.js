const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

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

// Helper function to execute queries safely
async function executeQuery(query, params = []) {
    try {
        if (!pool) {
            throw new Error('Database not initialized');
        }
        const [rows] = await pool.execute(query, params);
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
        const startDate = req.query.start_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = req.query.end_date || new Date().toISOString().split('T')[0];
        
        console.log(`📊 Loading revenue-profit data from ${startDate} to ${endDate}`);
        
        const query = `
            SELECT a.bulan, a.total_omset, a.total_laba, IFNULL(b.jumlah_faktur, 0) AS jumlah_nota
            FROM (SELECT DATE_FORMAT(tgl_jual, '%Y-%m') AS bulan, SUM((netto - h_beli) * (jumlah - retur)) AS total_laba, 
            SUM(total) AS total_omset FROM penjualan_det where tgl_jual BETWEEN ? AND ? 
            GROUP BY DATE_FORMAT(tgl_jual, '%Y-%m')) AS a 
            LEFT JOIN (SELECT DATE_FORMAT(tgl_jual, '%Y-%m') AS bulan, 
            COUNT(no_faktur_jual) AS jumlah_faktur FROM penjualan_fix where tgl_jual BETWEEN ? AND ? 
            GROUP BY DATE_FORMAT(tgl_jual, '%Y-%m')) AS b 
            ON a.bulan = b.bulan 
            ORDER BY a.bulan
        `;
        
        const results = await executeQuery(query, [startDate, endDate, startDate, endDate]);

        const totalRevenueQuery = `SELECT SUM(grand_total) AS total_revenue FROM penjualan_fix WHERE tgl_jual BETWEEN ? AND ?`;
        const totalRevenueResult = await executeQuery(totalRevenueQuery, [startDate, endDate]);
        const totalRevenue = totalRevenueResult[0]?.total_revenue || 0;

        
        let revenueData = [];
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
                revenueData.push(Math.round(row.total_revenue || 0));
                labels.push(row.bulan); // '2025-06', '2025-07', dll.
                omsetData.push(Math.round(row.total_omset || 0));
                labaData.push(Math.round(row.total_laba || 0));
                notaData.push(Math.round(row.jumlah_nota || 0));
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
        const startDate = req.query.start_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = req.query.end_date || new Date().toISOString().split('T')[0];
        
        if (!categoryId) {
            return res.status(400).json({
                error: 'Category ID is required'
            });
        }
        
        console.log(`📊 Loading category sales data for category "${categoryId}" from ${startDate} to ${endDate}`);
        
        // Query untuk mendapatkan data produk dalam kategori dari pecah_stok dan penjualan_det
        const productsQuery = `
            SELECT 
                ps.kd_produk,
                ps.nama_produk,
                SUM(pd.jumlah - IFNULL(pd.retur, 0)) as total_qty,
                SUM(pd.total) as total_omset,
                SUM((pd.netto - pd.h_beli) * (pd.jumlah - IFNULL(pd.retur, 0))) as total_laba
            FROM pecah_stok ps
            LEFT JOIN penjualan_det pd ON ps.kd_produk = pd.kd_produk
            WHERE ps.kategori = ? 
            AND pd.tgl_jual BETWEEN ? AND ?
            AND pd.jumlah > 0
            GROUP BY ps.kd_produk, ps.nama_produk
            HAVING total_qty > 0
            ORDER BY total_omset DESC
        `;
        
        let productsResult = await executeQuery(productsQuery, [categoryId, startDate, endDate]);
        
        // Jika tidak ada hasil dari pecah_stok, coba langsung dari penjualan_det berdasarkan nama produk
        if (!productsResult || productsResult.length === 0) {
            const alternativeQuery = `
                SELECT 
                    pd.kd_produk,
                    pd.nama_produk,
                    SUM(pd.jumlah - IFNULL(pd.retur, 0)) as total_qty,
                    SUM(pd.total) as total_omset,
                    SUM((pd.netto - pd.h_beli) * (pd.jumlah - IFNULL(pd.retur, 0))) as total_laba
                FROM penjualan_det pd
                WHERE pd.tgl_jual BETWEEN ? AND ?
                AND pd.jumlah > 0
                AND pd.nama_produk LIKE ?
                GROUP BY pd.kd_produk, pd.nama_produk
                HAVING total_qty > 0
                ORDER BY total_omset DESC
                LIMIT 20
            `;
            
            // Coba dengan pattern matching kategori
            const categoryPattern = `%${categoryId}%`;
            productsResult = await executeQuery(alternativeQuery, [startDate, endDate, categoryPattern]);
        }
        
        // Query untuk chart data (top 8 produk)
        const chartQuery = `
            SELECT 
                ps.nama_produk,
                SUM(pd.jumlah - IFNULL(pd.retur, 0)) as total_qty
            FROM pecah_stok ps
            LEFT JOIN penjualan_det pd ON ps.kd_produk = pd.kd_produk
            WHERE ps.kategori = ? 
            AND pd.tgl_jual BETWEEN ? AND ?
            AND pd.jumlah > 0
            GROUP BY ps.kd_produk, ps.nama_produk
            HAVING total_qty > 0
            ORDER BY total_qty DESC
            LIMIT 8
        `;
        
        let chartResult = await executeQuery(chartQuery, [categoryId, startDate, endDate]);
        
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
        
        // Fallback data
        const fallbackProducts = [
            { kd_produk: 'P001', nama_produk: 'Contoh Produk A', total_qty: 150, total_omset: 1500000, total_laba: 450000 },
            { kd_produk: 'P002', nama_produk: 'Contoh Produk B', total_qty: 120, total_omset: 1200000, total_laba: 360000 },
            { kd_produk: 'P003', nama_produk: 'Contoh Produk C', total_qty: 100, total_omset: 1000000, total_laba: 300000 }
        ];
        
        const fallbackChart = [
            { nama_produk: 'Contoh Produk A', total_qty: 150 },
            { nama_produk: 'Contoh Produk B', total_qty: 120 },
            { nama_produk: 'Contoh Produk C', total_qty: 100 }
        ];
        
        res.json({
            products: fallbackProducts,
            chart_data: fallbackChart,
            error: 'Using fallback data: ' + error.message
        });
    }
});

// Category Sales Summary endpoint - untuk overview pie chart
app.get('/api/category-sales-summary', async (req, res) => {
    try {
        const startDate = req.query.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = req.query.end_date || new Date().toISOString().split('T')[0];
        
        console.log(`📊 Loading category sales summary from ${startDate} to ${endDate}`);
        
        // Query untuk mendapatkan total penjualan per kategori
        const categorySummaryQuery = `
            SELECT 
                ps.kategori,
                COUNT(DISTINCT ps.kd_produk) as total_products,
                SUM(pd.jumlah - IFNULL(pd.retur, 0)) as total_qty,
                SUM(pd.total) as total_omset,
                SUM((pd.netto - pd.h_beli) * (pd.jumlah - IFNULL(pd.retur, 0))) as total_laba
            FROM pecah_stok ps
            LEFT JOIN penjualan_det pd ON ps.kd_produk = pd.kd_produk
            WHERE pd.tgl_jual BETWEEN ? AND ?
            AND pd.jumlah > 0
            AND ps.kategori IS NOT NULL 
            AND ps.kategori != ''
            GROUP BY ps.kategori
            HAVING total_omset > 0
            ORDER BY total_omset DESC
        `;
        
        let categoryResults = await executeQuery(categorySummaryQuery, [startDate, endDate]);
        
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
                WHERE pd.tgl_jual BETWEEN ? AND ?
                AND pd.jumlah > 0
                GROUP BY 'UMUM'
                HAVING total_omset > 0
            `;
            
            categoryResults = await executeQuery(alternativeQuery, [startDate, endDate]);
        }
        
        // Hitung total keseluruhan
        const totalOmset = categoryResults.reduce((sum, cat) => sum + (parseFloat(cat.total_omset) || 0), 0);
        const totalQty = categoryResults.reduce((sum, cat) => sum + (parseInt(cat.total_qty) || 0), 0);
        const totalLaba = categoryResults.reduce((sum, cat) => sum + (parseFloat(cat.total_laba) || 0), 0);
        
        // Format data untuk chart
        const chartData = categoryResults.map(cat => ({
            kategori: cat.kategori,
            total_omset: parseFloat(cat.total_omset) || 0,
            total_qty: parseInt(cat.total_qty) || 0,
            total_laba: parseFloat(cat.total_laba) || 0,
            total_products: parseInt(cat.total_products) || 0,
            percentage: totalOmset > 0 ? ((parseFloat(cat.total_omset) / totalOmset) * 100).toFixed(1) : 0
        }));
        
        // Cari top 5 kategori dengan penjualan tertinggi
        const topCategories = chartData.slice(0, 5).map(cat => ({
            name: cat.kategori,
            total_omset: cat.total_omset,
            percentage: cat.percentage
        }));
        
        const topCategory = chartData.length > 0 ? chartData[0] : null;
        
        console.log(`Found ${categoryResults.length} categories with total sales: Rp ${totalOmset.toLocaleString('id-ID')}`);
        
        res.json({
            categories: chartData,
            summary: {
                total_categories: categoryResults.length,
                total_omset: totalOmset,
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
        
        // Fallback data
        const fallbackData = [
            { kategori: 'MAKANAN', total_omset: 5500000, total_qty: 250, total_laba: 1650000, total_products: 15, percentage: '35.5' },
            { kategori: 'MINUMAN', total_omset: 4200000, total_qty: 180, total_laba: 1260000, total_products: 12, percentage: '27.1' },
            { kategori: 'ATK', total_omset: 3100000, total_qty: 95, total_laba: 930000, total_products: 8, percentage: '20.0' },
            { kategori: 'ALAT LISTRIK', total_omset: 1800000, total_qty: 45, total_laba: 540000, total_products: 6, percentage: '11.6' },
            { kategori: 'SABUN', total_omset: 900000, total_qty: 30, total_laba: 270000, total_products: 4, percentage: '5.8' }
        ];
        
        const totalOmset = fallbackData.reduce((sum, cat) => sum + cat.total_omset, 0);
        const totalQty = fallbackData.reduce((sum, cat) => sum + cat.total_qty, 0);
        const totalLaba = fallbackData.reduce((sum, cat) => sum + cat.total_laba, 0);
        
        // Create top 5 from fallback data
        const topCategories = fallbackData.slice(0, 5).map(cat => ({
            name: cat.kategori,
            total_omset: cat.total_omset,
            percentage: cat.percentage
        }));
        
        res.json({
            categories: fallbackData,
            summary: {
                total_categories: fallbackData.length,
                total_omset: totalOmset,
                total_qty: totalQty,
                total_laba: totalLaba,
                top_categories: topCategories, // Top 5 categories for fallback
                top_category: {
                    name: fallbackData[0].kategori,
                    omset: fallbackData[0].total_omset,
                    percentage: fallbackData[0].percentage
                }
            },
            error: 'Using fallback data: ' + error.message
        });
    }
});

// User Sales endpoint - untuk analisis performa operator
app.get('/api/user-sales', async (req, res) => {
    try {
        const startDate = req.query.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = req.query.end_date || new Date().toISOString().split('T')[0];
        
        console.log(`📊 Loading user sales data from ${startDate} to ${endDate}`);
        
        // Query untuk mendapatkan total penjualan per operator
        const userSalesQuery = `
            SELECT 
                pf.operator as user,
                COUNT(DISTINCT pf.no_faktur_jual) as total_transactions,
                SUM(pd.total) as total_sales,
                AVG(pd.total) as avg_transaction_value
            FROM penjualan_fix pf
            LEFT JOIN penjualan_det pd ON pf.no_faktur_jual = pd.no_faktur_jual
            WHERE pf.tgl_jual BETWEEN ? AND ?
            AND pf.operator IS NOT NULL 
            AND pf.operator != ''
            AND pd.total > 0
            GROUP BY pf.operator
            ORDER BY total_sales DESC
        `;
        
        let userSalesResults = await executeQuery(userSalesQuery, [startDate, endDate]);
        
        // Jika tidak ada data, buat fallback data
        if (!userSalesResults || userSalesResults.length === 0) {
            console.log('⚠️  No user sales data found, using fallback');
            userSalesResults = [
                { operator: 'Admin', total_transactions: 150, total_sales: 25000000, avg_transaction_value: 166667 },
                { operator: 'Kasir1', total_transactions: 120, total_sales: 18000000, avg_transaction_value: 150000 },
                { operator: 'Kasir2', total_transactions: 95, total_sales: 14500000, avg_transaction_value: 152632 },
                { operator: 'Manager', total_transactions: 75, total_sales: 12000000, avg_transaction_value: 160000 }
            ];
        }
        
        // Format data untuk response
        const formattedData = userSalesResults.map(row => ({
            operator: row.operator,
            total_sales: parseFloat(row.total_sales) || 0,
            total_transactions: parseInt(row.total_transactions) || 0,
            avg_transaction: parseFloat(row.avg_transaction_value) || 0
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
        
        // Fallback data pada error
        const fallbackData = [
            { operator: 'Admin', total_sales: 25000000, total_transactions: 150, avg_transaction: 166667 },
            { operator: 'Kasir1', total_sales: 18000000, total_transactions: 120, avg_transaction: 150000 },
            { operator: 'Kasir2', total_sales: 14500000, total_transactions: 95, avg_transaction: 152632 },
            { operator: 'Manager', total_sales: 12000000, total_transactions: 75, avg_transaction: 160000 }
        ];
        
        res.json({
            users: fallbackData,
            error: 'Using fallback data: ' + error.message,
            summary: {
                total_operators: fallbackData.length,
                total_sales: fallbackData.reduce((sum, user) => sum + user.total_sales, 0),
                total_transactions: fallbackData.reduce((sum, user) => sum + user.total_transactions, 0)
            }
        });
    }
});

// Daily Sales Trend endpoint
app.get('/api/daily-sales-trend', async (req, res) => {
    try {
        const startDate = req.query.start_date;
        const endDate = req.query.end_date;
        let days = parseInt(req.query.days) || 30;

        console.log(`📈 Loading daily sales trend for ${days} days or date range ${startDate} - ${endDate}`);

        let query, params;

        if (startDate && endDate) {
            // Use custom date range
            query = `
                SELECT 
                    DATE(pd.tgl_jual) as tanggal,
                    SUM(pd.total) as total_omset,
                    COUNT(DISTINCT pd.no_faktur_jual) as jumlah_transaksi,
                    SUM(pd.jumlah - IFNULL(pd.retur, 0)) as total_qty
                FROM penjualan_det pd
                WHERE DATE(pd.tgl_jual) BETWEEN ? AND ?
                GROUP BY DATE(pd.tgl_jual)
                ORDER BY tanggal ASC
            `;
            params = [startDate, endDate];
        } else {
            // Use days parameter
            query = `
                SELECT 
                    DATE(pd.tgl_jual) as tanggal,
                    SUM(pd.total) as total_omset,
                    COUNT(DISTINCT pd.no_faktur_jual) as jumlah_transaksi,
                    SUM(pd.jumlah - IFNULL(pd.retur, 0)) as total_qty
                FROM penjualan_det pd
                WHERE pd.tgl_jual >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                GROUP BY DATE(pd.tgl_jual)
                ORDER BY tanggal ASC
            `;
            params = [days];
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

        console.log(`📊 Loading weekly sales trend for ${weeks} weeks`);

        const query = `
            SELECT 
                YEARWEEK(pd.tgl_jual, 1) as week_number,
                CONCAT('Minggu ', WEEK(MIN(pd.tgl_jual), 1) + 1, ' (', 
                       DATE_FORMAT(MIN(pd.tgl_jual), '%d %b'), ' - ', 
                       DATE_FORMAT(MAX(pd.tgl_jual), '%d %b'), ')') as minggu,
                SUM(pd.total) as total_omset,
                COUNT(DISTINCT pd.no_faktur_jual) as jumlah_transaksi,
                ROUND(SUM(pd.total) / COUNT(DISTINCT DATE(pd.tgl_jual)), 2) as rata_rata_harian,
                SUM(pd.jumlah - IFNULL(pd.retur, 0)) as total_qty
            FROM penjualan_det pd
            WHERE pd.tgl_jual >= DATE_SUB(CURDATE(), INTERVAL ? WEEK)
            GROUP BY YEARWEEK(pd.tgl_jual, 1)
            ORDER BY week_number ASC
        `;

        const results = await executeQuery(query, [weeks]);

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
