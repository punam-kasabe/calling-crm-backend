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
        bookingStatus

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

        existingLead.assigned_manager =
          manager?.email || "";

        existingLead.visit_created =
          true;

        existingLead.visit_status =
          visitStatus;

        await existingLead.save();

      }

      /* ===============================
         CREATE NEW LEAD
      =============================== */

      else {

        await Lead.create({

          name: clientName,

          phone: mobile,

          project,

          status: "Followup",

          assigned_manager:
            manager?.email || "",

          visit_created: true,

          visit_status: visitStatus

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
   DASHBOARD
========================================= */

app.get(
  "/api/dashboard",

  async (req, res) => {

    try {

      const email =
        req.query.email
          ?.toLowerCase();

      const role =
        req.query.role
          ?.toLowerCase();

      let match = {};

      if (
        role ===
        "executive"
      ) {

        match.assigned_to =
          email;

      }

      if (
        role ===
        "manager"
      ) {

        match.assigned_manager =
          email;

      }

      const summary =
        await Lead.aggregate([

          {
            $match: match
          },

          {
            $group: {

              _id: null,

              total: {
                $sum: 1
              },

              booked: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$status",
                        "Booked"
                      ]
                    },
                    1,
                    0
                  ]
                }
              }

            }

          }

        ]);

      res.json(

        summary[0] || {

          total: 0,

          booked: 0

        }

      );

    }

    catch {

      res.status(500).json({
        message: "Dashboard error ❌"
      });

    }

  }

);

/* =========================================
   START SERVER
========================================= */

app.listen(5000, () => {

  console.log(
    "Server running 🚀"
  );

});