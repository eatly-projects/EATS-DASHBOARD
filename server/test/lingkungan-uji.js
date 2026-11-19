// Dimuat sebelum tes apa pun (node --import). dotenv tidak menimpa variabel
// yang sudah ada, jadi semua tes memakai schema finance_uji, bukan finance.
process.env.DB_SCHEMA = "finance_uji";
process.env.NODE_ENV = "test";
// Tes nomor paralel membuka 20 transaksi sekaligus. Dengan 8 sambungan (bawaan laptop), sisanya
// antre sambungan dan bisa melewati batas tunggu 15 detik saat database lambat. Yang mau diuji
// adalah antrean kunci baris nomor urut, bukan antrean sambungan.
process.env.DB_POOL_MAX ??= "25";
