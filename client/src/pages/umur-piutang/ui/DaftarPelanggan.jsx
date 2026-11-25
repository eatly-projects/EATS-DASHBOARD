// Daftar pelanggan Umur Piutang: tabel di layar lebar, kartu di HP dan tablet. Setiap pelanggan bisa
// dibuka untuk melihat dokumennya; setiap dokumen punya tombol "Buka di Operasional".
import { Fragment, useState } from "react";
import { FiChevronDown, FiChevronRight, FiExternalLink } from "react-icons/fi";
import { Button } from "@/shared/ui/button";
import { formatRupiah } from "@/shared/lib/uang";
import { tanggal } from "@/shared/lib/format";
import { cn } from "@/shared/lib/cn";
import { KELOMPOK_UMUR, NAMA_KELOMPOK, namaLiniBisnis } from "@/entities/umur-piutang";

const JENIS = { co: "Confirmation Order (CO)", invoice_po: "Invoice PO" };

const nol = (teks) => !teks || Number(teks) === 0;

function Uang({ teks, className }) {
  return <span className={cn("tabular-nums", nol(teks) && "text-muted-foreground", className)}>{formatRupiah(teks)}</span>;
}

const jatuhTempo = (d) => (d.jenis_dokumen === "co" ? "Tidak ada" : d.jatuh_tempo ? tanggal(d.jatuh_tempo) : "—");

function TombolOperasional({ url }) {
  if (!url) return null;
  return (
    <Button asChild variant="outline" size="sm" className="gap-2 hover:bg-muted hover:text-foreground">
      <a href={url} target="_blank" rel="noopener noreferrer">
        <FiExternalLink className="h-4 w-4" aria-hidden /> Buka di Operasional
      </a>
    </Button>
  );
}

function SisaDokumen({ d }) {
  return (
    <span className="flex flex-col items-end gap-0.5">
      <Uang teks={d.sisa} className="font-semibold" />
      {!nol(d.harus_dikembalikan) && (
        <span className="text-xs font-medium text-[hsl(var(--warning))]">Harus dikembalikan {formatRupiah(d.harus_dikembalikan)}</span>
      )}
    </span>
  );
}

function NomorDokumen({ d }) {
  return (
    <span className="flex flex-col">
      <span className="font-medium text-foreground">{d.nomor_dokumen}</span>
      <span className="text-xs text-muted-foreground">
        {JENIS[d.jenis_dokumen] ?? d.jenis_dokumen}
        {d.nomor_po_klien && ` · PO klien ${d.nomor_po_klien}`}
      </span>
    </span>
  );
}

