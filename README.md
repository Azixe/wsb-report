# WSB Report Dashboard
<img width="1918" height="971" alt="Image" src="https://github.com/user-attachments/assets/bb978b92-026e-45df-aa1d-1a1ad10248ad" />
Dashboard Laporan Inventori Retail dengan backend Express.js dan frontend vanilla JavaScript yang terhubung ke database MySQL.

##  Fitur

- **Unified Branch Filtering** - Satu dropdown cabang mengontrol semua chart dan data
- **Standardized Revenue Calculation** - Konsistensi data antara card omset dan overview chart
- **Dashboard Analytics** dengan revenue, profit, dan kategori sales per cabang
- **Multi-Branch Support** - Support untuk multiple cabang/outlet dengan filtering
- **Performa Operator** - Analisis kinerja operator per cabang dengan chart dan tabel
- **Category Sales Analysis** - Top kategori dengan breakdown produk per cabang
- **Revenue & Profit Tracking** dengan filter rentang tanggal dan cabang
- **Layout Responsif** - Optimized untuk desktop dan mobile
- **Database Integration** dengan MySQL untuk data real-time multi-cabang
- **Modern UI/UX** dengan CSS Grid dan design yang clean
- **Real-time Data Loading** dari backend Express.js API dengan caching
- **Query Optimization** - In-memory caching dan optimized SQL queries

Dashboard Laporan Inventori Retail dengan backend Express.js dan frontend vanilla JavaScript yang terhubung ke database MySQL.

##  Prerequisites & Setup

### Prerequisites
- **Node.js** (versi 16 atau lebih baru)
- **MySQL Server** (versi 5.7 atau lebih baru)

> ⚠️ **PERINGATAN DATABASE PERFORMANCE**: 
> Project ini **direkomendasikan menggunakan MySQL** untuk performa optimal. 
> **MariaDB akan mengalami query yang lambat** karena perbedaan optimizer dan query execution plan. 
> Jika harus menggunakan MariaDB, harap siapkan waktu loading yang lebih lama.

- **Database `toko`** dengan struktur tabel yang sesuai:
  - `penjualan_fix` - Header transaksi penjualan (no_faktur_jual, tgl_jual, grand_total, operator, kd_cabang)
  - `penjualan_det` - Detail item per transaksi (no_faktur_jual, kd_produk, nama_produk, jumlah, total, netto, h_beli, retur)
  - `pecah_stok` - Master produk dengan kategori (kd_produk, nama_produk, kategori, harga_jual_umum, harga_beli)
  - `produk` - Data stok produk (kd_produk, stok_toko, stok_gudang, stok_minimal)
  - `cabang` - Master cabang/outlet (kd_cabang, nama_cabang)
  - `kategori` - Master kategori produk (kd_kategori, nama_kategori)

### Installation & Running

1. **Clone repository**
   ```bash
   git clone https://github.com/Azixe/wsb-report.git
   cd wsb-report
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   ```

3. **Konfigurasi Database**
   - Pastikan MySQL server berjalan di port 3306
   - Database `toko` sudah tersedia dengan struktur sesuai
   - Update konfigurasi di `backend/server.js` jika diperlukan:
     ```javascript
     const dbConfig = {
         host: 'localhost',
         port: 3306,
         user: 'root',
         password: '', // Sesuaikan dengan password MySQL Anda
         database: 'toko'
     };
     ```

4. **Jalankan Backend Server**
   ```bash
   cd backend
   node server.js
   ```

5. **Akses Dashboard**
   - Dashboard: http://localhost:3002
   - API Endpoints: http://localhost:3002/api


##  API Endpoints

Server Express.js menyediakan endpoint berikut:

