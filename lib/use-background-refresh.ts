"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Hook untuk fetch data otomatis setiap interval tertentu.
 * Data akan direfresh di background tanpa reload halaman.
 *
 * @param fetcher — async function untuk mengambil data
 * @param deps — dependencies yang memicu refresh ulang (e.g. [bulan, tahun])
 * @param intervalMs — interval refresh dalam ms (default: 30 detik)
 */
export function useBackgroundRefresh<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = [],
  intervalMs: number = 30_000
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const result = await fetcher();
      if (isMounted.current) {
        setData(result);
      }
    } catch (err: any) {
      if (isMounted.current) {
        setError(err?.message || "Gagal mengambil data");
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    isMounted.current = true;
    refresh();

    const id = setInterval(refresh, intervalMs);
    return () => {
      isMounted.current = false;
      clearInterval(id);
    };
  }, [refresh, intervalMs]);

  return { data, loading, error, refresh };
}
