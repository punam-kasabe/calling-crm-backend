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

/* =========================================
   MONGODB
========================================= */

mongoose.connect(process.env.MONGO_URI)

  .then(() => {
    console.log("MongoDB Connected ✅");
  })

  .catch((err) => {
    console.log("DB Error ❌", err);
  });

/* =========================================
   USER SCHEMA
========================================= */

const userSchema = new mongoose.Schema({

  name: String,

  email: {
    type: String,
    lowercase: true,
    trim: true
  },

  phone: String,

  password: String,

  role: String,

  can_import: Boolean,

  can_export: Boolean,

  can_delete_lead: Boolean,

  can_access_project: Boolean,

  status: {
    type: String,
    default: "active"
  }

}, {
  timestamps: true
});

/* =========================================
   LEAD SCHEMA
========================================= */

const leadSchema = new mongoose.Schema({

  name: String,

  phone: {
    type: String,
    unique: true
  },

  email: String,

  source: String,

  project: String,

  status: {

    type: String,

    default: "New",

    enum: [

      "New",
      "Interested",
      "Not Interested",
      "Followup",
      "Booked",
       "Call Cut",
    "Call Back",
    "Ringing",
    "Busy",
    "Switch Off",
    "Out of Service",
    "Wrong Number"
    ]

  },
description: {
  type: String,
  default: ""
},

subSource: {
  type: String,
  default: ""
},



closingExecutive: {
  type: String,
  default: ""
},

remark: {
  type: String,
  default: ""
},

followup_date: {
  type: Date,
  default: null
},
  assigned_to: {
    type: String,
    lowercase: true,
    trim: true
  },

  assigned_manager: {
    type: String,
    lowercase: true,
    trim: true,
    default: ""
  },

  visit_created: {
    type: Boolean,
    default: false
  },

  visit_status: {

    type: String,

    default: "",

    enum: [

      "",
      "IN_OFFICE",
      "VISIT_DONE",
      "BOOKED",
      "NOT_BOOKED",
      "FOLLOWUP"

    ]

  },

  created_by: String,

  next_call_date: Date,

  upload_batch: Number,

  followups: [

    {

      note: String,

      status: String,

      next_call_date: Date,

      created_at: {
        type: Date,
        default: Date.now
      }

    }

  ]

}, {
  timestamps: true
});

/* =========================================
   VISIT SCHEMA
========================================= */

const visitSchema = new mongoose.Schema(

  {

    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
    },

    clientName: String,

    mobile: String,

    project: String,

    attendedManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    receptionUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    visitStatus: {
      type: String,
      enum: [
        "IN_OFFICE",
        "VISIT_DONE",
        "BOOKED",
        "NOT_BOOKED",
        "FOLLOWUP"
      ],
      default: "IN_OFFICE",
    },
      
    
    bookingStatus: {
      type: String,
      enum: [
        "PENDING",
        "BOOKED",
        "NOT_BOOKED"
      ],
      default: "PENDING",
    },
     assigned_manager: {
  type: String,
  default: ""
},

calling_by: [
  {
    type: String
  }
],

remark: {
  type: String,
  default: ""
},
    visitDate: {
      type: Date,
      default: Date.now,
    },

  },

  {
    timestamps: true,
  }

);
/* =========================================
   FOLLOWUP SCHEMA
========================================= */

const followupSchema = new mongoose.Schema({

  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lead"
  },

  clientName: String,

  phone: String,

  project: String,

  executive: String,

  note: {
    type: String,
    default: ""
  },

  followup_date: Date,

  status: {
    type: String,
    default: "Followup"
  }

}, {
  timestamps: true
});
/* =========================================
   PROJECT SCHEMA
========================================= */

const projectSchema = new mongoose.Schema({

  name: String,

  city: String,

  address: String,

  projectId: {
    type: String,
    unique: true
  },

  description: String,

  active: {
    type: Boolean,
    default: true
  }

}, {
  timestamps: true
});
/* =========================================
   MODELS
========================================= */

const User = mongoose.model(
  "User",
  userSchema
);

const Lead = mongoose.model(
  "Lead",
  leadSchema
);

const Visit = mongoose.model(
  "Visit",
  visitSchema
);
const Project = mongoose.model(
  "Project",
  projectSchema
);
const Followup = mongoose.model(
  "Followup",
  followupSchema
);
/* =========================================
   FILE UPLOAD
========================================= */

const upload = multer({
  dest: "uploads/"
});

/* =========================================
   LOGIN
========================================= */

