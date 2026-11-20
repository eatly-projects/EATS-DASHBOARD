// Pilihan rentang tanggal (atau per tanggal untuk Neraca) dan kepala laporan
// beserta tombol Unduh Excel dan Cetak / Simpan PDF.
import { FiDownload, FiPrinter } from "react-icons/fi";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/cn";
import { akhirBulan, geserHari, hariIni, labelRentang, rentangPeriode } from "@/shared/lib/rentang";
import { tanggal } from "@/shared/lib/format";
import { useUnduhExcel } from "@/entities/laporan-keuangan";

const PRESET_RENTANG = [
  { nilai: "bulan_ini", label: "Bulan ini" },
  { nilai: "bulan_lalu", label: "Bulan lalu" },
  { nilai: "tahun_ini", label: "Tahun ini" },
];

function Chip({ aktif, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktif}
      className={cn(
        "h-9 rounded-full border px-3.5 text-sm transition-colors",
        aktif ? "border-[hsl(var(--primary))]/40 bg-[hsl(var(--accent))] font-medium text-[hsl(var(--accent-foreground))]" : "border-border bg-card hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

/** nilai: { dari, sampai }. */
export function PilihRentang({ nilai, onUbah, idAwal = "rentang" }) {
  const preset = PRESET_RENTANG.find((p) => {
    const r = rentangPeriode(p.nilai);
    return r.dari === nilai.dari && r.sampai === nilai.sampai;
  });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESET_RENTANG.map((p) => (
          <Chip key={p.nilai} aktif={preset?.nilai === p.nilai} onClick={() => onUbah(rentangPeriode(p.nilai))}>
            {p.label}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idAwal}-dari`}>Dari tanggal</Label>
          <Input id={`${idAwal}-dari`} type="date" value={nilai.dari} onChange={(e) => onUbah({ ...nilai, dari: e.target.value })} className="w-44" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idAwal}-sampai`}>Sampai tanggal</Label>
          <Input id={`${idAwal}-sampai`} type="date" value={nilai.sampai} onChange={(e) => onUbah({ ...nilai, sampai: e.target.value })} className="w-44" />
        </div>
      </div>
      {nilai.dari && nilai.sampai && nilai.dari > nilai.sampai && <p className="text-sm text-destructive">Tanggal awal tidak boleh sesudah tanggal akhir.</p>}
    </div>
  );
}

/** nilai: "YYYY-MM-DD" (Neraca per tanggal). */
export function PilihPerTanggal({ nilai, onUbah, idAwal = "per" }) {
  const h = hariIni();
  const akhirBulanLalu = geserHari(`${h.slice(0, 8)}01`, -1);
  const akhirTahunLalu = `${Number(h.slice(0, 4)) - 1}-12-31`;
  const pilihan = [
    { nilai: h, label: "Hari ini" },
    { nilai: akhirBulan(h), label: "Akhir bulan ini" },
    { nilai: akhirBulanLalu, label: "Akhir bulan lalu" },
    { nilai: akhirTahunLalu, label: "Akhir tahun lalu" },
  ];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {pilihan.map((p) => (
          <Chip key={p.label} aktif={nilai === p.nilai} onClick={() => onUbah(p.nilai)}>
            {p.label}
          </Chip>
        ))}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idAwal}-tgl`}>Per tanggal</Label>
        <Input id={`${idAwal}-tgl`} type="date" value={nilai} onChange={(e) => onUbah(e.target.value)} className="w-44" />
      </div>
    </div>
  );
}

export const teksPeriode = (data) =>
  data.per ? `Per ${tanggal(data.per)}` : data.dari && data.sampai ? labelRentang({ dari: data.dari, sampai: data.sampai }) : "";

/** Judul laporan untuk layar dan cetakan, beserta tombol unduh dan cetak. */
export function KepalaLaporan({ data, jenis, params, sedangMemuat }) {
  const unduh = useUnduhExcel();
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
      <div>
        <p className="text-sm text-muted-foreground">{data.perusahaan}</p>
        <h2 className="text-xl font-bold text-foreground">{data.judul}</h2>
        <p className="text-sm text-muted-foreground">
          {teksPeriode(data)}
          {sedangMemuat && <span className="ml-2 print:hidden">· memperbarui…</span>}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="outline" onClick={() => unduh.mutate({ jenis, params })} disabled={unduh.isPending} className="gap-2 hover:bg-muted hover:text-foreground">
          <FiDownload className="h-4 w-4" aria-hidden /> {unduh.isPending ? "Menyiapkan…" : "Unduh Excel"}
        </Button>
        <Button variant="outline" onClick={() => window.print()} className="gap-2 hover:bg-muted hover:text-foreground">
          <FiPrinter className="h-4 w-4" aria-hidden /> Cetak / Simpan PDF
        </Button>
      </div>
    </div>
  );
}
