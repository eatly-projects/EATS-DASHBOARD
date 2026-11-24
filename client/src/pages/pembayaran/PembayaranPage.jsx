// Kas & Bank > Pembayaran: uang keluar dari rekening atau kas, pola daftar lalu formulir seperti Accurate.
import { KerangkaDaftarForm } from "@/widgets/daftar-form/ui/KerangkaDaftarForm";
import { DaftarJurnal } from "@/widgets/rincian-jurnal/ui/DaftarJurnal";
import { FormKasBank } from "@/widgets/rincian-jurnal/ui/FormKasBank";
import { useHak } from "@/entities/navigasi";

export function PembayaranPage() {
  const hak = useHak("pembayaran");
  return (
    <KerangkaDaftarForm
      namaData="pembayaran"
      bisaBuat={hak.buat}
      renderDaftar={({ buka }) => <DaftarJurnal tipe="pembayaran" buka={buka} />}
      renderForm={(p) => <FormKasBank tipe="pembayaran" {...p} />}
    />
  );
}
