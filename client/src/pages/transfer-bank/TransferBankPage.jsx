// Kas & Bank > Transfer Bank: pindah uang antar-rekening atau ke kas, pola daftar lalu formulir.
import { KerangkaDaftarForm } from "@/widgets/daftar-form/ui/KerangkaDaftarForm";
import { DaftarJurnal } from "@/widgets/rincian-jurnal/ui/DaftarJurnal";
import { FormTransferBank } from "@/widgets/rincian-jurnal/ui/FormTransferBank";
import { useHak } from "@/entities/navigasi";

export function TransferBankPage() {
  const hak = useHak("transfer_bank");
  return (
    <KerangkaDaftarForm
      namaData="transfer bank"
      bisaBuat={hak.buat}
      renderDaftar={({ buka }) => <DaftarJurnal tipe="transfer_bank" buka={buka} />}
      renderForm={(p) => <FormTransferBank {...p} />}
    />
  );
}
