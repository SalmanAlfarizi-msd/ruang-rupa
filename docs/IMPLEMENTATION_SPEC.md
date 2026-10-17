# Spesifikasi MVP Ruang Rupa

## Ruang lingkup

MVP P0 lokal: beranda, katalog, detail, konfigurator 2D, ringkasan dan formulir penawaran dengan backend persisten. Bantuan/FAQ dan material juga tersedia. Pada 17 Oktober 2026, ditambahkan bagian P1 berupa dashboard pengelolaan permintaan dengan autentikasi. Editor produk/opsi/tarif, akun pelanggan, penawaran harga final, pembayaran, pengiriman terintegrasi, dan 3D/AR belum termasuk.

Tidak melakukan publikasi: deployment belum ditentukan dan data usaha belum disetujui. Nama Ruang Rupa merupakan identitas sementara. Semua enam model, dimensi awal, pilihan, dan aturan kompatibilitas adalah contoh. Tidak ada harga atau testimoni fiktif.

## Sitemap

- `/`: beranda dengan hero, kategori, kurasi produk, proses, material, FAQ, CTA.
- `/katalog`: pencarian nama/jenis, kategori, material, sorting kurasi/A–Z/Z–A, pagination tiga model, filter aktif, reset, empty state.
- `/produk/:slug`: tiga tampilan ilustrasi, modal zoom, spesifikasi, accordion, model terkait.
- `/konfigurasi/:slug?langkah=1..3`: model/ukuran/jumlah → material/finishing/opsi → review.
- `/penawaran`: empty state bila belum memilih; form dan snapshot review; ID setelah respons penyimpanan.
- `/material`, `/bantuan#kontak`, `/tentang`: konten pendukung dan batasan demo.
- `/admin`: halaman terpisah dengan login, daftar dan detail permintaan. API data admin memerlukan autentikasi.
- URL tidak dikenal: halaman 404; server juga mengirim status 404.

## Stack dan pemisahan tanggung jawab

Node.js 24+, native HTTP dan SQLite (`node:sqlite`), JavaScript modules, HTML/CSS, SVG asli. Dipilih karena repository kosong, tidak memerlukan install dependency, dan mendukung persistence server yang dapat diuji. Tidak memakai framework karena ukuran MVP kecil.

- `public/catalog.mjs`: data, opsi, default, validasi bersama browser/server.
- `public/art.mjs`: ilustrasi parametris; ukuran, warna, kedalaman dan opsi kabel/rak memengaruhi preview.
- `public/app.mjs`: routing client, UI, state konfigurasi dan formulir.
- `public/styles.css`: token dan layout responsif.
- `src/store.mjs`: validasi, normalisasi, snapshot, idempotensi, persistence.
- `server.mjs`: routing HTTP, daftar aset eksplisit, header keamanan, batas body dan origin.

## Data dan batasan

Produk, material, finishing, kategori, dan opsi berada pada satu katalog. Snapshot permintaan mencakup produk penuh, konfigurasi, versi katalog, `pricingVersion: null`, `pricingStatus: requires-review`, pelanggan, catatan, dan persetujuan. Perubahan katalog di masa mendatang tidak mengubah snapshot tersimpan.

Dimensi positif dengan presisi 0,1 cm, maksimum input 10.000 cm; jumlah 1–100. Ini **batas representasi/input teknis**, bukan constraint produksi. Tidak menerapkan min/max produksi yang belum dikonfirmasi. Finishing harus sesuai material; opsi harus sesuai model. Seluruh kompatibilitas diberi label demo.

Konfigurasi nonkontak disimpan di localStorage; data kontak dan catatan hanya berada pada memori form sampai submit, lalu SQLite server. Refresh menghapus kontak yang belum dikirim. Endpoint daftar/detail pelanggan memerlukan sesi admin. Database berada di luar public; tidak ada admin tanpa perlindungan. Status/catatan internal disimpan terpisah dari snapshot, dengan riwayat dan pemeriksaan revisi sebelum update.

Idempotency key unik per percobaan permintaan; retry isi yang sama mengembalikan ID yang sama. Key yang sama dengan isi berbeda ditolak 409. Tombol dan field dinonaktifkan saat request berjalan. Kegagalan mempertahankan isian dan memberi pesan; keberhasilan hanya setelah insert SQLite atau retry identik dikonfirmasi.

## Design system

Latar `#fbfaf7`, sand `#f0ede6`, teks `#272c25`, teks sekunder `#666b60`, hijau `#354c3c`, border `#dedfd5`. Font Arial/system sans untuk UI, Georgia/system serif untuk heading. Konten maksimum 1280 px. Grid 1/2/3 kolom sesuai ruang. Header sticky; preview sticky hanya pada layar lebih besar. Menu mobile inline disclosure, bukan dialog. Galeri menggunakan native dialog dengan pengembalian fokus. Focus ring 3 px. SVG dengan accessible name; tidak membutuhkan jaringan pihak ketiga.

Ilustrasi menggantikan foto karena aset pemilik belum diberikan. Tidak ada galeri hasil pengerjaan palsu. Optimasi gambar berupa SVG vektor lokal, bukan download foto beresolusi besar. Tidak memakai lazy-load bitmap karena tidak ada bitmap konten. Pagination membatasi jumlah kartu.

## Yang diperlukan untuk produksi

Konfirmasi nama/identitas, katalog, foto berizin, aturan konstruksi dan harga, kontak, workflow tindak lanjut, pengiriman dan kebijakan data. Untuk deployment: perluasan autentikasi admin lokal ke infrastruktur produksi, TLS, pembatasan trafik publik, backup/retensi database, monitoring, dan notifikasi sesuai layanan terpilih. Server MVP sengaja hanya bind loopback; aplikasi ini belum merupakan toko publik. Rincian dashboard ada pada `ADMIN.md`.
