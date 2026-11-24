// Laporan > Laporan Keuangan: daftar laporan ala Accurate ("Daftar Laporan"), lalu
// pilih rentang tanggal, lalu hasilnya langsung tampil dan bisa diunduh atau dicetak.
import { useState } from "react";
import { FiArrowLeft, FiBookOpen, FiColumns, FiFileText, FiGrid, FiLayers, FiList, FiTrendingUp } from "react-icons/fi";
import { ErrorState, TableSkeleton } from "@/shared/ui/bits";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { PilihDepartemen } from "@/features/pilih-departemen/ui/PilihDepartemen";
import { cn } from "@/shared/lib/cn";
import { hariIni, rentangPeriode } from "@/shared/lib/rentang";
import { useLaporan } from "@/entities/laporan-keuangan";
import { KepalaLaporan, PilihPerTanggal, PilihRentang } from "./ui/ParameterLaporan";
import { ArusKas, BukuBesar, DaftarJurnalLaporan, LabaRugi, Neraca, NeracaPercobaan } from "./ui/TampilanLaporan";

const DAFTAR = [
  { kunci: "laba-rugi", jenis: "laba-rugi", nama: "Laba/Rugi", ket: "Pendapatan, beban, dan laba bersih dalam satu rentang tanggal.", ikon: FiFileText },
  {
    kunci: "laba-rugi-lini",
    jenis: "laba-rugi",
    nama: "Laba/Rugi per Lini Bisnis",
    ket: "Laba rugi dengan satu kolom per departemen: Maklon, Retail, HORECA, Modern Trade.",
    ikon: FiColumns,
    tambahan: { per_departemen: "1" },
  },
  { kunci: "neraca", jenis: "neraca", nama: "Neraca", ket: "Aset, liabilitas, dan ekuitas per satu tanggal.", ikon: FiLayers, perTanggal: true },
  { kunci: "neraca-percobaan", jenis: "neraca-percobaan", nama: "Neraca Percobaan", ket: "Saldo awal, mutasi debit dan kredit, serta saldo akhir setiap akun.", ikon: FiGrid },
  { kunci: "buku-besar", jenis: "buku-besar", nama: "Rincian Buku Besar", ket: "Semua transaksi per akun beserta saldo berjalannya.", ikon: FiBookOpen },
  { kunci: "jurnal", jenis: "jurnal", nama: "Keseluruhan Jurnal", ket: "Semua jurnal yang disetujui beserta rinciannya.", ikon: FiList },
  {
    kunci: "arus-kas",
    jenis: "arus-kas",
    nama: "Arus Kas",
    ket: "Uang masuk dan keluar per bulan, dikelompokkan per aktivitas.",
    ikon: FiTrendingUp,
    lini: true,
  },
];

const TAMPILAN = {
  "laba-rugi": LabaRugi,
  neraca: Neraca,
  "neraca-percobaan": NeracaPercobaan,
  "buku-besar": BukuBesar,
  jurnal: DaftarJurnalLaporan,
  "arus-kas": ArusKas,
};

function HasilLaporan({ pilihan }) {
  const [rentang, setRentang] = useState(() => rentangPeriode("bulan_ini"));
  const [per, setPer] = useState(hariIni());
  const [departemen, setDepartemen] = useState(null);
  const params = pilihan.perTanggal
    ? { per }
    : { ...rentang, ...(pilihan.tambahan ?? {}), ...(pilihan.lini && departemen ? { departemen_id: departemen } : {}) };
  const sah = pilihan.perTanggal ? Boolean(per) : Boolean(rentang.dari && rentang.sampai && rentang.dari <= rentang.sampai);
  const q = useLaporan(pilihan.jenis, params, sah);
  const Tampilan = TAMPILAN[pilihan.jenis];

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-4 shadow-card print:hidden sm:p-5" aria-label="Pilih periode">
        {pilihan.perTanggal ? <PilihPerTanggal nilai={per} onUbah={setPer} idAwal={pilihan.kunci} /> : <PilihRentang nilai={rentang} onUbah={setRentang} idAwal={pilihan.kunci} />}
        {pilihan.lini && (
          <div className="mt-4 max-w-xs space-y-1.5">
            <Label htmlFor={`${pilihan.kunci}-lini`}>Lini bisnis</Label>
            <PilihDepartemen id={`${pilihan.kunci}-lini`} value={departemen} onChange={setDepartemen} labelKosong="Semua lini bisnis" />
          </div>
        )}
      </section>
      <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-card print:border-0 print:p-0 print:shadow-none sm:p-5" aria-label={pilihan.nama}>
        {q.isError ? (
          <ErrorState pesan={q.error?.message} aksi={<Button onClick={() => q.refetch()}>Coba lagi</Button>} />
        ) : !q.data ? (
          <TableSkeleton />
        ) : (
          <>
            <KepalaLaporan data={q.data} jenis={pilihan.jenis} params={params} sedangMemuat={q.isFetching} />
            <Tampilan data={q.data} />
          </>
        )}
      </section>
    </div>
  );
}

export function LaporanKeuanganPage() {
  const [kunci, setKunci] = useState(null);
  const pilihan = DAFTAR.find((d) => d.kunci === kunci);

  if (pilihan) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setKunci(null)} className="gap-2 px-2 print:hidden">
          <FiArrowLeft className="h-4 w-4" aria-hidden /> Daftar laporan
        </Button>
        <HasilLaporan key={pilihan.kunci} pilihan={pilihan} />
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {DAFTAR.map((d) => (
        <li key={d.kunci}>
          <button
            type="button"
            onClick={() => setKunci(d.kunci)}
            className={cn(
              "flex h-full w-full items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-card transition-colors hover:border-[hsl(var(--primary))]/40 hover:bg-[hsl(var(--accent))]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] sm:p-5",
            )}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--jenis-laporan))] text-[hsl(var(--jenis-laporan-isi))]">
              <d.ikon className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="block font-semibold text-foreground">{d.nama}</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{d.ket}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
