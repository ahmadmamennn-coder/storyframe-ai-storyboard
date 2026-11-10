
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(express.json({ limit: "20kb" }));

app.use(
  "/api/",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false
  })
);

// Menampilkan website
app.use(express.static(path.join(__dirname)));

// Status server
app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    aiConfigured: false,
    message: "StoryFrame backend is running. AI is not configured yet."
  });
});

// Validasi permintaan storyboard
app.post("/api/generate", (req, res) => {
  const { idea, language, scenes, style } = req.body || {};

  if (typeof idea !== "string" || !idea.trim() || idea.length > 3000) {
    return res.status(400).json({
      error: "Ide cerita wajib diisi (maksimal 3000 karakter)."
    });
  }

  if (!["id", "en"].includes(language)) {
    return res.status(400).json({
      error: "Bahasa tidak valid."
    });
  }

  if (![5, 7, 10, 15].includes(Number(scenes))) {
    return res.status(400).json({
      error: "Jumlah adegan tidak valid."
    });
  }

  if (typeof style !== "string" || style.length > 50) {
    return res.status(400).json({
      error: "Gaya cinematic tidak valid."
    });
  }

  return res.status(503).json({
    error: "AI belum dikonfigurasi.",
    message: "Backend siap, tetapi generator AI belum diaktifkan."
  });
});

app.listen(PORT, () => {
  console.log(`StoryFrame running on port ${PORT}`);
});
