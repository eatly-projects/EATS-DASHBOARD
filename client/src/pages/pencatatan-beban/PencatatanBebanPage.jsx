// Buku Besar > Pencatatan Beban: beban yang belum dibayar dicatat sebagai utang beban (akrual, seperti Accurate).
import { KerangkaDaftarForm } from "@/widgets/daftar-form/ui/KerangkaDaftarForm";
import { DaftarJurnal } from "@/widgets/rincian-jurnal/ui/DaftarJurnal";
import { FormJurnal } from "@/widgets/rincian-jurnal/ui/FormJurnal";
import { useHak } from "@/entities/navigasi";

export function PencatatanBebanPage() {
  const hak = useHak("pencatatan_beban");
  return (
    <KerangkaDaftarForm
      namaData="pencatatan beban"
      bisaBuat={hak.buat}
      renderDaftar={({ buka }) => <DaftarJurnal tipe="pencatatan_beban" buka={buka} />}
      renderForm={(p) => <FormJurnal tipe="pencatatan_beban" {...p} />}
    />
  );
}
