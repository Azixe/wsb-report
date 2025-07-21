# WSB Report Dashboard

Dashboard Laporan Inventori Retail dengan backend Express.js dan frontend vanilla JavaScript yang terhubung ke database MySQL.

##  Fitur

- **Dashboard Analytics** dengan revenue, profit, dan kategori sales
- **Performa Operator** - Analisis kinerja operator dengan chart dan tabel
- **Category Sales Analysis** - Top 5 kategori dengan breakdown produk
- **Revenue & Profit Tracking** dengan filter rentang tanggal
- **Layout Responsif** - Optimized untuk desktop dan mobile
- **Database Integration** dengan MySQL untuk data real-time
- **Modern UI/UX** dengan CSS Grid dan design yang clean
- **Real-time Data Loading** dari backend Express.js APIDashboard

Dashboard Laporan Inventori Retail dengan backend Express.js dan frontend vanilla JavaScript yang terhubung ke database MySQL.

##  Prerequisites & Setup

### Prerequisites
- **Node.js** (versi 16 atau lebih baru)
- **MySQL Server** (versi 5.7 atau lebih baru)
- **Database `toko`** dengan struktur tabel yang sesuai:
  - `penjualan_fix` - Header transaksi penjualan
  - `penjualan_det` - Detail item per transaksi
  - `pecah_stok` - Master produk dengan kategori
  - `produk` - Data stok produk

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

| Endpoint | Method | Deskripsi |
|----------|---------|-----------|
| `/api/revenue-profit` | GET | Data omset & laba dengan filter tanggal |
| `/api/categories` | GET | Daftar kategori produk |
| `/api/category-sales` | GET | Detail penjualan per kategori |
| `/api/category-sales-summary` | GET | Summary penjualan semua kategori (top 5) |
| `/api/user-sales` | GET | Performa penjualan per operator |
| `/api/user-individual-sales` | GET | Detail penjualan operator individual |
| `/api/users` | GET | Daftar operator/user |
| `/api/daily-sales-trend` | GET | Trend penjualan harian |
| `/api/weekly-sales-trend` | GET | Trend penjualan mingguan |
| `/api/product/:productId` | GET | Detail produk dan analytics |

### Contoh penggunaan API:

**Revenue-Profit dengan filter tanggal:**
```
GET /api/revenue-profit?start_date=2025-01-01&end_date=2025-01-31
```

**Category Sales Summary (Top 5):**
```
GET /api/category-sales-summary?start_date=2025-01-01&end_date=2025-01-31
```

**User Sales Performance:**
```
GET /api/user-sales?start_date=2025-01-01&end_date=2025-01-31
```
##  Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3 Grid
- **Backend**: Node.js + Express.js  
- **Database**: MySQL
- **Charts**: Chart.js
- **Styling**: CSS Grid, Flexbox, Responsive Design
- **Dependencies**: mysql2, cors, express

##  Dashboard Features

### Revenue & Profit Analytics
- **Monthly Revenue Tracking**: Bar chart dengan data omset dan laba bulanan
- **Date Range Filtering**: Filter data berdasarkan rentang tanggal
- **Real-time Updates**: Data langsung dari database MySQL

### Category Sales Analysis  
- **Top 5 Categories**: Pie chart kategori dengan penjualan tertinggi
- **Product Breakdown**: Detail produk per kategori dengan omset dan laba
- **Interactive Charts**: Chart yang responsive dan interactive

### Operator Performance (User Sales)
- **Sales Leaderboard**: Ranking operator berdasarkan total penjualan
- **Individual Analysis**: Breakdown produk per operator
- **Transaction Analytics**: Total transaksi dan nilai penjualan

### Product Analytics
- **Daily/Weekly Trends**: Analisis trend penjualan produk
- **Stock Analytics**: Monitoring stok dan performa produk
- **Detailed Reports**: Comprehensive product performance data

##  Responsive Design

- **Desktop**: Full sidebar layout dengan navigation dan content grid
- **Tablet**: Responsive grid dengan adjusted spacing
- **Mobile**: Stacked layout dengan collapsible navigation


##  Database Schema

Project ini menggunakan database MySQL dengan nama `toko` yang memiliki struktur untuk sistem POS/retail:

### Tabel Utama:
- **`penjualan_fix`**: Header transaksi penjualan (operator, tanggal, total)
- **`penjualan_det`**: Detail item per transaksi (produk, qty, harga, laba)
- **`pecah_stok`**: Master produk dengan kategori dan harga
- **`produk`**: Data stok produk
- **`kategori`**: Master kategori produk

### Query Analytics:
- **Revenue & Profit**: JOIN `penjualan_fix` + `penjualan_det` untuk kalkulasi bulanan
- **Category Sales**: JOIN `pecah_stok` + `penjualan_det` untuk breakdown kategori  
- **User Performance**: GROUP BY operator dari `penjualan_fix` untuk analytics kinerja
- **Product Analytics**: Aggregasi data penjualan per produk dengan stok

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
- **SQL optimization**: Query sudah dioptimasi dengan proper indexing


## Kontributor
<a href="https://github.com/Azixe/wsb-report/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Azixe/wsb-report"  alt="wsb-report Contributors"/>
</a>

