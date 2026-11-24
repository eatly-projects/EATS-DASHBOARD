// Tipe transaksi yang punya penomoran otomatis. Tahap berikutnya menambah di sini.
export const TIPE_TRANSAKSI = [
  { kode: "jurnal_umum", nama: "Jurnal Umum" },
  { kode: "pencatatan_beban", nama: "Pencatatan Beban" },
  { kode: "penerimaan", nama: "Penerimaan" },
  { kode: "pembayaran", nama: "Pembayaran" },
  { kode: "transfer_bank", nama: "Transfer Bank" },
];

export const namaTipe = (kode) => TIPE_TRANSAKSI.find((t) => t.kode === kode)?.nama ?? kode;
