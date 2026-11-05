// Data master: unit usaha dan daftar pos laba rugi. Jarang berubah.
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiGet } from "@/shared/api/client";

export const KODE_GABUNGAN = "GABUNGAN";

export function useReferensi() {
  const q = useQuery({
    queryKey: ["referensi"],
    queryFn: () => apiGet("/referensi"),
    staleTime: Infinity,
  });
  const turunan = useMemo(() => {
    const d = q.data;
    if (!d) return null;
    const unit = [...(d.unit ?? [])].sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0));
    const pos = [...(d.pos ?? [])].sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0));
    const posPerKode = Object.fromEntries(pos.map((p) => [p.kode, p]));
    const unitPerKode = Object.fromEntries(unit.map((u) => [u.kode, u]));
    const kelompok = d.kelompok ?? [];
    const namaKelompok = Object.fromEntries(kelompok.map((k) => [k.kode, k.nama]));
    return { unit, pos, posPerKode, unitPerKode, kelompok, namaKelompok };
  }, [q.data]);
  return { ...q, ref: turunan };
}

/** "PT EATS — Maklon untuk Hangry"; GABUNGAN -> "Gabungan PT EATS + Boomboo". */
export function labelUnit(kode, unitPerKode, { pendek = false } = {}) {
  if (kode === KODE_GABUNGAN) {
    if (pendek) return "Gabungan";
    const nama = Object.values(unitPerKode ?? {}).map((u) => u.nama);
    return nama.length ? `Gabungan ${nama.join(" + ")}` : "Gabungan semua unit";
  }
  const u = unitPerKode?.[kode];
  if (!u) return kode;
  if (pendek || !u.keterangan) return u.nama;
  return `${u.nama} — ${u.keterangan}`;
}
