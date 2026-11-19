import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiChevronDown, FiX } from "react-icons/fi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { cn } from "@/shared/lib/cn";
import { KODE_DASHBOARD, useTab } from "../model/useTab";

/** Baris tab menu yang terbuka, seperti Accurate. Tab aktif berwarna merek. */
export function BarisTab({ namaTab, kodeAktif }) {
  const { tab: semuaTab, tutup, tutupSemua } = useTab();
  // Tab yang namanya belum diketahui (navigasi masih dimuat, atau menunya tidak boleh dibuka) tidak ditampilkan.
  const tab = semuaTab.filter((t) => t.kode === KODE_DASHBOARD || namaTab(t.kode));
  const navigate = useNavigate();
  const barisRef = useRef(null);

  // Tab aktif selalu terlihat, juga di HP saat baris tab harus digeser.
  useEffect(() => {
    barisRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [kodeAktif, tab.length]);

  const tutupTab = (kode) => {
    const tujuan = tutup(kode);
    if (kode === kodeAktif && tujuan) navigate(tujuan);
  };

  return (
    <div className="sticky top-14 z-30 flex h-11 items-end gap-2 border-b border-border bg-[hsl(var(--muted))] pl-2 pr-2 sm:pl-3">
      <div ref={barisRef} className="flex min-w-0 flex-1 items-end gap-1 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label="Tab menu terbuka">
        {tab.map((t) => {
          const aktif = t.kode === kodeAktif;
          const nama = namaTab(t.kode);
          return (
            <div
              key={t.kode}
              role="presentation"
              className={cn(
                "flex h-9 shrink-0 items-center rounded-t-lg border border-b-0 text-sm transition-colors",
                aktif
                  ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] font-semibold text-white"
                  : "border-border bg-card text-foreground hover:bg-[hsl(var(--accent))]",
              )}
            >
              <Link to={t.path} role="tab" aria-selected={aktif} className="whitespace-nowrap py-1.5 pl-3 pr-3 focus-visible:outline-none">
                {nama}
              </Link>
              {t.kode !== KODE_DASHBOARD && (
                <button
                  type="button"
                  onClick={() => tutupTab(t.kode)}
                  aria-label={`Tutup tab ${nama}`}
                  className={cn(
                    "-ml-1.5 mr-1.5 flex h-6 w-6 items-center justify-center rounded-md",
                    aktif ? "hover:bg-white/20" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <FiX className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Daftar ${tab.length} tab terbuka`}
            className="mb-1 flex h-8 shrink-0 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-sm font-semibold text-foreground hover:bg-[hsl(var(--accent))]"
          >
            {tab.length}
            <FiChevronDown className="h-4 w-4" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Tab terbuka</DropdownMenuLabel>
          {tab.map((t) => (
            <DropdownMenuItem key={t.kode} onSelect={() => navigate(t.path)} className={t.kode === kodeAktif ? "font-semibold" : ""}>
              {namaTab(t.kode)}
            </DropdownMenuItem>
          ))}
          {tab.length > 1 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  tutupSemua();
                  navigate("/");
                }}
              >
                Tutup semua tab kecuali Dashboard
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
