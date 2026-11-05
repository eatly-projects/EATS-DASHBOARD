/* Dikonversi otomatis dari shadcn/ui TypeScript milik aplikasi lama.
 * Alat: esbuild (transform TS -> JS, JSX dipertahankan).
 * Kelas Tailwind dan struktur elemen TIDAK diubah sama sekali,
 * supaya tampilannya identik dengan aslinya. */
import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva } from "class-variance-authority";
import { cn } from "@/shared/lib/cn";
const labelVariants = cva("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70");
const Label = React.forwardRef(({ className, ...props }, ref) => <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />);
Label.displayName = LabelPrimitive.Root.displayName;
export {
  Label
};
