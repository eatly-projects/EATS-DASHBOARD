// Pemilih unit + bulan (+ tahun bila lebih dari satu) untuk dashboard.
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Label } from "@/shared/ui/label";
import { namaBulan } from "@/shared/lib/format";
import { KODE_GABUNGAN, labelUnit } from "@/entities/referensi";

export function PemilihLaporan({ unitList, unitPerKode, unit, onUnit, periodeList, periode, onPeriode, tahunList, tahun, onTahun }) {
  const pilihanUnit = [KODE_GABUNGAN, ...unitList.map((u) => u.kode)];
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[14rem] flex-1 sm:flex-none">
        <Label htmlFor="pilih-unit" className="mb-1.5 block text-sm font-semibold text-foreground">
          Unit usaha
        </Label>
        <Select value={unit} onValueChange={onUnit}>
          <SelectTrigger id="pilih-unit" className="h-11 w-full rounded-xl bg-card text-[15px] sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pilihanUnit.map((k) => (
              <SelectItem key={k} value={k}>
                {labelUnit(k, unitPerKode)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-[10rem]">
        <Label htmlFor="pilih-bulan" className="mb-1.5 block text-sm font-semibold text-foreground">
          Bulan
        </Label>
        <Select value={periode ?? ""} onValueChange={onPeriode} disabled={!periodeList.length}>
          <SelectTrigger id="pilih-bulan" className="h-11 w-full rounded-xl bg-card text-[15px] sm:w-44">
            <SelectValue placeholder="Belum ada data" />
          </SelectTrigger>
          <SelectContent>
            {[...periodeList].reverse().map((p) => (
              <SelectItem key={p} value={p}>
                {namaBulan(p, { panjang: true })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {tahunList.length > 1 && (
        <div className="min-w-[7rem]">
          <Label htmlFor="pilih-tahun" className="mb-1.5 block text-sm font-semibold text-foreground">
            Tahun
          </Label>
          <Select value={String(tahun ?? "")} onValueChange={(v) => onTahun(Number(v))}>
            <SelectTrigger id="pilih-tahun" className="h-11 w-full rounded-xl bg-card text-[15px] sm:w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[...tahunList].sort((a, b) => b - a).map((t) => (
                <SelectItem key={t} value={String(t)}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
