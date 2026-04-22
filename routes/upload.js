const express = require("express");
const router = express.Router();

const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");

const Lead = require("../models/Lead");

const upload = multer({
  dest: "uploads/"
});

/* ================= UPLOAD CSV ================= */

router.post("/", upload.single("file"), async (req, res) => {

  try {

    const assignedUser =
      req.body.assigned_to?.toLowerCase().trim();

    const createdBy =
      req.body.created_by || "";

    if (!assignedUser) {
      return res.status(400).json({
        message: "User not selected ❌"
      });
    }

    const rows = [];

    fs.createReadStream(req.file.path)

      .pipe(csv())

      .on("data", (data) => {

        rows.push(data);

      })

      .on("end", async () => {

        try {

          for (const data of rows) {

            if (!data["Phone"]) continue;

            await Lead.create({

              name: data["Name"] || "",

              phone: data["Phone"]
                .toString()
                .trim(),

              email: data["Email"] || "",

              source:
                data["Lead Source"] || "",

              status:
                data["Lead Status"] || "New",

              assigned_to: assignedUser,

              created_by: createdBy

            });

          }

          fs.unlinkSync(req.file.path);

          res.json({
            message: "CSV Uploaded ✅"
          });

        } catch (err) {

          console.log(err);

          res.status(500).json({
            message: "DB Error ❌"
          });

        }

      });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Upload Failed ❌"
    });

  }

});

module.exports = router;