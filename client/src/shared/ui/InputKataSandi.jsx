import { forwardRef, useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/cn";

/** Kolom kata sandi dengan tombol lihat/sembunyikan (aturan Lutfi). */
export const InputKataSandi = forwardRef(function InputKataSandi({ className, ...props }, ref) {
  const [lihat, setLihat] = useState(false);
  return (
    <div className="relative">
      <Input ref={ref} type={lihat ? "text" : "password"} className={cn("pr-11", className)} {...props} />
      <button
        type="button"
        onClick={() => setLihat((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={lihat ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
        title={lihat ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
      >
        {lihat ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
      </button>
    </div>
  );
});
