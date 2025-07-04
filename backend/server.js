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

// Stats endpoint
app.get('/api/stats', async (req, res) => {
    try {
        // Total revenue (last 30 days)
        const startDate = req.query.start_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = req.query.end_date || new Date().toISOString().split('T')[0];

        const revenueQuery = `
            SELECT SUM(grand_total) as total_revenue 
            FROM penjualan_fix 
            WHERE tgl_jual >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        `;
        const revenueResult = await executeQuery(revenueQuery);
        const revenue = revenueResult[0]?.total_revenue || 0;
        
        // Total products
        const productQuery = "SELECT COUNT(*) as total_products FROM produk";
        const productResult = await executeQuery(productQuery);
        const totalProducts = productResult[0]?.total_products || 0;
        
        // Today's orders
        const ordersQuery = `
            SELECT COUNT(*) as today_orders 
            FROM penjualan_fix 
            WHERE DATE(tgl_jual) = CURDATE()
        `;
        const ordersResult = await executeQuery(ordersQuery);
        const todayOrders = ordersResult[0]?.today_orders || 0;
        
        // Low stock items
        const lowStockQuery = `
            SELECT COUNT(*) as low_stock 
            FROM produk 
            WHERE (stok_toko + stok_gudang) < stok_minimal AND stok_minimal > 0
        `;
        const lowStockResult = await executeQuery(lowStockQuery);
        const lowStock = lowStockResult[0]?.low_stock || 0;
        
        res.json({
            revenue: parseFloat(revenue),
            products: parseInt(totalProducts),
            orders: parseInt(todayOrders),
            low_stock: parseInt(lowStock)
        });
    } catch (error) {
        console.error('Stats API error:', error);
        // Fallback data
        res.json({
            revenue: 125450000,
            products: 1247,
            orders: 324,
            low_stock: 42
        });
    }
});

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
            console.log('🔄 No data found, generating fallback data');
            // Generate fallback data if no real data exists
            const start = new Date(startDate);
            const end = new Date(endDate);
            const current = new Date(start);
            
            while (current <= end) {
                labels.push(current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                omsetData.push(Math.floor(Math.random() * 15000000) + 10000000); // 10M - 25M
                labaData.push(Math.floor(Math.random() * 12000000) + 8000000);   // 8M - 20M
                current.setDate(current.getDate() + 1);
            }
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
        // Return fallback data on error
        const labels = ['Jun 26', 'Jun 27', 'Jun 28', 'Jun 29', 'Jun 30'];
        const omsetData = [15000000, 18000000, 19000000, 22000000, 24000000];
        const labaData = [10000000, 16000000, 15000000, 18000000, 20000000];
        
        res.json({
            labels,
            omset: omsetData,
            laba: labaData,
            error: 'Using fallback data: ' + error.message
        });
    }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username dan password harus diisi'
            });
        }
        
        // Hash password dengan MD5
        const hashedPassword = crypto.createHash('md5').update(password).digest('hex');
        
        // Query untuk mencari user
        const query = 'SELECT username, password, level, nama FROM user WHERE username = ?';
        const result = await executeQuery(query, [username]);
        
        if (result.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Username tidak ditemukan'
            });
        }
        
        const user = result[0];
        
        // Verifikasi password
        if (user.password !== hashedPassword) {
            return res.status(401).json({
                success: false,
                message: 'Password salah'
            });
        }
        
        // Login berhasil
        res.json({
            success: true,
            message: 'Login berhasil',
            user: {
                username: user.username,
                level: user.level,
                nama: user.nama
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
});

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

// Debug endpoint untuk melihat struktur database
app.get('/api/debug/tables', async (req, res) => {
    try {
        console.log('🔍 Checking database tables...');
        
        // Cek tabel yang ada
        const tablesQuery = "SHOW TABLES";
        const tables = await executeQuery(tablesQuery);
        
        console.log('Available tables:', tables);
        
        // Cek struktur tabel kategori
        let kategoriBryStruct = null;
        try {
            const kategoriQuery = "DESCRIBE kategori";
            kategoriBryStruct = await executeQuery(kategoriQuery);
        } catch (e) {
            console.log('Kategori table not found or error:', e.message);
        }
        
        // Cek struktur tabel pecah_stok
        let pecahStokStruct = null;
        try {
            const pecahStokQuery = "DESCRIBE pecah_stok";
            pecahStokStruct = await executeQuery(pecahStokQuery);
        } catch (e) {
            console.log('Pecah_stok table not found or error:', e.message);
        }
        
        // Cek sample data kategori
        let kategoripData = null;
        try {
            const sampleKategoriQuery = "SELECT * FROM kategori LIMIT 10";
            kategoripData = await executeQuery(sampleKategoriQuery);
        } catch (e) {
            console.log('Cannot get kategori data:', e.message);
        }
        
        // Cek sample data pecah_stok
        let pecahStokData = null;
        try {
            const samplePecahStokQuery = "SELECT DISTINCT kategori FROM pecah_stok WHERE kategori IS NOT NULL LIMIT 10";
            pecahStokData = await executeQuery(samplePecahStokQuery);
        } catch (e) {
            console.log('Cannot get pecah_stok data:', e.message);
        }
        
        res.json({
            tables: tables,
            kategori_structure: kategoriBryStruct,
            pecah_stok_structure: pecahStokStruct,
            kategori_data: kategoripData,
            pecah_stok_categories: pecahStokData
        });
        
    } catch (error) {
        console.error('Debug tables error:', error);
        res.status(500).json({
            error: 'Debug failed: ' + error.message
        });
    }
});

// Products/Items endpoint
app.get('/api/products', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const category = req.query.category || '';
        const lowStock = req.query.low_stock === 'true';
        const offset = (page - 1) * limit;
        
        console.log(`📦 Loading products - Page: ${page}, Limit: ${limit}, Search: "${search}", Category: "${category}", Low Stock: ${lowStock}`);
        
        // Build WHERE conditions
        let whereConditions = [];
        let queryParams = [];
        
        if (search) {
            whereConditions.push('(ps.nama_produk LIKE ? OR ps.kd_produk LIKE ? OR ps.barcode LIKE ?)');
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        if (category) {
            whereConditions.push('ps.kategori = ?');
            queryParams.push(category);
        }
        
        if (lowStock) {
            whereConditions.push('((p.stok_toko + p.stok_gudang) < p.stok_minimal AND p.stok_minimal > 0)');
        }
        
        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
        
        // Main query untuk mendapatkan data produk
        const mainQuery = `
            SELECT 
                ps.barcode,
                ps.kd_produk,
                ps.nama_produk,
                ps.satuan,
                ps.kategori,
                ps.sub_kategori,
                ps.harga_beli,
                ps.harga_jual_umum,
                ps.harga_jual_member,
                ps.harga_jual_grosir,
                IFNULL(p.stok_toko, 0) as stok_toko,
                IFNULL(p.stok_gudang, 0) as stok_gudang,
                IFNULL(p.stok_minimal, 0) as stok_minimal,
                (IFNULL(p.stok_toko, 0) + IFNULL(p.stok_gudang, 0)) as total_stok,
                ps.kd_dsb as distributor_code,
                ps.last_update
            FROM pecah_stok ps
            LEFT JOIN produk p ON ps.kd_produk = p.kd_produk
            ${whereClause}
            ORDER BY ps.nama_produk ASC
            LIMIT ${limit} OFFSET ${offset}
        `;
        
        // Count query untuk pagination
        const countQuery = `
            SELECT COUNT(*) as total
            FROM pecah_stok ps
            LEFT JOIN produk p ON ps.kd_produk = p.kd_produk
            ${whereClause}
        `;
        
        // Execute queries
        const countParams = [...queryParams];
        const mainParams = [...queryParams];
        
        const [countResult, productsResult] = await Promise.all([
            executeQuery(countQuery, countParams),
            executeQuery(mainQuery, mainParams)
        ]);
        
        const totalItems = countResult[0]?.total || 0;
        const totalPages = Math.ceil(totalItems / limit);
        
        // Calculate stock status for each product
        const products = productsResult.map(product => ({
            ...product,
            stock_status: product.stok_minimal > 0 && product.total_stok < product.stok_minimal ? 'low' : 
                         product.total_stok === 0 ? 'out' : 'normal',
            margin: product.harga_jual_umum && product.harga_beli ? 
                   ((product.harga_jual_umum - product.harga_beli) / product.harga_beli * 100).toFixed(2) : null
        }));
        
        console.log(`✅ Found ${productsResult.length} products, Total: ${totalItems}`);
        
        res.json({
            products,
            pagination: {
                current_page: page,
                total_pages: totalPages,
                total_items: totalItems,
                items_per_page: limit,
                has_next: page < totalPages,
                has_prev: page > 1
            },
            filters: {
                search,
                category,
                low_stock: lowStock
            }
        });
        
    } catch (error) {
        console.error('Products API error:', error);
        
        // Fallback data
        const fallbackProducts = [
            {
                barcode: '8888000000001',
                kd_produk: 'P001',
                nama_produk: 'Contoh Produk A',
                satuan: 'PCS',
                kategori: 'MAKANAN',
                sub_kategori: 'Snack',
                harga_beli: 5000,
                harga_jual_umum: 7000,
                harga_jual_member: 6500,
                harga_jual_grosir: 6000,
                stok_toko: 50,
                stok_gudang: 100,
                stok_minimal: 10,
                total_stok: 150,
                stock_status: 'normal',
                margin: '40.00',
                distributor_code: 'D001',
                last_update: new Date().toISOString()
            },
            {
                barcode: '8888000000002',
                kd_produk: 'P002',
                nama_produk: 'Contoh Produk B',
                satuan: 'BOX',
                kategori: 'MINUMAN',
                sub_kategori: 'Soft Drink',
                harga_beli: 25000,
                harga_jual_umum: 35000,
                harga_jual_member: 32000,
                harga_jual_grosir: 30000,
                stok_toko: 5,
                stok_gudang: 2,
                stok_minimal: 20,
                total_stok: 7,
                stock_status: 'low',
                margin: '40.00',
                distributor_code: 'D002',
                last_update: new Date().toISOString()
            }
        ];
        
        res.json({
            products: fallbackProducts,
            pagination: {
                current_page: 1,
                total_pages: 1,
                total_items: fallbackProducts.length,
                items_per_page: 20,
                has_next: false,
                has_prev: false
            },
            error: 'Using fallback data: ' + error.message
        });
    }
});

// Product detail endpoint
app.get('/api/products/:productId', async (req, res) => {
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
            ORDER BY DATE(pd.tgl_jual) DESC
            LIMIT 30
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
