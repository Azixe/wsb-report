# WSB Report Dashboard

Dashboard Laporan Inventori Retail dengan backend Express.js dan frontend vanilla JavaScript yang terhubung ke database MySQL.

## 🚀 Fitur

- **� Sistem Login** dengan autentikasi database (MD5 hash)
- **� Revenue Card Premium** dengan row terpisah untuk nominal besar
- **� Chart Omset & Laba** dengan filter rentang tanggal real-time
- **📱 Layout Responsif** - Chart dan tabel side-by-side di desktop, stack di mobile
- **🗄️ Database Integration** dengan MySQL untuk data real-time
- **🎨 Modern UI/UX** dengan CSS modular dan design yang clean
- **⚡ Real-time Updates** dari backend Express.js

## 🛠️ Setup & Installation

### Prerequisites
- Node.js (versi 14 atau lebih baru)
- MySQL Server
- Database `toko` (sesuai dengan struktur yang ada)

### Langkah-langkah Installation

1. **Clone atau download project ini**

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   ```

3. **Konfigurasi Database**
   - Pastikan MySQL server berjalan
   - Database `toko` sudah tersedia dengan struktur sesuai dokumentasi
   - Update konfigurasi di `backend/server.js` jika diperlukan:
     ```javascript
     const dbConfig = {
         host: 'localhost',
         port: 3306,
         user: 'root',
         password: '', // Ganti dengan password MySQL Anda
         database: 'toko'
     };
     ```

4. **Jalankan server**
   ```bash
   cd backend
   npm start
   ```
   
   Atau untuk development mode dengan auto-reload:
   ```bash
   cd backend
   npm run dev
   ```

5. **Akses Dashboard**
   - Dashboard: http://localhost:3002
   - API: http://localhost:3002/api
   - Login dengan credential yang tersedia di database


## 📡 API Endpoints

Server Express.js menyediakan endpoint berikut:

| Endpoint | Deskripsi |
|----------|-----------|
| `POST /api/auth/login` | Autentikasi login dengan username/password |
| `GET /api/stats` | Statistik umum (revenue, produk, order, stok menipis) |
| `GET /api/revenue-profit` | Data omset & laba dengan filter tanggal |

### Contoh penggunaan API:

**Login:**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}
```

**Revenue-Profit dengan filter tanggal:**
```
GET /api/revenue-profit?start_date=2024-06-01&end_date=2024-06-30
```
## 💻 Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js + Express.js  
- **Database**: MySQL
- **Charts**: Chart.js
- **Authentication**: MD5 password hashing
- **Icons**: Font Awesome
- **Styling**: CSS Modular (base.css, login.css, dashboard-v2.css)

## 🎨 Design Features

- **Responsive Layout**: Desktop sidebar + main content, mobile stack layout
- **Premium Revenue Card**: Dedicated row dengan styling yang prominent
- **Side-by-side Layout**: Chart dan tabel bersebelahan di desktop
- **Modern CSS**: Gradients, shadows, hover effects
- **Clean Typography**: Professional font hierarchy

## Fitur Responsive

- **Desktop**: Layout penuh dengan sidebar dan konten utama
- **Tablet**: Adaptasi layout untuk layar medium
- **Mobile**: Sidebar yang dapat diciutkan, layout stack vertikal

## 📊 Komponen Dashboard

### Revenue Section
- **Total Pendapatan**: Card premium dengan row terpisah untuk nominal besar
- **Typography besar**: Font 3rem untuk readability nominal milyaran
- **White theme**: Styling konsisten dengan design system

### Stats Grid  
- **Total Produk**: Jumlah produk dari database
- **Pesanan Hari Ini**: Transaksi hari ini dari `penjualan_fix`
- **Stok Menipis**: Alert produk dengan stok < minimal

### Content Grid
- **Chart Section**: Bar chart omset & laba dengan filter tanggal
- **Table Section**: Data tabel omset/laba dengan scroll
- **Responsive**: Side-by-side di desktop, stack di mobile

### Login System
- **Database Authentication**: Username/password dengan MD5 hash
- **User Level Display**: Menampilkan level user (ADMIN, USER, etc.)
- **Session Management**: LocalStorage untuk state management

## Customization

### Mengubah Warna Tema
Edit variabel CSS di file `css/base.css`:
```css
:root {
    --primary-color: #3498db;
    --secondary-color: #2ecc71;
    --danger-color: #e74c3c;
    --warning-color: #f39c12;
}
```

### Menambah Data
Edit array data di file `script.js`:
```javascript
// Data untuk grafik penjualan
const salesData = [12, 19, 15, 25, 22, 18, 20];

// Data untuk kategori
const categoryData = [35, 25, 20, 15, 5];
```

### Mengubah Bahasa
Semua teks dapat diubah langsung di file HTML atau dengan membuat file konfigurasi bahasa.

## Browser Support

- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

## Demo Features

- **Real-time Updates**: Simulasi update data setiap 30 detik
- **Interactive Charts**: Hover effects dan tooltips
- **Responsive Tables**: Scroll horizontal untuk data yang banyak
- **Loading States**: Animasi loading untuk better UX
- **Error Handling**: Validasi form dan error messages

## 🚀 Future Enhancements

