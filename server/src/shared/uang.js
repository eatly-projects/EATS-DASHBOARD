// Uang selalu teks desimal ("1250000.50") di API dan numeric(18,2) di database.
// Hitungan di JS memakai sen dalam BigInt supaya tidak pernah ada galat pecahan
// (0,10 + 0,20 tetap tepat 0,30).
import { z } from "zod";

const POLA = /^-?\d{1,16}(\.\d{1,2})?$/;

/** Teks desimal → sen (BigInt). Melempar galat kalau bentuknya bukan angka uang. */
export function keSen(teks) {
  const t = String(teks ?? "").trim();
  if (!POLA.test(t)) throw new Error(`Angka uang tidak sah: ${teks}`);
  const negatif = t.startsWith("-");
  const [utuh, pecahan = ""] = t.replace("-", "").split(".");
  const sen = BigInt(utuh) * 100n + BigInt((pecahan + "00").slice(0, 2));
  return negatif ? -sen : sen;
}

/** Sen (BigInt) → teks desimal dengan dua angka di belakang titik. */
export function dariSen(sen) {
  const s = BigInt(sen);
  const negatif = s < 0n;
  const mutlak = negatif ? -s : s;
  const teks = `${mutlak / 100n}.${String(mutlak % 100n).padStart(2, "0")}`;
  return negatif ? `-${teks}` : teks;
}

/** Skema zod untuk angka uang dari browser (teks; boleh negatif kalau `negatif`). */
export const skemaUang = ({ negatif = false, label = "Nilai" } = {}) =>
  z
    .string({ error: `${label} wajib diisi.` })
    .trim()
    .refine((v) => POLA.test(v), `${label} harus berupa angka, paling banyak dua angka di belakang koma.`)
    .refine((v) => negatif || !v.startsWith("-"), `${label} tidak boleh negatif.`);

/** "1500000.50" → "Rp 1.500.000,50"; "-2000" → "−Rp 2.000". Untuk pesan dan log. */
export function rupiahTeks(teks) {
  const s = keSen(teks);
  const negatif = s < 0n;
  const mutlak = negatif ? -s : s;
  const utuh = (mutlak / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const sen = mutlak % 100n;
  return `${negatif ? "−" : ""}Rp ${utuh}${sen ? `,${String(sen).padStart(2, "0")}` : ""}`;
}
