// Kolom isian rupiah: tampil "1.250.000" saat tidak diketik, menerima ketikan gaya
// Indonesia ("1.250.000,50"), dan mengirim teks desimal ("1250000.50") ke induknya.
import { useState } from "react";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/cn";
import { bacaRupiah, teksInput } from "@/shared/lib/uang";

export function InputUang({ value, onChange, negatif = false, className, ...rest }) {
  const [fokus, setFokus] = useState(false);
  const [teks, setTeks] = useState("");
  const terbaca = bacaRupiah(teks);
  const tidakSah = fokus && teks.trim() !== "" && (terbaca === null || (!negatif && terbaca.startsWith("-")));
  return (
    <Input
      inputMode="decimal"
      autoComplete="off"
      value={fokus ? teks : teksInput(value)}
      onFocus={(e) => {
        setFokus(true);
        setTeks(teksInput(value));
        requestAnimationFrame(() => e.target.select());
      }}
      onBlur={() => setFokus(false)}
      onChange={(e) => {
        const t = e.target.value;
        setTeks(t);
        const v = bacaRupiah(t);
        if (v !== null && (negatif || !v.startsWith("-"))) onChange(v);
      }}
      aria-invalid={tidakSah || undefined}
      className={cn("text-right tabular-nums", tidakSah && "border-destructive focus-visible:ring-destructive", className)}
      {...rest}
    />
  );
}