app.post("/api/login", async (req, res) => {

  try {

    const {
      email,
      password
    } = req.body;

    const user = await User.findOne({

      email: email
        .toLowerCase()
        .trim()

    });

    if (!user) {

      return res.status(401).json({
        message: "User not found ❌"
      });

    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {

      return res.status(401).json({
        message: "Wrong password ❌"
      });

    }

    const role = user.role?.toLowerCase();

    const isAdmin = role === "admin";

    res.json({

      user: {

        id: user._id,

        name: user.name,

        email: user.email,

        role,

        can_import:
          isAdmin || user.can_import,

        can_export:
          isAdmin || user.can_export,

        can_delete_lead:
          isAdmin || user.can_delete_lead,

      }

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Login error ❌"
    });

  }

});

/* =========================================
   ADD USER
========================================= */

app.post("/api/add-user", async (req, res) => {

  try {

    const {
      name,
      email,
      phone,
      password,
      role
    } = req.body;

    const exists = await User.findOne({

      email: email
        .toLowerCase()
        .trim()

    });

    if (exists) {

      return res.status(400).json({
        message: "User already exists ❌"
      });

    }

    const hash = await bcrypt.hash(
      password,
      10
    );

    const user = await User.create({

      name,

      email: email
        .toLowerCase()
        .trim(),

      phone,

      password: hash,

      role

    });

    res.json({

      message: "User added ✅",

      user

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Add user error ❌"
    });

  }

});

/* =========================================
   GET USERS
========================================= */

app.get("/api/all-users", async (req, res) => {

  try {

    const users = await User.find()
      .select("-password");

    res.json(users);

  }

  catch {

    res.status(500).json({
      message: "Fetch users error ❌"
    });

  }

});

/* =========================================
   GET MANAGERS
========================================= */

app.get("/api/managers", async (req, res) => {

  try {

    const managers = await User.find({
      role: /manager/i
    }).select("name email");

    res.json(managers);

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Managers fetch error ❌"
    });

  }

});

/* =========================================
   CSV UPLOAD
========================================= */

app.post(
  "/api/upload",
  upload.single("file"),

  async (req, res) => {

    try {

      if (!req.file) {

        return res.status(400).json({
          message: "File missing ❌"
        });

      }

      const assigned_to = req.body
        .assigned_to
        ?.toLowerCase()
        .trim();

      const created_by =
        req.body.created_by || "";

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

              if (!data["Phone"])
                continue;

              const exists =
                await Lead.findOne({

                  phone:
                    data["Phone"]?.trim()

                });

              if (exists)
                continue;

              await Lead.create({

                name:
                  data["Name"] || "",

                phone:
                  data["Phone"]?.trim() || "",

                email:
                  data["Email"] || "",

                source:
                  data["Lead Source"] || "",

                project:
                  data["Project"] || "",

                status:
                  data["Lead Status"] || "New",

                assigned_to:

                  data["assigned_to"]

                    ? data["assigned_to"]
                        .toLowerCase()
                        .trim()

                    : assigned_to,

                created_by

              });

              inserted++;

            }

            fs.unlinkSync(
              req.file.path
            );

            res.json({

              message:
                "Upload Success ✅",

              inserted

            });

          }

          catch (err) {

            console.log(err);

            res.status(500).json({

              message:
                "Database save failed ❌"

            });

          }

        });

    }

    catch (err) {

      console.log(err);

      res.status(500).json({
        message: "Upload failed ❌"
      });

    }

  }

);



/* =========================================
   SEARCH CLIENT
========================================= */

app.get(
  "/api/search-client/:phone",

  async (req, res) => {

    try {

      const lead =
        await Lead.findOne({
          phone: req.params.phone
        });

      if (!lead) {

        return res.status(404).json({
          message: "Client not found ❌"
        });

      }

      res.json(lead);

    }

    catch (err) {

      console.log(err);

      res.status(500).json({
        message: "Search error ❌"
      });

    }

  }

);
/* =========================================
   SEARCH CLIENT BY NAME
========================================= */

app.get(
  "/api/search-client-name/:name",

  async (req, res) => {

    try {

      const search =
        decodeURIComponent(
          req.params.name
        );

      console.log(
        "Searching:",
        search
      );

      const leads =
        await Lead.find({

          name: {
            $regex: search,
            $options: "i"
          }

        }).limit(10);

      console.log(
        "Results:",
        leads.length
      );

      res.json(leads);

    }

    catch (err) {

      console.log(err);

      res.status(500).json({
        message: "Search error ❌"
      });

    }

  }

);
/* =========================================
   CREATE VISIT
========================================= */

