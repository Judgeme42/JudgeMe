const express = require("express");
const bcrypt = require("bcrypt");
const { getSupabase } = require("../config/supabase");
const { HttpError, asyncHandler } = require("../middleware/error");
const { requireFields } = require("../utils/mappers");

const router = express.Router();
const SALT_ROUNDS = 12;

// Registro de estudiante
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const missing = requireFields(req.body, ["studentNumber", "email", "password", "fullName"]);
    if (missing.length) {
      throw new HttpError(400, `Faltan campos: ${missing.join(", ")}`);
    }

    const studentNumber = String(req.body.studentNumber).trim();
    const email = String(req.body.email).trim().toLowerCase();
    const password = String(req.body.password);
    const fullName = String(req.body.fullName).trim();

    // Validaciones
    if (!/^[A-Z0-9]{6,10}$/i.test(studentNumber)) {
      throw new HttpError(400, "Número de matrícula inválido (debe tener entre 6 y 10 caracteres alfanuméricos)");
    }

    if (password.length < 8) {
      throw new HttpError(400, "La contraseña debe tener al menos 8 caracteres");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpError(400, "Correo electrónico inválido");
    }

    const supabase = getSupabase();

    // Verificar si la matrícula ya existe
    const { data: existingStudent, error: checkError } = await supabase
      .from("students")
      .select("id")
      .eq("student_number", studentNumber)
      .maybeSingle();

    if (checkError) throw new HttpError(500, checkError.message);

    if (existingStudent) {
      throw new HttpError(409, "Ya existe una cuenta con este número de matrícula");
    }

    // Verificar si el email ya existe
    const { data: existingEmail, error: emailCheckError } = await supabase
      .from("students")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (emailCheckError) throw new HttpError(500, emailCheckError.message);

    if (existingEmail) {
      throw new HttpError(409, "Ya existe una cuenta con este correo electrónico");
    }

    // Hashear contraseña
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insertar estudiante
    const { data, error } = await supabase
      .from("students")
      .insert({
        student_number: studentNumber,
        email,
        full_name: fullName,
        password_hash: passwordHash,
        is_active: true,
      })
      .select("id, student_number, email, full_name")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new HttpError(409, "Ya existe una cuenta con estos datos");
      }
      throw new HttpError(500, error.message);
    }

    res.status(201).json({
      student: {
        id: data.id,
        studentNumber: data.student_number,
        email: data.email,
        fullName: data.full_name,
      },
      message: "Cuenta creada exitosamente. Ya puedes iniciar sesión.",
    });
  })
);

// Login de estudiante
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const missing = requireFields(req.body, ["studentNumber", "password"]);
    if (missing.length) {
      throw new HttpError(400, `Faltan campos: ${missing.join(", ")}`);
    }

    const studentNumber = String(req.body.studentNumber).trim();
    const password = String(req.body.password);

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("students")
      .select("id, student_number, email, full_name, is_active, password_hash")
      .eq("student_number", studentNumber)
      .maybeSingle();

    if (error) throw new HttpError(500, error.message);
    if (!data || !data.is_active) {
      throw new HttpError(401, "Credenciales incorrectas");
    }

    const matches = await bcrypt.compare(password, data.password_hash);
    if (!matches) {
      throw new HttpError(401, "Credenciales incorrectas");
    }

    // Generar token JWT
    const jwt = require("jsonwebtoken");
    const token = jwt.sign(
      { sub: data.id, type: "student", studentNumber: data.student_number, email: data.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
    );

    res.json({
      student: {
        id: data.id,
        studentNumber: data.student_number,
        email: data.email,
        fullName: data.full_name,
      },
      token,
    });
  })
);

// Obtener información del estudiante autenticado
router.get(
  "/me",
  asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new HttpError(401, "Token de autenticación requerido");
    }

    const token = authHeader.substring(7);
    const jwt = require("jsonwebtoken");

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.type !== "student") {
        throw new HttpError(401, "Token inválido");
      }

      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("students")
        .select("id, student_number, email, full_name, is_active")
        .eq("id", decoded.sub)
        .maybeSingle();

      if (error) throw new HttpError(500, error.message);
      if (!data || !data.is_active) {
        throw new HttpError(401, "Estudiante no autorizado");
      }

      res.json({
        student: {
          id: data.id,
          studentNumber: data.student_number,
          email: data.email,
          fullName: data.full_name,
        },
      });
    } catch (err) {
      if (err instanceof HttpError) throw err;
      throw new HttpError(401, "Token inválido o expirado");
    }
  })
);

module.exports = router;
