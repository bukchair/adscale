/**
 * Generic API hook for the AdScale backend.
 * Usage: const { data, loading, error, refetch } = useApi<T>("/recommendations", params)
 */
"use client";
import { useState, useEffect, useCallback, useRef } from "react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adscale_token");
}

export function useApi<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  deps: unknown[] = []
) {
  const [data, setData]       = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const abortRef              = useRef<AbortController | null>(null);

  const fetch_ = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);

    try {
      const url = new URL(`${BACKEND}/api${path}`);
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined) url.searchParams.set(k, String(v));
        });
      }

      const token = getToken();
      const res = await fetch(url.toString(), {
        signal: ctrl.signal,
        headers: {
          "Content-Type":  "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const json = await res.json();
      setData(json);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, JSON.stringify(params), ...deps]);

  useEffect(() => {
    fetch_();
    return () => abortRef.current?.abort();
  }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

export async function apiPost<T>(
  path: string,
  body: unknown
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BACKEND}/api${path}`, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BACKEND}/api${path}`, {
    method:  "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
