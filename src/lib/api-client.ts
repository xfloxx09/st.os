export async function parseApiResponse<T extends { error?: string }>(
  res: Response
): Promise<{ data: T; ok: boolean }> {
  const text = await res.text();

  if (!text.trim()) {
    return {
      data: {
        error: res.ok
          ? "Empty server response"
          : `Server error (${res.status})`,
      } as T,
      ok: res.ok,
    };
  }

  try {
    return { data: JSON.parse(text) as T, ok: res.ok };
  } catch {
    const lower = text.toLowerCase();
    const message = lower.includes("upstream")
      ? "Server timed out while scanning — wait a few seconds and hit REFRESH"
      : lower.includes("gateway")
        ? "Gateway timeout — scan took too long, try again"
        : text.length > 160
          ? `${text.slice(0, 160)}…`
          : text;

    return {
      data: { error: message } as T,
      ok: false,
    };
  }
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const { data, ok } = await parseApiResponse<T & { error?: string }>(res);
  if (!ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}
