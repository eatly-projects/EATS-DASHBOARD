import { useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useSesi } from "@/entities/sesi";
import { FormMasuk } from "@/features/auth-masuk/ui/FormMasuk";
import { Skeleton } from "@/shared/ui/bits";
import { MountFade } from "@/shared/ui/motion";

export function MasukPage() {
  const sesi = useSesi();
  const navigate = useNavigate();
  const lokasi = useLocation();
  const tujuan = lokasi.state?.dari && lokasi.state.dari !== "/masuk" ? lokasi.state.dari : "/";

  useEffect(() => {
    document.title = "Masuk · EATS Dashboard";
  }, []);

  if (sesi.data) return <Navigate to={tujuan} replace />;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[hsl(var(--primary))]/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-[hsl(var(--accent))]/10 blur-3xl" aria-hidden />

      <MountFade className="relative w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-elevated">
          <div className="relative bg-gradient-hero px-6 py-7 text-white sm:px-8">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[hsl(var(--accent))]/20 blur-2xl" aria-hidden />
            <div className="relative flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-gold font-display text-xl font-semibold shadow-gold">E</div>
              <div>
                <p className="font-display text-xl font-medium">EATS Dashboard</p>
                <p className="text-sm text-white/70">Laporan keuangan PT EATS</p>
              </div>
            </div>
            <p className="relative mt-5 text-sm leading-relaxed text-white/80">
              Unggah laporan keuangan, biarkan AI membacanya, lalu periksa dan setujui sebelum angkanya tampil di dashboard.
            </p>
          </div>
          <div className="px-6 py-7 sm:px-8">
            <h1 className="font-display text-2xl font-medium text-foreground">Masuk</h1>
            <p className="mb-5 mt-1 text-sm text-muted-foreground">Gunakan akun yang diberikan admin.</p>
            {sesi.isPending ? (
              <div className="space-y-4">
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </div>
            ) : (
              <FormMasuk onBerhasil={() => navigate(tujuan, { replace: true })} />
            )}
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">Lupa kata sandi? Hubungi admin untuk mengatur ulang.</p>
      </MountFade>
    </div>
  );
}
