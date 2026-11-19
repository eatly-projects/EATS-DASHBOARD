// Format teks untuk pesan dan log, dari tanggal 'YYYY-MM-DD' tanpa Date (tidak bergeser karena zona waktu).
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/** "2026-12-31" -> "31 Desember 2026" */
export function tanggalPanjang(tanggal) {
  const [tahun, bulan, hari] = String(tanggal).slice(0, 10).split("-");
  return `${Number(hari)} ${BULAN[Number(bulan) - 1]} ${tahun}`;
}

/** "2027-01-01" -> "Januari 2027" */
export function bulanTahun(tanggal) {
  const [tahun, bulan] = String(tanggal).slice(0, 7).split("-");
  return `${BULAN[Number(bulan) - 1]} ${tahun}`;
}
