// Uang di formulir pembukuan: selalu teks desimal ("1250000.50") seperti API, dan
// dihitung dalam sen (BigInt) supaya 0,10 + 0,20 tepat 0,30. Tampilan rupiah penuh
// gaya Indonesia: titik pemisah ribuan, koma untuk sen, sen hanya kalau ada.
const KOSONG = "—";
const MINUS = "−";
const POLA = /^-?\d{1,16}(\.\d{1,2})?$/;
// Literal BigInt (0n) tidak didukung target build (es2019/Safari 14); fungsi BigInt() didukung.
const NOL = BigInt(0);
const SATU = BigInt(1);
const SERATUS = BigInt(100);

export function keSen(teks) {
  const t = String(teks ?? "").trim();
  if (t === "") return NOL;
  if (!POLA.test(t)) return null;
  const negatif = t.startsWith("-");
  const [utuh, pecahan = ""] = t.replace("-", "").split(".");
  const sen = BigInt(utuh) * SERATUS + BigInt((pecahan + "00").slice(0, 2));
  return negatif ? -sen : sen;
}

export function dariSen(sen) {
  const negatif = sen < NOL;
  const mutlak = negatif ? -sen : sen;
  const teks = `${mutlak / SERATUS}.${String(mutlak % SERATUS).padStart(2, "0")}`;
  return negatif ? `-${teks}` : teks;
}

const ribuan = (bigint) => bigint.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** Ketikan pengguna ("1.250.000,50", "Rp 2.000", "-500,5") → "1250000.50"; kosong → ""; tidak sah → null. */
export function bacaRupiah(ketikan) {
  let t = String(ketikan ?? "").trim().replace(/\s/g, "").replace(/^Rp/i, "").replace(MINUS, "-");
  if (t === "") return "";
  const negatif = t.startsWith("-");
  t = t.replace(/^-/, "");
  // Titik = pemisah ribuan (harus berkelompok tiga), koma = sen (paling banyak dua angka).
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(t)) return null;
  const [utuh, sen = ""] = t.replace(/\./g, "").split(",");
  if (utuh.length > 16) return null;
  return dariSen((negatif ? -SATU : SATU) * (BigInt(utuh) * SERATUS + BigInt((sen + "00").slice(0, 2))));
}

/** "1250000.50" → "Rp 1.250.000,50"; "-2000" → "−Rp 2.000"; kosong → "—". */
export function formatRupiah(teks) {
  if (teks === null || teks === undefined || teks === "") return KOSONG;
  const sen = keSen(teks);
  if (sen === null) return KOSONG;
  const negatif = sen < NOL;
  const mutlak = negatif ? -sen : sen;
  const sisa = mutlak % SERATUS;
  return `${negatif ? MINUS : ""}Rp ${ribuan(mutlak / SERATUS)}${sisa ? `,${String(sisa).padStart(2, "0")}` : ""}`;
}

/** Teks desimal → isi kolom input ("1250000.50" → "1.250.000,50"); kosong tetap kosong. */
export function teksInput(teks) {
  if (teks === null || teks === undefined || teks === "") return "";
  const sen = keSen(teks);
  if (sen === null) return String(teks);
  const negatif = sen < NOL;
  const mutlak = negatif ? -sen : sen;
  const sisa = mutlak % SERATUS;
  return `${negatif ? "-" : ""}${ribuan(mutlak / SERATUS)}${sisa ? `,${String(sisa).padStart(2, "0")}` : ""}`;
}

/** Jumlah teks desimal (kosong dianggap 0) → teks desimal. */
export function jumlahkan(daftar) {
  return dariSen(daftar.reduce((s, x) => s + (keSen(x) ?? NOL), NOL));
}

/** Apakah teks desimal bernilai lebih dari nol. */
export const lebihDariNol = (teks) => (keSen(teks) ?? NOL) > NOL;
