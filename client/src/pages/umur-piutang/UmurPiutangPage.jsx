// Penjualan › Umur Piutang (baca-saja): piutang klien dari aplikasi Operasional per pelanggan dan per
// dokumen, dikelompokkan menurut lama telatnya. Datanya hanya bisa diubah di Operasional (spec §5.2).
// Kalau Operasional tidak bisa dihubungi, yang tampil data terakhir beserta waktunya; kalau ada cek
// Operasional yang gagal, angkanya tidak ditampilkan (spec §5.1).
import { useState } from "react";
import { FiAlertTriangle, FiExternalLink, FiInfo, FiRefreshCw } from "react-icons/fi";
import { EmptyState, ErrorState, TableSkeleton } from "@/shared/ui/bits";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { formatRupiah } from "@/shared/lib/uang";
import { tanggalJam } from "@/shared/lib/format";
import { URL_OPERASIONAL } from "@/shared/lib/operasional";
import { cn } from "@/shared/lib/cn";
import { KELOMPOK_UMUR, LINI_BISNIS, useUmurPiutang } from "@/entities/umur-piutang";
import { DaftarPelanggan } from "./ui/DaftarPelanggan";

const SEMUA = "semua";
const TELAT = new Set(["telat_1_30", "telat_31_60", "telat_lebih_60"]);

function KartuAngka({ label, teks, tegas, peringatan }) {
  const kosong = !teks || Number(teks) === 0;
  return (
    <div className={cn("rounded-xl border border-border bg-card p-3", tegas && "border-[hsl(var(--primary))]/30 bg-[hsl(var(--accent))]/40")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-base font-bold tabular-nums sm:text-lg",
          kosong ? "text-muted-foreground" : peringatan ? "text-destructive" : "text-foreground",
        )}
      >
        {formatRupiah(teks)}
      </p>
    </div>
  );
}

function CatatanBacaSaja({ diperbarui, sedangMemuat, onMuatUlang }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/50 p-3 text-sm md:flex-row md:items-center md:justify-between">
      <div className="space-y-0.5">
        <p className="flex items-start gap-2 font-medium text-foreground">
          <FiInfo className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--primary))]" aria-hidden />
          Data ini hanya bisa diubah di aplikasi Operasional
        </p>
        <p className="pl-6 text-muted-foreground">Diperbarui terakhir {diperbarui ? tanggalJam(diperbarui) : "—"}</p>
      </div>
      <div className="flex flex-wrap gap-2 pl-6 md:pl-0">
        <Button variant="outline" size="sm" className="gap-2 hover:bg-muted hover:text-foreground" onClick={onMuatUlang} disabled={sedangMemuat}>
          <FiRefreshCw className={cn("h-4 w-4", sedangMemuat && "animate-spin")} aria-hidden /> Muat ulang
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-2 hover:bg-muted hover:text-foreground">
          <a href={URL_OPERASIONAL} target="_blank" rel="noopener noreferrer">
            <FiExternalLink className="h-4 w-4" aria-hidden /> Buka di Operasional
          </a>
        </Button>
      </div>
    </div>
  );
}

function Isi({ data }) {
  if (data.cek_gagal.length) {
    return (
      <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <p className="flex items-start gap-2 font-semibold text-destructive">
          <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Angka piutang dari Operasional tidak lolos pemeriksaan, jadi tidak ditampilkan. Laporkan ke Lutfi:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-10 text-destructive/90">
          {data.cek_gagal.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </div>
    );
  }
  if (!data.pelanggan.length) {
    return <EmptyState judul="Tidak ada piutang yang belum dibayar" keterangan="Semua tagihan klien di lini bisnis ini sudah lunas." />;
  }
  const t = data.total;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {KELOMPOK_UMUR.map((k) => (
          <KartuAngka key={k.kode} label={k.nama} teks={t.sisa_per_umur[k.kode]} peringatan={TELAT.has(k.kode)} />
        ))}
        <KartuAngka label="Total belum dibayar" teks={t.sisa} tegas />
      </div>
      <p className="text-sm text-muted-foreground">
        {t.jumlah_pelanggan} pelanggan, {t.jumlah_dokumen} dokumen.
        {Number(t.harus_dikembalikan) > 0 && (
          <span className="font-medium text-[hsl(var(--warning))]"> Harus dikembalikan ke klien: {formatRupiah(t.harus_dikembalikan)}.</span>
        )}
      </p>
      <DaftarPelanggan pelanggan={data.pelanggan} />
    </div>
  );
}

export function UmurPiutangPage() {
  const [lini, setLini] = useState(SEMUA);
  const q = useUmurPiutang(lini === SEMUA ? null : lini);

  return (
    <div className="space-y-4">
      <CatatanBacaSaja diperbarui={q.data?.diperbarui} sedangMemuat={q.isFetching} onMuatUlang={() => q.refetch()} />
      <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5" aria-label="Saringan">
        <div className="max-w-xs space-y-1.5">
          <Label htmlFor="umur-piutang-lini">Lini bisnis</Label>
          <Select value={lini} onValueChange={setLini}>
            <SelectTrigger id="umur-piutang-lini">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEMUA}>Semua lini bisnis</SelectItem>
              {LINI_BISNIS.map((l) => (
                <SelectItem key={l.kode} value={l.kode}>
                  {l.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>
      <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5" aria-label="Umur piutang">
        {q.data?.basi && (
          <p role="status" className="flex items-start gap-2 rounded-xl border border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/10 p-3 text-sm text-foreground">
            <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning))]" aria-hidden />
            Data terbaru dari aplikasi Operasional belum bisa diambil. Yang tampil data terakhir per {tanggalJam(q.data.diperbarui)}.
          </p>
        )}
        {q.isError ? (
          <ErrorState pesan={q.error?.message} aksi={<Button onClick={() => q.refetch()}>Coba lagi</Button>} />
        ) : !q.data ? (
          <TableSkeleton />
        ) : (
          <Isi data={q.data} />
        )}
      </section>
    </div>
  );
}
