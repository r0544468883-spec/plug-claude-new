// ============================================================
// HELIX AI Kit — Sandbox gate
// Distilled from Polsia's SANDBOX_MODE: one choke point every real-world
// side effect (post a tweet, send an email, charge a card, open a PR)
// must pass through. When sandbox is on, the effect is skipped, logged,
// and an optional simulated value is returned — so agents run end-to-end
// in tests, previews, and demos without touching the outside world.
//
// Sandbox is ON when SANDBOX_MODE=true, OR whenever the LLM is mocked
// (AI_KIT_MOCK) — because a mocked brain must never trigger real actions.
// ============================================================

/** Evaluated lazily on every call so env set after import is honored. */
export function isSandbox(): boolean {
  return (Deno.env.get("SANDBOX_MODE") ?? "").toLowerCase() === "true" ||
    Boolean(Deno.env.get("AI_KIT_MOCK"));
}

/** Load-time snapshot — convenient in edge fns where env exists at import. */
export const SANDBOX_MODE: boolean = isSandbox();

/**
 * Guard a real side effect. In sandbox mode `real` is NOT executed;
 * instead we log the intended action and return `simulate?.()` (or
 * `undefined` cast to T). In live mode we just run `real`.
 *
 *   await sideEffect("twitter.post", () => client.tweet(text),
 *                    () => ({ id: "sandbox-tweet" }));
 */
export async function sideEffect<T>(
  name: string,
  real: () => Promise<T> | T,
  simulate?: () => Promise<T> | T,
): Promise<T> {
  if (isSandbox()) {
    console.log(`[sandbox] skipped side-effect: ${name}`);
    return simulate ? await simulate() : (undefined as unknown as T);
  }
  return await real();
}

/** Throw if a hard side effect is attempted without opting out of sandbox. */
export function assertLive(name: string): void {
  if (isSandbox()) {
    throw new Error(`[sandbox] refusing to run "${name}" — SANDBOX_MODE is on`);
  }
}