app.post(
  "/api/create-visit",

  async (req, res) => {

    try {

      const {

        leadId,
        clientName,
        mobile,
        project,
        attendedManager,
        receptionUser,
        visitStatus,
        bookingStatus,
        calling_by,
        remark,
        assigned_manager

      } = req.body;

      const visit = await Visit.create({

        leadId,

        clientName,

        mobile,

        project,

        attendedManager,

        receptionUser,

        visitStatus,

        bookingStatus

      });

      /* ===============================
         GET MANAGER EMAIL
      =============================== */

      const manager =
        await User.findById(
          attendedManager
        );

      /* ===============================
         FIND LEAD USING MOBILE
      =============================== */

      const existingLead =
        await Lead.findOne({

          phone: mobile

        });
       
/* ===============================
         UPDATE EXISTING LEAD
      =============================== */

      if (existingLead) {

  existingLead.name = clientName;

  existingLead.project = project;

  existingLead.assigned_manager =
    manager?.email || "";

  existingLead.visit_created = true;

  existingLead.visit_status =
    visitStatus;

  existingLead.status =
    bookingStatus === "BOOKED"
      ? "Booked"
      : "Followup";

  await existingLead.save();

}

      /* ===============================
         CREATE NEW LEAD
      =============================== */

      else {

  await Lead.create({

    name: clientName,

    phone: mobile,

    project: project,

    source: "Visit",

    status:
      bookingStatus === "BOOKED"
        ? "Booked"
        : "Followup",

    assigned_manager:
      manager?.email || "",

    visit_created: true,

    visit_status: visitStatus,

    created_by: "Reception"

  });

}

      res.json({

        message: "Visit created ✅",

        visit

      });

    }

    catch (err) {

      console.log(err);

      res.status(500).json({

        message:
          "Visit create failed ❌"

      });

    }

  }

);
/* =========================================
   GET ALL VISITS
========================================= */

app.get(
  "/api/visits",

  async (req, res) => {

    try {

      const visits = await Visit.find()

        .populate(
          "attendedManager",
          "name email"
        )

        .populate(
          "receptionUser",
          "name email"
        )

        .sort({
          createdAt: -1
        });

      res.json(visits);

    }

    catch (err) {

      console.log(err);

      res.status(500).json({
        message: "Visits fetch failed ❌"
      });

    }

  }

);

/* =========================================
   UPDATE VISIT STATUS
========================================= */

app.put(
  "/api/update-visit/:id",

  async (req, res) => {

    try {

      const {

        visitStatus,
        bookingStatus,
        attendedManager

      } = req.body;

      const updated =
        await Visit.findByIdAndUpdate(

          req.params.id,

          {

            visitStatus,
            bookingStatus,
            attendedManager

          },

          {
            new: true
          }

        );

      res.json({

        message: "Visit updated ✅",

        visit: updated

      });

    }

    catch (err) {

      console.log(err);

      res.status(500).json({
        message: "Visit update failed ❌"
      });

    }

  }

);
/* =========================================
   GET VISIT ENTRIES
========================================= */

app.get(
  "/api/visit-entries",

  async (req, res) => {

    try {

      const visits =
        await Visit.find()

          .sort({
            createdAt: -1
          });

      res.json(visits);

    }

    catch (err) {

      console.log(err);

      res.status(500).json({

        message:
          "Visit fetch error ❌"

      });

    }

  }

);
/* =========================================
   BULK UPDATE
========================================= */

