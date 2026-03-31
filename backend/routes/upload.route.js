import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// Setup storage engine and destination
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "./uploads";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = [".json", ".csv", ".txt"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only .json, .csv, or .txt files are allowed."));
    }
  },
});

// POST /api/upload
router.post("/", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." });
  }

  const filePath = path.join("uploads", req.file.filename);
  const fileExtension = path.extname(req.file.originalname).toLowerCase();

  // Preview JSON content
  if (fileExtension === ".json") {
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        return res.status(500).json({ message: "Error reading uploaded file." });
      }

      try {
        const parsed = JSON.parse(data);
        return res.status(200).json({
          message: "✅ File uploaded and preview ready.",
          filename: req.file.filename,
          preview: parsed,
        });
      } catch (error) {
        return res.status(400).json({ message: "❌ Invalid JSON format." });
      }
    });
  } else {
    // Non-JSON files
    return res.status(200).json({
      message: "✅ File uploaded successfully.",
      filename: req.file.filename,
    });
  }
});

export default router;
