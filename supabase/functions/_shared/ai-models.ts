// Central AI model configuration. Bumping these strings invalidates
// existing DB-cached AI artifacts lazily — readers compare against
// the stored *_model column and re-run when stale.

export const CURRENT_AI_MODEL = "claude-haiku-4-5-20251001";

// Versioned identifier stored in *_model columns. Bump the @vN suffix
// when the prompt/output schema changes meaningfully (not just model id),
// so cached rows from a prior prompt revision get re-generated.
export const CURRENT_AI_MODEL_VERSION = "claude-haiku-4-5-20251001@v1";

// Anthropic prompt-caching beta header (required when sending
// `cache_control` blocks in the system array).
export const ANTHROPIC_CACHING_BETA = "prompt-caching-2024-07-31";
