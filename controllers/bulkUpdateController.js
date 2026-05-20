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
        message: "File upload failed ❌"
      });

    }

    if (!req.file) {

      return res.status(400).json({
        message: "CSV file required ❌"
      });

    }

    const results = [];

    fs.createReadStream(req.file.path)

      .pipe(csv())

      .on("data", (row) => {

        results.push(row);

      })

      .on("end", async () => {

        try {

          let updated = 0;
          let inserted = 0;
          let skipped = 0;

          const duplicates = [];

          for (const row of results) {

            // ✅ CLEAN PHONE
            const phone = String(

              row.phone ||
              row.Phone ||
              ""

            )
              .replace(/\D/g, "")
              .slice(-10);

            if (!phone || phone.length !== 10) {

              skipped++;
              continue;

            }

            // ✅ ALL FIELDS
            const leadData = {

              name:
                row.name || "",

              phone,

              email:
                row.Email || "",

              other_contact:
                row["Other Contact"] || "",

              source:
                row["Lead Source"] || "",

              channel_partner:
                row["Channel Partner"] || "",

              referral_name:
                row["Referral Name"] || "",

              referral_mobile:
                row["Referral Mobile"] || "",

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
                  row.assigned_to || ""
                )
                  .trim()
                  .toLowerCase(),

              closing_executive:
                row["Closing Executive"] || "",

              enquiry:
                row.Enquiry || "",

              city:
                row.City || "",

              locality:
                row.Locality || "",

              dead_reason:
                row["Dead Reason"] || "",

              description:
                row.Description || "",

              created_at:
                row["Created at"] || "",

              visited:
                row.Visited || "",

              visited_date:
                row["Visited Date"] || ""

            };

            // ✅ FIND EXISTING LEAD
            const existingLead = await Lead.findOne({
              phone
            });

            // ✅ UPDATE EXISTING
            if (existingLead) {

              await Lead.updateOne(

                { phone },

                {
                  $set: leadData
                }

              );

              updated++;

            }

            // ✅ INSERT NEW
            else {

              await Lead.create(leadData);

              inserted++;

            }

          }

          // ✅ DELETE TEMP FILE
          fs.unlinkSync(req.file.path);

          return res.json({

            success: true,

            updated,
            inserted,
            skipped,

            duplicates,

            message:
              `Updated: ${updated}, Inserted: ${inserted}, Skipped: ${skipped}`

          });

        }

        catch (error) {

          console.log(error);

          return res.status(500).json({

            message: "Bulk update failed ❌"

          });

        }

      });

  });

};