const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const bcrypt = require("bcrypt");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

/* ================= MONGODB ================= */

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log("DB Error ❌", err));

/* ================= SCHEMAS ================= */

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, lowercase: true, trim: true },
  phone: String,
  password: String,
  role: String,
  can_import: Boolean,
  can_export: Boolean,
  can_delete_lead: Boolean,
  can_access_project: Boolean,
  status: { type: String, default: "active" }
}, { timestamps: true });

const leadSchema = new mongoose.Schema({
  name: String,
  phone: { type: String, unique: true },
  email: String,
  source: String,

  status: {
    type: String,
    default: "New",
    enum: ["New", "Interested", "Not Interested", "Booked"]
  },

  assigned_to: { type: String, lowercase: true, trim: true },
  created_by: String,
  next_call_date: Date,
  upload_batch: Number,

  followups: [
    {
      note: String,
      status: String,
      next_call_date: Date,
      created_at: { type: Date, default: Date.now }
    }
  ]

}, { timestamps: true });

const Lead = mongoose.model("Lead", leadSchema);
const User = mongoose.model("User", userSchema);


/* ================= FILE ================= */

const upload = multer({ dest: "uploads/" });

/* ================= UPLOAD CSV ================= */

app.post("/api/upload", upload.single("file"), async (req, res) => {

  try {

    if (!req.file) {
      return res.status(400).json({
        message: "File missing ❌"
      });
    }

    const assigned_to = req.body.assigned_to?.toLowerCase().trim();

    const created_by = req.body.created_by || "";

    const rows = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())

      .on("data", (data) => {
        rows.push(data);
      })

      .on("end", async () => {

        try {

          let inserted = 0;

          for (const data of rows) {

          if (!data["Phone"]) continue;

            const exists = await Lead.findOne({
  phone: data["Phone"]?.trim()
});
            if (exists) continue;

           await Lead.create({

  name: data["Name"] || "",

  phone: data["Phone"]?.trim() || "",

  email: data["Email"] || "",

  source: data["Lead Source"] || "",

  status: data["Lead Status"] || "New",

  assigned_to: data["assigned_to"]
    ? data["assigned_to"].toLowerCase().trim()
    : assigned_to,

  created_by

});

            inserted++;

          }

          fs.unlinkSync(req.file.path);

          res.json({
            message: "Upload Success ✅",
            inserted
          });

        } catch (err) {

          console.log(err);

          res.status(500).json({
            message: "Database save failed ❌"
          });

        }

      });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Upload failed ❌"
    });

  }

});
/* ================= LOGIN ================= */

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase().trim()
    });

    if (!user) return res.status(401).json({ message: "User not found ❌" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Wrong password ❌" });

    const role = user.role.toLowerCase();
    const isAdmin = role === "admin";

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role,
        can_import: isAdmin || user.can_import,
        can_export: isAdmin || user.can_export,
        can_delete_lead: isAdmin || user.can_delete_lead,
      }
    });

  } catch {
    res.status(500).json("Login error ❌");
  }
});

/* ================= USERS ================= */

app.get("/api/all-users", async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch {
    res.status(500).json("Fetch users error ❌");
  }
});

app.post("/api/add-user", async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    const exists = await User.findOne({
      email: email.toLowerCase().trim()
    });

    if (exists) return res.status(400).json("User already exists ❌");

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      phone,
      password: hash,
      role
    });

    res.json({ message: "User added ✅", user });

  } catch {
    res.status(500).json("Add user error ❌");
  }
});

/* ================= FILTER LEADS ================= */

app.post("/api/filter-leads", async (req, res) => {
  try {
    const { email, role, page = 1, filters = {} } = req.body;

    const limit = 10;
    const skip = (page - 1) * limit;

    let query = {};

   const userRole = role?.toLowerCase();

if (userRole === "executive" && email) {

  query.assigned_to = email.toLowerCase().trim();

}

if (userRole === "manager") {

  
     }
    if (filters.status) query.status = filters.status;
    if (filters.assigned) query.assigned_to = filters.assigned;
    if (filters.project) query.source = new RegExp(filters.project, "i");

    const total = await Lead.countDocuments(query);

    const leads = await Lead.find(query)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      data: leads,
      totalPages: Math.ceil(total / limit),
    });

  } catch {
    res.status(500).json("Filter error ❌");
  }
});

