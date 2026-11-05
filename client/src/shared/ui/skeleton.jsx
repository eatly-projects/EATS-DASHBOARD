/* Dikonversi otomatis dari shadcn/ui TypeScript milik aplikasi lama.
 * Alat: esbuild (transform TS -> JS, JSX dipertahankan).
 * Kelas Tailwind dan struktur elemen TIDAK diubah sama sekali,
 * supaya tampilannya identik dengan aslinya. */
import { cn } from "@/shared/lib/cn";
function Skeleton({ className, ...props }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}
export {
  Skeleton
};
