import { FiChevronDown } from "react-icons/fi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { cn } from "@/shared/lib/cn";

/** Chip filter ala Accurate: "Label: Pilihan aktif ⌄". */
export function ChipFilter({ label, nilai, pilihan, onUbah, labelAktif }) {
  const aktif = pilihan.find((p) => p.nilai === nilai);
  // Pilihan pertama selalu "Semua", jadi chip hanya disorot kalau isinya bukan itu.
  const terpilih = nilai !== pilihan[0]?.nilai;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors",
            terpilih ? "border-[hsl(var(--primary))]/40 bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]" : "border-border bg-card text-foreground hover:bg-muted",
          )}
        >
          <span className="text-muted-foreground">{label}:</span>
          <span className="font-medium">{labelAktif ?? aktif?.label ?? "Semua"}</span>
          <FiChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-64 overflow-y-auto">
        <DropdownMenuRadioGroup value={nilai ?? ""} onValueChange={onUbah}>
          {pilihan.map((p) => (
            <DropdownMenuRadioItem key={p.nilai} value={p.nilai}>
              {p.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
