# WSB Report Backend

Backend server untuk sistem laporan WSB menggunakan Express.js dan MySQL.

## 🚀 Cara Menjalankan

### Prerequisites
- Node.js (versi 14 atau lebih tinggi)
- MySQL Server
- Database `toko` dengan tabel yang sesuai

### Instalasi
```bash
cd backend
npm install
```

### Menjalankan Server
```bash
npm start
# atau
node server.js
```

Server akan berjalan di: `http://localhost:3002`

## 📁 Struktur File

```
backend/
├── server.js              # Main Express.js server
├── package.json            # Dependencies dan scripts
├── package-lock.json       # Lock file
├── node_modules/           # Dependencies
└── README.md              # Dokumentasi backend
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - Login user dengan username/password

### Data API
- `GET /api/stats` - Statistik umum dashboard
- `GET /api/revenue-profit` - Data omset & laba dengan filter tanggal

### Parameters
- `start_date` - Tanggal mulai (format: YYYY-MM-DD)
- `end_date` - Tanggal selesai (format: YYYY-MM-DD)

## 🗄️ Database Configuration

Server menggunakan MySQL dengan konfigurasi default:
- Host: localhost
- Port: 3306
- Database: toko
- User: root
- Password: (sesuaikan dengan setup MySQL Anda)

*Edit konfigurasi database di file `server.js` sesuai dengan setup lokal Anda.*

### Tabel yang Digunakan
- `user` - Data user untuk login
- `penjualan_fix` - Data transaksi penjualan
- `produk` - Data produk

## 🔧 Environment

### Development
```bash
NODE_ENV=development
PORT=3002
```

### Production
Pastikan untuk mengatur:
- Database credentials yang aman
- CORS policy yang sesuai
- Error handling yang proper

## 📊 Features

- ✅ REST API untuk dashboard data
- ✅ Authentication dengan MD5 password hash
- ✅ CORS enabled untuk frontend
- ✅ Error handling dan fallback data
- ✅ Static file serving untuk frontend
- ✅ MySQL connection pooling

## 🛠️ Troubleshooting

### Database Connection Error
- Pastikan MySQL server berjalan
- Cek konfigurasi database di `server.js`
- Pastikan database `toko` exists

### Port Already in Use
- Ganti PORT di `server.js` jika port 3002 sudah digunakan
- Update `API_BASE` di frontend sesuai port baru

### CORS Issues
- Server sudah menggunakan `cors()` middleware
- Jika masih ada masalah, cek origin yang diizinkan
