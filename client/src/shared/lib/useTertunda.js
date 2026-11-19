import { useEffect, useState } from "react";

/** Nilai yang baru ikut berubah setelah `ms` milidetik tanpa perubahan (mis. pratinjau saat mengetik). */
export function useTertunda(nilai, ms = 300) {
  const [tertunda, setTertunda] = useState(nilai);
  useEffect(() => {
    const t = setTimeout(() => setTertunda(nilai), ms);
    return () => clearTimeout(t);
  }, [nilai, ms]);
  return tertunda;
}