| Endpoint | Method | Deskripsi | Parameters |
|----------|---------|-----------|------------|
| `/api/revenue-profit` | GET | Data omset & laba dengan filter tanggal dan cabang | `start_date`, `end_date`, `kd_cabang` |
| `/api/categories` | GET | Daftar kategori produk | - |
| `/api/category-sales` | GET | Detail penjualan per kategori | `category_id`, `start_date`, `end_date`, `kd_cabang` |
| `/api/category-sales-summary` | GET | Summary penjualan semua kategori (overview chart) | `start_date`, `end_date`, `kd_cabang` |
| `/api/user-sales` | GET | Performa penjualan per operator | `start_date`, `end_date`, `kd_cabang` |
| `/api/user-individual-sales` | GET | Detail penjualan operator individual | `operator`, `start_date`, `end_date`, `kd_cabang` |
| `/api/users` | GET | Daftar operator/user per cabang | `kd_cabang` |
| `/api/cabang` | GET | Daftar cabang/outlet | - |
| `/api/daily-sales-trend` | GET | Trend penjualan harian | `start_date`, `end_date`, `days`, `kd_cabang` |
| `/api/weekly-sales-trend` | GET | Trend penjualan mingguan | `weeks`, `kd_cabang` |
| `/api/product/:productId` | GET | Detail produk dan analytics | - |
| `/api/cache/clear` | POST | Clear query cache | - |
| `/api/cache/stats` | GET | Cache statistics | - |

### Contoh penggunaan API:

**Revenue-Profit dengan filter tanggal dan cabang:**
```
GET /api/revenue-profit?start_date=2025-01-01&end_date=2025-01-31&kd_cabang=1
```

**Category Sales Summary (Overview Chart):**
```
GET /api/category-sales-summary?start_date=2025-01-01&end_date=2025-01-31&kd_cabang=1
```

**User Sales Performance dengan filter cabang:**
```
GET /api/user-sales?start_date=2025-01-01&end_date=2025-01-31&kd_cabang=1
```

**Daftar Cabang:**
```
GET /api/cabang
```

**Daily Sales Trend dengan filter cabang:**
```
GET /api/daily-sales-trend?start_date=2025-01-01&end_date=2025-01-31&kd_cabang=1
```

**Category Sales Detail:**
```
GET /api/category-sales?category_id=MAKANAN&start_date=2025-01-01&end_date=2025-01-31&kd_cabang=1
```
##  Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3 Grid
- **Backend**: Node.js + Express.js  
- **Database**: MySQL
- **Charts**: Chart.js
- **Styling**: CSS Grid, Flexbox, Responsive Design
- **Dependencies**: mysql2, cors, express

##  Dashboard Features

### Unified Branch Filtering System
- **Single Branch Selector**: Satu dropdown cabang yang mengontrol semua chart dan data
- **Consistent Data Display**: Semua section dashboard menampilkan data yang konsisten untuk cabang terpilih
- **Real-time Updates**: Perubahan cabang langsung memperbarui seluruh dashboard

### Revenue & Profit Analytics
- **Standardized Revenue Calculation**: Menggunakan `penjualan_fix.grand_total` untuk konsistensi data
- **Monthly Revenue Tracking**: Bar chart dengan data omset dan laba bulanan
- **Branch-specific Filtering**: Filter data berdasarkan cabang dan rentang tanggal
- **Accurate Total Display**: Card omset dan overview chart menampilkan angka yang sama

### Category Sales Analysis  
- **Top Categories Overview**: Pie chart kategori dengan penjualan tertinggi per cabang
- **Product Breakdown**: Detail produk per kategori dengan omset dan laba
- **Interactive Charts**: Chart yang responsive dan interactive
- **Proportional Display**: Persentase dihitung berdasarkan total revenue cabang

### Operator Performance (User Sales)
- **Sales Leaderboard**: Ranking operator berdasarkan total penjualan per cabang
- **Individual Analysis**: Breakdown produk per operator
- **Transaction Analytics**: Total transaksi dan nilai penjualan per operator
- **Branch-specific Performance**: Analisis performa operator per cabang

### Product Analytics
- **Daily/Weekly Trends**: Analisis trend penjualan produk per cabang
- **Stock Analytics**: Monitoring stok dan performa produk
- **Detailed Reports**: Comprehensive product performance data
- **Cross-branch Comparison**: Perbandingan performa produk antar cabang

##  Responsive Design

- **Desktop**: Full sidebar layout dengan navigation dan content grid
- **Tablet**: Responsive grid dengan adjusted spacing
- **Mobile**: Stacked layout dengan collapsible navigation


