import { useState } from "react";
import { FiLogIn } from "react-icons/fi";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Button } from "@/shared/ui/button";
import { InputKataSandi } from "@/shared/ui/InputKataSandi";
import { useMasuk } from "@/entities/sesi";

export function FormMasuk({ onBerhasil }) {
  const [email, setEmail] = useState("");
  const [kataSandi, setKataSandi] = useState("");
  const [galat, setGalat] = useState("");
  const masuk = useMasuk();

  const kirim = (e) => {
    e.preventDefault();
    setGalat("");
    if (!email.trim() || !kataSandi) {
      setGalat("Isi email dan kata sandi terlebih dahulu.");
      return;
    }
    masuk.mutate(
      { email: email.trim(), kata_sandi: kataSandi },
      { onSuccess: () => onBerhasil?.(), onError: (err) => setGalat(err.message) },
    );
  };

  return (
    <form onSubmit={kirim} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          placeholder="nama@perusahaan.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11"
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="kata-sandi">Kata sandi</Label>
        <InputKataSandi
          id="kata-sandi"
          autoComplete="current-password"
          value={kataSandi}
          onChange={(e) => setKataSandi(e.target.value)}
          className="h-11"
        />
      </div>
      {galat && (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {galat}
        </p>
      )}
      <Button type="submit" className="h-11 w-full text-base" disabled={masuk.isPending}>
        <FiLogIn aria-hidden />
        {masuk.isPending ? "Memeriksa…" : "Masuk"}
      </Button>
    </form>
  );
}
