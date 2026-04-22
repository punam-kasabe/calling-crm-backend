const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const Lead = require("../models/Lead");

const upload = multer({ dest: "uploads/" }).single("file");

exports.bulkUpdate = (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(500).json("File upload error");

    const updates = [];
    const inserts = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (row) => {
        try {
          const phone = row["phone"] || row["Phone"];

          if (!phone) return;

          const leadData = {
            source: row["source"] || row["Lead Source"] || "",
            assignedTo: row["assigned_to"]?.toLowerCase().trim(),
            status: row["status"] || row["Lead Status"] || "",
          };

          updates.push({ phone, data: leadData });

        } catch (e) {
          console.log("Row error:", row);
        }
      })
      .on("end", async () => {
        try {
          let updatedCount = 0;
          let insertedCount = 0;

          for (let item of updates) {
            const existing = await Lead.findOne({ mobile: item.phone });

            if (existing) {
              await Lead.updateOne(
                { mobile: item.phone },
                { $set: item.data }
              );
              updatedCount++;
            } else {
              await Lead.create({
                mobile: item.phone,
                ...item.data,
              });
              insertedCount++;
            }
          }

          fs.unlinkSync(req.file.path);

          res.json({
            message: "Bulk Update Done ✅",
            updated: updatedCount,
            inserted: insertedCount,
          });

        } catch (err) {
          console.error(err);
          res.status(500).json("Processing error");
        }
      });
  });
};