// Rumus laba rugi (docs/PLANNING.md §5). Fungsi murni: tidak menyentuh
// database, jadi bisa diuji dan dipakai ulang untuk cek silang unggahan.
//
// Prinsip: kosong ≠ nol. Jumlah dari pos yang semuanya kosong = null.

export const DAFTAR_UKURAN = [
  { kode: "total_pendapatan", nama: "Total pendapatan" },
  { kode: "total_hpp", nama: "Total harga pokok penjualan" },
  { kode: "laba_kotor", nama: "Laba kotor" },
  { kode: "biaya_lainnya", nama: "Biaya lain-lain (pos j)" },
  { kode: "total_biaya_maklon", nama: "Total biaya operasional maklon" },
  { kode: "total_biaya_dimples", nama: "Total biaya operasional Dimples" },
  { kode: "total_biaya_operasional", nama: "Total biaya operasional" },
  { kode: "laba_bersih", nama: "Laba bersih" },
  { kode: "total_penyusutan", nama: "Total penyusutan" },
  { kode: "ebitda", nama: "EBITDA" },
];
export const NAMA_UKURAN = Object.fromEntries(DAFTAR_UKURAN.map((u) => [u.kode, u.nama]));

const ada = (v) => typeof v === "number" && Number.isFinite(v);
const bulatkan = (v) => (v === null ? null : Math.round(v * 100) / 100);

// Jumlah yang menghormati "kosong": null kalau tidak ada satu pun angka.
export function jumlah(daftar) {
  let total = null;
  for (const v of daftar) if (ada(v)) total = (total ?? 0) + v;
  return bulatkan(total);
}

const kurang = (a, b) => (a === null ? null : bulatkan(a - (b ?? 0)));
const bagi = (a, b) => (a === null || b === null || b === 0 ? null : a / b);

/**
 * @param {Record<string, number>} pos  nilai per kode pos (pos tanpa nilai = tidak ada di objek)
 * @param {Array<{kode:string,kelompok:string,tambah_ebitda:boolean}>} daftarPos  dari pos_akun
 */
export function hitungUkuran(pos, daftarPos) {
  const per = (kelompok) => daftarPos.filter((p) => p.kelompok === kelompok).map((p) => pos[p.kode]);

  const total_pendapatan = jumlah(per("pendapatan"));
  const total_hpp = jumlah(per("hpp"));
  const laba_kotor = kurang(total_pendapatan, total_hpp);
  const biaya_lainnya = jumlah(per("biaya_lainnya"));
  const total_biaya_maklon = jumlah([...per("biaya_maklon"), biaya_lainnya]);
  const total_biaya_dimples = jumlah(per("biaya_dimples"));
  const total_biaya_operasional = jumlah([total_biaya_maklon, total_biaya_dimples]);
  const laba_bersih = kurang(laba_kotor, total_biaya_operasional);
  const total_penyusutan = jumlah([pos.penyusutan, pos.dimples_penyusutan]);
  const tambahan = jumlah(daftarPos.filter((p) => p.tambah_ebitda).map((p) => pos[p.kode]));
  const ebitda = laba_bersih === null ? null : bulatkan(laba_bersih + (tambahan ?? 0));

  return {
    total_pendapatan,
    total_hpp,
    laba_kotor,
    margin_laba_kotor: bagi(laba_kotor, total_pendapatan),
    persen_hpp: bagi(total_hpp, total_pendapatan),
    biaya_lainnya,
    total_biaya_maklon,
    total_biaya_dimples,
    total_biaya_operasional,
    laba_bersih,
    margin_laba_bersih: bagi(laba_bersih, total_pendapatan),
    total_penyusutan,
    ebitda,
  };
}

/** Menjumlah pos beberapa unit (untuk Gabungan). */
export function gabungPos(daftarPosUnit) {
  const hasil = {};
  for (const pos of daftarPosUnit) {
    for (const [kode, v] of Object.entries(pos)) if (ada(v)) hasil[kode] = bulatkan((hasil[kode] ?? 0) + v);
  }
  return hasil;
}
