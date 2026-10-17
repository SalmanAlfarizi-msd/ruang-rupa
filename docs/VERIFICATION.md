# Verifikasi — 16 Oktober 2026 (Asia/Jakarta)

## Pembaruan admin — 17 Oktober 2026

Build dan syntax lint mencakup 13 modul. Seluruh 11 tes lulus: 6 tes MVP dan 5 tes admin, termasuk script setup password yang menolak menimpa konfigurasi lama. Tes admin memeriksa setup/auth, hashing, cookie, kedaluwarsa/logout, pembatasan login, migrasi schema lama tanpa menghapus data, snapshot tidak berubah, validasi catatan/status, konflik revisi, riwayat, search/pagination, endpoint terlindungi, Origin dan CSRF, serta cache no-store.

Tes HTTP admin awalnya memakai port 4190 yang diblokir sebagai port terlarang oleh fetch. Port tes diganti 4192. Sandbox kemudian menolak loopback (EACCES); tes diulang dengan izin jaringan lokal dan lulus.

Uji browser menggunakan database sintetis terpisah di `data/qa-admin/` dan server QA port 4193, tanpa mengubah permintaan utama:

- Login membuka 13 permintaan; halaman kedua berisi 3 permintaan.
- Status dan catatan tersimpan; riwayat menunjukkan revisi 1.
- Sesi kedua memperbarui revisi 2; sesi lama ditolak dengan pesan konflik, dan isi catatan pada form tetap utuh.
- Pencarian tanpa hasil menampilkan empty state; filter Perlu informasi menghasilkan satu permintaan.
- Nama berisi markup `<img ...>` ditampilkan sebagai teks; jumlah elemen gambar yang disuntikkan nol.
- Logout menghilangkan tabel pelanggan dan kembali ke form login. Password salah menampilkan pesan koreksi; password tidak dipertahankan dalam input.
- Daftar/detail diperiksa pada 360, 390, 768, 1024, 1440 px: 10 kombinasi tanpa overflow halaman. Tabel berubah menjadi kartu pada layar kecil. Hasil mentah di `admin-responsive-results.json`.
- Screenshot di `screenshots/admin-list-*.jpg`, `admin-detail-*.jpg`, dan `admin-login-1440.jpg`. Semua kontak dalam screenshot merupakan data sintetis `example.com`.

Belum ada audit keamanan menyeluruh, multiakun staf, uji beban skala besar, atau deployment publik. Admin pengelolaan permintaan selesai; editor produk/tarif dan penerbitan penawaran final belum dibuat. Catatan hasil MVP di bawah ini merupakan rekaman tahap 16 Oktober sebelum admin ditambahkan.

## Hasil aktual

| Pemeriksaan | Hasil |
| --- | --- |
| Syntax lint, `node scripts/check.mjs` | Lulus untuk 9 modul; pemeriksaan sintaks Node, bukan analisis ESLint |
| Build, `node scripts/build.mjs` | Lulus; paket server + UI tersedia di `dist/` |
| Tes unit/storage | 5 tes lulus: default katalog, dimensi/jumlah, kompatibilitas/opsi, pelanggan/persetujuan, persistensi/snapshot/idempotensi/reopen database |
| Tes HTTP | 1 tes integrasi lulus: rute/aset, 404, blok akses file database/source, validasi 422, JSON rusak 400, body besar 413, origin asing 403, submit 201, retry ID sama |
| Browser end-to-end | Konfigurasi Senja 175 × 75 × 40 cm, MDF, Ivory, lubang kabel → review → submit sintetis → ID dari server |
| Kegagalan dan pemulihan | Server dihentikan, form disubmit: pesan gagal, tidak ada sukses, nama tetap `Demo Pemulihan`; setelah restart, retry berhasil |
| Responsif | 25 kombinasi (5 halaman × 5 viewport); scrollWidth tidak melebihi clientWidth |
| Galeri | Thumbnail ukuran dan modal zoom bekerja; Escape menutup; fokus kembali ke tombol pembuka |
| Keyboard/mobile | Menu membuka/menutup dengan aria-expanded; Escape mengembalikan fokus; accordion dapat dibuka dengan Enter; focus ring input terlihat |

