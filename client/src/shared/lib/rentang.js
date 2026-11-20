// Tanggal 'YYYY-MM-DD' untuk filter dan laporan, dihitung tanpa zona waktu (tidak bergeser).
import { BULAN_PENDEK } from "./format";

export const hariIni = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

export function geserHari(t, n) {
  const d = new Date(`${t}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Tanggal terakhir di bulan yang sama: "2027-02-10" → "2027-02-28". */
export function akhirBulan(t) {
  const [y, m] = t.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

/** "13–19 Nov 2026", "28 Okt – 3 Nov 2026", "1 Jan – 31 Des 2027", atau "19 Nov 2026". */
export function labelRentang({ dari, sampai }) {
  const [y1, m1, d1] = dari.split("-").map(Number);
  const [y2, m2, d2] = sampai.split("-").map(Number);
  if (dari === sampai) return `${d1} ${BULAN_PENDEK[m1 - 1]} ${y1}`;
  if (y1 === y2 && m1 === m2) return `${d1}–${d2} ${BULAN_PENDEK[m1 - 1]} ${y1}`;
  if (y1 === y2) return `${d1} ${BULAN_PENDEK[m1 - 1]} – ${d2} ${BULAN_PENDEK[m2 - 1]} ${y1}`;
  return `${d1} ${BULAN_PENDEK[m1 - 1]} ${y1} – ${d2} ${BULAN_PENDEK[m2 - 1]} ${y2}`;
}

export const PILIHAN_PERIODE = [
  { nilai: "semua", label: "Semua" },
  { nilai: "bulan_ini", label: "Bulan ini" },
  { nilai: "bulan_lalu", label: "Bulan lalu" },
  { nilai: "tahun_ini", label: "Tahun ini" },
];

/** Pilihan periode → { dari, sampai }; "semua" → kosong. */
export function rentangPeriode(pilihan, h = hariIni()) {
  if (pilihan === "bulan_ini") return { dari: `${h.slice(0, 8)}01`, sampai: akhirBulan(h) };
  if (pilihan === "bulan_lalu") {
    const akhir = geserHari(`${h.slice(0, 8)}01`, -1);
    return { dari: `${akhir.slice(0, 8)}01`, sampai: akhir };
  }
  if (pilihan === "tahun_ini") return { dari: `${h.slice(0, 4)}-01-01`, sampai: `${h.slice(0, 4)}-12-31` };
  return { dari: "", sampai: "" };
}

/** Label chip: "Bulan ini (1–30 Nov 2026)". */
export function labelPeriode(pilihan) {
  const p = PILIHAN_PERIODE.find((x) => x.nilai === pilihan);
  if (!p || pilihan === "semua") return "Semua";
  return `${p.label} (${labelRentang(rentangPeriode(pilihan))})`;
}
