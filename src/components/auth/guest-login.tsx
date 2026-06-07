"use client";

import { useState } from "react";
import { useAppStore } from "@/stores/app-store";

export function GuestLogin() {
  const [loading, setLoading] = useState(false);
  const setGuest = useAppStore((s) => s.setGuest);

  const onGuest = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/guest", { method: "POST" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        guest: {
          guestId: string;
          searchesUsed: number;
          searchesRemaining: number;
          searchesLimit: number;
        };
      };
      setGuest(data.guest);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void onGuest()}
      disabled={loading}
      className="border border-[var(--border)] px-4 py-2 text-xs tracking-wider text-[var(--text-secondary)] hover:border-[var(--warning)] hover:text-[var(--warning)] disabled:opacity-50"
    >
      {loading ? "INITIALIZING..." : "CONTINUE AS GUEST (5 SEARCHES)"}
    </button>
  );
}
