import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId requerido" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar que el usuario es estudiante
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (studentError || !student) {
      return new Response(JSON.stringify({ error: "Usuario no es estudiante" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ error: countError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
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

    return new Response(
      JSON.stringify({
        canCreate,
        currentCount: reportCount,
        maxCount: 1,
        nextAvailableDate,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