app.post(
  "/api/bulk-update",
  upload.single("file"),

  async (req, res) => {

    try {

      if (!req.file) {

        return res.status(400).json({
          message: "File missing ❌"
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

            let updated = 0;

            for (const data of rows) {

  /* PHONE */

  const phone =
    (
      data.phone ||
      data.Phone ||
      data.PHONE
    )?.trim();

  if (!phone) continue;

  /* FIND LEAD */

  let lead =
  await Lead.findOne({
    phone
  });

/* CREATE NEW LEAD IF NOT EXISTS */

if (!lead) {

  lead = new Lead({

    name:
      data.Name || "",

    phone,

    email:
      data.Email || "",

    source:
      data["Lead Source"] || "",

    project:
      data.Enquiry || "",

    status:
      data["Lead Status"] || "New",

    assigned_to:
      (
        data.assigned_to || ""
      )
        .toLowerCase()
        .trim()

  });

}
  /* STATUS */

  const status =
  data["Lead Status"] ||
  data.status ||
  data.Status;

  if (status) {
    lead.status = status;
  }

  /* ASSIGNED TO */

  const assignedTo =
  data.assigned_to ||
  data["assigned_to"] ||
  data["Assigned To"] ||
  data["assigned to"];

  if (assignedTo) {

    lead.assigned_to =
      assignedTo
        .toLowerCase()
        .trim();

  }

  /* SOURCE */

  const source =
  data["Lead Source"] ||
  data.source ||
  data.Source;

  if (source) {
    lead.source = source;
  }

  await lead.save();

  updated++;

}

            fs.unlinkSync(
              req.file.path
            );

            res.json({

              message:
                `Bulk Update Success ✅ (${updated} updated)`,

              updated

            });

          }

          catch (err) {

            console.log(err);

            res.status(500).json({

              message:
                "Bulk update failed ❌"

            });

          }

        });

    }

    catch (err) {

      console.log(err);

      res.status(500).json({

        message:
          "Server Error ❌"

      });

    }

  }

);
/* =========================================
   ASSIGN MANAGER
========================================= */

app.put(
  "/api/assign-manager/:id",
  async (req, res) => {

    try {

      const { managerId } = req.body;

      const visit = await Visit.findByIdAndUpdate(

        req.params.id,

        {
          attendedManager: managerId
        },

        {
          new: true
        }

      ).populate(
        "attendedManager",
        "name email"
      );

      res.json({

        message: "Manager Assigned ✅",

        visit

      });

    }

    catch (err) {

      console.log(err);

      res.status(500).json({

        message: "Assign manager error ❌"

      });

    }

  }

);
/* =========================================
   ADD LEAD
========================================= */

