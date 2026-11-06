// Halaman "Cek dan setujui" untuk satu unggahan.
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiCpu, FiDownload, FiRefreshCw, FiX } from "react-icons/fi";
import { CardBox, ErrorState, Skeleton, TableSkeleton } from "@/shared/ui/bits";
import { Button } from "@/shared/ui/button";
import { tanggalJam, ukuranBerkas } from "@/shared/lib/format";
import { useReferensi } from "@/entities/referensi";
import {
  NAMA_JENIS,
  kalimatRingkasan,
  namaPembaca,
  useBacaUnggahan,
  useBatalkanUnggahan,
  useUnggahan,
} from "@/entities/unggahan";
import { StatusUnggahan } from "@/entities/unggahan/ui/StatusUnggahan";
import { PanelRencana } from "./ui/PanelRencana";

function KepalaUnggahan({ u }) {
  const pembaca = namaPembaca(u.sumber_ai);
  return (
    <CardBox>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="break-words font-display text-lg font-bold text-foreground sm:text-xl">{u.nama_berkas}</h2>
            <StatusUnggahan status={u.status} />
          </div>
          <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm text-muted-foreground sm:grid-cols-2">
            <div>
              <dt className="inline">Jenis: </dt>
              <dd className="inline text-foreground">
                {NAMA_JENIS[u.jenis_berkas] ?? "Berkas"} · {ukuranBerkas(u.ukuran)}
              </dd>
            </div>
            <div>
              <dt className="inline">Diunggah: </dt>
              <dd className="inline text-foreground">
                {tanggalJam(u.diunggah_at)}
                {u.diunggah_oleh_nama ? ` oleh ${u.diunggah_oleh_nama}` : ""}
              </dd>
            </div>
            {pembaca && (
              <div>
                <dt className="inline">Dibaca oleh: </dt>
                <dd className="inline text-foreground">
                  {pembaca}
                  {u.dibaca_at ? ` · ${tanggalJam(u.dibaca_at)}` : ""}
                </dd>
              </div>
            )}
            {u.diputuskan_at && (
              <div>
                <dt className="inline">{u.status === "disetujui" ? "Disetujui: " : "Dibatalkan: "}</dt>
                <dd className="inline text-foreground">
                  {tanggalJam(u.diputuskan_at)}
                  {u.diputuskan_oleh_nama ? ` oleh ${u.diputuskan_oleh_nama}` : ""}
                </dd>
              </div>
            )}
          </dl>
        </div>
        <Button variant="outline" size="sm" asChild className="hover:bg-muted hover:text-foreground">
          <a href={`/api/unggahan/${u.id}/berkas`} download={u.nama_berkas}>
            <FiDownload aria-hidden /> Unduh berkas asli
          </a>
        </Button>
      </div>
    </CardBox>
  );
}

function PanelBelumDibaca({ u }) {
  const navigate = useNavigate();
  const baca = useBacaUnggahan();
  const batalkan = useBatalkanUnggahan(u.id);
  const gagal = u.status === "gagal_dibaca";
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${gagal ? "bg-destructive/10 text-destructive" : "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"}`}>
          <FiCpu className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-bold text-foreground">{gagal ? "AI belum berhasil membaca berkas ini" : "Berkas belum dibaca AI"}</p>
          {gagal && u.pesan_gagal && (
            <p className="mt-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{u.pesan_gagal}</p>
          )}
          {baca.isPending && (
            <p className="mt-2 text-sm text-muted-foreground">AI sedang membaca berkas… biasanya 20–60 detik. Jangan tutup halaman ini.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => baca.mutate(u.id)} disabled={baca.isPending}>
              <FiRefreshCw className={baca.isPending ? "animate-spin" : ""} aria-hidden /> {gagal ? "Coba baca lagi" : "Baca dengan AI"}
            </Button>
            <Button
              variant="outline"
              className="hover:bg-muted hover:text-foreground"
              disabled={batalkan.isPending || baca.isPending}
              onClick={() => batalkan.mutate(undefined, { onSuccess: () => navigate("/unggah") })}
            >
              <FiX aria-hidden /> Batalkan
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CekUnggahanPage() {
  const { id } = useParams();
  const q = useUnggahan(id);
  const { ref, isPending: refMemuat, isError: refGalat, error: galatRef } = useReferensi();

  if (q.isPending || refMemuat) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <TableSkeleton baris={10} />
      </div>
    );
  }
  if (q.isError || refGalat) {
    return (
      <ErrorState
        judul={q.error?.status === 404 ? "Unggahan tidak ditemukan" : "Data gagal dimuat"}
        pesan={(q.error ?? galatRef)?.message}
        aksi={
          <Button variant="outline" asChild className="hover:bg-muted hover:text-foreground">
            <Link to="/unggah">Kembali ke daftar unggahan</Link>
          </Button>
        }
      />
    );
  }

  const u = q.data?.unggahan ?? q.data;
  const dataTersimpan = q.data?.data_tersimpan ?? [];
  const bisaUbah = u.status === "menunggu_cek";
  const sudahDiputuskan = u.status === "disetujui" || u.status === "dibatalkan";

  return (
    <div className="space-y-6">
      <Link to="/unggah" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <FiArrowLeft className="h-4 w-4" aria-hidden /> Kembali ke unggah laporan
      </Link>

      <KepalaUnggahan u={u} />

      {sudahDiputuskan && (
        <div
          className={`rounded-xl border p-4 text-sm ${u.status === "disetujui" ? "border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/5" : "border-border bg-muted/40"}`}
        >
          {u.status === "disetujui" ? (
            <>
              <p className="font-medium text-foreground">Unggahan ini sudah disetujui dan tersimpan.</p>
              <p className="mt-0.5 text-muted-foreground">
                {kalimatRingkasan(u.ringkasan_simpan)} Tabel di bawah adalah hasil bacaan AI; angka yang disimpan bisa berbeda kalau diubah saat pengecekan — angka final ada di{" "}
                <Link to="/" className="font-medium text-[hsl(var(--primary))] hover:underline">
                  ringkasan laba rugi
                </Link>
                .
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">Unggahan ini dibatalkan. Tidak ada angka yang disimpan dari berkas ini.</p>
          )}
        </div>
      )}

      {(u.status === "diunggah" || u.status === "gagal_dibaca") && <PanelBelumDibaca u={u} />}

      {u.rencana && (u.status === "menunggu_cek" || sudahDiputuskan) && (
        <PanelRencana
          key={`${u.id}-${u.dibaca_at ?? ""}`}
          unggahan={u}
          dataTersimpan={dataTersimpan}
          referensi={ref}
          bisaUbah={bisaUbah}
        />
      )}
    </div>
  );
}
