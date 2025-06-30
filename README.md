# Sistem Manajemen Inventori Retail

Sistem manajemen inventori modern untuk bisnis retail dengan interface berbahasa Indonesia.

## Fitur

### Halaman Login
- **Authentication**: Form login dengan validasi
- **Demo Credentials**: username: `admin`, password: `admin123`
- **Responsive Design**: Tampilan optimal di semua perangkat
- **Modern UI**: Desain gradien yang menarik dengan animasi

### Dashboard
- **Statistik Real-time**: Total pendapatan, produk, pesanan, dan stok menipis
- **Grafik Interaktif**: 
  - Tren penjualan mingguan (Line Chart)
  - Kategori produk terlaris (Doughnut Chart)
- **Tabel Data**:
  - Produk terlaris dengan gambar dan informasi lengkap
  - Transaksi terbaru dengan status
- **Sidebar Navigation**: Menu navigasi yang dapat diciutkan
- **Notifikasi**: Sistem notifikasi real-time
- **Search Function**: Pencarian produk dan kategori

## Struktur File

```
wsb-report/
├── index.html      # Halaman login
├── dashboard.html  # Dashboard utama
├── style.css       # Stylesheet untuk semua halaman
├── script.js       # JavaScript untuk interaktivitas
└── README.md       # Dokumentasi
```

## Cara Menjalankan

1. **Clone atau download** project ini
2. **Buka file** `index.html` di browser web
3. **Login** menggunakan kredensial demo:
   - Username: `admin`
   - Password: `admin123`
4. Setelah login berhasil, Anda akan diarahkan ke dashboard

## Teknologi yang Digunakan

- **HTML5**: Struktur halaman
- **CSS3**: Styling dengan Flexbox, Grid, dan animasi
- **JavaScript (ES6+)**: Interaktivitas dan logika aplikasi
- **Chart.js**: Library untuk grafik interaktif
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