app.post("/api/add-lead", async (req, res) => {

  try {

    const {

      name,
      phone,
      email,
      source,
      subSource,
      project,
      status,
      assignedTo,
      closingExecutive,
      description,
      remark,
      next_call_date

    } = req.body;

    /* CHECK DUPLICATE */

    const exists = await Lead.findOne({
      phone: phone?.trim()
    });

    if (exists) {

      return res.status(400).json({
        message: "Lead already exists ❌"
      });

    }

    /* CREATE */

    const lead = await Lead.create({

      name,

      phone: phone?.trim(),

      email: email || "",

      source: source || "Virtual Call",

      subSource: subSource || "",

      project: project || "",

      status: status || "New",

assigned_to:
  assignedTo
    ?.toLowerCase()
    .trim() || "",
      closingExecutive:
        closingExecutive || "",

      description: description || "",

      remark: remark || "",

      next_call_date:
        next_call_date || null,


      created_by:
        closingExecutive || "Executive"

    });

    res.json({

      success: true,

      message: "Lead added ✅",

      lead

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({

      message: "Add lead failed ❌"

    });

  }

});
/* =========================================
   EXECUTIVE LEADS
========================================= */

app.get(
  "/api/my-leads",

  async (req, res) => {

    try {

      const email = req.query.email
        ?.toLowerCase()
        .trim();

      const leads =
  await Lead.find({

    $or: [

      {
        assigned_to: email
      },

      {
        assignedTo: email
      }

    ]

  }).sort({

    createdAt: -1

  });
      res.json(leads);

    }

    catch {

      res.status(500).json({
        message: "Fetch error ❌"
      });

    }

  }

);

/* =========================================
   MANAGER CLIENTS
========================================= */

app.get(
  "/api/manager-clients",

  async (req, res) => {

    try {

      const email = req.query.email
        ?.toLowerCase()
        .trim();

      const leads =
        await Lead.find({

          assigned_manager:
            email

        }).sort({

          createdAt: -1

        });

      res.json(leads);

    }

    catch {

      res.status(500).json({
        message: "Manager fetch error ❌"
      });

    }

  }

);

/* =========================================
   UPDATE STATUS
========================================= */

app.put(
  "/api/update-status/:id",

  async (req, res) => {

    try {

      const {

        status,
        remark,
        followup_date

      } = req.body;

      const updated =
        await Lead.findByIdAndUpdate(

          req.params.id,

          {

            status,

            remark,

            followup_date

          },

          {

            new: true

          }

        );

      res.json(updated);

    }

    catch {

      res.status(500).json({
        message: "Update failed ❌"
      });

    }

  }

);

/* =========================================
   FILTER LEADS
========================================= */

app.post(
  "/api/filter-leads",

  async (req, res) => {

    try {

      const {

        email,
        role,
        page = 1,
        filters = {}

      } = req.body;

      const limit = 10;

      const skip =
        (page - 1) * limit;

      let query = {};

      const userRole =
        role?.toLowerCase();

      if (
        userRole ===
        "executive"
      ) {

        query.assigned_to =
          email
            ?.toLowerCase()
            .trim();

      }

      if (
        userRole ===
        "manager"
      ) {

        query.assigned_manager =
          email
            ?.toLowerCase()
            .trim();

      }

      if (filters.status) {
        query.status = filters.status;
      }
      
      /* ASSIGNED FILTER */

     if (filters.assigned) {

        query.assigned_to =
      filters.assigned
      .toLowerCase()
      .trim();

      }
      if (filters.project) {

        query.project =
          new RegExp(
            filters.project,
            "i"
          );

      }

      const total =
        await Lead.countDocuments(
          query
        );

      const leads =
        await Lead.find(query)

          .sort({
            _id: -1
          })

          .skip(skip)

          .limit(limit);

      res.json({

        data: leads,

        totalPages:
          Math.ceil(
            total / limit
          )

      });

    }

    catch {

      res.status(500).json({
        message: "Filter error ❌"
      });

    }

  }

);

/* =========================================
   ADD FOLLOWUP
========================================= */

app.post(
  "/api/add-followup/:id",

  async (req, res) => {

    try {

      const {

        note,
        status,
        next_call_date

      } = req.body;

      const followup = {

        note,

        status,

        next_call_date:

          next_call_date

            ? new Date(
                next_call_date
              )

            : null

      };

      const updated =
        await Lead.findByIdAndUpdate(

          req.params.id,

          {

            $push: {

              followups:
                followup

            },

            $set: {

              status,

              next_call_date:
                followup.next_call_date

            }

          },

          {

            new: true

          }

        );

      res.json({

        message:
          "Followup saved ✅",

        lead: updated

      });

    }

    catch {

      res.status(500).json({
        message: "Followup error ❌"
      });

    }

  }

);
/* =========================================
   CREATE FOLLOWUP
========================================= */

app.post(
  "/api/create-followup",

  async (req, res) => {

    try {

      const {

        leadId,
        note,
        followup_date,
        executive

      } = req.body;

      /* FIND LEAD */

      const lead = await Lead.findById(
        leadId
      );

      if (!lead) {

        return res.status(404).json({
          message: "Lead not found ❌"
        });

      }

      /* CREATE FOLLOWUP */

      const followup =
        await Followup.create({

          leadId,

          clientName: lead.name,

          phone: lead.phone,

          project: lead.project,

          executive,

          note,

          followup_date,

          status: "Followup"

        });

      /* UPDATE LEAD */

      lead.status = "Followup";

      lead.followup_date =
        followup_date;

      lead.next_call_date =
        followup_date;

      lead.followups.push({

        note,

        status: "Followup",

        next_call_date:
          followup_date

      });

      await lead.save();

      res.json({

        success: true,

        message:
          "Followup created ✅",

        followup

      });

    }

    catch (err) {

      console.log(err);

      res.status(500).json({

        message:
          "Create followup failed ❌"

      });

    }

  }

);

/* =========================================
   UPDATE LEAD
========================================= */

app.put("/api/update-lead/:id", async (req, res) => {

  try {

    const updated = await Lead.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) {

      return res.status(404).json({
        message: "Lead not found ❌"
      });

    }

    res.json({
      message: "Lead updated ✅",
      lead: updated
    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Update failed ❌"
    });

  }

});

/* =========================================
   DELETE LEAD
========================================= */

app.delete("/api/delete-lead/:id", async (req, res) => {

  try {

    const deletedLead =
      await Lead.findByIdAndDelete(
        req.params.id
      );

    if (!deletedLead) {

      return res.status(404).json({
        message: "Lead not found ❌"
      });

    }

    res.json({
      message: "Lead deleted ✅"
    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Delete failed ❌"
    });

  }

});
/* =========================================
   TODAY FOLLOWUPS
========================================= */

app.get(
  "/api/today-followups/:email",

  async (req, res) => {

    try {

      const today = new Date();

      today.setHours(
        0, 0, 0, 0
      );

      const tomorrow =
        new Date(today);

      tomorrow.setDate(
        tomorrow.getDate() + 1
      );

      const followups =
        await Followup.find({

          executive:
            req.params.email,

          followup_date: {

            $gte: today,

            $lt: tomorrow

          }

        }).sort({

          followup_date: 1

        });

      res.json(followups);

    }

    catch (err) {

      console.log(err);

      res.status(500).json({

        message:
          "Today followups error ❌"

      });

    }

  }

);
/* =========================================
   EXECUTIVE DASHBOARD
========================================= */

app.get(
  "/api/executive/dashboard/:id",

  async (req, res) => {

    try {

      /* USER FIND */

      const user =
        await User.findById(
          req.params.id
        );

      if (!user) {

        return res.status(404).json({
          message: "User not found ❌"
        });

      }

      const email =
        user.email
          ?.toLowerCase()
          .trim();

      /* TOTAL LEADS */

      const totalLeads =
        await Lead.countDocuments({

          assigned_to: email

        });

      /* FOLLOWUPS */

      const followups =
        await Lead.countDocuments({

          assigned_to: email,
          status: "Followup"

        });

      /* CONVERTED */

      const converted =
        await Lead.countDocuments({

          assigned_to: email,

          status: "Booked"

        });

      /* INTERESTED */

      const hotLeads =
        await Lead.countDocuments({

          assigned_to: email,

          status: "Interested"

        });

      /* TODAY FOLLOWUPS */

      const today = new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );

      const tomorrow =
        new Date(today);

      tomorrow.setDate(
        tomorrow.getDate() + 1
      );

      const todayFollowups =
        await Lead.countDocuments({

          assigned_to: email,

          next_call_date: {

            $gte: today,

            $lt: tomorrow

          }

        });


        /* TODAY FOLLOWUPS LIST */

const todayFollowupsList =
  await Followup.find({

    executive: email,

    followup_date: {

      $gte: today,

      $lt: tomorrow

    }

  })

  .sort({
    followup_date: 1
  })

  .limit(10);

      /* PENDING CALLS */

      const pendingCalls =
        await Lead.countDocuments({

          assigned_to: email,

          status: "New"

        });

      /* RECENT LEADS */

      const recentLeads =
        await Lead.find({

          assigned_to: email

        })

          .sort({

            createdAt: -1

          })

          .limit(5);

      /* CALLS */

      const calls =
        followups + converted;

      res.json({

        totalLeads,

        followups,

        calls,

        converted,

        todayFollowups,

        hotLeads,

        pendingCalls,

        recentLeads,
        todayFollowupsList

      });

    }

    catch (err) {

      console.log(err);

      res.status(500).json({

        message:
          "Executive dashboard error ❌"

      });

    }

  }

);

