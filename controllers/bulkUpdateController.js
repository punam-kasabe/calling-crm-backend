const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const Lead = require("../models/Lead");

const upload = multer({
  dest: "uploads/"
}).single("file");

exports.bulkUpdate = (req, res) => {

  upload(req, res, async (err) => {

    if (err) {
      return res.status(500).json({
        message: "File upload error ❌"
      });
    }

    const updates = [];

    fs.createReadStream(req.file.path)

      .pipe(csv())

      .on("data", (row) => {

        try {

          const phone = String(
            row["phone"] ||
            row["Phone"] ||
            ""
          ).trim();

          if (!phone) return;

          const leadData = {

            source:
              row["source"] ||
              row["Lead Source"] ||
              "",

            assigned_to:
              row["assigned_to"]
                ?.toLowerCase()
                .trim() || "",

            status:
              row["status"] ||
              row["Lead Status"] ||
              "New",

            project:
              row["project"] ||
              row["Project"] ||
              ""

          };

          updates.push({
            phone,
            data: leadData
          });

        }

        catch (e) {

          console.log("Row Error ❌", row);

        }

      })

      .on("end", async () => {

        try {

          let updatedCount = 0;
          let insertedCount = 0;

          for (const item of updates) {

            /* FIND EXISTING LEAD */

            const existing = await Lead.findOne({
              phone: item.phone
            });

            /* UPDATE */

            if (existing) {

              await Lead.updateOne(

                { phone: item.phone },

                {
                  $set: item.data
                }

              );

              updatedCount++;

            }

            /* INSERT NEW */

            else {

              await Lead.create({

                phone: item.phone,

                source:
                  item.data.source,

                assigned_to:
                  item.data.assigned_to,

                status:
                  item.data.status,

                project:
                  item.data.project

              });

              insertedCount++;

            }

          }

          /* DELETE TEMP FILE */

          fs.unlinkSync(req.file.path);

          res.json({

            success: true,

            message: "Bulk Update Done ✅",

            updated: updatedCount,

            inserted: insertedCount

          });

        }

        catch (err) {

          console.log(err);

          res.status(500).json({
            message: "Processing Error ❌"
          });

        }

      });

  });

};