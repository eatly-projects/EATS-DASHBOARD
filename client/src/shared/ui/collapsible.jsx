/* Dikonversi otomatis dari shadcn/ui TypeScript milik aplikasi lama.
 * Alat: esbuild (transform TS -> JS, JSX dipertahankan).
 * Kelas Tailwind dan struktur elemen TIDAK diubah sama sekali,
 * supaya tampilannya identik dengan aslinya. */
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
const Collapsible = CollapsiblePrimitive.Root;
const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;
const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent;
export {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
};
