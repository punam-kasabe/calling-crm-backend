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

    if (!req.file) {

      return res.status(400).json({
        message: "CSV file required ❌"
      });

    }

    const leads = [];

    fs.createReadStream(req.file.path)

      .pipe(csv())

      .on("data", (row) => {

        try {

          console.log("CSV ROW =>", row);

          const cleanPhone = String(
            row.phone || ""
          )
            .replace(/\D/g, "")
            .slice(-10);

          if (!cleanPhone || cleanPhone.length !== 10) {

            console.log("INVALID PHONE =>", row.phone);

            return;

          }

          leads.push({

            name:
              row.name || "",

            phone:
              cleanPhone,

            email:
              row.Email || "",

            other_contacts:
              row["Other Contacts"] || "",

            source:
              row["Lead Source"] || "",

            channel_partner:
              row["Channel Partner(CP UUID)"] || "",

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
                row.assigned_to || ""
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
              row["Visited Date"] || ""

          });

        }

        catch (e) {

          console.log("ROW ERROR =>", e);

        }

      })

      .on("end", async () => {

        try {

          let inserted = 0;
          let updated = 0;
          let skipped = 0;

          for (const lead of leads) {

            try {

              const existingLead =
                await Lead.findOne({
                  phone: lead.phone
                });

              // UPDATE EXISTING
              if (existingLead) {

                await Lead.updateOne(

                  {
                    phone: lead.phone
                  },

                  {
                    $set: lead
                  }

                );

                updated++;

              }

              // INSERT NEW
              else {

                await Lead.create(lead);

                inserted++;

              }

            }

            catch (err) {

              console.log(
                "INSERT ERROR =>",
                err
              );

              skipped++;

            }

          }

          fs.unlinkSync(req.file.path);

          return res.json({

            success: true,

            inserted,

            updated,

            skipped,

            message:
              "CSV Upload Successful ✅"

          });

        }

        catch (err) {

          console.log(err);

          return res.status(500).json({

            message:
              "Processing Error ❌"

          });

        }

      });

  });

};