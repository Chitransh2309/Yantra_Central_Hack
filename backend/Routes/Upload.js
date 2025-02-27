const express = require("express");
const multer = require("multer");
const path = require("path");
const File = require("../models/File");
const router = express.Router();

// Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter (Allow only .csv, .jpg, .jpeg, .png)
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "text/csv",
      "application/zip",
      "application/x-zip-compressed",
      "application/x-rar-compressed",
      "application/vnd.rar",
      "application/octet-stream", // Some systems use this for zip/rar
    ];
  
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only .csv, .jpg, .jpeg, .png, .zip, .rar files are allowed"), false);
    }
  };
  

// Multer Upload Middleware
const upload = multer({ storage, fileFilter });

// Upload Route
router.post("/", upload.array("files", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    // Store file data in MongoDB
    const uploadedFiles = req.files.map(file => {
      const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
      return { filename: file.filename, fileType: file.mimetype, fileUrl};
    });

    // Save all files to MongoDB
    await File.insertMany(uploadedFiles);

    res.json({ message: "Files uploaded successfully", files: uploadedFiles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
