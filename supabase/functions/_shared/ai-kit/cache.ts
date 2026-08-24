// ============================================================
// HELIX AI Kit — Cache (future infra, wired now)
// Adopts (deferred): redis / upstash — with a Postgres-backed default so
// it works TODAY without any new infra. Set UPSTASH_REDIS_REST_URL +
// UPSTASH_REDIS_REST_TOKEN to transparently switch to Redis later.
//
// Use for: LLM response caching, rate-limit counters, dedup locks.
// ============================================================

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const REDIS_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const REDIS_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");
const USE_REDIS = Boolean(REDIS_URL && REDIS_TOKEN);

async function redis(cmd: (string | number)[]): Promise<unknown> {
  const res = await fetch(REDIS_URL!, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  const data = await res.json();
  return data.result;
}

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  /** atomic increment with optional TTL — for rate limiting */
  incr(key: string, ttlSeconds?: number): Promise<number>;
}

/** Redis-backed when configured, else Postgres (ai_kit_cache table). */
export function makeCache(sb: SupabaseClient): Cache {
  if (USE_REDIS) {
    return {
      async get<T>(key: string) {
        const v = await redis(["GET", key]);
        return v == null ? null : JSON.parse(v as string) as T;
      },
      async set<T>(key: string, value: T, ttl?: number) {
        const args = ["SET", key, JSON.stringify(value)];
        if (ttl) args.push("EX", ttl);
        await redis(args);
      },
      async incr(key: string, ttl?: number) {
        const n = await redis(["INCR", key]) as number;
        if (ttl && n === 1) await redis(["EXPIRE", key, ttl]);
        return n;
      },
    };
  }

  // Postgres fallback — works with zero extra infra.
  return {
    async get<T>(key: string) {
      const { data } = await sb.from("ai_kit_cache")
        .select("value, expires_at").eq("key", key).maybeSingle();
      if (!data) return null;
      if (data.expires_at && new Date(data.expires_at).getTime() < nowMs()) return null;
      return data.value as T;
    },
    async set<T>(key: string, value: T, ttl?: number) {
      await sb.from("ai_kit_cache").upsert({
        key, value,
        expires_at: ttl ? new Date(nowMs() + ttl * 1000).toISOString() : null,
      }, { onConflict: "key" });
    },
    async incr(key: string, ttl?: number) {
      const { data } = await sb.rpc("ai_kit_cache_incr", {
        p_key: key, p_ttl_seconds: ttl ?? null,
      });
      return (data as number) ?? 1;
    },
  };
}

// Edge runtime allows Date.now(); isolated here so the rest of the kit
// stays clock-free where it matters.
function nowMs(): number { return Date.now(); }

export const cacheUsesRedis = USE_REDIS;
