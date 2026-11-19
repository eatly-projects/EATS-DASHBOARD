// Layar daftar ala Accurate: chip filter, tombol muat ulang, kolom cari, kotak
// jumlah data, lalu tabel berkepala gelap. Di HP tabel diganti kartu.
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
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-3 shadow-card sm:p-4">
      {filter && <div className="flex flex-wrap gap-2">{filter}</div>}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 hover:bg-muted hover:text-foreground"
          onClick={onMuatUlang}
          aria-label="Muat ulang"
          title="Muat ulang"
        >
          <FiRefreshCw className={cn("h-4 w-4", memuat && "animate-spin")} aria-hidden />
        </Button>
        {aksiAtas}
        <div className="ml-auto flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
          {onCari && (
            <div className="relative min-w-0 flex-1 sm:w-64">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={cari ?? ""} onChange={(e) => onCari(e.target.value)} placeholder="Cari…" className="h-9 pl-9" aria-label="Cari" />
            </div>
          )}
          <span className="shrink-0 rounded-md border border-border bg-muted px-3 py-1.5 text-sm tabular-nums text-muted-foreground">
            {memuat ? "…" : `${(jumlah ?? baris.length).toLocaleString("id-ID")} data`}
          </span>
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
          <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[hsl(var(--kepala-tabel))] text-left text-white">
                  {kolom.map((k) => (
                    <th key={k.kunci} scope="col" className={cn("whitespace-nowrap px-3 py-2.5 font-semibold", k.rata === "kanan" && "text-right")}>
                      {k.judul}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {baris.map((b, i) => (
                  <tr
                    key={kunciBaris(b)}
                    tabIndex={onPilih ? 0 : undefined}
                    onClick={onPilih ? () => onPilih(b) : undefined}
                    onKeyDown={onPilih ? (e) => e.key === "Enter" && onPilih(b) : undefined}
                    className={cn(
                      "border-t border-border/60",
                      i % 2 === 1 && "bg-muted/40",
                      onPilih && "cursor-pointer hover:bg-[hsl(var(--accent))] focus-visible:bg-[hsl(var(--accent))] focus-visible:outline-none",
                    )}
                  >
                    {kolom.map((k) => (
                      <td key={k.kunci} className={cn("px-3 py-2.5 align-top", k.rata === "kanan" && "text-right tabular-nums")}>
                        {k.render ? k.render(b) : (b[k.kunci] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-2 md:hidden">
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
