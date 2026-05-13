import { defineBackend } from "@aws-amplify/backend";

/**
 * Supabase owns auth, DB, and storage for Neurolib.
 * This backend is intentionally empty in Phase 0 — Hosting is enough.
 *
 * Phase 3 adds the `compile-tex` Function (Lambda container with Tectonic).
 * Do NOT add defineAuth or defineData here; that would scaffold a phantom
 * Cognito user pool / AppSync API and confuse future-you.
 */
export const backend = defineBackend({});
