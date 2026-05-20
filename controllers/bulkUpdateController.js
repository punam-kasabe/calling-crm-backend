const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const Lead = require("../models/Lead");

const upload = multer({
  dest: "uploads/",
}).single("file");

exports.bulkUpdate = (req, res) => {

  upload(req, res, async (err) => {

    if (err) {
      return res.status(500).json({
        message: "File upload failed ❌",
      });
    }

    const rows = [];

    fs.createReadStream(req.file.path)

      .pipe(csv())

      .on("data", (row) => {

        rows.push(row);

      })

      .on("end", async () => {

        try {

          let updated = 0;
          let inserted = 0;

          for (const row of rows) {

            /* CLEAN PHONE */

            const cleanPhone = String(
              row["phone"] || ""
            )
              .replace(/\D/g, "")
              .slice(-10);

            if (!cleanPhone) {
              continue;
            }

            /* DATA */

            const leadData = {

              name:
                row["name"] || "",

              phone:
                cleanPhone,

              email:
                row["Email"] || "",

              other_contact:
                row["Other Con"] || "",

              source:
                row["Lead Source"] || "",

              channel_partner:
                row["Channel P"] || "",

              referal_name:
                row["Referal Name"] || "",

              referal_mobile:
                row["Referal Mobile"] || "",

              sub_source:
                row["Sub Source"] || "",

              status:
                row["Lead Status"] || "New",

              next_call_date:
                row["Next Call Date"] || "",

              secondary_email:
                row["Secondary Email"] || "",

              assigned_to:
                String(
                  row["assigned_to"] || ""
                )
                  .trim()
                  .toLowerCase(),

              closing_executive:
                row["Closing Executive"] || "",

              enquiry:
                row["Enquiry"] || "",

              city:
                row["City"] || "",

              locality:
                row["Locality"] || "",

              dead_reason:
                row["Dead Reason"] || "",

              description:
                row["Description"] || "",

              created_at:
                row["Created at"] || "",

              visited:
                row["Visited"] || "",

              visited_date:
                row["Visited Date"] || "",

            };

            /* FIND EXISTING */

            const existingLead =
              await Lead.findOne({
                phone: cleanPhone,
              });

            /* UPDATE */

            if (existingLead) {

              await Lead.updateOne(
                { phone: cleanPhone },
                {
                  $set: leadData,
                }
              );

              updated++;

            }

            /* INSERT */

            else {

              await Lead.create(
                leadData
              );

              inserted++;

            }

          }

          fs.unlinkSync(req.file.path);

          res.json({

            success: true,

            updated,

            inserted,

            skipped: 0,

            message:
              "CSV Uploaded Successfully ✅",

          });

        }

        catch (error) {

          console.log(error);

          res.status(500).json({
            message:
              "Bulk upload failed ❌",
          });

        }

      });

  });

};