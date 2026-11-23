require("dotenv").config();

const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/students");
const teacherRoutes = require("./routes/teachers");
const reportRoutes = require("./routes/reports");
const { errorHandler, notFound } = require("./middleware/error");

if (!process.env.JWT_SECRET) {
  console.error("Falta JWT_SECRET en el archivo .env");
  process.exit(1);
}

const app = express();
const port = Number(process.env.BACKEND_PORT || process.env.PORT) || 3001;

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((u) => u.trim())
  : ["http://localhost:8000", "https://proyectos2026.aldretelabs.net"];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "judgeme-backend",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/reports", reportRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`API REST escuchando en http://localhost:${port}`);
});
