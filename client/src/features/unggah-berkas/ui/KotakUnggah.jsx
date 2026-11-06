// Unggah berkas -> langsung dibaca AI -> kalau berhasil, pindah ke halaman Cek dan setujui.
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { FiAlertTriangle, FiCheck, FiFile, FiRefreshCw, FiUploadCloud, FiX } from "react-icons/fi";
import { Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import { tanggalJam, ukuranBerkas } from "@/shared/lib/format";
import { apiGet } from "@/shared/api/client";
import {
  ACCEPT_INPUT,
  STATUS,
  periksaBerkas,
  useBacaUnggahan,
  useBatalkanUnggahan,
  useUnggahBerkas,
} from "@/entities/unggahan";

function Langkah({ selesai, aktif, children }) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs",
          selesai && "border-[hsl(var(--success))] bg-[hsl(var(--success))] text-white",
          aktif && "border-[hsl(var(--primary))] text-[hsl(var(--primary))]",
          !selesai && !aktif && "border-border text-muted-foreground",
        )}
      >
        {selesai ? <FiCheck className="h-3.5 w-3.5" /> : aktif ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      </span>
      <span className={cn(aktif ? "font-medium text-foreground" : selesai ? "text-foreground" : "text-muted-foreground")}>{children}</span>
    </li>
  );
}

function PanelMembaca({ berkas, tahap, mulai }) {
  const [detik, setDetik] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDetik(Math.floor((Date.now() - mulai) / 1000)), 1000);
    return () => clearInterval(t);
  }, [mulai]);
  return (
    <div className="flex flex-col items-center gap-6 py-6 text-center sm:flex-row sm:items-start sm:text-left">
      <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute inset-0 rounded-full border-2 border-[hsl(var(--primary))]/40"
            initial={{ scale: 0.6, opacity: 0.8 }}
            animate={{ scale: 1.25, opacity: 0 }}
            transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.7, ease: "easeOut" }}
          />
        ))}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-gold text-white shadow-gold">
          <FiFile className="h-7 w-7" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-bold text-foreground">
          {tahap === "mengunggah" ? "Mengunggah berkas…" : "AI sedang membaca berkas…"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Biasanya 20–60 detik. <span className="font-medium text-foreground">Jangan tutup halaman ini.</span>
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground" title={berkas?.name}>
          {berkas?.name} · {ukuranBerkas(berkas?.size)} · sudah {detik} detik
        </p>
        <ol className="mt-4 space-y-2">
          <Langkah selesai={tahap !== "mengunggah"} aktif={tahap === "mengunggah"}>
            Mengunggah berkas ke server
          </Langkah>
          <Langkah aktif={tahap === "membaca"}>AI membaca isi berkas (Claude, cadangan Gemini)</Langkah>
          <Langkah aktif={false}>Menyusun rencana dan mencocokkan dengan total di berkas</Langkah>
        </ol>
      </div>
    </div>
  );
}

