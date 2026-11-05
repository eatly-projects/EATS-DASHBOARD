import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Menggabungkan kelas Tailwind dengan aman.
 *
 * `clsx`      : menerima string, objek, array, dan mengabaikan nilai kosong
 * `twMerge`   : menyelesaikan kelas yang bertabrakan — `cn("p-2", "p-4")`
 *               menghasilkan "p-4", bukan keduanya
 *
 * Fungsi yang sama persis dengan `src/lib/utils.ts` aplikasi lama.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