/* =========================================
   EXECUTIVE REPORT
========================================= */

app.get(
  "/api/executive/report/:id",

  async (req, res) => {

    try {

      /* FIND USER */

      const user =
        await User.findById(
          req.params.id
        );

      if (!user) {

        return res.status(404).json({
          message: "User not found ❌"
        });

      }

      const email =
        user.email
          ?.toLowerCase()
          .trim();

      /* TOTAL LEADS */

      const total =
        await Lead.countDocuments({

          assigned_to: email

        });

      /* INTERESTED */

      const interested =
        await Lead.countDocuments({

          assigned_to: email,

          status: "Interested"

        });

      /* SITE VISITS */

      const siteVisit =
        await Lead.countDocuments({

          assigned_to: email,

          visit_created: true

        });

      /* NOT INTERESTED */

      const notInterested =
        await Lead.countDocuments({

          assigned_to: email,

          status: "Not Interested"

        });

      /* BOOKED */

      const booked =
        await Lead.countDocuments({

          assigned_to: email,

          status: "Booked"

        });

      /* RECENT LEADS */

      const recentLeads =
        await Lead.find({

          assigned_to: email

        })

        .sort({
          createdAt: -1
        })

        .limit(10);

      /* RESPONSE */

      res.json({

        total,

        interested,

        siteVisit,

        notInterested,

        booked,

        recentLeads

      });

    }

    catch (err) {

      console.log(err);

      res.status(500).json({

        message:
          "Executive report error ❌"

      });

    }

  }

);

/* =========================================
   DASHBOARD
========================================= */

