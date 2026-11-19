import { Navigate, useLocation } from "react-router-dom";
import { FiLock } from "react-icons/fi";
import { useSesi } from "@/entities/sesi";
import { useHak, useNavigasi } from "@/entities/navigasi";
import { EmptyState, ErrorState, Skeleton, TableSkeleton } from "@/shared/ui/bits";
import { Button } from "@/shared/ui/button";

function LayarMemuatSesi() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-14 border-b border-border bg-card" />
      <div className="flex">
        <div className="hidden h-[calc(100vh-3.5rem)] w-16 shrink-0 bg-[hsl(var(--rel))] md:block" />
        <div className="flex-1 space-y-4 p-6 md:p-8">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
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

/** Isi halaman hanya tampil kalau pengguna punya hak Lihat di menu itu. */
export function PerluHak({ menu, children }) {
  const nav = useNavigasi();
  const hak = useHak(menu);
  if (nav.isPending) return <TableSkeleton />;
  // Gagal memuat (mis. koneksi database putus) bukan berarti tidak punya akses.
  if (nav.isError) {
    return (
      <ErrorState
        judul="Daftar menu gagal dimuat"
        pesan={nav.error?.message}
        aksi={<Button onClick={() => nav.refetch()}>Coba lagi</Button>}
      />
    );
  }
  if (hak.lihat) return children;
  if (!nav.data?.modul?.length) {
    return (
      <EmptyState
        ikon={FiLock}
        judul="Akun Anda belum diberi akses grup"
        keterangan="Hubungi Administrator supaya akun Anda dimasukkan ke akses grup yang sesuai."
      />
    );
  }
  return (
    <EmptyState
      ikon={FiLock}
      judul="Anda belum punya akses ke menu ini"
      keterangan="Minta Administrator menambahkannya di Pengaturan, menu Akses Grup."
    />
  );
}
