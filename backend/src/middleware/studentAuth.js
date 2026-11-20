const jwt = require("jsonwebtoken");
const { getSupabase } = require("../config/supabase");
const { HttpError, asyncHandler } = require("./error");

const requireStudentAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    throw new HttpError(401, "Token de autenticación requerido");
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new HttpError(401, "Token inválido o expirado");
  }

  if (payload.type !== "student") {
    throw new HttpError(401, "Token inválido para estudiante");
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("students")
    .select("id, student_number, email, full_name, is_active")
    .eq("id", payload.sub)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!data || !data.is_active) {
    throw new HttpError(401, "Estudiante no autorizado");
  }

  req.student = {
    id: data.id,
    studentNumber: data.student_number,
    email: data.email,
    fullName: data.full_name,
  };

  next();
});

module.exports = { requireStudentAuth };