app.get("/api/dashboard", async (req, res) => {

  try {

    const email = req.query.email?.toLowerCase();
    const role = req.query.role?.toLowerCase();

    let match = {};

    if (role === "executive") {
      match.assigned_to = email;
    }

    if (role === "manager") {
      match.assigned_manager = email;
    }

    const total = await Lead.countDocuments(match);

    const newLeads = await Lead.countDocuments({
      ...match,
      status: "New"
    });

    const booked = await Lead.countDocuments({
      ...match,
      status: "Booked"
    });

    const interested = await Lead.countDocuments({
      ...match,
      status: "Interested"
    });

    const notInterested = await Lead.countDocuments({
      ...match,
      status: "Not Interested"
    });

    const status = await Lead.aggregate([
      { $match: match },

      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({

      total,

      new: newLeads,

      booked,

      interested,

      not_interested: notInterested,

      status

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Dashboard error ❌"
    });

  }

});
/* =========================================
   CREATE PROJECT
========================================= */

app.post("/api/projects", async (req, res) => {
  try {
    const {
      name,
      city,
      address,
      projectId,
      description,
      active
    } = req.body;

    /* VALIDATION */
    if (!name || !projectId) {
      return res.status(400).json({
        message: "Name & Project ID required ❌"
      });
    }

    const cleanProjectId = projectId.trim().toLowerCase();

    /* CHECK EXIST */
    const exists = await Project.findOne({
      projectId: cleanProjectId
    });

    if (exists) {
      return res.status(400).json({
        message: "Project already exists ❌"
      });
    }

    /* CREATE */
    const project = await Project.create({
      name,
      city,
      address,
      projectId: cleanProjectId,
      description,
      active
    });

    res.json({
      success: true,
      message: "Project created ✅",
      data: project
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Create project failed ❌"
    });
  }
});


/* =========================================
   GET PROJECTS
========================================= */

app.get("/api/projects", async (req, res) => {
  try {
    const projects = await Project.find()
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: projects
    });

  } catch (err) {
    res.status(500).json({
      message: "Fetch projects failed ❌"
    });
  }
});


/* =========================================
   UPDATE PROJECT
========================================= */

app.put("/api/projects/:id", async (req, res) => {
  try {

    const updated = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        message: "Project not found ❌"
      });
    }

    res.json({
      success: true,
      message: "Project updated ✅",
      data: updated
    });

  } catch (err) {
    res.status(500).json({
      message: "Update failed ❌"
    });
  }
});


/* =========================================
   DELETE PROJECT
========================================= */

app.delete("/api/projects/:id", async (req, res) => {
  try {

    const deleted = await Project.findByIdAndDelete(
      req.params.id
    );

    if (!deleted) {
      return res.status(404).json({
        message: "Project not found ❌"
      });
    }

    res.json({
      success: true,
      message: "Project deleted ✅"
    });

  } catch (err) {
    res.status(500).json({
      message: "Delete failed ❌"
    });
  }
});
/* =========================================
   FULL DASHBOARD API
========================================= */

