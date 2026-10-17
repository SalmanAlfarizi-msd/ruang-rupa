# Dashboard admin — 17 Oktober 2026

Dashboard `/admin` mengelola tindak lanjut permintaan lokal. Fitur: statistik, pencarian nama/nomor/kota/model, filter status, pagination 10 permintaan, detail kontak dan snapshot, catatan internal, serta riwayat perubahan. Tidak ada penghapusan permanen; status Diarsipkan dapat dikembalikan ke status lain.

## Aktivasi awal

1. Hentikan server bila sedang berjalan.
2. Jalankan `node scripts/admin-setup.mjs` dari folder proyek.
3. Simpan password acak yang muncul satu kali di terminal.
4. Jalankan `node server.mjs` dan buka `http://127.0.0.1:4173/admin`.

Pengaturan disimpan di `data/admin-auth.json` sebagai salt/hash scrypt. File ini diabaikan Git dan tidak dilayani sebagai aset web. Script menolak menimpa pengaturan yang sudah ada. Akses admin dinonaktifkan sampai pengaturan valid tersedia.

Untuk paket build, gunakan `node dist/scripts/admin-setup.mjs` dan `node dist/server.mjs`. Default pengaturan/database build berada di `dist/data/`. Jangan menghapus folder tersebut jika dipakai untuk data penting.

`ADMIN_AUTH_PATH` dapat menunjuk file hash di lokasi yang dipilih pemilik. `DB_PATH` mengatur database secara terpisah. Keduanya harus sama antara proses setup/operasi yang ingin berbagi data. `ADMIN_PASSWORD` merupakan override environment opsional (16–200 karakter) untuk deployment/test terkontrol; password di-hash saat startup dan dihapus dari environment proses setelah dibaca. Jangan menaruh password di frontend, Git, atau argumen command line.

## Tindak lanjut

- Menunggu peninjauan: permintaan baru dari formulir.
- Sedang ditinjau: kebutuhan sedang dievaluasi.
- Perlu informasi: ada detail yang perlu ditanyakan melalui kanal yang dipilih usaha.
- Selesai ditinjau: peninjauan internal selesai; bukan status produksi atau pembayaran.
- Diarsipkan: permintaan disisihkan dari pekerjaan aktif tanpa menghapusnya.

Semua status dapat dipilih ulang. Perubahan hanya tersimpan setelah respons server berhasil. Catatan internal maksimal 4.000 karakter, tidak ditampilkan kepada pelanggan. Riwayat menyimpan waktu, status lama/baru, indikator perubahan catatan, dan revisi; tidak menyimpan salinan historis penuh catatan.

Snapshot konfigurasi pelanggan tidak diubah oleh admin. Perubahan status/catatan berada di tabel terpisah dan transaksi SQLite. Jika dua sesi mengedit revisi yang sama, penyimpanan kedua ditolak 409. Salin catatan yang masih dibutuhkan sebelum memilih Muat ulang data, lalu gabungkan dengan data terbaru.

## Akses dan keamanan

- Satu admin lokal bersama; belum ada akun staf, peran terpisah, atau audit per individu.
- Session token acak disimpan dalam cookie HttpOnly, SameSite=Strict; token sesi di-hash pada server. Masa sesi 4 jam; restart server dan logout mencabut sesi.
- Cookie dipakai melalui HTTP loopback lokal. Untuk publikasi, wajib menyesuaikan TLS, cookie Secure, proxy/origin dan infrastruktur autentikasi; tidak cukup mengganti alamat bind.
- Pembaruan memerlukan sesi, token CSRF, dan Origin yang sesuai. Host dibatasi ke loopback/localhost dengan port aplikasi untuk mengurangi risiko DNS rebinding.
- Lima login gagal memblokir percobaan dari alamat yang sama selama 15 menit. Batas ini berada di memori proses dan reset saat restart.
- API admin memakai `Cache-Control: no-store`; input pelanggan di-escape saat ditampilkan. Kontak tidak dikirim ke layanan eksternal dan tidak dicatat pada log aplikasi.
- Password hash/database tetap dapat diakses pemilik perangkat. Perlindungan filesystem/backup berada pada sistem operasi; belum ada enkripsi database atau manajemen retensi otomatis.
- Daftar admin disaring dari data lokal di memori. Ini sesuai MVP volume kecil, belum dioptimalkan untuk ribuan permintaan.

## Jika password hilang

Pemilik perangkat dapat menghentikan server, memindahkan file `data/admin-auth.json` ke cadangan privat, lalu menjalankan script setup kembali. Jangan mengubah database `requests.sqlite`. Mulai ulang server untuk menggunakan password baru dan membatalkan sesi lama. Bila memakai `ADMIN_AUTH_PATH`, gunakan lokasi konfigurasi tersebut. Simpan cadangan hash sebagai data privat.

## Cakupan yang masih tersisa

Bagian P1 yang selesai adalah pengelolaan **permintaan**. CRUD produk, editor opsi/constraint produksi, tarif, penyusunan nominal penawaran, serta pengiriman penawaran belum dibuat. Tarif/konstruksi dan kontak usaha masih belum dikonfirmasi. Akun pelanggan, pembayaran, integrasi pengiriman, dan 3D/AR tetap di luar tahap ini.
