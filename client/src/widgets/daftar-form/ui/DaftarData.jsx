// Layar daftar ala Accurate: chip filter, kolom cari, jumlah data, tombol muat
// ulang, lalu tabel. Di HP dan tablet tabel diganti kartu, supaya kolom tidak perlu digeser.
import { FiRefreshCw, FiSearch } from "react-icons/fi";
import { EmptyState, ErrorState, TableSkeleton } from "@/shared/ui/bits";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/cn";

export function DaftarData({
  kolom,
  baris = [],
  kunciBaris = (b) => b.id,
  memuat,
  galat,
  onMuatUlang,
  onPilih,
  cari,
  onCari,
  filter,
  aksiAtas,
  jumlah,
  adaLagi,
  onMuatLagi,
  memuatLagi,
  kosong = { judul: "Belum ada data" },
  kartuHp,
  satuan = "data",
  petunjukCari = "Cari…",
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-3 shadow-card sm:p-4">
      {filter && <div className="flex flex-wrap gap-2">{filter}</div>}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {onCari && (
          <div className="relative w-full min-w-0 sm:w-auto sm:max-w-sm sm:flex-1">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={cari ?? ""}
              onChange={(e) => onCari(e.target.value)}
              placeholder={petunjukCari}
              className="h-10 pl-9"
              aria-label={petunjukCari.replace("…", "")}
            />
          </div>
        )}
        {aksiAtas}
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
            {memuat ? "Memuat…" : `${(jumlah ?? baris.length).toLocaleString("id-ID")} ${satuan}`}
          </span>
          <Button
            variant="outline"
            className="h-10 gap-2 px-3 hover:bg-muted hover:text-foreground"
            onClick={onMuatUlang}
            aria-label="Muat ulang"
          >
            <FiRefreshCw className={cn("h-4 w-4", memuat && "animate-spin")} aria-hidden />
            <span className="hidden sm:inline">Muat ulang</span>
          </Button>
        </div>
      </div>

      {memuat ? (
        <TableSkeleton />
      ) : galat ? (
        <ErrorState pesan={galat.message} aksi={<Button onClick={onMuatUlang}>Coba lagi</Button>} />
      ) : baris.length === 0 ? (
        <EmptyState judul={kosong.judul} keterangan={kosong.keterangan} aksi={kosong.aksi} />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-border lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-left text-muted-foreground">
                  {kolom.map((k) => (
                    <th key={k.kunci} scope="col" className={cn("whitespace-nowrap px-4 py-3 font-semibold", k.rata === "kanan" && "text-right")}>
                      {k.judul}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {baris.map((b) => (
                  <tr
                    key={kunciBaris(b)}
                    tabIndex={onPilih ? 0 : undefined}
                    onClick={onPilih ? () => onPilih(b) : undefined}
                    onKeyDown={onPilih ? (e) => e.key === "Enter" && onPilih(b) : undefined}
                    className={cn(
                      "border-t border-border/70",
                      onPilih && "cursor-pointer hover:bg-[hsl(var(--accent))]/60 focus-visible:bg-[hsl(var(--accent))]/60 focus-visible:outline-none",
                    )}
                  >
                    {kolom.map((k) => (
                      <td key={k.kunci} className={cn("px-4 py-3 align-top", k.rata === "kanan" && "text-right tabular-nums")}>
                        {k.render ? k.render(b) : (b[k.kunci] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-2 lg:hidden">
            {baris.map((b) => (
              <li key={kunciBaris(b)}>
                <button
                  type="button"
                  onClick={onPilih ? () => onPilih(b) : undefined}
                  className="w-full rounded-lg border border-border bg-card p-3 text-left hover:bg-[hsl(var(--accent))]"
                >
                  {kartuHp ? kartuHp(b) : <span className="font-medium">{b[kolom[0].kunci]}</span>}
                </button>
              </li>
            ))}
          </ul>
          {adaLagi && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={onMuatLagi} disabled={memuatLagi} className="hover:bg-muted hover:text-foreground">
                {memuatLagi ? "Memuat…" : "Tampilkan lebih banyak"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
