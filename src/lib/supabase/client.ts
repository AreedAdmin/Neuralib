import { createBrowserClient } from "@supabase/ssr";
import type { Database, SchemaName } from "./types";

export function createClient() {
  return createBrowserClient<Database, SchemaName>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      db: { schema: "neuralib" },
    }
  );
}
