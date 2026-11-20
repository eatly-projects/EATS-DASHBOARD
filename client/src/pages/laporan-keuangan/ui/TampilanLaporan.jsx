// Tampilan setiap laporan keuangan. Angka rupiah penuh; sel tanpa nilai ditulis "—";
// baris jumlah tebal. Di HP tabel bisa digeser dengan kolom nama tetap terlihat.
import { FiAlertTriangle } from "react-icons/fi";
import { cn } from "@/shared/lib/cn";
import { formatRupiah, keSen } from "@/shared/lib/uang";
import { tanggal } from "@/shared/lib/format";

const NOL = keSen("0");
/** Sel rincian: nol ditulis "—" (tidak ada nilai), selain itu rupiah penuh. */
const sel = (v) => (v === null || v === undefined || keSen(v) === NOL ? "—" : formatRupiah(v));
/** Sel jumlah: nol tetap "Rp 0" karena memang sudah dihitung. */
const jumlah = (v) => formatRupiah(v ?? "0");

const KOTAK = "overflow-x-auto rounded-xl border border-border bg-card";
const TH = "whitespace-nowrap px-3 py-2.5 text-left font-semibold";
const TD = "px-3 py-2 align-top";
const ANGKA = "whitespace-nowrap px-3 py-2 text-right tabular-nums align-top";
const TEMPEL = "sticky left-0 z-10 bg-card";

function BarisJudul({ judul, kolom, kelas }) {
  return (
    <tr className={cn("border-t border-border bg-muted/50", kelas)}>
      <td className={cn(TD, TEMPEL, "bg-muted/50 font-bold text-foreground")} colSpan={1}>
        {judul}
      </td>
      <td colSpan={kolom} />
    </tr>
  );
}

