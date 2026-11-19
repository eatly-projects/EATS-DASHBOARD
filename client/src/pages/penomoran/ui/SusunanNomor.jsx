// Susunan nomor: bagian-bagian berurutan, bisa ditambah, dipindah, dan dihapus.
import { FiArrowDown, FiArrowUp, FiPlus, FiX } from "react-icons/fi";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { BAGIAN } from "@/entities/penomoran";

const namaBagian = (jenis) => BAGIAN.find((b) => b.jenis === jenis)?.nama ?? jenis;

function TombolKecil({ label, onClick, nonaktif, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={nonaktif}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
    >
      {children}
    </button>
  );
}

export function SusunanNomor({ format, onUbah, nonaktif }) {
  const adaNomorUrut = format.some((b) => b.jenis === "counter");
  const ganti = (i, bagian) => onUbah(format.map((b, j) => (j === i ? bagian : b)));
  const pindah = (i, arah) => {
    const baru = [...format];
    [baru[i], baru[i + arah]] = [baru[i + arah], baru[i]];
    onUbah(baru);
  };

  return (
    <div className="space-y-2">
      <ol className="space-y-1.5">
        {format.map((b, i) => (
          <li key={i} className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 py-1 pl-3 pr-1">
            <span className="w-6 shrink-0 text-xs tabular-nums text-muted-foreground">{i + 1}.</span>
            {b.jenis === "teks" ? (
              <Input
                value={b.nilai ?? ""}
                maxLength={20}
                disabled={nonaktif}
                onChange={(e) => ganti(i, { jenis: "teks", nilai: e.target.value })}
                placeholder="Misalnya: JU."
                aria-label={`Teks bagian ${i + 1}`}
                className="h-8 min-w-0 flex-1 bg-card"
              />
            ) : (
              <span className="flex-1 text-sm font-medium text-foreground">{namaBagian(b.jenis)}</span>
            )}
            <TombolKecil label="Pindah ke atas" onClick={() => pindah(i, -1)} nonaktif={nonaktif || i === 0}>
              <FiArrowUp className="h-4 w-4" aria-hidden />
            </TombolKecil>
            <TombolKecil label="Pindah ke bawah" onClick={() => pindah(i, 1)} nonaktif={nonaktif || i === format.length - 1}>
              <FiArrowDown className="h-4 w-4" aria-hidden />
            </TombolKecil>
            <TombolKecil label={`Hapus bagian ${namaBagian(b.jenis)}`} onClick={() => onUbah(format.filter((_, j) => j !== i))} nonaktif={nonaktif}>
              <FiX className="h-4 w-4" aria-hidden />
            </TombolKecil>
          </li>
        ))}
      </ol>
      {!nonaktif && format.length < 12 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="hover:bg-muted hover:text-foreground">
              <FiPlus aria-hidden /> Tambah bagian
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            {BAGIAN.filter((b) => b.jenis !== "counter" || !adaNomorUrut).map((b) => (
              <DropdownMenuItem key={b.jenis} onSelect={() => onUbah([...format, b.jenis === "teks" ? { jenis: "teks", nilai: "" } : { jenis: b.jenis }])}>
                {b.nama}
                {b.contoh && <span className="ml-auto text-xs text-muted-foreground">contoh: {b.contoh}</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
