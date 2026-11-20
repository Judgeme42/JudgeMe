const express = require("express");
const multer = require("multer");
const { getSupabase } = require("../config/supabase");
const { HttpError, asyncHandler } = require("../middleware/error");
const { requireAuth } = require("../middleware/auth");
const { requireStudentAuth } = require("../middleware/studentAuth");
const { requireFields, mapReport } = require("../utils/mappers");

const router = express.Router();

// Configurar multer para manejar archivos en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10485760, // 10MB máximo por archivo
    files: 5, // Máximo 5 archivos por reporte
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/",
      "audio/",
      "video/",
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    const isAllowed = allowedTypes.some((type) => file.mimetype.startsWith(type));

    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new HttpError(400, "Tipo de archivo no permitido. Solo se aceptan imágenes, audio, video, PDF y documentos."));
    }
  },
});
const ALLOWED_STATUS = new Set(["pending", "in_review", "resolved", "dismissed"]);

router.post(
  "/",
  requireStudentAuth,
  upload.array("evidences", 5), // Aceptar hasta 5 archivos
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

    // Verificar límite de reportes por semana (máximo 2)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: recentReports, error: countError } = await supabase
      .from("reports")
      .select("id")
      .eq("student_id", req.student.id)
      .gte("created_at", oneWeekAgo.toISOString());

    if (countError) throw new HttpError(500, countError.message);

    if (recentReports && recentReports.length >= 2) {
      throw new HttpError(
        429,
        "Has alcanzado el límite de 2 reportes por semana. Por favor, espera a que pase una semana desde tu primer reporte para poder crear nuevos reportes."
      );
    }

    // Crear reporte anónimo - no guardar información del estudiante en el reporte
    // Solo guardar student_id para uso interno, pero nunca exponerlo al admin
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .insert({
        teacher_id: teacher.id,
        student_id: req.student.id, // Guardado para control interno
        motive: String(req.body.motive).trim(),
        description,
        is_anonymous: true, // Siempre anónimo
      })
      .select("*")
      .single();

    if (reportError) throw new HttpError(500, reportError.message);

    // Procesar archivos de evidencia si existen
    const evidences = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          // Generar nombre único para el archivo
          const fileName = `${report.id}/${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

          // Subir archivo a Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from("report-evidences")
            .upload(fileName, file.buffer, {
              contentType: file.mimetype,
              cacheControl: "3600",
            });

          if (uploadError) {
            console.error("Error al subir archivo:", uploadError);
            throw new HttpError(500, `Error al subir archivo: ${uploadError.message}`);
          }

          // Obtener URL pública del archivo
          const { data: urlData } = supabase.storage
            .from("report-evidences")
            .getPublicUrl(fileName);

          // Guardar información del archivo en la base de datos
          const { data: evidence, error: evidenceError } = await supabase
            .from("report_evidences")
            .insert({
              report_id: report.id,
              file_name: file.originalname,
              file_type: file.mimetype,
              file_size: file.size,
              file_path: fileName,
            })
            .select("*")
            .single();

          if (evidenceError) {
            console.error("Error al guardar evidencia:", evidenceError);
            throw new HttpError(500, `Error al guardar evidencia: ${evidenceError.message}`);
          }

          evidences.push({
            id: evidence.id,
            fileName: evidence.file_name,
            fileType: evidence.file_type,
            fileSize: evidence.file_size,
            fileUrl: urlData.publicUrl,
          });
        } catch (error) {
          console.error("Error procesando archivo:", error);
          throw error;
        }
      }
    }

    res.status(201).json({
      report: mapReport(report),
      evidences,
      message: "Reporte enviado exitosamente. Será revisado por la administración.",
    });
  })
);

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const supabase = getSupabase();
    let query = supabase
      .from("reports")
      .select("*, teachers(*), report_evidences(*)")
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

    // Mapear reportes y agregar evidencias
    const reportsWithEvidences = (data || []).map((report) => {
      const mapped = mapReport(report);

      // Agregar evidencias si existen
      if (report.report_evidences && report.report_evidences.length > 0) {
        mapped.evidences = report.report_evidences.map((evidence) => ({
          id: evidence.id,
          fileName: evidence.file_name,
          fileType: evidence.file_type,
          fileSize: evidence.file_size,
          fileUrl: supabase.storage
            .from("report-evidences")
            .getPublicUrl(evidence.file_path).data.publicUrl,
        }));
      }

      return mapped;
    });

    res.json({ reports: reportsWithEvidences });
  })
);

router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("reports")
      .select("*, teachers(*), report_evidences(*)")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) throw new HttpError(500, error.message);
    if (!data) throw new HttpError(404, "Reporte no encontrado");

    const mapped = mapReport(data);

    // Agregar evidencias si existen
    if (data.report_evidences && data.report_evidences.length > 0) {
      mapped.evidences = data.report_evidences.map((evidence) => ({
        id: evidence.id,
        fileName: evidence.file_name,
        fileType: evidence.file_type,
        fileSize: evidence.file_size,
        fileUrl: supabase.storage
          .from("report-evidences")
          .getPublicUrl(evidence.file_path).data.publicUrl,
      }));
    }

    res.json({ report: mapped });
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
