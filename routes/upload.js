const express = require("express");
const router = express.Router();
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const db = require("../db");

const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("file"), (req, res) => {
  const assignedUser = req.body.assigned_to;
  const createdBy = req.body.created_by;
  const batch = Date.now();

  if (!assignedUser) {
    return res.status(400).json("User not selected");
  }

  const results = [];

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => {
      results.push([
        data.name,
        data.phone,
        data.email,
        data.source,
        assignedUser,
        createdBy,
        batch
      ]);
    })
    .on("end", () => {
      const sql = `
        INSERT INTO leads 
        (name, phone, email, source, assigned_to, created_by, upload_batch)
        VALUES ?
      `;

      db.query(sql, [results], (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).json("DB Error");
        }

        res.json("CSV Uploaded & Leads Assigned ✅");
      });
    });
});

module.exports = router;