##  Database Schema

Project ini menggunakan database MySQL dengan nama `toko` yang memiliki struktur untuk sistem POS/retail multi-cabang:

### Tabel Utama:
- **`penjualan_fix`**: Header transaksi penjualan
  - `no_faktur_jual` (PRIMARY KEY) - Nomor faktur unik
  - `tgl_jual` - Tanggal transaksi
  - `grand_total` - Total nilai transaksi (untuk revenue calculation)
  - `operator` - Nama operator/kasir
  - `kd_cabang` - Kode cabang/outlet

- **`penjualan_det`**: Detail item per transaksi
  - `no_faktur_jual` (FOREIGN KEY) - Referensi ke penjualan_fix
  - `kd_produk` - Kode produk
  - `nama_produk` - Nama produk
  - `jumlah` - Quantity terjual
  - `total` - Total harga item
  - `netto` - Harga netto per unit
  - `h_beli` - Harga beli per unit
  - `retur` - Quantity retur (jika ada)

- **`pecah_stok`**: Master produk dengan kategori
  - `kd_produk` (PRIMARY KEY) - Kode produk unik
  - `nama_produk` - Nama produk
  - `kategori` - Kategori produk (MAKANAN, MINUMAN, dll)
  - `sub_kategori` - Sub kategori produk
  - `harga_jual_umum` - Harga jual retail
  - `harga_beli` - Harga beli dari supplier
  - `satuan` - Unit satuan (PCS, BOX, dll)

- **`produk`**: Data stok produk
  - `kd_produk` (FOREIGN KEY) - Referensi ke pecah_stok
  - `stok_toko` - Stok di toko
  - `stok_gudang` - Stok di gudang utama
  - `stok_gudang_2` - Stok di gudang cadangan
  - `stok_minimal` - Minimum stock level

- **`cabang`**: Master cabang/outlet
  - `kd_cabang` (PRIMARY KEY) - Kode cabang unik
  - `nama_cabang` - Nama cabang/outlet

- **`kategori`**: Master kategori produk
  - `kd_kategori` (PRIMARY KEY) - Kode kategori
  - `nama_kategori` - Nama kategori

### Query Analytics & Performance:
- **Revenue & Profit**: JOIN `penjualan_fix` + `penjualan_det` dengan filtering `kd_cabang`
- **Standardized Revenue**: Menggunakan `penjualan_fix.grand_total` untuk konsistensi
- **Category Sales**: JOIN `pecah_stok` + `penjualan_det` + `penjualan_fix` untuk breakdown kategori per cabang
- **User Performance**: GROUP BY operator dari `penjualan_fix` dengan filter cabang
- **Product Analytics**: Aggregasi data penjualan per produk dengan stok, support multi-cabang
- **Caching System**: In-memory cache (5 menit) untuk optimasi query yang sering digunakan
- **Query Optimization**: Proper indexing dan JOIN optimization untuk performa maksimal

##  Struktur Project

```
wsb-report/
├── backend/
│   ├── server.js          # Express.js server dengan API endpoints
│   └── package.json       # Backend dependencies
├── css/
│   └── dashboard-v2.css   # Styling untuk dashboard
├── imgs/
│   └── LOGO_WSB_blue.png  # Logo assets
├── dashboard.html         # Main dashboard interface  
├── script.js              # Frontend JavaScript logic
└── README.md              # Documentation
```

## Troubleshooting

### Server Issues
- **Port 3306**: Pastikan MySQL berjalan di port default
- **Database connection**: Cek konfigurasi di `backend/server.js`
- **Missing tables**: Server akan log error jika tabel tidak ditemukan

### Dashboard Issues  
- **API calls**: Cek browser network tab untuk failed requests
- **Chart rendering**: Pastikan Chart.js loaded dari CDN
- **Console errors**: Monitor browser console untuk JavaScript errors

### Performance Issues
- **Large datasets**: API menggunakan LIMIT untuk query besar
- **Date ranges**: Filter tanggal untuk membatasi data yang dimuat


## Kontributor
<a href="https://github.com/Azixe/wsb-report/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Azixe/wsb-report"  alt="wsb-report Contributors"/>
</a>

