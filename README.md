# MEMEVERSE Starter Prototype

Ini adalah **prototype frontend lokal**, bukan game online yang sudah selesai.

## Cara menjalankan dari Android
1. Ekstrak `memeverse-starter.zip`.
2. Buka folder hasil ekstrak menggunakan editor kode Android atau editor web yang mendukung HTML.
3. Buka `index.html` melalui fitur preview/browser.
4. Navigasikan menu di sidebar.

Jika editor tidak bisa menjalankan folder secara langsung, gunakan hosting statis seperti GitHub Pages atau Vercel setelah membuat repository.

## Yang sudah ada
- Dashboard responsif untuk HP.
- Navigasi enam modul: X, Telegram, Discord, Pump.fun, Trading, Marketplace.
- Demo saldo virtual dan pembelian.
- Demo membuat postingan.
- Demo membuat server Discord.
- Demo membuat token virtual.
- Data harga market ilustratif.

## Yang belum ada
- Login dan akun online.
- Database bersama.
- Chat/DM realtime.
- Sinkronisasi multiplayer.
- Feed global.
- Wallet blockchain.
- Market data live.
- Trading engine yang aman.
- Creator reward production-ready.

Semua saldo, harga, token, dan interaksi saat ini hanya demo di browser. Jangan gunakan untuk uang sungguhan.

## Rencana backend
- Supabase Auth untuk akun.
- PostgreSQL untuk data.
- Row Level Security untuk akses.
- Supabase Realtime untuk chat/feed.
- Server-side functions untuk ledger, order, token trades, dan rewards.
- Market data API dengan lisensi yang sesuai.

## Urutan implementasi
1. Pasang Supabase dan auth.
2. Buat schema database dan RLS.
3. Buat ledger virtual yang aman.
4. Implementasikan satu modul sosial online.
5. Tambahkan modul lain satu per satu.
6. Bangun Pump.fun simulator dan trading engine.

## X player profile setup
The X profile editor supports display name, unique username, bio, location, website, private birthday, profile photo, and banner.

Before using online profile editing:
1. Copy `supabase-config.js` and set the Supabase project URL and browser-safe publishable/anon key. Never use a service-role key in the browser.
2. Ensure the app has a Supabase Auth sign-in flow and a signed-in session.
3. The existing `profile-media` public bucket accepts PNG/JPG/WebP images up to 2 MB; storage policies restrict uploads to the signed-in user's folder.
4. Public profile fields are stored in `public.profiles`; birthday is stored separately in `public.profile_private` and is visible only to its owner.

The current starter app does not yet include login UI. Until Auth is wired, the profile editor will explain that online save requires a signed-in account.
