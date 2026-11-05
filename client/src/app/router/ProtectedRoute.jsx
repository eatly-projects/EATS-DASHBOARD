import { Navigate, useLocation } from "react-router-dom";
import { useSesi } from "@/entities/sesi";
import { Skeleton } from "@/shared/ui/bits";
import { Button } from "@/shared/ui/button";

function LayarMemuatSesi() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden h-screen w-64 shrink-0 bg-[hsl(var(--sidebar))] md:block" />
      <div className="flex-1 space-y-4 p-6 md:p-8">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }) {
  const sesi = useSesi();
  const lokasi = useLocation();

  if (sesi.isPending) return <LayarMemuatSesi />;
  if (sesi.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-xl border border-destructive/30 bg-card p-6 text-center shadow-card">
          <p className="font-display text-lg text-destructive">Tidak bisa memeriksa akun Anda</p>
          <p className="mt-2 text-sm text-muted-foreground">{sesi.error?.message}</p>
          <Button className="mt-4" onClick={() => sesi.refetch()}>
            Coba lagi
          </Button>
        </div>
      </div>
    );
  }
  if (!sesi.data) return <Navigate to="/masuk" replace state={{ dari: lokasi.pathname }} />;
  return children;
}

export function KhususAdmin({ children }) {
  const { data: pengguna } = useSesi();
  if (pengguna?.peran !== "admin") return <Navigate to="/" replace />;
  return children;
}
