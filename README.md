# Ruang Rupa — MVP furniture custom

Website berbahasa Indonesia dengan katalog, detail, konfigurator 2D, penyimpanan permintaan penawaran ke SQLite, dan dashboard admin untuk tindak lanjut. Dibangun dari brief `instructions.md`, dengan audit sampel Pickawood yang dipisahkan dari asumsi desain.

**Status: MVP lokal, identitas/katalog contoh. Belum dipublikasikan dan bukan layanan usaha aktif.** Tidak ada tarif, pembayaran, pesan WhatsApp, email, atau janji produksi otomatis.

## Menjalankan

Memerlukan **Node.js 24 atau lebih baru**. Tidak ada dependency eksternal dan tidak memerlukan `npm install`.

```powershell
cd C:\Users\user\Documents\ChatGPT\web_e-commerce
node server.mjs
```

Buka **http://127.0.0.1:4173**. Gunakan alamat ini apabila `localhost` tidak bekerja pada browser perangkat Anda. Server hanya menerima koneksi lokal. Hentikan dengan Ctrl+C.

Jika npm tersedia, `npm run dev` atau `npm start` melakukan hal yang sama. Pada lingkungan pengerjaan ini, `node` tersedia tetapi perintah `npm` tidak ditemukan; perintah langsung Node telah diuji.

Port opsional melalui environment `PORT`. Lokasi database opsional melalui `DB_PATH`. Default data adalah `data/requests.sqlite`, relatif terhadap lokasi server, dan otomatis dibuat. Jangan menaruh database di `public/` atau membagikannya karena berisi data formulir.

## Build dan pemeriksaan

```powershell
node scripts/check.mjs
node --test tests/core.test.mjs tests/http.test.mjs tests/admin.test.mjs
node scripts/build.mjs
node dist/server.mjs
```

Build menghasilkan paket `dist/public`, `dist/src`, dan `dist/server.mjs`. Matikan server pengembangan sebelum menjalankan paket di port yang sama. Database paket build berada di `dist/data/` kecuali `DB_PATH` diatur secara eksplisit. Build tidak menghapus database. Jangan menghapus `dist/` apabila menyimpan data penting di sana.

`npm run lint`, `npm test`, dan `npm run build` juga tersedia bila npm terpasang. Lint pada proyek ini adalah pemeriksaan sintaks semua modul dengan `node --check`, bukan ESLint. Tes HTTP menggunakan loopback port 4189 dan 4192 serta database sementara; perlu izin loopback di lingkungan sandbox.

## Mengaktifkan dashboard admin

Jalankan sekali, dari folder proyek:

```powershell
node scripts/admin-setup.mjs
node server.mjs
```

Perintah pertama membuat password acak dan menampilkannya **sekali** di terminal. Simpan di pengelola password. File `data/admin-auth.json` hanya berisi salt/hash scrypt dan diabaikan Git. Tidak ada password bawaan. Bila server sudah berjalan, hentikan terlebih dahulu lalu mulai ulang setelah setup.

Buka **http://127.0.0.1:4173/admin** untuk login, mencari permintaan, melihat konfigurasi/kontak, mengubah status, dan mencatat tindak lanjut. Dashboard tidak mengirim pesan atau memulai produksi. Jika menjalankan paket build, gunakan `node dist/scripts/admin-setup.mjs`, lalu `node dist/server.mjs`; data dan pengaturan default paket build berada di `dist/data/`.

Panduan lengkap, konfigurasi, pemulihan akses, serta batas keamanan ada pada [panduan admin](docs/ADMIN.md).

## Fitur selesai

- Beranda, katalog enam model, empat kategori, pencarian, filter material/kategori, sorting, pagination, query URL, dan empty state.
- Halaman produk dengan tiga ilustrasi, zoom dialog, spesifikasi, accordion, dan produk terkait.
- Konfigurasi ukuran/material/finishing/opsi/jumlah dengan preview 2D dan review sebelum form.
- Konfigurasi bertahan di browser; kontak tidak masuk localStorage.
- Validasi ulang server, ID tersimpan, snapshot katalog/konfigurasi, pencegahan duplikasi, serta error/retry yang mempertahankan isian.
- Halaman material, FAQ, kontak yang transparan, dan penjelasan status demo.
- Tampilan diperiksa pada viewport 360, 390, 768, 1024, dan 1440 px.
- Dashboard admin: login/logout, sesi kedaluwarsa, statistik, pencarian/filter/pagination, detail snapshot dan kontak, status, catatan internal, riwayat perubahan, dan penolakan konflik revisi.

## Lokasi perubahan konten

Katalog dan kompatibilitas: `public/catalog.mjs`. Identitas/navigasi/footer: `public/index.html`; konten halaman: `public/app.mjs`; desain: `public/styles.css`; ilustrasi: `public/art.mjs`. Data contoh tidak boleh dianggap batas produksi atau katalog yang disetujui.

Database menyimpan nomor/status, waktu, idempotency key, hash, dan snapshot JSON. API pembacaan dan pembaruan pelanggan hanya tersedia setelah login admin. Pemilik perangkat juga dapat memeriksa SQLite dengan alat lokal yang dipercaya. Dua permintaan sintetis dari uji browser MVP mungkin ada di database pengembangan; keduanya memakai alamat `example.com` dan bukan permintaan pelanggan. Uji browser admin menggunakan database sintetis terpisah di `data/qa-admin/`, bukan database permintaan utama.

## Dokumentasi dan bukti

- [Audit referensi](REFERENCE_AUDIT.md): URL, bukti, keterbatasan, dan adaptasi.
- [Spesifikasi implementasi](docs/IMPLEMENTATION_SPEC.md): scope, arsitektur, data, desain, dan prasyarat produksi.
- [Hasil verifikasi](docs/VERIFICATION.md): pengujian aktual dan batasannya.
- [Panduan admin](docs/ADMIN.md): aktivasi, penggunaan, keamanan, dan batas cakupan P1.
- `docs/screenshots/`: screenshot referensi dan implementasi.
- `docs/responsive-results.json`: ukuran viewport/client/scroll untuk 25 kombinasi halaman/viewport.

Semua ilustrasi dibuat sebagai SVG orisinal untuk proyek ini. Tidak menggunakan logo, foto produk, testimoni, atau sertifikasi Pickawood. Tidak menyalin aturan harga. Nama merek, produk, dimensi, dan opsi merupakan contoh yang mudah diganti.
