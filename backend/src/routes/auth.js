const express = require("express");
const bcrypt = require("bcrypt");
const { getSupabase } = require("../config/supabase");
const { HttpError, asyncHandler } = require("../middleware/error");
const { signToken, publicUser, requireAuth } = require("../middleware/auth");
const { requireFields } = require("../utils/mappers");

const router = express.Router();
const SALT_ROUNDS = 12;

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const missing = requireFields(req.body, ["email", "password", "fullName"]);
    if (missing.length) {
      throw new HttpError(400, `Faltan campos: ${missing.join(", ")}`);
    }

    const email = String(req.body.email).trim().toLowerCase();
    const password = String(req.body.password);
    const fullName = String(req.body.fullName).trim();

    if (password.length < 8) {
      throw new HttpError(400, "La contraseña debe tener al menos 8 caracteres");
    }

    const supabase = getSupabase();
    const { count, error: countError } = await supabase
      .from("admin_users")
      .select("id", { count: "exact", head: true });

    if (countError) throw new HttpError(500, countError.message);

    const userCount = count || 0;

    // El primer usuario se crea sin token. Los siguientes requieren admin.
    if (userCount > 0) {
      if (!req.headers.authorization) {
        throw new HttpError(401, "Solo un administrador puede registrar más usuarios");
      }
      await new Promise((resolve, reject) => {
        requireAuth(req, res, (err) => (err ? reject(err) : resolve()));
      });
      if (req.user.role !== "admin") {
        throw new HttpError(403, "Se requiere rol de administrador");
      }
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const role = userCount === 0 ? "admin" : req.body.role === "staff" ? "staff" : "admin";

    const { data, error } = await supabase
      .from("admin_users")
      .insert({
        email,
        full_name: fullName,
        password_hash: passwordHash,
        role,
      })
      .select("id, email, full_name, role")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new HttpError(409, "El correo ya está registrado");
      }
      throw new HttpError(500, error.message);
    }

    const token = signToken(data);
    res.status(201).json({ user: publicUser(data), token });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const missing = requireFields(req.body, ["email", "password"]);
    if (missing.length) {
      throw new HttpError(400, `Faltan campos: ${missing.join(", ")}`);
    }

    const email = String(req.body.email).trim().toLowerCase();
    const password = String(req.body.password);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("admin_users")
      .select("id, email, full_name, role, is_active, password_hash")
      .eq("email", email)
      .maybeSingle();

    if (error) throw new HttpError(500, error.message);
    if (!data || !data.is_active) {
      throw new HttpError(401, "Credenciales incorrectas");
    }

    const matches = await bcrypt.compare(password, data.password_hash);
    if (!matches) {
      throw new HttpError(401, "Credenciales incorrectas");
    }

    const token = signToken(data);
    res.json({ user: publicUser(data), token });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);

module.exports = router;
