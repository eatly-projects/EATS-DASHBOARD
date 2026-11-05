// Rumus laba rugi — PLANNING.md §5, mengikuti rumus di berkas Excel contoh.
// Fungsi murni; dipakai halaman "Cek dan setujui" untuk menghitung ulang total
// secara langsung saat angka diubah. Dashboard memakai `ukuran` dari server
// (rumusnya sama).
//
// Aturan kosong: jumlah dari pos yang SEMUANYA kosong = kosong (null), bukan 0.

const ada = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));

/** Jumlah nilai yang ada; null kalau tidak satu pun ada. */
export function jumlah(daftar) {
  let total = 0;
  let adaIsi = false;
  for (const v of daftar) {
    if (ada(v)) {
      total += Number(v);
      adaIsi = true;
    }
  }
  return adaIsi ? total : null;
}

const bagi = (a, b) => (ada(a) && ada(b) && Number(b) !== 0 ? Number(a) / Number(b) : null);

export const KODE_PENYUSUTAN = ["penyusutan", "dimples_penyusutan"];

/**
 * @param {Record<string, number|null>} nilaiPos  kode pos -> nilai
 * @param {Array<{kode:string, kelompok:string, tambah_ebitda:boolean}>} daftarPos
 * @returns ukuran: total_pendapatan, total_hpp, laba_kotor, margin_laba_kotor, persen_hpp,
 *          biaya_lainnya, total_biaya_maklon, total_biaya_dimples, total_biaya_operasional,
 *          laba_bersih, margin_laba_bersih, total_penyusutan, ebitda
 */
export function hitungUkuran(nilaiPos, daftarPos) {
  const v = nilaiPos ?? {};
  const perKelompok = (k) => daftarPos.filter((p) => p.kelompok === k).map((p) => v[p.kode]);

  const total_pendapatan = jumlah(perKelompok("pendapatan"));
  const total_hpp = jumlah(perKelompok("hpp"));
  const laba_kotor = total_pendapatan === null ? null : total_pendapatan - (total_hpp ?? 0);

  const biaya_lainnya = jumlah(perKelompok("biaya_lainnya"));
  const total_biaya_maklon = jumlah([...perKelompok("biaya_maklon"), biaya_lainnya]);
  const total_biaya_dimples = jumlah(perKelompok("biaya_dimples"));
  const total_biaya_operasional = jumlah([total_biaya_maklon, total_biaya_dimples]);

  const laba_bersih = laba_kotor === null ? null : laba_kotor - (total_biaya_operasional ?? 0);
  const total_penyusutan = jumlah(KODE_PENYUSUTAN.map((k) => v[k]));
  const tambahan = jumlah(daftarPos.filter((p) => p.tambah_ebitda).map((p) => v[p.kode]));
  const ebitda = laba_bersih === null ? null : laba_bersih + (tambahan ?? 0);

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

/** Jumlahkan peta pos beberapa unit (untuk Gabungan). */
export function gabungPos(daftarPeta) {
  const hasil = {};
  for (const peta of daftarPeta) {
    for (const [kode, nilai] of Object.entries(peta ?? {})) {
      if (!ada(nilai)) continue;
      hasil[kode] = (hasil[kode] ?? 0) + Number(nilai);
    }
  }
  return hasil;
}

/**
 * Total beberapa bulan (mis. tahun berjalan): jumlahkan pos, lalu hitung ulang
 * ukuran — margin dari total, bukan rata-rata margin bulanan.
 */
export function ukuranRentang(daftarPetaPos, daftarPos) {
  return hitungUkuran(gabungPos(daftarPetaPos), daftarPos);
}

/** Nama ukuran untuk layar (tanpa singkatan). */
export const NAMA_UKURAN = {
  total_pendapatan: "Total pendapatan",
  total_hpp: "Total harga pokok penjualan",
  laba_kotor: "Laba kotor",
  margin_laba_kotor: "Margin laba kotor",
  persen_hpp: "Harga pokok terhadap pendapatan",
  biaya_lainnya: "Biaya lain-lain",
  total_biaya_maklon: "Total biaya operasional maklon",
  total_biaya_dimples: "Total biaya operasional Dimples",
  total_biaya_operasional: "Total biaya operasional",
  laba_bersih: "Laba bersih",
  margin_laba_bersih: "Margin laba bersih",
  total_penyusutan: "Total penyusutan dan amortisasi",
  ebitda: "EBITDA (laba sebelum bunga, pajak, penyusutan, dan amortisasi)",
};

/** Ukuran yang "naik = buruk" (biaya). */
export const UKURAN_BIAYA = new Set(["total_hpp", "persen_hpp", "biaya_lainnya", "total_biaya_maklon", "total_biaya_dimples", "total_biaya_operasional", "total_penyusutan"]);
