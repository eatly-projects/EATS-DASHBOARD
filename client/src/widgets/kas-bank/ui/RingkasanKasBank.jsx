// Kartu saldo kas & bank di halaman utama (seperti widget Accurate): saldo setiap rekening
// per hari ini, dan uang masuk/keluar bulan berjalan. Hanya untuk yang punya hak Histori Bank.
// Rekening tanpa transaksi dan tanpa saldo awal ditulis "—", bukan Rp 0.
import { useNavigate } from "react-router-dom";
import { FiCreditCard } from "react-icons/fi";
import { ErrorState, Skeleton } from "@/shared/ui/bits";
import { Button } from "@/shared/ui/button";
import { useLaporan } from "@/entities/laporan-keuangan";
import { useHak } from "@/entities/navigasi";
import { formatRupiah } from "@/shared/lib/uang";
import { tanggal } from "@/shared/lib/format";
import { hariIni } from "@/shared/lib/rentang";
import { cn } from "@/shared/lib/cn";

const keteranganBank = (r) => [r.bank_nama, r.nomor_rekening_akhir && `•••• ${r.nomor_rekening_akhir}`].filter(Boolean).join(" ");

function KartuRekening({ r, onBuka }) {
  return (
    <button
      type="button"
      onClick={onBuka}
      className="flex h-full w-full flex-col gap-1 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-[hsl(var(--primary))]/40 hover:bg-[hsl(var(--accent))]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
    >
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-foreground">{r.nama}</span>
        {r.utama && (
          <span className="rounded-full bg-[hsl(var(--accent))] px-2 py-0.5 text-xs font-medium text-[hsl(var(--accent-foreground))]">Rekening utama</span>
        )}
      </span>
      <span className="text-xs text-muted-foreground">{keteranganBank(r) || r.kode}</span>
      <span className={cn("mt-1 text-lg font-bold tabular-nums", r.saldo === null ? "text-muted-foreground" : "text-foreground")}>
        {r.saldo === null ? "—" : formatRupiah(r.saldo)}
      </span>
      {r.saldo === null && <span className="text-xs text-muted-foreground">Belum ada transaksi atau saldo awal</span>}
    </button>
  );
}

export function RingkasanKasBank() {
  const hak = useHak("histori_bank");
  const navigate = useNavigate();
  const per = hariIni();
  const q = useLaporan("ringkasan-kas-bank", { per }, hak.lihat);
  if (!hak.lihat) return null;

  return (
    <section aria-label="Kas dan bank" className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <FiCreditCard className="h-5 w-5 text-[hsl(var(--primary))]" aria-hidden /> Kas &amp; Bank
        </h2>
        <p className="text-sm text-muted-foreground">Saldo per {tanggal(per)}</p>
      </div>
      {q.isError ? (
        <ErrorState pesan={q.error?.message} aksi={<Button onClick={() => q.refetch()}>Coba lagi</Button>} />
      ) : !q.data ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {q.data.rekening.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada akun Kas &amp; Bank. Tambahkan di Buku Besar, menu Akun Perkiraan.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {q.data.rekening.map((r) => (
                <li key={r.akun_id}>
                  <KartuRekening r={r} onBuka={() => navigate(`/kas-bank/histori-bank?akun=${r.akun_id}`)} />
                </li>
              ))}
            </ul>
          )}
          <dl className="grid gap-x-6 gap-y-1 border-t border-border pt-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex justify-between gap-3 sm:block">
              <dt className="text-muted-foreground">Total saldo</dt>
              <dd className="font-semibold tabular-nums">{q.data.total === null ? "—" : formatRupiah(q.data.total)}</dd>
            </div>
            <div className="flex justify-between gap-3 sm:block">
              <dt className="text-muted-foreground">
                Masuk {tanggal(q.data.bulan.dari)} sampai {tanggal(q.data.bulan.sampai)}
              </dt>
              <dd className="font-semibold tabular-nums">{formatRupiah(q.data.bulan.masuk)}</dd>
            </div>
            <div className="flex justify-between gap-3 sm:block">
              <dt className="text-muted-foreground">Keluar</dt>
              <dd className="font-semibold tabular-nums">{formatRupiah(q.data.bulan.keluar)}</dd>
            </div>
            <div className="flex justify-between gap-3 sm:block">
              <dt className="text-muted-foreground">Bersih</dt>
              <dd className="font-semibold tabular-nums">{formatRupiah(q.data.bulan.bersih)}</dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}