app.get("/api/dashboard-full", async (req, res) => {

  try {

    const email =
      req.query.email
        ?.toLowerCase()
        .trim();

    const role =
      req.query.role
        ?.toLowerCase()
        .trim();

    let match = {};

    /* ROLE FILTER */

    if (role === "executive") {

      match.assigned_to = email;

    }

    if (role === "manager") {

      match.assigned_manager = email;

    }

    /* =====================================
       SUMMARY COUNTS
    ===================================== */

    const total =
      await Lead.countDocuments(match);

    /* TODAY NEW LEADS */

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);

    tomorrow.setDate(
      tomorrow.getDate() + 1
    );

    const newLeads =
      await Lead.countDocuments({

        ...match,

        createdAt: {
          $gte: today,
          $lt: tomorrow
        }

      });

    const interested =
      await Lead.countDocuments({

        ...match,

        status: "Interested"

      });

    const booked =
      await Lead.countDocuments({

        ...match,

        status: "Booked"

      });

    const notInterested =
      await Lead.countDocuments({

        ...match,

        status: "Not Interested"

      });

    const pending =
      await Lead.countDocuments({

        ...match,

        status: {
          $in: ["New", "Followup"]
        }

      });

    /* =====================================
       STATUS CHART
    ===================================== */

    const statusData =
      await Lead.aggregate([

        {
          $match: match
        },

        {
          $group: {

            _id: "$status",

            count: {
              $sum: 1
            }

          }

        }

      ]);

    /* =====================================
       WEEKLY CHART
    ===================================== */

    const weekly =
      await Lead.aggregate([

        {
          $match: match
        },

        {
          $group: {

            _id: {
              $dayOfWeek: "$createdAt"
            },

            count: {
              $sum: 1
            }

          }

        },

        {
          $sort: {
            _id: 1
          }
        }

      ]);

    const dayMap = {
      1: "Sun",
      2: "Mon",
      3: "Tue",
      4: "Wed",
      5: "Thu",
      6: "Fri",
      7: "Sat"
    };

    const weeklyData =
      weekly.map((w) => ({

        day: dayMap[w._id],

        count: w.count

      }));

    /* =====================================
       EXECUTIVE PERFORMANCE
    ===================================== */

    const executives =
      await Lead.aggregate([

        {
          $match: match
        },

        {
          $group: {

            _id: "$assigned_to",

            total: {
              $sum: 1
            },

            interested: {
              $sum: {
                $cond: [
                  {
                    $eq: ["$status", "Interested"]
                  },
                  1,
                  0
                ]
              }
            },

            booked: {
              $sum: {
                $cond: [
                  {
                    $eq: ["$status", "Booked"]
                  },
                  1,
                  0
                ]
              }
            },

            pending: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      "$status",
                      ["New", "Followup"]
                    ]
                  },
                  1,
                  0
                ]
              }
            }

          }

        },

        {
          $project: {

            name: "$_id",

            total: 1,

            interested: 1,

            booked: 1,

            pending: 1

          }

        }

      ]);

    /* =====================================
       LEAD ASSIGNMENT
    ===================================== */

    const assignments =
      await Lead.aggregate([

        {
          $match: match
        },

        {
          $group: {

            _id: "$assigned_to",

            count: {
              $sum: 1
            }

          }

        }

      ]);

    const assignmentData =
      assignments.map((a) => ({

        name: a._id || "Unassigned",

        count: a.count

      }));

    /* =====================================
       TEAM LEADERBOARD
    ===================================== */

    const leaderboard =
      [...assignmentData]

        .sort((a, b) =>
          b.count - a.count
        )

        .slice(0, 5);

    /* =====================================
       TODAY FOLLOWUPS
    ===================================== */

    const followups =
      await Lead.find({

        ...match,

        next_call_date: {

          $gte: today,

          $lt: tomorrow

        }

      })

      .select("name phone")

      .limit(10);

    /* =====================================
       MISSED FOLLOWUPS
    ===================================== */

    const missedFollowups =
      await Lead.find({

        ...match,

        next_call_date: {
          $lt: today
        },

        status: {
          $ne: "Booked"
        }

      })

      .select("name phone")

      .limit(10);

    /* =====================================
       PROJECT ANALYSIS
    ===================================== */

    const projects =
      await Lead.aggregate([

        {
          $match: match
        },

        {
          $group: {

            _id: "$project",

            count: {
              $sum: 1
            }

          }

        }

      ]);

    /* =====================================
       SOURCE ANALYSIS
    ===================================== */

    const sources =
      await Lead.aggregate([

        {
          $match: match
        },

        {
          $group: {

            _id: "$source",

            count: {
              $sum: 1
            }

          }

        }

      ]);

    /* =====================================
       REVENUE CHART
    ===================================== */

    const revenue =
      await Lead.aggregate([

        {
          $match: {

            ...match,

            status: "Booked"

          }
        },

        {
          $group: {

            _id: {
              $month: "$createdAt"
            },

            amount: {
              $sum: 50000
            }

          }

        },

        {
          $sort: {
            _id: 1
          }
        }

      ]);

    const monthMap = {
      1: "Jan",
      2: "Feb",
      3: "Mar",
      4: "Apr",
      5: "May",
      6: "Jun",
      7: "Jul",
      8: "Aug",
      9: "Sep",
      10: "Oct",
      11: "Nov",
      12: "Dec"
    };

    const revenueData =
      revenue.map((r) => ({

        month: monthMap[r._id],

        amount: r.amount

      }));

    /* =====================================
       RECENT ACTIVITIES
    ===================================== */

    const activities =
      await Lead.find(match)

        .sort({
          updatedAt: -1
        })

        .limit(10);

    const activityData =
      activities.map((a) => ({

        user:
          a.assigned_to || "Admin",

        message:
          `${a.name} marked as ${a.status}`

      }));

    /* =====================================
       FINAL RESPONSE
    ===================================== */

    res.json({

      total,

      new: newLeads,

      interested,

      booked,

      not_interested: notInterested,

      pending,

      statusData,

      executives,

      assignments: assignmentData,

      leaderboard,

      followups,

      missedFollowups,

      projects,

      sources,

      revenue: revenueData,

      activities: activityData,

      weekly: weeklyData

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({

      message:
        "Dashboard API Error ❌"

    });

  }

});
/* =========================================
   START SERVER
========================================= */

const PORT = 5000;

app.listen(PORT, "0.0.0.0", () => {

  console.log(`
🚀 Server Running:
➡️ http://localhost:${PORT}
➡️ http://192.168.29.50:${PORT}
`);

});