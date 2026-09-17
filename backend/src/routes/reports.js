const express = require("express");
const { getSupabase } = require("../config/supabase");
const { HttpError, asyncHandler } = require("../middleware/error");
const { requireAuth } = require("../middleware/auth");
const { requireFields, mapReport } = require("../utils/mappers");

const router = express.Router();
const ALLOWED_STATUS = new Set(["pending", "in_review", "resolved", "dismissed"]);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const missing = requireFields(req.body, ["teacherId", "motive", "description"]);
    if (missing.length) {
      throw new HttpError(400, `Faltan campos: ${missing.join(", ")}`);
    }

    const description = String(req.body.description).trim();
    if (description.length < 20) {
      throw new HttpError(400, "La descripción debe tener al menos 20 caracteres");
    }

    const supabase = getSupabase();
    const { data: teacher, error: teacherError } = await supabase
      .from("teachers")
      .select("id, is_active")
      .eq("id", req.body.teacherId)
      .maybeSingle();

    if (teacherError) throw new HttpError(500, teacherError.message);
    if (!teacher || !teacher.is_active) {
      throw new HttpError(404, "Maestro no encontrado");
    }

    const { data, error } = await supabase
      .from("reports")
      .insert({
        teacher_id: teacher.id,
        motive: String(req.body.motive).trim(),
        description,
        is_anonymous: Boolean(req.body.isAnonymous),
      })
      .select("*")
      .single();

    if (error) throw new HttpError(500, error.message);
    res.status(201).json({ report: mapReport(data) });
  })
);

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const supabase = getSupabase();
    let query = supabase
      .from("reports")
      .select("*, teachers(*)")
      .order("created_at", { ascending: false });

    if (req.query.status) {
      if (!ALLOWED_STATUS.has(req.query.status)) {
        throw new HttpError(400, "Estado de reporte no válido");
      }
      query = query.eq("status", req.query.status);
    }
    if (req.query.teacherId) {
      query = query.eq("teacher_id", req.query.teacherId);
    }

    const { data, error } = await query;
    if (error) throw new HttpError(500, error.message);
    res.json({ reports: (data || []).map(mapReport) });
  })
);

router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("reports")
      .select("*, teachers(*)")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) throw new HttpError(500, error.message);
    if (!data) throw new HttpError(404, "Reporte no encontrado");
    res.json({ report: mapReport(data) });
  })
);

router.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.body.status || !ALLOWED_STATUS.has(req.body.status)) {
      throw new HttpError(400, "Debes enviar un status válido");
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("reports")
      .update({
        status: req.body.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", req.params.id)
      .select("*, teachers(*)")
      .maybeSingle();

    if (error) throw new HttpError(500, error.message);
    if (!data) throw new HttpError(404, "Reporte no encontrado");
    res.json({ report: mapReport(data) });
  })
);

module.exports = router;
