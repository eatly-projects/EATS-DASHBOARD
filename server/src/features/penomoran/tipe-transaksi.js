// Tipe transaksi yang bisa diberi penomoran otomatis. Tahap berikutnya menambah
// isinya (Faktur Penjualan, Penerimaan, dan seterusnya) saat transaksinya dibangun.
export const TIPE_TRANSAKSI = [{ kode: "jurnal_umum", nama: "Jurnal Umum" }];

export const namaTipe = (kode) => TIPE_TRANSAKSI.find((t) => t.kode === kode)?.nama ?? kode;
