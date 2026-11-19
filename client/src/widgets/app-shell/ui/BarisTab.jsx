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

/** Baris tab menu yang terbuka, seperti Accurate. Tab aktif ditandai garis merah di bawahnya. */
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
    <div className="sticky top-14 z-30 flex h-12 items-stretch gap-2 border-b border-border bg-card px-2 sm:px-4 md:top-0 md:px-6">
      <div ref={barisRef} className="flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label="Tab menu terbuka">
        {tab.map((t) => {
          const aktif = t.kode === kodeAktif;
          const nama = namaTab(t.kode);
          return (
            <div
              key={t.kode}
              role="presentation"
              className={cn(
                "-mb-px flex shrink-0 items-center border-b-2 text-sm transition-colors",
                aktif
                  ? "border-[hsl(var(--primary))] font-semibold text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              <Link
                to={t.path}
                role="tab"
                aria-selected={aktif}
                className="whitespace-nowrap rounded-md px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
              >
                {nama}
              </Link>
              {t.kode !== KODE_DASHBOARD && (
                <button
                  type="button"
                  onClick={() => tutupTab(t.kode)}
                  aria-label={`Tutup tab ${nama}`}
                  className="-ml-2 mr-1 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
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
            className="my-2 flex shrink-0 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            {tab.length} tab
            <FiChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
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
