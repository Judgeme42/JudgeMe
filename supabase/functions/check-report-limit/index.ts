import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return jsonResponse({ error: "userId requerido" }, 400);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar que el usuario es estudiante
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (studentError || !student) {
      return jsonResponse({ error: "Usuario no es estudiante" }, 403);
    }

    // Contar reportes de los últimos 3 días
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: reports, error: countError } = await supabase
      .from("reports")
      .select("id, created_at")
      .eq("student_id", student.id)
      .gte("created_at", threeDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    if (countError) {
      return jsonResponse({ error: countError.message }, 500);
    }

    const reportCount = reports?.length || 0;
    const canCreate = reportCount === 0;

    let nextAvailableDate = null;
    if (!canCreate && reports && reports.length > 0) {
      const lastReportDate = new Date(reports[0].created_at);
      const nextAvailable = new Date(lastReportDate);
      nextAvailable.setDate(nextAvailable.getDate() + 3);
      nextAvailableDate = nextAvailable.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }

    return jsonResponse({
      canCreate,
      currentCount: reportCount,
      maxCount: 1,
      nextAvailableDate,
    });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});
