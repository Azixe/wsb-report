# WSB Report Dashboard

Dashboard Laporan Inventori Retail dengan backend Express.js dan frontend vanilla JavaScript.

## 🚀 Fitur

- **📊 Bar Chart Omset & Laba** dengan filter rentang tanggal
- **📈 Dashboard Analytics** lengkap dengan berbagai chart dan tabel
- **🔗 Koneksi Database MySQL** untuk data real-time
- **📱 Responsive Design** yang berfungsi di desktop dan mobile
- **🎨 Modern UI/UX** dengan design yang clean dan professional

## 🛠️ Setup & Installation

### Prerequisites
- Node.js (versi 14 atau lebih baru)
- MySQL Server
- Database `toko` (sesuai dengan struktur yang ada)

### Langkah-langkah Installation

1. **Clone atau download project ini**


2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Konfigurasi Database**
   - Pastikan MySQL server berjalan
   - Database `toko` sudah tersedia
   - Update konfigurasi di `server.js` jika diperlukan:
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
   npm start
   ```
   
   Atau untuk development mode dengan auto-reload:
   ```bash
   npm run dev
   ```


## 📡 API Endpoints

Server Express.js menyediakan endpoint berikut:

| Endpoint | Deskripsi |
|----------|-----------|
| `GET /api/stats` | Statistik umum (revenue, produk, order, stok menipis) |
| `GET /api/sales-trend` | Trend penjualan 7 hari terakhir |
| `GET /api/category-sales` | Penjualan per kategori |
| `GET /api/revenue-profit` | Data omset & laba dengan filter tanggal |
| `GET /api/monthly-comparison` | Perbandingan bulanan |
| `GET /api/top-products` | Produk terlaris |
| `GET /api/stock-analysis` | Analisis stok |
| `GET /api/recent-transactions` | Transaksi terbaru |
| `GET /api/top-selling-products` | Produk terlaris dengan detail |

### Contoh penggunaan API Revenue-Profit:
```
GET /api/revenue-profit?start_date=2024-06-01&end_date=2024-06-30
```
- **Font Awesome**: Icons
- **Google Fonts**: Typography

## Fitur Responsive

- **Desktop**: Layout penuh dengan sidebar dan konten utama
- **Tablet**: Adaptasi layout untuk layar medium
- **Mobile**: Sidebar yang dapat diciutkan, layout stack vertikal

## Komponen Dashboard

### Cards Statistik
- Total Pendapatan dengan persentase perubahan
- Jumlah Produk dengan trend
- Pesanan Hari Ini
- Alert Stok Menipis

### Grafik
- **Sales Chart**: Menampilkan tren penjualan 7 hari terakhir
- **Category Chart**: Distribusi penjualan per kategori produk

### Tabel
- **Produk Terlaris**: Menampilkan produk dengan penjualan tertinggi
- **Transaksi Terbaru**: Log transaksi real-time dengan status

### Navigasi
- Dashboard
- Produk
- Inventori
- Penjualan
- Laporan
- Supplier
- Pengaturan

## Customization

### Mengubah Warna Tema
Edit variabel CSS di file `style.css`:
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

## Future Enhancements

- [ ] Integrasi dengan database real
- [ ] Export data ke PDF/Excel
- [ ] Multi-user support dengan roles
- [ ] Dark mode theme
- [ ] Push notifications
- [ ] PWA (Progressive Web App) support
- [ ] Inventory forecasting
- [ ] Barcode scanning integration

## Lisensi

Project ini dibuat untuk keperluan edukasi dan demonstrasi.

## Kontak

Untuk pertanyaan atau saran, silakan buat issue di repository ini.

## 🎯 Cara Menggunakan Chart Omset & Laba

1. **Akses Dashboard** di `http://localhost:3000`
2. **Scroll ke bawah** untuk melihat section "Omset & Laba"
3. **Pilih rentang tanggal** menggunakan date picker
4. **Klik tombol "Terapkan"** untuk memfilter data
5. **Chart akan update** menampilkan data sesuai rentang tanggal yang dipilih

## 📁 Struktur File

```
wsb-report/
├── server.js              # Express.js server
├── package.json            # Dependencies dan scripts
├── dashboard.html          # Frontend dashboard
├── style.css              # Styling
├── script.js              # Frontend JavaScript
├── api.php                # PHP API (legacy, bisa dihapus)
├── test-revenue-profit.html # Testing tool
└── imgs/                  # Assets gambar
    └── LOGO_WSB_blue.png
```

## 🔧 Troubleshooting

### Server tidak bisa connect ke database
- Pastikan MySQL server berjalan
- Cek konfigurasi database di `server.js`
- Pastikan database `toko` exists
- Jika database kosong, server akan menggunakan data fallback

### Dashboard tidak load data
- Pastikan server Express.js berjalan di port 3000
- Cek console browser untuk error message
- Jika ada CORS error, pastikan server sudah enable CORS

### Chart tidak muncul
- Pastikan Chart.js library ter-load
- Cek console browser untuk JavaScript errors
- Refresh halaman jika diperlukan

## 🆚 Perbandingan PHP vs Express.js

| Aspek | PHP | Express.js |
|-------|-----|------------|
| **Performance** | Good | Excellent |
| **Real-time** | Limited | Native support |
| **Scalability** | Good | Excellent |
| **Modern Features** | Limited | Full ES6+ support |
| **Development Speed** | Fast | Very Fast |
| **Community** | Large | Very Large |

## 📝 Notes

- Backend Express.js menggantikan sepenuhnya PHP API
- Semua endpoint memiliki fallback data jika database tidak tersedia
- Chart menggunakan Chart.js dengan konfigurasi yang responsif
- Date range picker mendukung validasi input
- Semua data tidak dibatasi 5 row (menampilkan data lengkap)

