function requireFields(body, fields) {
  const missing = fields.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || String(value).trim() === "";
  });
  return missing;
}

function mapTeacher(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    programCode: row.program_code,
    programLabel: row.program_label,
    subject: row.subject,
    bio: row.bio,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapReport(row) {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    motive: row.motive,
    description: row.description,
    isAnonymous: row.is_anonymous,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    teacher: row.teachers ? mapTeacher(row.teachers) : undefined,
  };
}

module.exports = { requireFields, mapTeacher, mapReport };