function TabelDokumen({ dokumen }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-muted-foreground">
          {["Dokumen", "Tanggal", "Jatuh tempo", "Lini bisnis"].map((j) => (
            <th key={j} className="px-3 py-2 font-medium">{j}</th>
          ))}
          {["Tagihan", "Retur", "Dibayar", "Sisa"].map((j) => (
            <th key={j} className="px-3 py-2 text-right font-medium">{j}</th>
          ))}
          <th className="px-3 py-2 font-medium">Kelompok</th>
          <th className="px-3 py-2"><span className="sr-only">Tindakan</span></th>
        </tr>
      </thead>
      <tbody>
        {dokumen.map((d) => (
          <tr key={`${d.jenis_dokumen}-${d.id_dokumen}`} className="border-t border-border/60 align-top">
            <td className="px-3 py-2"><NomorDokumen d={d} /></td>
            <td className="whitespace-nowrap px-3 py-2">{tanggal(d.tanggal_dokumen)}</td>
            <td className="whitespace-nowrap px-3 py-2">{jatuhTempo(d)}</td>
            <td className="whitespace-nowrap px-3 py-2">{namaLiniBisnis(d.segmen)}</td>
            <td className="whitespace-nowrap px-3 py-2 text-right"><Uang teks={d.total_tagihan} /></td>
            <td className="whitespace-nowrap px-3 py-2 text-right"><Uang teks={d.total_retur} /></td>
            <td className="whitespace-nowrap px-3 py-2 text-right"><Uang teks={d.dibayar} /></td>
            <td className="whitespace-nowrap px-3 py-2 text-right"><SisaDokumen d={d} /></td>
            <td className="whitespace-nowrap px-3 py-2">{NAMA_KELOMPOK[d.umur_piutang] ?? "—"}</td>
            <td className="px-3 py-2 text-right"><TombolOperasional url={d.url_operasional} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function KartuDokumen({ d }) {
  const baris = [
    ["Tanggal", tanggal(d.tanggal_dokumen)],
    ["Jatuh tempo", jatuhTempo(d)],
    ["Lini bisnis", namaLiniBisnis(d.segmen)],
    ["Kelompok", NAMA_KELOMPOK[d.umur_piutang] ?? "—"],
    ["Tagihan", <Uang key="t" teks={d.total_tagihan} />],
    ["Retur", <Uang key="r" teks={d.total_retur} />],
    ["Dibayar", <Uang key="b" teks={d.dibayar} />],
  ];
  return (
    <li className="space-y-2 rounded-xl border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <NomorDokumen d={d} />
        <SisaDokumen d={d} />
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        {baris.map(([k, v]) => (
          <Fragment key={k}>
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="text-right">{v}</dd>
          </Fragment>
        ))}
      </dl>
      <TombolOperasional url={d.url_operasional} />
    </li>
  );
}

const namaPelanggan = (p) => (p.kode ? `${p.kode} · ${p.nama}` : p.nama);

export function DaftarPelanggan({ pelanggan }) {
  const [terbuka, setTerbuka] = useState(() => new Set());
  const alih = (kunci) =>
    setTerbuka((s) => {
      const baru = new Set(s);
      if (baru.has(kunci)) baru.delete(kunci);
      else baru.add(kunci);
      return baru;
    });

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-border lg:block">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 font-medium">Pelanggan</th>
              {KELOMPOK_UMUR.map((k) => (
                <th key={k.kode} className="px-3 py-2.5 text-right font-medium">{k.nama}</th>
              ))}
              <th className="px-3 py-2.5 text-right font-medium">Total belum dibayar</th>
            </tr>
          </thead>
          <tbody>
            {pelanggan.map((p) => {
              const buka = terbuka.has(p.kunci);
              return (
                <Fragment key={p.kunci}>
                  <tr className="border-t border-border">
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => alih(p.kunci)}
                        aria-expanded={buka}
                        className="flex items-start gap-2 text-left font-medium text-foreground hover:text-[hsl(var(--primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                      >
                        {buka ? <FiChevronDown className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <FiChevronRight className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
                        <span>
                          {namaPelanggan(p)}
                          <span className="block text-xs font-normal text-muted-foreground">{p.jumlah_dokumen} dokumen</span>
                        </span>
                      </button>
                    </td>
                    {KELOMPOK_UMUR.map((k) => (
                      <td key={k.kode} className="whitespace-nowrap px-3 py-2.5 text-right"><Uang teks={p.sisa_per_umur[k.kode]} /></td>
                    ))}
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      <SisaDokumen d={p} />
                    </td>
                  </tr>
                  {buka && (
                    <tr className="bg-muted/30">
                      <td colSpan={KELOMPOK_UMUR.length + 2} className="px-3 pb-3">
                        <TabelDokumen dokumen={p.dokumen} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 lg:hidden">
        {pelanggan.map((p) => {
          const buka = terbuka.has(p.kunci);
          return (
            <li key={p.kunci} className="rounded-xl border border-border bg-card p-3">
              <button
                type="button"
                onClick={() => alih(p.kunci)}
                aria-expanded={buka}
                className="flex w-full items-start justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-foreground">{namaPelanggan(p)}</span>
                  <span className="text-xs text-muted-foreground">{p.jumlah_dokumen} dokumen · {buka ? "Tutup rincian" : "Lihat rincian"}</span>
                </span>
                <SisaDokumen d={p} />
              </button>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                {KELOMPOK_UMUR.filter((k) => !nol(p.sisa_per_umur[k.kode])).map((k) => (
                  <Fragment key={k.kode}>
                    <dt className="text-muted-foreground">{k.nama}</dt>
                    <dd className="text-right"><Uang teks={p.sisa_per_umur[k.kode]} /></dd>
                  </Fragment>
                ))}
              </dl>
              {buka && (
                <ul className="mt-3 space-y-2">
                  {p.dokumen.map((d) => (
                    <KartuDokumen key={`${d.jenis_dokumen}-${d.id_dokumen}`} d={d} />
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
