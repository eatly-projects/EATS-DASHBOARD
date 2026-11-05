// Dialog tambah akun & atur ulang kata sandi.
import { useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { InputKataSandi } from "@/shared/ui/InputKataSandi";
import { buatKataSandiAcak, useTambahPengguna, useUbahPengguna } from "@/entities/pengguna";

const MIN_SANDI = 8;

function KolomKataSandi({ id, nilai, onUbah }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>Kata sandi</Label>
        <button
          type="button"
          onClick={() => onUbah(buatKataSandiAcak())}
          className="inline-flex items-center gap-1 text-xs font-medium text-[hsl(var(--primary))] hover:underline"
        >
          <FiRefreshCw className="h-3 w-3" aria-hidden /> Buat acak
        </button>
      </div>
      <InputKataSandi id={id} value={nilai} onChange={(e) => onUbah(e.target.value)} autoComplete="new-password" />
      <p className="text-xs text-muted-foreground">Minimal {MIN_SANDI} karakter. Sampaikan ke pemilik akun lewat jalur pribadi.</p>
    </div>
  );
}

export function DialogTambahPengguna({ buka, onTutup }) {
  const [form, setForm] = useState({ email: "", nama: "", peran: "staf", kata_sandi: "" });
  const [galat, setGalat] = useState("");
  const tambah = useTambahPengguna();
  const ubah = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const tutup = () => {
    setForm({ email: "", nama: "", peran: "staf", kata_sandi: "" });
    setGalat("");
    onTutup();
  };

  const kirim = (e) => {
    e.preventDefault();
    if (!form.nama.trim() || !form.email.trim()) return setGalat("Nama dan email wajib diisi.");
    if (form.kata_sandi.length < MIN_SANDI) return setGalat(`Kata sandi minimal ${MIN_SANDI} karakter.`);
    setGalat("");
    tambah.mutate(
      { ...form, email: form.email.trim(), nama: form.nama.trim() },
      { onSuccess: tutup, onError: (err) => setGalat(err.message) },
    );
  };

  return (
    <Dialog open={buka} onOpenChange={(o) => !o && tutup()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah pengguna</DialogTitle>
          <DialogDescription>Akun baru langsung bisa dipakai masuk ke EATS Dashboard.</DialogDescription>
        </DialogHeader>
        <form onSubmit={kirim} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="tambah-nama">Nama</Label>
            <Input id="tambah-nama" value={form.nama} onChange={(e) => ubah("nama")(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tambah-email">Email</Label>
            <Input id="tambah-email" type="email" inputMode="email" value={form.email} onChange={(e) => ubah("email")(e.target.value)} autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tambah-peran">Peran</Label>
            <Select value={form.peran} onValueChange={ubah("peran")}>
              <SelectTrigger id="tambah-peran">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staf">Staf — melihat dashboard, mengunggah, mengecek, menyetujui</SelectItem>
                <SelectItem value="admin">Admin — semua yang staf boleh + mengelola akun</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <KolomKataSandi id="tambah-sandi" nilai={form.kata_sandi} onUbah={ubah("kata_sandi")} />
          {galat && <p role="alert" className="text-sm text-destructive">{galat}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" className="hover:bg-muted hover:text-foreground" onClick={tutup}>
              Batal
            </Button>
            <Button type="submit" disabled={tambah.isPending}>
              {tambah.isPending ? "Membuat…" : "Buat akun"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DialogAturSandi({ pengguna, onTutup }) {
  const [sandi, setSandi] = useState("");
  const [galat, setGalat] = useState("");
  const ubahPengguna = useUbahPengguna();

  const tutup = () => {
    setSandi("");
    setGalat("");
    onTutup();
  };

  const kirim = (e) => {
    e.preventDefault();
    if (sandi.length < MIN_SANDI) return setGalat(`Kata sandi minimal ${MIN_SANDI} karakter.`);
    ubahPengguna.mutate({ id: pengguna.id, kata_sandi: sandi }, { onSuccess: tutup, onError: (err) => setGalat(err.message) });
  };

  return (
    <Dialog open={Boolean(pengguna)} onOpenChange={(o) => !o && tutup()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Atur ulang kata sandi</DialogTitle>
          <DialogDescription>
            Untuk {pengguna?.nama} ({pengguna?.email}). Kata sandi lama langsung tidak berlaku.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={kirim} className="space-y-4" noValidate>
          <KolomKataSandi id="atur-sandi" nilai={sandi} onUbah={setSandi} />
          {galat && <p role="alert" className="text-sm text-destructive">{galat}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" className="hover:bg-muted hover:text-foreground" onClick={tutup}>
              Batal
            </Button>
            <Button type="submit" disabled={ubahPengguna.isPending}>
              {ubahPengguna.isPending ? "Menyimpan…" : "Simpan kata sandi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