// ── Laba/Rugi ─────────────────────────────────────────────────────────────
export function LabaRugi({ data }) {
  const kolom = data.kolom;
  return (
    <div className={KOTAK}>
      <table className="w-full min-w-[32rem] text-sm">
        <thead>
          <tr className="bg-muted text-muted-foreground">
            <th scope="col" className={cn(TH, TEMPEL, "bg-muted")}>
              Akun
            </th>
            {kolom.map((k) => (
              <th key={k.kunci} scope="col" className={cn(TH, "text-right")}>
                {k.nama}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.bagian.map((b) =>
            b.jenis === "ringkasan" ? (
              <tr key={b.kunci} className="border-t-2 border-border bg-[hsl(var(--accent))]/50 font-bold">
                <td className={cn(TD, TEMPEL, "bg-[hsl(var(--accent))]")}>{b.judul}</td>
                {kolom.map((k) => (
                  <td key={k.kunci} className={ANGKA}>
                    {jumlah(b.nilai[k.kunci])}
                  </td>
                ))}
              </tr>
            ) : (
              <BagianLabaRugi key={b.kunci} b={b} kolom={kolom} />
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

function BagianLabaRugi({ b, kolom }) {
  return (
    <>
      <BarisJudul judul={b.judul} kolom={kolom.length} />
      {b.baris.length === 0 ? (
        <tr className="border-t border-border/60">
          <td className={cn(TD, TEMPEL, "pl-6 text-muted-foreground")}>Tidak ada transaksi</td>
          <td colSpan={kolom.length} />
        </tr>
      ) : (
        b.baris.map((r) => (
          <tr key={r.akun_id} className="border-t border-border/60">
            <td className={cn(TD, TEMPEL, "pl-6")}>
              <span className="mr-2 tabular-nums text-muted-foreground">{r.kode}</span>
              {r.nama}
            </td>
            {kolom.map((k) => (
              <td key={k.kunci} className={ANGKA}>
                {sel(r.nilai[k.kunci])}
              </td>
            ))}
          </tr>
        ))
      )}
      <tr className="border-t border-border font-semibold">
        <td className={cn(TD, TEMPEL)}>{b.judul_total}</td>
        {kolom.map((k) => (
          <td key={k.kunci} className={ANGKA}>
            {jumlah(b.total[k.kunci])}
          </td>
        ))}
      </tr>
    </>
  );
}

// ── Neraca ────────────────────────────────────────────────────────────────
export function Neraca({ data }) {
  return (
    <div className="space-y-3">
      {!data.seimbang && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Jumlah aset tidak sama dengan jumlah liabilitas dan ekuitas. Ini tidak seharusnya terjadi; hubungi pengelola aplikasi.
        </div>
      )}
      <div className={KOTAK}>
        <table className="w-full min-w-[26rem] text-sm">
          <thead>
            <tr className="bg-muted text-muted-foreground">
              <th scope="col" className={cn(TH, TEMPEL, "bg-muted")}>
                Deskripsi
              </th>
              <th scope="col" className={cn(TH, "text-right")}>
                Nilai
              </th>
            </tr>
          </thead>
          <tbody>
            {data.bagian.map((k) => (
              <KelompokNeraca key={k.kunci} k={k} />
            ))}
            <tr className="border-t-2 border-border bg-[hsl(var(--accent))]/50 font-bold">
              <td className={cn(TD, TEMPEL, "bg-[hsl(var(--accent))]")}>JUMLAH LIABILITAS DAN EKUITAS</td>
              <td className={ANGKA}>{jumlah(data.jumlah_liabilitas_ekuitas)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KelompokNeraca({ k }) {
  return (
    <>
      <BarisJudul judul={k.judul} kolom={1} />
      {k.sub.map((s) => (
        <SubNeraca key={s.judul} s={s} />
      ))}
      <tr className="border-t-2 border-border bg-[hsl(var(--accent))]/50 font-bold">
        <td className={cn(TD, TEMPEL, "bg-[hsl(var(--accent))]")}>{k.judul_total}</td>
        <td className={ANGKA}>{jumlah(k.total)}</td>
      </tr>
    </>
  );
}

function SubNeraca({ s }) {
  return (
    <>
      <tr className="border-t border-border/60">
        <td className={cn(TD, TEMPEL, "pl-5 font-semibold")}>{s.judul}</td>
        <td />
      </tr>
      {s.baris.length === 0 && (
        <tr className="border-t border-border/60">
          <td className={cn(TD, TEMPEL, "pl-9 text-muted-foreground")}>Tidak ada saldo</td>
          <td className={ANGKA}>—</td>
        </tr>
      )}
      {s.baris.map((r, i) => (
        <tr key={r.akun_id ?? `${r.nama}-${i}`} className="border-t border-border/60">
          <td className={cn(TD, TEMPEL, "pl-9")}>
            {r.kode && <span className="mr-2 tabular-nums text-muted-foreground">{r.kode}</span>}
            {r.nama}
            {r.dihitung && <span className="ml-1.5 text-xs text-muted-foreground">(dihitung dari laba rugi)</span>}
          </td>
          <td className={ANGKA}>{jumlah(r.nilai)}</td>
        </tr>
      ))}
      <tr className="border-t border-border font-semibold">
        <td className={cn(TD, TEMPEL, "pl-5")}>{s.judul_total}</td>
        <td className={ANGKA}>{jumlah(s.total)}</td>
      </tr>
    </>
  );
}

// ── Neraca Percobaan ──────────────────────────────────────────────────────
export function NeracaPercobaan({ data }) {
  if (!data.baris.length) return <Kosong />;
  return (
    <div className={KOTAK}>
      <table className="w-full min-w-[48rem] text-sm">
        <thead>
          <tr className="bg-muted text-muted-foreground">
            <th scope="col" className={cn(TH, TEMPEL, "bg-muted")}>
              Akun
            </th>
            <th scope="col" className={TH}>
              Tipe akun
            </th>
            <th scope="col" className={cn(TH, "text-right")}>
              Saldo awal
            </th>
            <th scope="col" className={cn(TH, "text-right")}>
              Debit
            </th>
            <th scope="col" className={cn(TH, "text-right")}>
              Kredit
            </th>
            <th scope="col" className={cn(TH, "text-right")}>
              Saldo akhir
            </th>
          </tr>
        </thead>
        <tbody>
          {data.baris.map((r) => (
            <tr key={r.akun_id} className="border-t border-border/60">
              <td className={cn(TD, TEMPEL)}>
                <span className="mr-2 tabular-nums text-muted-foreground">{r.kode}</span>
                {r.nama}
              </td>
              <td className={TD}>{r.tipe_nama}</td>
              <td className={ANGKA}>{sel(r.saldo_awal)}</td>
              <td className={ANGKA}>{sel(r.debit)}</td>
              <td className={ANGKA}>{sel(r.kredit)}</td>
              <td className={ANGKA}>{sel(r.saldo_akhir)}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-border font-bold">
            <td className={cn(TD, TEMPEL)}>Total</td>
            <td />
            <td />
            <td className={ANGKA}>{jumlah(data.total.debit)}</td>
            <td className={ANGKA}>{jumlah(data.total.kredit)}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Rincian Buku Besar / Histori Akun ─────────────────────────────────────
export function BukuBesar({ data }) {
  if (!data.akun.length) return <Kosong />;
  return (
    <div className="space-y-5">
      {data.akun.map((a) => (
        <section key={a.akun_id} aria-label={`${a.kode} ${a.nama}`} className="space-y-2">
          <h3 className="text-base font-bold text-foreground">
            <span className="mr-2 tabular-nums text-muted-foreground">{a.kode}</span>
            {a.nama}
            <span className="ml-2 text-xs font-normal text-muted-foreground">{a.tipe_nama}</span>
          </h3>
          <div className={KOTAK}>
            <table className="w-full min-w-[48rem] text-sm">
              <thead>
                <tr className="bg-muted text-muted-foreground">
                  <th scope="col" className={cn(TH, TEMPEL, "bg-muted")}>
                    Tanggal
                  </th>
                  <th scope="col" className={TH}>
                    Nomor
                  </th>
                  <th scope="col" className={TH}>
                    Tipe transaksi
                  </th>
                  <th scope="col" className={TH}>
                    Keterangan
                  </th>
                  <th scope="col" className={cn(TH, "text-right")}>
                    Debit
                  </th>
                  <th scope="col" className={cn(TH, "text-right")}>
                    Kredit
                  </th>
                  <th scope="col" className={cn(TH, "text-right")}>
                    Saldo
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border/60 bg-muted/30">
                  <td className={cn(TD, TEMPEL, "bg-muted/30 font-medium")}>Saldo awal</td>
                  <td colSpan={5} />
                  <td className={cn(ANGKA, "font-medium")}>{jumlah(a.saldo_awal)}</td>
                </tr>
                {a.baris.length === 0 && (
                  <tr className="border-t border-border/60">
                    <td className={cn(TD, TEMPEL, "text-muted-foreground")} colSpan={7}>
                      Tidak ada transaksi di rentang ini.
                    </td>
                  </tr>
                )}
                {a.baris.map((r, i) => (
                  <tr key={i} className="border-t border-border/60">
                    <td className={cn(TD, TEMPEL, "whitespace-nowrap")}>{tanggal(r.tanggal)}</td>
                    <td className={cn(TD, "whitespace-nowrap tabular-nums")}>{r.nomor ?? "—"}</td>
                    <td className={cn(TD, "whitespace-nowrap")}>{r.tipe_nama}</td>
                    <td className={TD}>
                      {r.keterangan || "—"}
                      {r.departemen_nama && <span className="ml-1.5 text-xs text-muted-foreground">({r.departemen_nama})</span>}
                    </td>
                    <td className={ANGKA}>{sel(r.debit)}</td>
                    <td className={ANGKA}>{sel(r.kredit)}</td>
                    <td className={ANGKA}>{jumlah(r.saldo)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-border font-bold">
                  <td className={cn(TD, TEMPEL)} colSpan={4}>
                    Total dan saldo akhir
                  </td>
                  <td className={ANGKA}>{jumlah(a.total_debit)}</td>
                  <td className={ANGKA}>{jumlah(a.total_kredit)}</td>
                  <td className={ANGKA}>{jumlah(a.saldo_akhir)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

// ── Keseluruhan Jurnal ────────────────────────────────────────────────────
export function DaftarJurnalLaporan({ data }) {
  if (!data.jurnal.length) return <Kosong />;
  return (
    <div className={KOTAK}>
      <table className="w-full min-w-[48rem] text-sm">
        <thead>
          <tr className="bg-muted text-muted-foreground">
            <th scope="col" className={cn(TH, TEMPEL, "bg-muted")}>
              Akun
            </th>
            <th scope="col" className={TH}>
              Departemen
            </th>
            <th scope="col" className={cn(TH, "text-right")}>
              Debit
            </th>
            <th scope="col" className={cn(TH, "text-right")}>
              Kredit
            </th>
          </tr>
        </thead>
        <tbody>
          {data.jurnal.map((j) => (
            <JurnalLaporan key={j.id} j={j} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JurnalLaporan({ j }) {
  return (
    <>
      <tr className="border-t-2 border-border bg-muted/40">
        <td className={cn(TD, TEMPEL, "bg-muted/40 font-semibold")} colSpan={4}>
          {tanggal(j.tanggal)} · {j.nomor ?? "—"} · {j.tipe_nama}
          {j.keterangan && <span className="font-normal text-muted-foreground"> — {j.keterangan}</span>}
        </td>
      </tr>
      {j.baris.map((b, i) => (
        <tr key={i} className="border-t border-border/60">
          <td className={cn(TD, TEMPEL, "pl-6")}>
            <span className="mr-2 tabular-nums text-muted-foreground">{b.kode}</span>
            {b.nama}
            {b.catatan && <span className="ml-1.5 text-xs text-muted-foreground">({b.catatan})</span>}
          </td>
          <td className={TD}>{b.departemen_nama || "—"}</td>
          <td className={ANGKA}>{sel(b.debit)}</td>
          <td className={ANGKA}>{sel(b.kredit)}</td>
        </tr>
      ))}
    </>
  );
}

function Kosong() {
  return <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">Tidak ada transaksi di rentang ini.</p>;
}
