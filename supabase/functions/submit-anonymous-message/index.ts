import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SubmitPayload {
  recipient_username: string;
  category: string;
  content: string;
  client_hash?: string;
}

const VALID_CATEGORIES = new Set([
  "secret",
  "confession",
  "compliment",
  "fun",
  "advice",
  "friendship",
  "other",
]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body: SubmitPayload = await req.json();
    const recipient_username = (body.recipient_username || "").trim().toLowerCase().replace(/^@/, "");
    const content = (body.content || "").trim();
    const category = body.category;
    const client_hash = (body.client_hash || "").trim();
    const userAgent = req.headers.get("user-agent") || "";
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "";

    // 1. Validation
    if (!recipient_username) {
      return new Response(
        JSON.stringify({ success: false, error: "প্রাপকের নাম উল্লেখ করা আবশ্যক।" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: "চিঠি ফাঁকা রাখা যাবে না (Letter content cannot be empty)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (content.length > 1000) {
      return new Response(
        JSON.stringify({ success: false, error: "চিঠির দৈর্ঘ্য সর্বোচ্চ ১০০০ অক্ষর হতে পারে।" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!VALID_CATEGORIES.has(category)) {
      return new Response(
        JSON.stringify({ success: false, error: "অবৈধ চিঠির বিভাগ নির্বাচন করা হয়েছে।" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call the database security-definer function submit_anonymous_message
    const { data, error } = await supabase.rpc("submit_anonymous_message", {
      p_recipient_username: recipient_username,
      p_category: category,
      p_content: content,
      p_client_hash: client_hash || clientIp,
      p_user_agent_hash: userAgent ? userAgent.substring(0, 64) : null,
    });

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: data?.success ? 200 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
