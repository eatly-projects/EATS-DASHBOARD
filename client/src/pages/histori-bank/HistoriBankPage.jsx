// Kas & Bank > Histori Bank: semua uang masuk dan keluar satu rekening dalam rentang tanggal,
// dengan saldo awal, saldo berjalan, dan saldo akhir. Tanpa pilihan = rekening utama.
// Nomor setiap baris membuka dokumen asalnya. Bisa dibuka dengan ?akun=… (kartu saldo).
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ErrorState, TableSkeleton } from "@/shared/ui/bits";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { rentangPeriode } from "@/shared/lib/rentang";
import { useLaporan } from "@/entities/laporan-keuangan";
import { ALAMAT_MENU } from "@/entities/jurnal";
import { PilihAkun } from "@/features/pilih-akun/ui/PilihAkun";
import { useBuangParameter } from "@/shared/lib/useBuangParameter";
import { KepalaLaporan, PilihRentang } from "@/pages/laporan-keuangan/ui/ParameterLaporan";
import { BukuBesar } from "@/pages/laporan-keuangan/ui/TampilanLaporan";

/** Alamat dokumen asal satu baris histori, atau null (mis. Saldo Awal). */
export const tautanDokumen = (r) =>
  r.jurnal_id && ALAMAT_MENU[r.tipe] ? `${ALAMAT_MENU[r.tipe]}?buka=${r.jurnal_id}&judul=${encodeURIComponent(r.nomor ?? "")}` : null;

export function HistoriBankPage() {
  const [cari] = useSearchParams();
  const [akunId, setAkunId] = useState(cari.get("akun"));
  const [rentang, setRentang] = useState(() => rentangPeriode("bulan_ini"));
  const sah = Boolean(rentang.dari && rentang.sampai && rentang.dari <= rentang.sampai);
  const params = { ...rentang, ...(akunId ? { akun_id: akunId } : {}) };
  const q = useLaporan("histori-bank", params, sah);

  // Dibuka dari kartu saldo: ikuti rekening di alamat, lalu buang parameternya supaya klik kartu
  // yang sama lagi (setelah pilihan diganti) tetap bekerja.
  const dariAlamat = cari.get("akun");
  const [alamatTerakhir, setAlamatTerakhir] = useState(dariAlamat);
  if (dariAlamat !== alamatTerakhir) {
    setAlamatTerakhir(dariAlamat);
    if (dariAlamat) setAkunId(dariAlamat);
  }
  useBuangParameter(Boolean(dariAlamat), ["akun"]);

  // Tanpa pilihan, server memakai rekening utama; tampilkan namanya di pilihan.
  const tampil = akunId ?? (q.data?.akun?.length === 1 ? q.data.akun[0].akun_id : null);

  return (
    <div className="space-y-4">
      <section
        className="grid gap-5 rounded-2xl border border-border bg-card p-4 shadow-card print:hidden sm:p-5 lg:grid-cols-[minmax(0,22rem)_1fr]"
        aria-label="Pilih rekening dan periode"
      >
        <div className="space-y-1.5">
          <Label htmlFor="histori-bank-akun">Rekening</Label>
          <PilihAkun id="histori-bank-akun" tipe={["kas_bank"]} value={tampil} onChange={(a) => setAkunId(a.id)} placeholder="Rekening utama" />
        </div>
        <PilihRentang nilai={rentang} onUbah={setRentang} idAwal="histori-bank" />
      </section>
      <section
        className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-card print:border-0 print:p-0 print:shadow-none sm:p-5"
        aria-label="Histori bank"
      >
        {q.isError ? (
          <ErrorState pesan={q.error?.message} aksi={<Button onClick={() => q.refetch()}>Coba lagi</Button>} />
        ) : !q.data ? (
          <TableSkeleton />
        ) : (
          <>
            <KepalaLaporan data={q.data} jenis="histori-bank" params={params} sedangMemuat={q.isFetching} />
            <BukuBesar data={q.data} tautanNomor={tautanDokumen} />
          </>
        )}
      </section>
    </div>
  );
}
