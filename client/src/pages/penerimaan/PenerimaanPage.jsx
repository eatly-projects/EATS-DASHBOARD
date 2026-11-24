// Kas & Bank > Penerimaan: uang masuk ke rekening atau kas, pola daftar lalu formulir seperti Accurate.
import { KerangkaDaftarForm } from "@/widgets/daftar-form/ui/KerangkaDaftarForm";
import { DaftarJurnal } from "@/widgets/rincian-jurnal/ui/DaftarJurnal";
import { FormKasBank } from "@/widgets/rincian-jurnal/ui/FormKasBank";
import { useHak } from "@/entities/navigasi";

export function PenerimaanPage() {
  const hak = useHak("penerimaan");
  return (
    <KerangkaDaftarForm
      namaData="penerimaan"
      bisaBuat={hak.buat}
      renderDaftar={({ buka }) => <DaftarJurnal tipe="penerimaan" buka={buka} />}
      renderForm={(p) => <FormKasBank tipe="penerimaan" {...p} />}
    />
  );
}
