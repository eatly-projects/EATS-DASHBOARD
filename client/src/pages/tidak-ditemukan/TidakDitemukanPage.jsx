import { Link } from "react-router-dom";
import { FiCompass } from "react-icons/fi";
import { EmptyState } from "@/shared/ui/bits";
import { Button } from "@/shared/ui/button";

export function TidakDitemukanPage() {
  return (
    <EmptyState
      ikon={FiCompass}
      judul="Halaman tidak ditemukan"
      keterangan="Alamat yang Anda buka tidak ada. Mungkin tautannya salah ketik atau sudah dipindah."
      aksi={
        <Button asChild>
          <Link to="/">Kembali ke ringkasan</Link>
        </Button>
      }
    />
  );
}
