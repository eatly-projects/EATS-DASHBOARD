// Pilih akun ala Accurate ("Cari/Pilih Akun Perkiraan…"): cari kode atau nama, akun
// menjorok per tingkat, akun induk tampil sebagai judul kelompok dan tidak bisa dipilih.
import { useMemo, useState } from "react";
import { FiCheck, FiChevronDown, FiSearch } from "react-icons/fi";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Input } from "@/shared/ui/input";
import { Skeleton } from "@/shared/ui/bits";
import { cn } from "@/shared/lib/cn";
import { useDaftarAkun } from "@/entities/akun";

/**
 * - `tipe`: daftar kode tipe yang boleh dipilih (kosong = semua).
 * - `label`: teks cadangan untuk akun terpilih yang tidak ada di daftar aktif (mis. sudah nonaktif).
 */
export function PilihAkun({ value, onChange, tipe, label, id, disabled, placeholder = "Pilih akun…", className, "aria-label": ariaLabel }) {
  const q = useDaftarAkun({ aktif: true });
  const [buka, setBuka] = useState(false);
  const [cari, setCari] = useState("");

  const semua = useMemo(() => q.data ?? [], [q.data]);
  const terpilih = semua.find((a) => a.id === value);
  const teksTerpilih = terpilih ? `${terpilih.kode} ${terpilih.nama}` : label;

  const tampil = useMemo(() => {
    const kata = cari.trim().toLowerCase();
    const bolehTipe = (a) => !tipe?.length || tipe.includes(a.tipe);
    if (kata) {
      return semua.filter((a) => !a.punya_anak && bolehTipe(a) && `${a.kode} ${a.nama}`.toLowerCase().includes(kata));
    }
    // Tanpa pencarian: tampilkan pohon, tetapi induk hanya kalau punya anak yang boleh dipilih.
    const detail = semua.filter((a) => !a.punya_anak && bolehTipe(a));
    const indukDipakai = new Set();
    const peta = new Map(semua.map((a) => [a.id, a]));
    for (const a of detail) {
      let p = a.induk_id;
      while (p) {
        indukDipakai.add(p);
        p = peta.get(p)?.induk_id;
      }
    }
    return semua.filter((a) => (a.punya_anak ? indukDipakai.has(a.id) : bolehTipe(a)));
  }, [semua, cari, tipe]);

  const pilih = (a) => {
    onChange(a);
    setBuka(false);
    setCari("");
  };

  return (
    <Popover open={buka} onOpenChange={(o) => !disabled && setBuka(o)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            "flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <span className={cn("min-w-0 flex-1 truncate", !teksTerpilih && "text-muted-foreground")} title={teksTerpilih}>
            {teksTerpilih || placeholder}
          </span>
          <FiChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(26rem,calc(100vw-2rem))] p-2">
        <div className="relative">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            autoFocus
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari kode atau nama akun…"
            className="h-9 pl-9"
            aria-label="Cari akun"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const pertama = tampil.find((a) => !a.punya_anak);
                if (pertama) {
                  e.preventDefault();
                  pilih(pertama);
                }
              }
            }}
          />
        </div>
        <ul className="mt-2 max-h-72 overflow-y-auto" role="listbox" aria-label="Daftar akun">
          {q.isPending && (
            <li className="space-y-2 p-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-4/5" />
            </li>
          )}
          {!q.isPending && tampil.length === 0 && <li className="px-3 py-3 text-sm text-muted-foreground">Tidak ada akun yang cocok.</li>}
          {tampil.map((a) =>
            a.punya_anak ? (
              <li
                key={a.id}
                className="px-2 pb-1 pt-2 text-xs font-semibold text-muted-foreground"
                style={{ paddingLeft: `${0.5 + (cari ? 0 : a.tingkat) * 1}rem` }}
              >
                {a.kode} {a.nama}
              </li>
            ) : (
              <li key={a.id} role="option" aria-selected={a.id === value}>
                <button
                  type="button"
                  onClick={() => pilih(a)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                    a.id === value && "bg-[hsl(var(--accent))] font-medium",
                  )}
                  style={{ paddingLeft: `${0.5 + (cari ? 0 : a.tingkat) * 1}rem` }}
                >
                  <span className="w-16 shrink-0 tabular-nums text-muted-foreground">{a.kode}</span>
                  <span className="min-w-0 flex-1">{a.nama}</span>
                  {a.id === value && <FiCheck className="h-4 w-4 shrink-0 text-[hsl(var(--primary))]" aria-hidden />}
                </button>
              </li>
            ),
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
