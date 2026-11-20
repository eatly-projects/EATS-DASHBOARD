// Buku Besar > Jurnal Umum: catat transaksi apa pun dengan debit dan kredit yang seimbang.
import { KerangkaDaftarForm } from "@/widgets/daftar-form/ui/KerangkaDaftarForm";
import { DaftarJurnal } from "@/widgets/rincian-jurnal/ui/DaftarJurnal";
import { FormJurnal } from "@/widgets/rincian-jurnal/ui/FormJurnal";
import { useHak } from "@/entities/navigasi";

export function JurnalUmumPage() {
  const hak = useHak("jurnal_umum");
  return (
    <KerangkaDaftarForm
      namaData="jurnal umum"
      bisaBuat={hak.buat}
      renderDaftar={({ buka }) => <DaftarJurnal tipe="jurnal_umum" buka={buka} />}
      renderForm={(p) => <FormJurnal tipe="jurnal_umum" {...p} />}
    />
  );
}