export function KotakUnggah() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [seret, setSeret] = useState(false);
  const [tahap, setTahap] = useState("pilih"); // pilih | mengunggah | membaca | gagal
  const [berkas, setBerkas] = useState(null);
  const [idAktif, setIdAktif] = useState(null);
  const [pesanGagal, setPesanGagal] = useState("");
  const [berkasSama, setBerkasSama] = useState([]);
  const [mulai, setMulai] = useState(0);

  const unggah = useUnggahBerkas();
  const baca = useBacaUnggahan();
  const batalkan = useBatalkanUnggahan(idAktif);

  const ulang = () => {
    setTahap("pilih");
    setBerkas(null);
    setIdAktif(null);
    setPesanGagal("");
    setBerkasSama([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const selesaiBaca = (id, u) => {
    if (u?.status === "menunggu_cek") {
      navigate(`/unggahan/${id}`);
      return;
    }
    const pesan = u?.pesan_gagal || "AI tidak berhasil membaca berkas ini.";
    setPesanGagal(pesan);
    setTahap("gagal");
    toast.error(pesan, { duration: 6000 });
  };

  // Di Vercel, proxy /api memutus sambungan setelah 120 detik tanpa jawaban,
  // padahal server tetap membaca dan menyimpan hasilnya. Jadi kalau sambungan
  // putus (bukan galat dari server), status unggahan ditanyakan berkala.
  const tungguHasil = async (id) => {
    const batas = Date.now() + 5 * 60 * 1000;
    while (Date.now() < batas) {
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const d = await apiGet(`/unggahan/${id}`);
        const u = d?.unggahan ?? d;
        if (u?.status && u.status !== "diunggah") return u;
      } catch {
        // coba lagi pada putaran berikutnya
      }
    }
    return null;
  };

  const jalankanBaca = async (id) => {
    setTahap("membaca");
    setPesanGagal("");
    try {
      selesaiBaca(id, await baca.mutateAsync(id));
    } catch (e) {
      const sambunganPutus = !e.status || [502, 503, 504].includes(e.status);
      if (sambunganPutus) {
        const u = await tungguHasil(id);
        if (u) return selesaiBaca(id, u);
        const pesan = "AI masih membaca berkas ini. Lihat statusnya di Riwayat unggahan beberapa menit lagi.";
        setPesanGagal(pesan);
        setTahap("gagal");
        toast(pesan, { duration: 8000 });
        return;
      }
      setPesanGagal(e.message);
      setTahap("gagal");
      toast.error(e.message, { duration: 6000 });
    }
  };

  const proses = async (f) => {
    const galat = periksaBerkas(f);
    if (galat) {
      toast.error(galat, { duration: 6000 });
      return;
    }
    setBerkas(f);
    setMulai(Date.now());
    setTahap("mengunggah");
    try {
      const hasil = await unggah.mutateAsync(f);
      const id = hasil?.unggahan?.id;
      const sama = hasil?.berkas_sama ?? [];
      setBerkasSama(sama);
      if (sama.length) {
        toast("Berkas yang sama persis pernah diunggah sebelumnya. Tetap dilanjutkan — periksa riwayat di bawah.", {
          icon: "⚠️",
          duration: 7000,
        });
      }
      if (!id) throw new Error("Server tidak mengembalikan nomor unggahan.");
      setIdAktif(id);
      await jalankanBaca(id);
    } catch (e) {
      setPesanGagal(e.message);
      setTahap((t) => (t === "mengunggah" ? "pilih" : "gagal"));
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setSeret(false);
    if (tahap !== "pilih") return;
    const f = e.dataTransfer.files?.[0];
    if (f) proses(f);
  };

  const sibuk = tahap === "mengunggah" || tahap === "membaca";

  return (
    <div className="space-y-3">
      {berkasSama.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/10 px-4 py-3 text-sm">
          <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(32_80%_40%)]" aria-hidden />
          <div>
            <p className="font-medium text-foreground">Berkas yang sama persis pernah diunggah:</p>
            <ul className="mt-1 space-y-0.5 text-muted-foreground">
              {berkasSama.map((b) => (
                <li key={b.id}>
                  <Link to={`/unggahan/${b.id}`} className="underline-offset-2 hover:underline">
                    {b.nama_berkas}
                  </Link>{" "}
                  · {tanggalJam(b.diunggah_at)} · {STATUS[b.status]?.label ?? b.status}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-muted-foreground">Tidak apa-apa dilanjutkan: kalau disetujui, data bulan yang sama akan diganti, bukan ditambah.</p>
          </div>
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (tahap === "pilih") setSeret(true);
        }}
        onDragLeave={() => setSeret(false)}
        onDrop={onDrop}
        className={cn(
          "rounded-2xl border-2 border-dashed bg-card p-5 shadow-card transition-colors sm:p-8",
          seret ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5" : "border-border",
          tahap === "gagal" && "border-destructive/40",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_INPUT}
          className="sr-only"
          id="pilih-berkas"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) proses(f);
          }}
          disabled={sibuk}
        />

        {tahap === "pilih" && (
          <label htmlFor="pilih-berkas" className="flex cursor-pointer flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
              <FiUploadCloud className="h-8 w-8" />
            </div>
            <div>
              <p className="font-display text-lg font-bold text-foreground">Tarik berkas ke sini, atau klik untuk memilih</p>
              <p className="mt-1 text-sm text-muted-foreground">Excel (.xlsx), PDF, atau foto (.png, .jpg, .jpeg, .webp) · maksimal 4 MB · satu berkas</p>
            </div>
            <span className="mt-1 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
              <FiUploadCloud className="h-4 w-4" /> Pilih berkas
            </span>
            {pesanGagal && <p className="text-sm text-destructive">{pesanGagal}</p>}
          </label>
        )}

        {sibuk && <PanelMembaca berkas={berkas} tahap={tahap} mulai={mulai} />}

        {tahap === "gagal" && (
          <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <FiAlertTriangle className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-bold text-foreground">Berkas belum berhasil dibaca</p>
              <p className="mt-1 text-sm text-muted-foreground">{berkas?.name}</p>
              <p className="mt-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{pesanGagal}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => jalankanBaca(idAktif)} disabled={!idAktif || baca.isPending}>
                  <FiRefreshCw aria-hidden /> Coba baca lagi
                </Button>
                <Button
                  variant="outline"
                  className="hover:bg-muted hover:text-foreground"
                  disabled={!idAktif || batalkan.isPending}
                  onClick={() => batalkan.mutate(undefined, { onSuccess: ulang })}
                >
                  <FiX aria-hidden /> Batalkan
                </Button>
                {idAktif && (
                  <Button variant="ghost" asChild className="hover:bg-muted hover:text-foreground">
                    <Link to={`/unggahan/${idAktif}`}>Lihat detail</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
