import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-plug-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate X-Plug-Key
    const plugKey = req.headers.get("x-plug-key");
    const expectedKey = Deno.env.get("PLUG_CLIENT_KEY");
    if (!plugKey || !expectedKey || plugKey !== expectedKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;
    const fileName = formData.get("fileName") as string | null;

    if (!file || !userId || !fileName) {
      return new Response(
        JSON.stringify({ error: "Missing file, userId, or fileName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role key for storage + DB operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const safeName = fileName
      .replace(/[^\x00-\x7F]/g, "")
      .replace(/\s+/g, "_") || "resume.pdf";
    const storagePath = `${userId}/${Date.now()}_${safeName}`;

    // Upload to resumes bucket
    const { error: uploadErr } = await supabase.storage
      .from("resumes")
      .upload(storagePath, file, { contentType: file.type, upsert: true });

    if (uploadErr) {
      console.error("Storage upload error:", uploadErr);
      return new Response(
        JSON.stringify({ error: `Upload failed: ${uploadErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert document row
    const { data: doc, error: insertErr } = await supabase
      .from("documents")
      .insert({
        owner_id: userId,
        file_name: fileName,
        file_path: storagePath,
        file_type: file.type,
        doc_type: "cv",
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("Documents insert error:", insertErr);
      return new Response(
        JSON.stringify({ error: `DB insert failed: ${insertErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { publicUrl } } = supabase.storage
      .from("resumes")
      .getPublicUrl(storagePath);

    return new Response(
      JSON.stringify({ ok: true, doc: { id: doc.id, file_name: fileName, publicUrl } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("upload-resume error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
