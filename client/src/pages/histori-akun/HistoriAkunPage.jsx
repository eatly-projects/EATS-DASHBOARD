// Buku Besar > Histori Akun: semua transaksi satu akun dalam rentang tanggal, dengan
// saldo awal, saldo berjalan, dan saldo akhir. Bisa dibuka dari formulir akun (?akun=…).
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ErrorState, TableSkeleton } from "@/shared/ui/bits";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { rentangPeriode } from "@/shared/lib/rentang";
import { useLaporan } from "@/entities/laporan-keuangan";
import { PilihAkun } from "@/features/pilih-akun/ui/PilihAkun";
import { KepalaLaporan, PilihRentang } from "@/pages/laporan-keuangan/ui/ParameterLaporan";
import { BukuBesar } from "@/pages/laporan-keuangan/ui/TampilanLaporan";

export function HistoriAkunPage() {
  const [cari] = useSearchParams();
  const [akunId, setAkunId] = useState(cari.get("akun"));
  const [rentang, setRentang] = useState(() => rentangPeriode("tahun_ini"));
  const sah = Boolean(akunId && rentang.dari && rentang.sampai && rentang.dari <= rentang.sampai);
  const params = { ...rentang, akun_id: akunId };
  const q = useLaporan("buku-besar", params, sah);

  // Dibuka lagi dari formulir akun lain: ikuti akun di alamat.
  const dariAlamat = cari.get("akun");
  const [alamatTerakhir, setAlamatTerakhir] = useState(dariAlamat);
  if (dariAlamat !== alamatTerakhir) {
    setAlamatTerakhir(dariAlamat);
    if (dariAlamat) setAkunId(dariAlamat);
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-5 rounded-2xl border border-border bg-card p-4 shadow-card print:hidden sm:p-5 lg:grid-cols-[minmax(0,22rem)_1fr]" aria-label="Pilih akun dan periode">
        <div className="space-y-1.5">
          <Label htmlFor="histori-akun">Akun</Label>
          <PilihAkun id="histori-akun" value={akunId} onChange={(a) => setAkunId(a.id)} placeholder="Pilih akun yang ingin dilihat" />
        </div>
        <PilihRentang nilai={rentang} onUbah={setRentang} idAwal="histori" />
      </section>
      <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-card print:border-0 print:p-0 print:shadow-none sm:p-5" aria-label="Histori akun">
        {!akunId ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Pilih akun dulu untuk melihat historinya.</p>
        ) : q.isError ? (
          <ErrorState pesan={q.error?.message} aksi={<Button onClick={() => q.refetch()}>Coba lagi</Button>} />
        ) : !q.data ? (
          <TableSkeleton />
        ) : (
          <>
            <KepalaLaporan data={{ ...q.data, judul: "Histori Akun" }} jenis="buku-besar" params={params} sedangMemuat={q.isFetching} />
            <BukuBesar data={q.data} />
          </>
        )}
      </section>
    </div>
  );
}
