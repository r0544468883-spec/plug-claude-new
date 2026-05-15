import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
serve(async () => {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { count: totalApps } = await sb.from("applications").select("*", { count: "exact", head: true });
  const { data: sample } = await sb.from("applications").select("id, candidate_id, source, job_title, created_at").order("created_at", { ascending: false }).limit(5);
  const { data: userApps } = await sb.from("applications").select("id, candidate_id, source, job_title").eq("candidate_id", "da55502c-62f1-4cfa-9b3a-b3a9ca8304db").limit(5);
  const { count: userCount } = await sb.from("applications").select("*", { count: "exact", head: true }).eq("candidate_id", "da55502c-62f1-4cfa-9b3a-b3a9ca8304db");
  return new Response(JSON.stringify({ totalApps, userCount, sample, userApps }, null, 2), { headers: { "Content-Type": "application/json" } });
});
