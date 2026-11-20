// Pilih departemen (lini bisnis) untuk satu baris transaksi. Boleh kosong.
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { useDaftarDepartemen } from "@/entities/departemen";

const TANPA = "__tanpa_departemen";

/** `label`: nama cadangan untuk departemen terpilih yang sudah nonaktif. */
export function PilihDepartemen({ value, onChange, label, id, disabled, className, "aria-label": ariaLabel }) {
  const q = useDaftarDepartemen({ aktif: true });
  const daftar = q.data ?? [];
  const adaDiDaftar = !value || daftar.some((d) => d.id === value);
  return (
    <Select value={value ?? TANPA} onValueChange={(v) => onChange(v === TANPA ? null : v)} disabled={disabled}>
      <SelectTrigger id={id} className={className} aria-label={ariaLabel}>
        <SelectValue placeholder="Tanpa departemen" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={TANPA}>Tanpa departemen</SelectItem>
        {!adaDiDaftar && <SelectItem value={value}>{label ?? "Departemen nonaktif"}</SelectItem>}
        {daftar.map((d) => (
          <SelectItem key={d.id} value={d.id}>
            {d.nama}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
