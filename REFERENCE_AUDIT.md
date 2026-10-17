# Audit referensi — 16 Oktober 2026 (Asia/Jakarta)

Audit ini bersifat sampel template, **bukan audit seluruh website**. Referensi berhasil dibuka pada sesi implementasi ini, berbeda dengan keadaan saat brief disusun. Pengamatan browser dipisahkan dari pembacaan teks melalui web. Tidak ada akun dibuat, formulir kontak dikirim, ataupun pesanan/pembayaran dilakukan.

## Matriks bukti

| URL | Komponen/fitur | Temuan | Bukti screenshot/observasi | Status |
| --- | --- | --- | --- | --- |
| https://www.pickawood.com/en/sideboards | Kategori | Hero, pilihan konfigurator, koleksi model, filter, pagination, kategori turunan, galeri pelanggan, layanan, penjelasan proses, FAQ, dan footer. | Browser DOM; `docs/screenshots/reference-category-1440.jpg`, `reference-category-390.jpg` | Terverifikasi untuk struktur |
| URL kategori di atas | Visual | Desktop: hero terbagi teks dan foto; tombol hitam; aksen kuning; latar putih/abu. H1 computed: Source Sans Pro, 60 px pada viewport 1440. Kartu produk berisi dimensi/material/harga. | Screenshot dan pembacaan computed style H1 | Terverifikasi; kode warna dan spacing tidak diukur |
| URL kategori di atas | Filter | Kontrol Filters diklik; screenshot disimpan. Pemilihan kombinasi, hasil filtering, sorting, dan reset belum diverifikasi. | `reference-filter-1440.jpg` | Sebagian; perilaku hasil belum diperiksa |
| https://www.pickawood.com/en/p/sideboards-21/7416 | Detail produk | Galeri beberapa sudut, pilihan material dan lebar, edit konfigurasi, CTA keranjang, detail dan dimensi, produk lain. Tombol lebar 215 cm diklik, tetapi transisi menghasilkan DOM sementara kosong sehingga dampak harga tidak dapat dinyatakan. | DOM browser; `reference-product-390.jpg`, `reference-product-1440.jpg` | Terverifikasi untuk struktur; perubahan harga belum terverifikasi |
| https://www.pickawood.com/en/configurator/sideboard2 | Konfigurator | Setelah loading muncul panel ukuran dan langkah material, dasar/kaki, kompartemen, pintu/laci, tambahan. Mobile menggunakan kontrol berbeda dari desktop. | Browser DOM; `reference-config-1440.jpg`, `reference-config-390.jpg` | Terverifikasi untuk tampilan; perubahan opsi/harga belum lengkap |
| https://www.pickawood.com/en/cart | Keranjang | Keranjang kosong menampilkan pesan kosong dan tautan kembali. | Browser DOM; `reference-cart-1440.jpg` | Terverifikasi untuk keadaan kosong |
| https://www.pickawood.com/en/ | Beranda | Hero, jalur belanja atau konfigurasi, pilihan keluarga produk, galeri proyek. | Browser DOM; `reference-home-1440.jpg`, `reference-home-390.jpg` | Terverifikasi untuk bagian yang diperiksa |
| https://www.pickawood.com/en/advice-service/material | Material | Halaman materi dan sampel tersedia. | Dibuka melalui web reader (469 baris); pemeriksaan interaksi tidak dilakukan | Terverifikasi akses teks saja |
| https://www.pickawood.com/en/advice-service/shipping | Pengiriman | Halaman bantuan pengiriman tersedia. | Web reader (329 baris) | Terverifikasi akses teks saja |
| https://www.pickawood.com/en/advice-service/about-us | Perusahaan | Halaman perusahaan tersedia. | Web reader (329 baris) | Terverifikasi akses teks saja |
| https://www.pickawood.com/en/advice-service/contact → https://www.pickawood.com/en/appointment | Kontak | Tautan kontak mengarah ke halaman janji konsultasi. | Redirect web reader; tidak mengisi atau mengirim formulir | Terverifikasi redirect saja |

Nama screenshot relatif terhadap `docs/screenshots/`. Screenshot mencatat viewport saat pengambilan, tidak berarti seluruh halaman telah ditinjau secara visual. Beberapa halaman referensi memuat UI secara asinkron; screenshot dan snapshot pada waktu berbeda dapat menunjukkan loading atau keadaan berbeda.

## Cakupan visual dan interaksi yang belum lengkap

- Referensi: viewport eksplisit 1440 dan 390 px. Ukuran 360, 768, dan 1024 tidak diaudit pada referensi; dipakai untuk pengujian implementasi sendiri.
- Tidak mengklaim pengukuran font selain H1 kategori, kode warna, lebar container, jarak, line-height, hover, fokus, radius, atau animasi referensi.
- Perubahan preview dan harga konfigurator belum dapat diverifikasi konsisten. Percobaan kontrol mobile menemui locator yang hilang setelah UI dinamis berubah; tidak diterjemahkan menjadi klaim fitur rusak.
- Belum diperiksa: checkout (keranjang kosong), keranjang berisi/edit/hapus, login, pencarian hasil, submenu penuh, navigasi keyboard referensi, validasi input konfigurator, seluruh variasi produk, FAQ terpisah, perakitan, galeri/proyek lengkap, kebijakan legal, dan tautan footer lainnya.
- Tidak ada inferensi tentang framework, database, API internal, formula harga, atau kemampuan produksi referensi.

## Keputusan adaptasi

| Pola | Keputusan implementasi | Alasan |
| --- | --- | --- |
| Model sebagai awal konfigurasi | Diadaptasi: katalog → detail → konfigurasi → ringkasan | Alur mudah dimulai tanpa merancang dari nol |
| Ukuran/material ringkas pada kartu | Diadaptasi sebagai data contoh yang ditandai | Membantu perbandingan tanpa klaim produksi |
| Konfigurator bertahap | Disederhanakan menjadi tiga langkah dan preview SVG 2D | MVP dapat digunakan tanpa mesin 3D |
| Harga dan checkout langsung | Tidak digunakan; penawaran setelah peninjauan | Tarif dan proses usaha belum tersedia |
| Identitas, foto, ulasan, sertifikasi referensi | Tidak digunakan | Tidak merepresentasikan bisnis pengguna |
| Gaya hitam/kuning dan sans-serif referensi | Diganti sage, krem, heading serif, dan ilustrasi asli | Membangun identitas sementara yang berbeda |
| Layanan pengiriman/perakitan | Menjelaskan status belum ditetapkan | Mencegah jaminan layanan tanpa persetujuan usaha |

Spesifikasi yang mengikuti bukti audit ada pada `docs/IMPLEMENTATION_SPEC.md`. Implementasi merupakan adaptasi alur, bukan reproduksi akurat Pickawood.
