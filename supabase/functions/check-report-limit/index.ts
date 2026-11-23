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

    // Contar reportes de los últimos 7 días
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: reports, error: countError } = await supabase
      .from("reports")
      .select("id")
      .eq("student_id", student.id)
      .gte("created_at", oneWeekAgo.toISOString());

    if (countError) {
      return new Response(JSON.stringify({ error: countError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const canCreate = (reports?.length || 0) < 2;

    return new Response(
      JSON.stringify({
        canCreate,
        currentCount: reports?.length || 0,
        maxCount: 2,
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
