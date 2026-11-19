// Perusahaan > Log Aktivitas: siapa mengubah apa, kapan. Daftar dengan filter, lalu detail.
import { useState } from "react";
import { KerangkaDaftarForm } from "@/widgets/daftar-form/ui/KerangkaDaftarForm";
import { DaftarData } from "@/widgets/daftar-form/ui/DaftarData";
import { ChipFilter } from "@/widgets/daftar-form/ui/ChipFilter";
import { BULAN_PENDEK, tanggal, tanggalJam } from "@/shared/lib/format";
import { useTertunda } from "@/shared/lib/useTertunda";
import { cn } from "@/shared/lib/cn";
import { NAMA_TINDAKAN, useDaftarLog, usePilihanLog } from "@/entities/log-aktivitas";
import { DetailLog } from "./ui/DetailLog";

const SEMUA = "semua";
const hariIni = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
function geserHari(t, n) {
  const d = new Date(`${t}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const PILIHAN_TANGGAL = [
  { nilai: SEMUA, label: "Semua" },
  { nilai: "hari_ini", label: "Hari ini" },
  { nilai: "7_hari", label: "7 hari terakhir" },
  { nilai: "30_hari", label: "30 hari terakhir" },
  { nilai: "bulan_ini", label: "Bulan ini" },
];

function rentang(pilihan) {
  const h = hariIni();
  if (pilihan === "hari_ini") return { dari: h, sampai: h };
  if (pilihan === "7_hari") return { dari: geserHari(h, -6), sampai: h };
  if (pilihan === "30_hari") return { dari: geserHari(h, -29), sampai: h };
  if (pilihan === "bulan_ini") return { dari: `${h.slice(0, 8)}01`, sampai: h };
  return { dari: "", sampai: "" };
}

/** "13–19 Nov 2026", "28 Okt – 3 Nov 2026", atau "19 Nov 2026". */
function labelRentang({ dari, sampai }) {
  const [y1, m1, d1] = dari.split("-").map(Number);
  const [y2, m2, d2] = sampai.split("-").map(Number);
  if (dari === sampai) return `${d1} ${BULAN_PENDEK[m1 - 1]} ${y1}`;
  if (y1 === y2 && m1 === m2) return `${d1}–${d2} ${BULAN_PENDEK[m1 - 1]} ${y1}`;
  if (y1 === y2) return `${d1} ${BULAN_PENDEK[m1 - 1]} – ${d2} ${BULAN_PENDEK[m2 - 1]} ${y1}`;
  return `${d1} ${BULAN_PENDEK[m1 - 1]} ${y1} – ${d2} ${BULAN_PENDEK[m2 - 1]} ${y2}`;
}

const WARNA_TINDAKAN = {
  buat: "border-[hsl(var(--jenis-transaksi-garis))] bg-[hsl(var(--jenis-transaksi))] text-[hsl(var(--jenis-transaksi-isi))]",
  ubah: "border-[hsl(var(--jenis-data-induk-garis))] bg-[hsl(var(--jenis-data-induk))] text-[hsl(var(--jenis-data-induk-isi))]",
  hapus: "border-destructive/30 bg-destructive/10 text-destructive",
};
const Tindakan = ({ t }) => (
  <span className={cn("inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold", WARNA_TINDAKAN[t])}>{NAMA_TINDAKAN[t] ?? t}</span>
);

const KOLOM = [
  { kunci: "waktu", judul: "Waktu", render: (l) => <span className="whitespace-nowrap">{tanggalJam(l.waktu)}</span> },
  { kunci: "tindakan", judul: "Tindakan", render: (l) => <Tindakan t={l.tindakan} /> },
  { kunci: "menu_nama", judul: "Menu" },
  { kunci: "referensi", judul: "Referensi", render: (l) => l.referensi || "—" },
  { kunci: "tanggal_transaksi", judul: "Tanggal transaksi", render: (l) => (l.tanggal_transaksi ? tanggal(l.tanggal_transaksi) : "—") },
  { kunci: "pengguna_nama", judul: "Pengguna" },
  { kunci: "pengguna_email", judul: "Email", render: (l) => <span className="break-all">{l.pengguna_email}</span> },
  { kunci: "alamat_ip", judul: "Alamat IP", render: (l) => l.alamat_ip || "—" },
];

function DaftarLog({ buka }) {
  const [tanggalPilih, setTanggalPilih] = useState(SEMUA);
  const [menu, setMenu] = useState(SEMUA);
  const [pengguna, setPengguna] = useState(SEMUA);
  const [tindakan, setTindakan] = useState(SEMUA);
  const [cari, setCari] = useState("");
  const cariTertunda = useTertunda(cari.trim());
  const r = rentang(tanggalPilih);
  const pilihan = usePilihanLog();
  const q = useDaftarLog({
    ...r,
    menu: menu === SEMUA ? "" : menu,
    pengguna_id: pengguna === SEMUA ? "" : pengguna,
    tindakan: tindakan === SEMUA ? "" : tindakan,
    cari: cariTertunda,
  });
  const baris = q.data?.pages.flatMap((p) => p.baris) ?? [];
  const labelTanggal = tanggalPilih === SEMUA ? "Semua" : `${PILIHAN_TANGGAL.find((p) => p.nilai === tanggalPilih).label} (${labelRentang(r)})`;
  const adaFilter = tanggalPilih !== SEMUA || menu !== SEMUA || pengguna !== SEMUA || tindakan !== SEMUA || cariTertunda;

  return (
    <DaftarData
      kolom={KOLOM}
      baris={baris}
      memuat={q.isPending}
      galat={q.isError ? q.error : null}
      onMuatUlang={() => q.refetch()}
      onPilih={(l) => buka(l.id, `${NAMA_TINDAKAN[l.tindakan]} ${l.referensi || l.menu_nama}`)}
      cari={cari}
      onCari={setCari}
      jumlah={q.data?.pages[0]?.jumlah}
      adaLagi={q.hasNextPage}
      onMuatLagi={() => q.fetchNextPage()}
      memuatLagi={q.isFetchingNextPage}
      filter={
        <>
          <ChipFilter label="Tanggal" nilai={tanggalPilih} pilihan={PILIHAN_TANGGAL} onUbah={setTanggalPilih} labelAktif={labelTanggal} />
          <ChipFilter
            label="Menu"
            nilai={menu}
            pilihan={[{ nilai: SEMUA, label: "Semua" }, ...(pilihan.data?.menu ?? []).map((m) => ({ nilai: m.kode, label: m.nama }))]}
            onUbah={setMenu}
          />
          <ChipFilter
            label="Pengguna"
            nilai={pengguna}
            pilihan={[{ nilai: SEMUA, label: "Semua" }, ...(pilihan.data?.pengguna ?? []).map((p) => ({ nilai: p.id, label: p.nama }))]}
            onUbah={setPengguna}
          />
          <ChipFilter
            label="Tindakan"
            nilai={tindakan}
            pilihan={[{ nilai: SEMUA, label: "Semua" }, ...Object.entries(NAMA_TINDAKAN).map(([nilai, label]) => ({ nilai, label }))]}
            onUbah={setTindakan}
          />
        </>
      }
      kosong={
        adaFilter
          ? { judul: "Tidak ada catatan yang cocok", keterangan: "Coba longgarkan filter atau kata pencarian." }
          : { judul: "Belum ada catatan", keterangan: "Setiap perubahan data akan tercatat di sini." }
      }
      kartuHp={(l) => (
        <>
          <div className="flex items-center justify-between gap-2">
            <Tindakan t={l.tindakan} />
            <span className="text-xs text-muted-foreground">{tanggalJam(l.waktu)}</span>
          </div>
          <p className="mt-1.5 font-medium text-foreground">{l.referensi || "—"}</p>
          <p className="text-sm text-muted-foreground">
            {l.menu_nama} · {l.pengguna_nama}
          </p>
        </>
      )}
    />
  );
}

export function LogAktivitasPage() {
  return (
    <KerangkaDaftarForm
      namaData="log aktivitas"
      renderDaftar={({ buka }) => <DaftarLog buka={buka} />}
      renderForm={({ id }) => <DetailLog id={id} />}
    />
  );
}
