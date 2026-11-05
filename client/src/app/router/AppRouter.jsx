import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/widgets/app-shell/ui/AppShell";
import { MasukPage } from "@/pages/masuk/MasukPage";
import { RingkasanPage } from "@/pages/ringkasan/RingkasanPage";
import { UnggahPage } from "@/pages/unggah/UnggahPage";
import { CekUnggahanPage } from "@/pages/cek-unggahan/CekUnggahanPage";
import { PenggunaPage } from "@/pages/pengguna/PenggunaPage";
import { TidakDitemukanPage } from "@/pages/tidak-ditemukan/TidakDitemukanPage";
import { ProtectedRoute, KhususAdmin } from "./ProtectedRoute";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/masuk" element={<MasukPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<RingkasanPage />} />
        <Route path="unggah" element={<UnggahPage />} />
        <Route path="unggahan/:id" element={<CekUnggahanPage />} />
        <Route
          path="pengguna"
          element={
            <KhususAdmin>
              <PenggunaPage />
            </KhususAdmin>
          }
        />
        <Route path="404" element={<TidakDitemukanPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  );
}
