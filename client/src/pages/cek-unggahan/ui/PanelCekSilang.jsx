// Cek silang: total yang dihitung dari angka rinci dibandingkan dengan baris
// total yang tertulis di berkas itu sendiri (TOTAL REVENUE, NET PROFIT, dst.).
import { useState } from "react";
import { FiAlertOctagon, FiCheckCircle, FiHelpCircle } from "react-icons/fi";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { namaBulan, persen, rupiah } from "@/shared/lib/format";
import { NAMA_UKURAN } from "@/entities/laporan";
import { labelUnit } from "@/entities/referensi";

function Baris({ c, unitPerKode }) {
  const fmt = (v) => (c.pecahan ? persen(v) : rupiah(v));
  return (
    <tr className="border-b border-border/40 align-top">
      <td className="py-1.5 pr-3 text-left">
        <span className="font-medium text-foreground">{c.nama_ukuran ?? NAMA_UKURAN[c.ukuran] ?? c.ukuran}</span>
        <span className="block text-xs text-muted-foreground">
          {labelUnit(c.unit_kode, unitPerKode, { pendek: true })} · {namaBulan(c.periode)}
        </span>
      </td>
      <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(c.angka_berkas)}</td>
      <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(c.angka_hitung)}</td>
      <td
        className={cn(
          "py-1.5 text-right tabular-nums",
          c.cocok === true && "text-[hsl(var(--success))]",
          c.cocok === false && "font-semibold text-destructive",
          c.cocok === null && "text-muted-foreground",
        )}
      >
        {c.cocok === null ? "tidak bisa dicek" : c.cocok ? "cocok" : c.pecahan ? persen(c.selisih, 2, { bertanda: true }) : rupiah(c.selisih, { bertanda: true })}
      </td>
    </tr>
  );
}

function TabelCek({ daftar, unitPerKode }) {
  return (
    <div className="relative -mx-3 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="py-1.5 pr-3 text-left font-medium">Yang dicocokkan</th>
            <th className="py-1.5 pr-3 text-right font-medium">Angka di berkas</th>
            <th className="py-1.5 pr-3 text-right font-medium">Hasil hitung</th>
            <th className="py-1.5 text-right font-medium">Selisih</th>
          </tr>
        </thead>
        <tbody>
          {daftar.map((c, i) => (
            <Baris key={`${c.unit_kode}-${c.periode}-${c.ukuran}-${i}`} c={c} unitPerKode={unitPerKode} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PanelCekSilang({ hasil, unitPerKode }) {
  const [buka, setBuka] = useState(false);
  const tidakCocok = hasil.filter((c) => c.cocok === false);
  const cocok = hasil.filter((c) => c.cocok === true);
  const tanpaCek = hasil.filter((c) => c.cocok === null);

  if (!hasil.length) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-card">
        <FiHelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        <div>
          <p className="font-medium text-foreground">Tidak ada baris total untuk dicocokkan</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Berkas ini tidak memuat angka total yang bisa dibandingkan. Periksa angka di bawah dengan berkas aslinya secara teliti.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-4 shadow-card sm:p-5",
        tidakCocok.length ? "border-destructive/40 bg-destructive/5" : "border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/5",
      )}
    >
      <div className="flex items-start gap-3">
        {tidakCocok.length ? (
          <FiAlertOctagon className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
        ) : (
          <FiCheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--success))]" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className={cn("font-display text-base font-medium", tidakCocok.length ? "text-destructive" : "text-[hsl(var(--success))]")}>
            {tidakCocok.length
              ? `${tidakCocok.length} dari ${hasil.length} total TIDAK cocok dengan berkas`
              : `Semua total cocok (${cocok.length} pemeriksaan)`}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Total yang dihitung dari angka rinci di bawah dibandingkan dengan baris total yang tertulis di berkas. Hasilnya ikut berubah saat Anda mengubah angka.
            {tanpaCek.length > 0 && ` ${tanpaCek.length} total tidak bisa dicek karena berkas tidak menuliskan angkanya.`}
          </p>
        </div>
      </div>

      {tidakCocok.length > 0 && (
        <div className="mt-4">
          <TabelCek daftar={tidakCocok} unitPerKode={unitPerKode} />
        </div>
      )}

      {cocok.length + tanpaCek.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setBuka((v) => !v)}
            className="inline-flex items-center gap-1 text-sm font-medium text-[hsl(var(--primary))] hover:underline"
            aria-expanded={buka}
          >
            {buka ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {buka ? "Sembunyikan" : "Lihat"} {cocok.length + tanpaCek.length} pemeriksaan lainnya
          </button>
          {buka && (
            <div className="mt-2">
              <TabelCek daftar={[...cocok, ...tanpaCek]} unitPerKode={unitPerKode} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
