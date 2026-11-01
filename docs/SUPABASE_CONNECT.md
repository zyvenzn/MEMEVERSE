# Menghubungkan MEMEVERSE ke Supabase

## Status
Frontend sudah dikonfigurasi dengan Supabase Project URL dan publishable key. Kunci publishable boleh berada di browser; jangan pernah memasukkan secret key atau service_role key ke file frontend.

**Project URL:** `https://whgryvzbafwvyoiyujzf.supabase.co`

## 1. Terapkan database
1. Buka Supabase Dashboard untuk project MEMEVERSE.
2. Buka **SQL Editor** lalu pilih **New query**.
3. Di repository GitHub, buka file `supabase/migrations/202611020001_initial_foundation.sql` pada branch `feat/supabase-foundation`.
4. Salin seluruh isi file SQL tersebut ke SQL Editor.
5. Klik **Run**. Pastikan tidak ada pesan error.

Migration ini membuat profil pemain, wallet USDV, ledger awal 10.000 USDV, dan tabel feed X dasar dengan Row Level Security. Jangan menjalankannya berulang-ulang sebagai pengganti migration baru.

## 2. Periksa pengaturan autentikasi
1. Di Supabase, buka **Authentication → URL Configuration**.
2. Tambahkan URL tempat frontend MEMEVERSE akan di-host ke **Site URL** dan **Redirect URLs**.
3. Untuk pengujian email, buka **Authentication → Providers → Email** dan pastikan Email provider aktif.
4. Jika konfirmasi email aktif, pemain harus membuka email konfirmasi sebelum bisa login.

## 3. Jalankan frontend
Buka repository dan deploy branch ini ke hosting statis seperti Vercel, atau jalankan secara lokal melalui server development sederhana. File `index.html`, `style.css`, `app.js`, `supabase-config.js`, dan `auth.js` harus berada di root yang sama.

## 4. Uji alur akun
1. Buka halaman MEMEVERSE.
2. Daftar menggunakan email milik sendiri dan password minimal 8 karakter.
3. Konfirmasi email jika diminta.
4. Login. Panel akun akan menampilkan nama pemain dan saldo USDV.
5. Periksa **Authentication → Users** dan tabel `profiles`, `wallets`, serta `ledger_entries` di Table Editor.

## Batasan saat ini
- Akun dan pembacaan profil/wallet menggunakan Supabase.
- Saldo hanya dibaca dari database; frontend tidak diberi izin untuk mengubah wallet atau ledger.
- Posting dan modul lain masih sebagian besar demo lokal. Integrasi feed online, chat realtime, transaksi virtual server-side, dan data market live belum selesai.
- Jangan aktifkan transaksi uang sungguhan. USDV adalah mata uang simulasi.