Saat tes pertama, sandbox menolak koneksi loopback dengan EACCES. Tes HTTP diulang dengan izin yang sesuai dan lulus. Preview `localhost` timeout; alamat `127.0.0.1` berhasil. Tidak ada perubahan firewall atau pengaturan keamanan sistem.

## Uji interaksi browser

1. Kategori Sideboard menghasilkan dua model dan URL `?kategori=sideboard`.
2. Sorting nama menghasilkan Nara lalu Senja.
3. Pencarian `zz-tidak-ada` menghasilkan empty state dan tautan pemulihan.
4. Reset mengembalikan enam model; halaman kedua menampilkan Nara, Temu, Ranu dan `?halaman=2`.
5. Lebar -5 ditolak dengan pesan koreksi. Lebar 175 diterima dan bertahan setelah navigasi/refresh.
6. Pemilihan MDF mengganti daftar finishing menjadi Sage/Ivory; Ivory dan lubang kabel tampil di review.
7. Submit kosong menampilkan error nama, kontak, kota, dan persetujuan. Data contoh valid berhasil disimpan.
8. Bukti sukses pertama: `RR-C7B9693E-37D2-43F4-8272-2BAFE224A4EA`. Bukti pemulihan: `RR-32D5E7CA-E3C4-4F31-A596-BFC6E3F191B8`. Keduanya data sintetis lokal, bukan pesanan pelanggan.
9. Galeri membuka native dialog; fokus berada di Tutup galeri dan kembali ke Perbesar ilustrasi Senja setelah Escape.
10. Pada 390 px, menu dapat dibuka/ditutup dan accordion dapat dibuka dengan keyboard. Navigasi ulang tidak menghapus konfigurasi valid.

## Bukti responsivitas

Viewport 360×844, 390×844, 768×1000, 1024×1000, 1440×1000. Halaman: beranda, katalog, detail Senja, konfigurasi langkah material, dan penawaran. Browser memakai scrollbar 15 px; clientWidth masing-masing 345, 375, 753, 1009, 1425. Semua scrollWidth sama dengan clientWidth.

Angka mentah: `responsive-results.json`. Screenshot bernama `{home|catalog|product|config|quote}-{width}.jpg` pada `screenshots/`. Pemeriksaan visual langsung mencakup beranda desktop/mobile, katalog desktop, dan konfigurasi mobile/tablet. Pengukuran 25 kombinasi bukan audit manual seluruh piksel atau seluruh opsi pada setiap layar.

Screenshot tambahan: `quote-review-1440.jpg`, `quote-success-1440.jpg`, `quote-failure-1440.jpg`, `config-keyboard-390.jpg`. Screenshot review/sukses memuat data uji sintetis saja.

## Batas verifikasi

- Browser yang diuji: browser dalam aplikasi berbasis Chromium. Safari, Firefox, pembaca layar, perangkat sentuh fisik dan keyboard virtual belum diuji.
- Belum ada audit WCAG menyeluruh, uji beban, pentest, atau deployment publik.
- Preview 2D bersifat ilustratif; proporsi skala ekstrem dapat sulit dilihat. Tidak memverifikasi konstruksi/kelayakan produksi.
- Tidak ada harga produksi yang bisa diuji; yang diverifikasi adalah status peninjauan dan tidak adanya harga rekaan.
- Dashboard admin, akun, checkout, pembayaran, email/WhatsApp, upload, dan 3D tidak dibuat dalam cakupan P0.
- Konfigurasi valid bertahan di browser. Kontak dan catatan belum dikirim hanya bertahan di memori tab; refresh sengaja menghapusnya.
- Jika server mati, navigasi baru/refresh tidak tersedia; halaman form yang sudah dimuat tetap dapat menunjukkan error dan retry.

## Perbedaan dari brief visual awal

Ilustrasi SVG asli menggantikan foto/galeri pengerjaan karena aset pemilik belum tersedia. Heading serif dan palet sage/krem membentuk identitas sementara; bukan pengukuran Pickawood. Harga/filter harga dan waktu produksi tidak ditawarkan karena belum ada data yang dapat dipertanggungjawabkan. Penawaran disimpan lokal, belum diteruskan ke operasi usaha.
