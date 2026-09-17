const express = require("express");
const { getSupabase } = require("../config/supabase");
const { HttpError, asyncHandler } = require("../middleware/error");
const { requireAuth } = require("../middleware/auth");
const { requireFields, mapTeacher } = require("../utils/mappers");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const supabase = getSupabase();
    let query = supabase
      .from("teachers")
      .select("*")
      .eq("is_active", true)
      .order("full_name", { ascending: true });

    if (req.query.program) {
      query = query.eq("program_code", String(req.query.program).toUpperCase());
    }
    if (req.query.search) {
      const term = String(req.query.search).replace(/[%_,]/g, "").trim();
      if (term) {
        query = query.or(`full_name.ilike.%${term}%,subject.ilike.%${term}%`);
      }
    }

    const { data, error } = await query;
    if (error) throw new HttpError(500, error.message);
    res.json({ teachers: (data || []).map(mapTeacher) });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("teachers")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) throw new HttpError(500, error.message);
    if (!data) throw new HttpError(404, "Maestro no encontrado");
    res.json({ teacher: mapTeacher(data) });
  })
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const missing = requireFields(req.body, [
      "fullName",
      "programCode",
      "programLabel",
      "subject",
    ]);
    if (missing.length) {
      throw new HttpError(400, `Faltan campos: ${missing.join(", ")}`);
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("teachers")
      .insert({
        full_name: String(req.body.fullName).trim(),
        program_code: String(req.body.programCode).trim().toUpperCase(),
        program_label: String(req.body.programLabel).trim(),
        subject: String(req.body.subject).trim(),
        bio: req.body.bio ? String(req.body.bio).trim() : null,
      })
      .select("*")
      .single();

    if (error) throw new HttpError(500, error.message);
    res.status(201).json({ teacher: mapTeacher(data) });
  })
);

router.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const patch = { updated_at: new Date().toISOString() };
    if (req.body.fullName !== undefined) patch.full_name = String(req.body.fullName).trim();
    if (req.body.programCode !== undefined) {
      patch.program_code = String(req.body.programCode).trim().toUpperCase();
    }
    if (req.body.programLabel !== undefined) {
      patch.program_label = String(req.body.programLabel).trim();
    }
    if (req.body.subject !== undefined) patch.subject = String(req.body.subject).trim();
    if (req.body.bio !== undefined) patch.bio = String(req.body.bio).trim();
    if (req.body.isActive !== undefined) patch.is_active = Boolean(req.body.isActive);

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("teachers")
      .update(patch)
      .eq("id", req.params.id)
      .select("*")
      .maybeSingle();

    if (error) throw new HttpError(500, error.message);
    if (!data) throw new HttpError(404, "Maestro no encontrado");
    res.json({ teacher: mapTeacher(data) });
  })
);

router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("teachers")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .select("id")
      .maybeSingle();

    if (error) throw new HttpError(500, error.message);
    if (!data) throw new HttpError(404, "Maestro no encontrado");
    res.status(204).send();
  })
);

module.exports = router;
