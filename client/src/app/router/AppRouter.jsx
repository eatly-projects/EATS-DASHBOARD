import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { AppShell } from "@/widgets/app-shell/ui/AppShell";
import { MasukPage } from "@/pages/masuk/MasukPage";
import { ProtectedRoute } from "./ProtectedRoute";

// Alamat lama (sebelum kerangka ala Accurate) tetap bisa dibuka dari bookmark.
function AlihCekUnggahan() {
  const { id } = useParams();
  return <Navigate to={`/laporan/unggah/${id}`} replace />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/masuk" element={<MasukPage />} />
      <Route path="/unggah" element={<Navigate to="/laporan/unggah" replace />} />
      <Route path="/unggahan/:id" element={<AlihCekUnggahan />} />
      <Route path="/pengguna" element={<Navigate to="/pengaturan/pengguna" replace />} />
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
