// FILE: backend/server.js

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
      "Booked"

    ]

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

          assigned_to: email

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

        recentLeads

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
   START SERVER
========================================= */

app.listen(5000, () => {

  console.log(
    "Server running 🚀"
  );

});