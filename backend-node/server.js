require("dotenv").config();
const { analyzeWithGroq } = require("./aiService");
const multer = require("multer");
const { extractPdfText } = require("./pdfService");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }
    cb(null, true);
  }
});

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Backend running" });
});



app.post("/analyze", upload.single("resume"), async (req, res) => {
  const { job_description } = req.body;

  if (!req.file) {
    return res.status(400).json({
      error: "Resume PDF is required"
    });
  }

  
if (
  typeof job_description !== "string" ||
  !job_description.trim()
) {
  return res.status(400).json({
    error: "Job description is required"
  });
}

const words = job_description.trim().split(/\s+/);

if (words.length < 20) {
  return res.status(400).json({
    error: "Please enter a detailed job description with at least 20 words, including responsibilities and required skills."
  });
}


  if (req.file.buffer.subarray(0, 5).toString() !== "%PDF-") {
    return res.status(400).json({
      error: "Please upload a valid PDF"
    });
  }

  try {
    const resumeText = await extractPdfText(req.file.buffer);

    if (!resumeText) {
      return res.status(400).json({
        error: "No readable text found in PDF"
      });
    }

    
const analysis = await analyzeWithGroq(
  resumeText,
  job_description
);

return res.json(analysis);

  } catch (error) {
    console.error("Analysis failed:", {
  message: error.message,
  status: error.status,
  name: error.name
});

  return res.status(500).json({
    error: "Resume analysis failed. Please try again."
  });
  }
});



app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: err.code === "LIMIT_FILE_SIZE"
        ? "PDF must be 5 MB or smaller"
        : "Invalid file upload"
    });
  }

  res.status(400).json({
    error: err.message || "Upload failed"
  });
});



const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