app.post("/api/bulk-update", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json("File missing ❌");

  const bulkOps = [];
  const rows = [];

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => rows.push(data))
    .on("end", async () => {
      try {

        for (let data of rows) {
if (!data["Phone"]) continue;
          let assignedEmail = "";

const csvAssigned = data.assigned_to || req.body.assigned_to;

if (csvAssigned) { const email = csvAssigned.toLowerCase().trim();

  const user = await User.findOne({ email });

  if (user) {
    assignedEmail = user.email;
  } else {
    console.log("User not found:", email);
  }
}

          bulkOps.push({
            updateOne: {
          filter: { phone: data["Phone"]?.trim() },
        update: {
       $set: {
  name: data["Name"] || "",

  phone: data["Phone"]?.trim() || "",

  email: data["Email"] || "",

  status: data["Lead Status"] || "New",

  assigned_to: assignedEmail || "",

  source: data["Lead Source"] || ""
}
  },
  upsert: true   // 🔥 ADD THIS LINE
}
 });
        
        }
        const result = await Lead.bulkWrite(bulkOps);
        fs.unlinkSync(req.file.path);

        res.json({
          message: "Bulk Update Done ✅",
          updated: result.modifiedCount
        });

      } catch (err) {
        console.log(err);
        res.status(500).json("Bulk update error ❌");
      }
    });
});
/* ================= 🔥 ADD FOLLOW-UP ================= */

app.post("/api/add-followup/:id", async (req, res) => {
  try {
    const { note, status, next_call_date } = req.body;

    const followup = {
      note,
      status,
      next_call_date: next_call_date ? new Date(next_call_date) : null
    };

    const updated = await Lead.findByIdAndUpdate(
      req.params.id,
      {
        $push: { followups: followup },
        $set: {
          status,
          next_call_date: followup.next_call_date
        }
      },
      { new: true }
    );

    res.json({ message: "Follow-up saved ✅", lead: updated });

  } catch {
    res.status(500).json("Follow-up error ❌");
  }
});

/* ================= FOLLOW-UP HISTORY ================= */

app.get("/api/followups/:id", async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    res.json(lead.followups || []);
  } catch {
    res.status(500).json("Fetch followups error ❌");
  }
});
/* ================= DELETE LEAD ================= */
app.delete("/api/delete-lead/:id", async (req, res) => {
  try {
    await Lead.findByIdAndDelete(req.params.id);
    res.json({ message: "Lead deleted ✅" });
  } catch {
    res.status(500).json("Delete error ❌");
  }
});

/* ================= UPDATE LEAD ================= */
app.put("/api/update-lead/:id", async (req, res) => {
  try {
    const updated = await Lead.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json({ message: "Lead updated ✅", lead: updated });
  } catch {
    res.status(500).json("Update error ❌");
  }
});
/* ================= DASHBOARD ================= */

app.get("/api/dashboard", async (req, res) => {
  try {
    const email = req.query.email?.toLowerCase();
    const role = req.query.role;

    let match = {};

if (role?.toLowerCase() === "executive") {
        match.assigned_to = email;
    }

   // 🔥 STATUS WISE COUNT
const statusStats = await Lead.aggregate([
  { $match: match },
  {
    $group: {
      _id: "$status",
      count: { $sum: 1 }
    }
  }
]);

// 🔥 SUMMARY
const summary = await Lead.aggregate([
  { $match: match },
  {
    $group: {
      _id: null,
      total: { $sum: 1 },
      new: { $sum: { $cond: [{ $eq: ["$status", "New"] }, 1, 0] } },
      booked: { $sum: { $cond: [{ $eq: ["$status", "Booked"] }, 1, 0] } },
      interested: { $sum: { $cond: [{ $eq: ["$status", "Interested"] }, 1, 0] } },
      not_interested: { $sum: { $cond: [{ $eq: ["$status", "Not Interested"] }, 1, 0] } }
    }
  }
]);

res.json({
  ...(summary[0] || {}),
  status: statusStats
});

} catch {
  res.status(500).json("Dashboard error ❌");
}
});
/* ================= START ================= */

app.listen(5000, () => console.log("Server running 🚀"));