const jwt = require("jsonwebtoken");
const { getSupabase } = require("../config/supabase");
const { HttpError, asyncHandler } = require("./error");

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );
}

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
  };
}

const requireAuth = asyncHandler(async (req, res, next) => {
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

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("admin_users")
    .select("id, email, full_name, role, is_active")
    .eq("id", payload.sub)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!data || !data.is_active) {
    throw new HttpError(401, "Usuario no autorizado");
  }

  req.user = publicUser(data);
  next();
});

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return next(new HttpError(403, "Se requiere rol de administrador"));
  }
  next();
}

module.exports = { signToken, publicUser, requireAuth, requireAdmin };
