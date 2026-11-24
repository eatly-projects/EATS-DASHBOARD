import { useState } from "react";
import { FiCheck, FiX } from "react-icons/fi";
import { ErrorState, Skeleton } from "@/shared/ui/bits";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { FormDokumen } from "@/widgets/daftar-form/ui/FormDokumen";
import { RincianBaca } from "@/widgets/rincian-jurnal/ui/RincianBaca";
import { usePersetujuan, useSetujui, useTolak } from "@/entities/persetujuan";
import { formatRupiah } from "@/shared/lib/uang";
import { tanggal, tanggalJam } from "@/shared/lib/format";
import { LencanaStatusJurnal } from "@/shared/ui/LencanaStatusJurnal";

// Label akun kepala per tipe transaksi.
const LABEL_KEPALA = { pencatatan_beban: "Hutang beban", penerimaan: "Setor ke", pembayaran: "Bayar dari", transfer_bank: "Dari rekening" };

function Data({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{children}</dd>
    </div>
  );
}

export function DetailPersetujuan({ id, tutup }) {
  const q = usePersetujuan(id);
  const setujui = useSetujui();
  const tolak = useTolak();
  const [dialogTolak, setDialogTolak] = useState(false);
  const [alasan, setAlasan] = useState("");

  if (q.isError) return <ErrorState pesan={q.error?.message} />;
  if (!q.data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  const j = q.data;
  const menunggu = j.status === "diajukan";
  const bisa = menunggu && j.bisa_putuskan;
  const namaPenyetuju = j.penyetuju.map((p) => p.nama).join(", ") || "belum ada penyetuju";

  return (
    <>
      <FormDokumen
        tab={[
          {
            kunci: "kepala",
            judul: j.tipe_nama,
            isi: (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <LencanaStatusJurnal status={j.status} />
                  {menunggu && !j.bisa_putuskan && <span className="text-sm text-muted-foreground">Menunggu keputusan {namaPenyetuju}.</span>}
                </div>
                <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Data label="Tanggal">{tanggal(j.tanggal)}</Data>
                  <Data label="Total">
                    <span className="font-semibold tabular-nums">{formatRupiah(j.total)}</span>
                  </Data>
                  <Data label="Dibuat oleh">
                    {j.dibuat_oleh_nama || "—"}
                    {j.diubah_at ? ` (terakhir diubah ${tanggalJam(j.diubah_at)})` : ""}
                  </Data>
                  <Data label="Penyetuju">{namaPenyetuju}</Data>
                  {j.akun_lawan_nama && <Data label={LABEL_KEPALA[j.tipe] ?? "Akun"}>{j.akun_lawan_nama}</Data>}
                  {j.akun_tujuan_nama && <Data label="Ke rekening">{j.akun_tujuan_nama}</Data>}
                  <div className="sm:col-span-2 xl:col-span-4">
                    <Data label="Keterangan">{j.keterangan || "—"}</Data>
                  </div>
                  {j.status === "ditolak" && (
                    <div className="sm:col-span-2 xl:col-span-4">
                      <Data label={`Alasan penolakan (${j.diputuskan_oleh_nama ?? "penyetuju"})`}>{j.alasan_keputusan || "—"}</Data>
                    </div>
                  )}
                </dl>
              </div>
            ),
          },
          { kunci: "rincian", judul: "Rincian", isi: <RincianBaca baris={j.semua_baris} /> },
        ]}
        aksi={
          bisa
            ? [
                {
                  kunci: "setujui",
                  label: "Setujui",
                  labelMemuat: "Menyetujui…",
                  ikon: FiCheck,
                  nada: "utama",
                  memuat: setujui.isPending,
                  onClick: () => setujui.mutate(id, { onSuccess: tutup }),
                },
                { kunci: "tolak", label: "Tolak", ikon: FiX, nada: "bahaya", onClick: () => setDialogTolak(true), memuat: tolak.isPending },
              ]
            : []
        }
        catatan={bisa ? "Setelah disetujui, transaksi mendapat nomor dan masuk laporan." : null}
      />
      <Dialog open={dialogTolak} onOpenChange={setDialogTolak}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak transaksi ini?</DialogTitle>
            <DialogDescription>Tulis alasannya. Pembuat transaksi akan melihat alasan ini, lalu bisa memperbaiki dan mengajukan lagi.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor={`alasan-${id}`}>Alasan penolakan</Label>
            <textarea
              id={`alasan-${id}`}
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              maxLength={300}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Misalnya: bukti pembayaran belum dilampirkan"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogTolak(false)} className="hover:bg-muted hover:text-foreground">
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={!alasan.trim() || tolak.isPending}
              onClick={() =>
                tolak.mutate(
                  { id, alasan: alasan.trim() },
                  {
                    onSuccess: () => {
                      setDialogTolak(false);
                      tutup();
                    },
                  },
                )
              }
            >
              {tolak.isPending ? "Menolak…" : "Ya, tolak"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
