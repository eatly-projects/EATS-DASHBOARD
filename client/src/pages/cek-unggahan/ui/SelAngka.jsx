// Satu sel angka yang bisa diubah. Diformat dengan pemisah ribuan saat tidak
// sedang diketik. Cincin kuning = AI kurang yakin (hilang setelah sel dicek).
import { memo, useState } from "react";
import toast from "react-hot-toast";
import { cn } from "@/shared/lib/cn";
import { angka, bacaAngka, rupiah } from "@/shared/lib/format";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

const ada = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));

function SelAngkaDasar({ k, nilai, lama, punyaLama, ragu, alasan, sumber, diubah, bisaUbah, onUbah, onDilihat }) {
  const [teks, setTeks] = useState(null); // null = tidak sedang diketik
  const tampil = teks ?? angka(nilai);
  const berubahDariLama = punyaLama && (ada(nilai) ? !ada(lama) || Number(lama) !== Number(nilai) : ada(lama));
  const judulSumber = sumber?.length
    ? `Dari ${sumber.map((s) => [s.letak, s.label].filter(Boolean).join(" — ")).join("; ")}`
    : undefined;

  const selesai = () => {
    onDilihat(k);
    if (teks === null) return;
    const n = bacaAngka(teks);
    setTeks(null);
    if (Number.isNaN(n)) {
      toast.error(`"${teks}" bukan angka. Gunakan angka saja, misalnya 1.250.000 atau -5.000.`);
      return;
    }
    if (n !== (ada(nilai) ? Number(nilai) : null)) onUbah(k, n);
  };

  const isi = bisaUbah ? (
    <input
      type="text"
      inputMode="decimal"
      value={tampil}
      placeholder="—"
      onFocus={() => setTeks(angka(nilai))}
      onChange={(e) => setTeks(e.target.value)}
      onBlur={selesai}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setTeks(null);
          e.currentTarget.blur();
        }
      }}
      title={judulSumber}
      aria-label={judulSumber ?? "Angka"}
      className={cn(
        "h-8 w-full min-w-[8.5rem] rounded-md border bg-background px-2 text-right text-sm tabular-nums outline-none transition-shadow",
        "focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/25",
        ragu ? "ragu border-transparent" : "border-border/70",
        diubah && !ragu && "border-[hsl(var(--primary))]/60 bg-[hsl(var(--primary))]/5",
        ada(nilai) && Number(nilai) < 0 && "text-destructive",
      )}
    />
  ) : (
    <span
      title={judulSumber}
      className={cn("block min-w-[8.5rem] px-2 py-1 text-right text-sm tabular-nums", ada(nilai) && Number(nilai) < 0 && "text-destructive", !ada(nilai) && "text-muted-foreground/60")}
    >
      {ada(nilai) ? rupiah(nilai) : "—"}
    </span>
  );

  return (
    <div>
      {ragu && bisaUbah ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div>{isi}</div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
            <span className="font-semibold">AI kurang yakin</span>
            {alasan ? `: ${alasan}` : ". Mohon dicek dengan berkas aslinya."}
          </TooltipContent>
        </Tooltip>
      ) : (
        isi
      )}
      {berubahDariLama && (
        <p className="mt-0.5 text-right text-[11px] leading-tight text-muted-foreground">
          {ada(nilai) ? "sebelumnya " : "akan dihapus, sebelumnya "}
          <span className="line-through">{ada(lama) ? rupiah(lama) : "kosong"}</span>
        </p>
      )}
    </div>
  );
}

export const SelAngka = memo(SelAngkaDasar);