- [ ] **Export functionality**: PDF/Excel export untuk laporan
- [ ] **More chart types**: Pie chart kategori, line chart trends  
- [ ] **Advanced filters**: Filter by category, product, payment method
- [ ] **Dark mode**: Theme switcher untuk user preference
- [ ] **Real-time notifications**: WebSocket untuk update real-time
- [ ] **Mobile app**: PWA conversion untuk mobile experience
- [ ] **Multi-branch support**: Support untuk multiple cabang/toko
- [ ] **Advanced analytics**: Forecasting, trend analysis, insights

## Lisensi

Project ini dibuat untuk keperluan edukasi dan demonstrasi.

## Kontak

Untuk pertanyaan atau saran, silakan buat issue di repository ini.

## 🎯 Cara Menggunakan

### Login
1. **Akses** `http://localhost:3002`
2. **Login** dengan kredensial yang tersedia di database
3. **Dashboard** akan terbuka setelah autentikasi berhasil

### Filter Data Omset & Laba
1. **Pilih tanggal mulai** di date picker kiri
2. **Pilih tanggal selesai** di date picker kanan  
3. **Klik "Terapkan"** untuk memfilter data
4. **Chart dan tabel** akan update dengan data sesuai rentang tanggal

### Responsive Usage
- **Desktop**: Chart dan tabel side-by-side dengan full features
- **Tablet**: Layout tetap side-by-side dengan spacing disesuaikan
- **Mobile**: Chart dan tabel stack vertikal untuk kemudahan akses

## 📁 Struktur File

```
wsb-report/
├── backend/               # Backend Express.js server
│   ├── server.js          # Main server file
│   ├── package.json       # Backend dependencies
│   ├── package-lock.json  # Lock file
│   ├── node_modules/      # Backend dependencies
│   └── README.md          # Backend documentation
├── css/                   # Frontend CSS files
│   ├── base.css           # Base styles dan variabel
│   ├── login.css          # Login page styles
│   └── dashboard-v2.css   # Dashboard styles
├── imgs/                  # Assets gambar
│   └── LOGO_WSB_blue.png
├── index.html             # Login page
├── dashboard.html         # Frontend dashboard
├── script.js              # Frontend JavaScript
└── README.md              # Main documentation
```

## 🔧 Troubleshooting

### Server tidak bisa connect ke database
- Pastikan MySQL server berjalan di port 3306
- Cek konfigurasi database di `backend/server.js`
- Pastikan database `toko` exists dengan struktur sesuai dokumentasi
- Jika database kosong, server akan menggunakan data fallback

### Login gagal
- Pastikan user dengan password MD5 hash yang benar ada di tabel `user`
- Cek endpoint `/api/auth/login` di browser network tab
- Pastikan server backend berjalan di port 3002

### Dashboard tidak load data
- Pastikan server Express.js berjalan di port 3002 (bukan 3000)
- Cek console browser untuk error message  
- Cek API calls di browser network tab
- Jika ada CORS error, server sudah include CORS middleware

### Chart tidak muncul
- Pastikan Chart.js library ter-load dari CDN
- Cek console browser untuk JavaScript errors
- Refresh halaman dan cek network tab untuk failed requests
- Pastikan canvas element dengan id `revenueProfitChart` ada

## 🗄️ Database Schema

Project ini menggunakan database MySQL dengan nama `toko` yang memiliki struktur lengkap untuk sistem POS/retail:

### Tabel Utama:
- **`user`**: Data pengguna dengan autentikasi MD5
- **`penjualan_fix`**: Header transaksi penjualan
- **`penjualan_det`**: Detail item per transaksi  
- **`produk`**: Master data produk dengan stok
- **`pecah_stok`**: Harga dan stok detail per satuan
- **`kategori`**: Kategori produk
- **`distributor`**: Data supplier

### Data yang Digunakan Dashboard:
- **Total Pendapatan**: `SUM(grand_total)` dari `penjualan_fix`
- **Omset & Laba**: Join `penjualan_fix` + `penjualan_det` untuk kalkulasi laba
- **Total Produk**: `COUNT(*)` dari `produk`  
- **Stok Menipis**: Produk dengan `stok_toko < stok_minimal`

*Referensi database structure tersedia di folder `db_structure_referrence/` (excluded dari git)*

## 📝 Notes & Architecture

### Backend Architecture
- **Modular structure**: File backend terpisah di folder `backend/`
- **Clean API endpoints**: RESTful design dengan proper error handling
- **Database fallback**: Jika database tidak tersedia, menggunakan sample data
- **MD5 Authentication**: Password hashing sesuai sistem existing

### Frontend Architecture  
- **Vanilla JavaScript**: No framework dependency, lightweight
- **Modular CSS**: Terpisah antara base, login, dan dashboard styles
- **Responsive first**: Mobile-friendly design dari awal
- **API-driven**: Semua data dari backend API calls

### Security Features
- **MD5 password hashing**: Sesuai dengan sistem database existing
- **Session management**: LocalStorage untuk state persistence  
- **CORS enabled**: Cross-origin requests handled properly
- **Input validation**: Client-side dan server-side validation

### Performance Optimizations
- **Chart.js optimized**: maintainAspectRatio false untuk responsive
- **Efficient queries**: Database query optimization untuk performa
- **CDN resources**: Font Awesome dan Chart.js dari CDN
- **Minimal dependencies**: Lightweight stack untuk fast loading

