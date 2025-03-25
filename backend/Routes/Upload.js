const express = require("express");
const multer = require("multer");
const path = require("path");
const File = require("../models/File");
const router = express.Router();
var convertapi = require('convertapi')('secret_JDL3V9MsHsRoDUAR');
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

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
      "application/pdf" 
    ];
  
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only .pdf files are allowed"), false);
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

    try {
      // Fetch the PDF URLs from MongoDB
      const files = await File.find();
      if (files.length < 2) {
        return res.status(400).send('At least two PDFs are needed for merging.');
      }
      
      const pdfUrls = files.map(file => file.fileUrl);
      
      // Use ConvertAPI to merge PDFs
      const result = await convertapi.convert('merge', {
        files: pdfUrls
      }, 'pdf');
  
      const mergedFileUrl = result.file.url;
  
      // Redirect to open the merged PDF in a new tab
      res.redirect(mergedFileUrl);
    } catch (error) {
      console.error('Error merging PDFs:', error);
      res.status(500).send('Error merging PDFs');
    }
    await File.deleteMany({});
    res.json({ message: "Files uploaded successfully", files: uploadedFiles });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;
