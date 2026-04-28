// Helpers for content-hash based AI result caching.

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Normalize a URL for dedup lookups: lowercase host, strip query/fragment,
// drop trailing slash. Returns null on parse failure.
export function normalizeUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let path = u.pathname.replace(/\/+$/, "");
    if (path === "") path = "/";
    return `${u.protocol}//${u.hostname.toLowerCase()}${path}`;
  } catch {
    return null;
  }
}
