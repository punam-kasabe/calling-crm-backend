const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
require("dotenv").config();
const rateLimit = require("express-rate-limit");
const compression = require("compression");


const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(compression());

const allowedOrigins = [
  "https://calling-crmfrontend.vercel.app",
  "https://calling-crmfrontend-95in.vercel.app",
  "https://calling-crmfrontend-kv6d.vercel.app",
  "https://crm-frontend-4191q4glk-punam-kasabes-projects.vercel.app",
  "http://localhost:3000"
];

app.use(
  cors({
    origin: function (origin, callback) {

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("Blocked Origin:", origin);

        callback(new Error("CORS blocked ❌"));
      }

    },

    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],

    allowedHeaders: [
      "Content-Type",
      "Authorization"
    ],
    credentials: true
  })
);

app.use(express.json());

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts ❌"
});

/* =========================================
   MONGODB
========================================= */
mongoose.set("strictQuery", false);

if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI missing ❌");
}

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET missing ❌");
}

mongoose.connect(process.env.MONGO_URI)

  .then(() => {
    console.log("MongoDB Connected ✅");
  })

  .catch((err) => {
    console.log("DB Error ❌", err);
  });


  
  /* =========================================
   PHONE NORMALIZER
========================================= */

const normalizePhone = (phone) => {

  if (!phone) return "";

  // REMOVE EVERYTHING EXCEPT DIGITS
  let cleaned = String(phone)
    .replace(/\D/g, "");

  // REMOVE INDIA CODE
  if (cleaned.startsWith("91") && cleaned.length > 10) {
    cleaned = cleaned.slice(-10);
  }

  // REMOVE 0091
  if (cleaned.startsWith("0091") && cleaned.length > 10) {
    cleaned = cleaned.slice(-10);
  }

  // KEEP LAST 10 DIGITS
  if (cleaned.length > 10) {
    cleaned = cleaned.slice(-10);
  }

  return cleaned;
};


/* =========================================
   USER SCHEMA
========================================= */

const userSchema = new mongoose.Schema({

  name: String,

  email: {
    type: String,
    lowercase: true,
    trim: true,
    unique: true
  },

  phone: {
    type: String,
    trim: true
  },

  birth_date: Date,   // 👈 NEW FIELD

  password: {
    type: String,
    select: false
  },

  role: String,

  passwordChangedAt: {
  type: Date
},

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
  trim: true,
  unique: true,
  index: true
},

  email: {
    type: String,
    lowercase: true,
    trim: true
  },
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

  visitDate: {
  type: Date,
  default: null
},


assignedTo: {
  type: String,
  default: "",
  trim: true
},

  assigned_to: {
    type: String,
    lowercase: true,
    trim: true
  },

  assigned_to_email: {
  type: String,
  lowercase: true,
  trim: true,
  default: ""
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

  created_by: {
    type: String,
    default: ""
  },

  created_date: {
  type: Date,
  default: Date.now
  },


  next_call_date: {
    type: Date,
    default: null
  },

  upload_batch: {
    type: Number,
    default: 0
  },

  totalBookings: {
  type: Number,
  default: 0
  },

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


leadSchema.index({ assigned_to: 1 });
leadSchema.index({ assigned_manager: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ next_call_date: 1 });
leadSchema.index({ createdAt: -1 });

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

const callLogSchema = new mongoose.Schema(
{
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lead"
  },

  executive: String,

  phone: String,

  status: {
    type: String,
    default: "Connected"
  },

  duration: {
    type: Number,
    default: 0
  },

  startedAt: Date,

  endedAt: Date
},
{
  timestamps: true
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

const Followup = mongoose.model(
  "Followup",
  followupSchema
);

const CallLog = mongoose.model(
  "CallLog",
  callLogSchema
);

/* =========================================
   BOOKING SCHEMA
========================================= */

const bookingSchema = new mongoose.Schema({

  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lead"
  },

  clientName: String,

  phone: String,

  project: String,

  unitNo: String,

  bookingAmount: Number,

  executive: String,

  attendingOfficer: String,

  bookingDate: {
    type: Date,
    default: Date.now
  }

},{
  timestamps:true
});

const Booking =
mongoose.model(
"Booking",
bookingSchema
);

/* =========================================
   TOTAL BOOKINGS
========================================= */

app.get("/api/bookings-count", async (req, res) => {

  try {

    const totalBookings =
      await Booking.countDocuments();

    res.json({
      total: totalBookings
    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Failed"
    });

  }

});
/* =========================================
   FILE UPLOAD
========================================= */

const upload = multer({

  dest: "uploads/",

  fileFilter: (req, file, cb) => {

    if (
      file.mimetype === "text/csv" ||
      file.originalname.endsWith(".csv")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files allowed ❌"));
    }

  }

});

/* =========================================
   LOGIN
========================================= */

app.post("/api/login", loginLimiter, async (req, res) => {

  try {

    const {
      email,
      password
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email & Password required ❌"
      });
    }


    const user = await User.findOne({
      email: email.toLowerCase().trim()
    }).select("+password");


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

    if ((user.status || "").toLowerCase() !== "active") {

      return res.status(403).json({
        message: "User inactive ❌"
      });

    }





    /* =========================================
       ROLE
    ========================================= */

    const role =
      user.role?.toLowerCase();

    const isAdmin =
      role === "admin";

    /* =========================================
       LOGIN TIME CHECK
    ========================================= */

    if (!isAdmin) {

      const now = new Date();

      const indiaTime = new Date(

        now.toLocaleString("en-US", {
          timeZone: "Asia/Kolkata"
        })

      );

      const hour =
        indiaTime.getHours();

      if (hour < 10 || hour >= 19) {

        return res.status(403).json({

          message:
            "Login allowed only between 10 AM and 7 PM ❌"

        });

      }

    }

    const token = jwt.sign(

      {
        id: user._id,
        email: user.email,
        role
      },

      process.env.JWT_SECRET,

      {
        expiresIn: "7d",
        issuer: "crm-backend"
      }
    );

    res.json({

      token,

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


    app.post("/api/call/start", async (req, res) => {
  try {

    const {
      leadId,
      executive,
      phone
    } = req.body;

    const log = await CallLog.create({
      leadId,
      executive,
      phone,
      startedAt: new Date()
    });

    res.json(log);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});


app.post("/api/call/end", async (req, res) => {
  try {

    const {
      callId,
      status
    } = req.body;

    const call = await CallLog.findById(callId);

    if (!call) {
      return res.status(404).json({
        error: "Call not found"
      });
    }

    call.endedAt = new Date();

    call.status = status;

    call.duration = Math.floor(
      (call.endedAt - call.startedAt) / 1000
    );

    await call.save();

    res.json(call);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});


app.get("/api/call-history/:leadId", async (req, res) => {

  const logs = await CallLog.find({
    leadId: req.params.leadId
  }).sort({
    createdAt: -1
  });

  res.json(logs);

});



/* =========================================
   AUTH MIDDLEWARE
========================================= */

const auth = (req, res, next) => {

  try {

    const authHeader =
      req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {

      return res.status(401).json({
        message: "No token ❌"
      });

    }

    const token =
      authHeader.split(" ")[1];

    if (!token || token === "null") {

      return res.status(401).json({
        message: "Invalid token ❌"
      });

    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;

    next();

  }

  catch (err) {

    console.log(err);

    res.status(401).json({
      message: "Invalid token ❌"
    });

  }

};

const adminOnly = (req, res, next) => {

  if (
    req.user.role !== "admin" &&
    req.user.role !== "superadmin"
  ) {
    return res.status(403).json({
      message: "Admin access only"
    });
  }

  next();
};

/* =========================================
   ADD USER
========================================= */

app.post("/api/add-user", auth, adminOnly, async (req, res) => {

  try {

    const {
      name,
      email,
      phone,
      password,
      role
    } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters ❌"
      });
    }

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
   BULK ADD USERS
========================================= */

app.post("/api/bulk-add-users", auth, adminOnly, async (req, res) => {

  try {

    const users = req.body;

    if (!Array.isArray(users)) {

      return res.status(400).json({
        message: "Array required ❌"
      });

    }

    let added = 0;
    let skipped = 0;

    for (const userData of users) {

      const {
        name,
        email,
        phone,
        password,
        role,
        can_import,
        can_export,
        can_delete_lead,
        can_access_project
      } = userData;

      if (
        !name ||
        !email ||
        !password ||
        password.length < 6
      ) {
        skipped++;
        continue;
      }
      const exists = await User.findOne({
        email: email.toLowerCase().trim()
      });

      if (exists) {

        skipped++;
        continue;

      }

      const hash = await bcrypt.hash(
        password,
        10
      );

      await User.create({

        name,

        email: email.toLowerCase().trim(),

        phone: phone || "",

        password: hash,

        role: role || "Executive",

        can_import:
          Boolean(can_import),

        can_export:
          Boolean(can_export),

        can_delete_lead:
          Boolean(can_delete_lead),

        can_access_project:
          Boolean(can_access_project)

      });

      added++;

    }

    res.json({

      success: true,

      message: "Bulk users added ✅",

      added,

      skipped

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({


      message: "Bulk add failed ❌"
    });

  }

});
/* =========================================
   ALL LEADS
========================================= */

app.get("/api/all-leads", async (req, res) => {

  try {

    const leads = await Lead.find()
      .sort({ createdAt: -1 });

    res.json(leads);

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Server Error"
    });

  }

});



app.get("/api/new-leads", async (req, res) => {
  try {
    const page =
      parseInt(req.query.page) || 1;

    const limit =
      parseInt(req.query.limit) || 30;

    const skip =
      (page - 1) * limit;

    const leads = await Lead.find({
      status: "New"
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalLeads =
      await Lead.countDocuments({
        status: "New"
      });

    res.json({
      leads,
      totalLeads,
      totalPages: Math.ceil(
        totalLeads / limit
      ),
      currentPage: page
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message:
        "Error fetching new leads"
    });
  }
});
/* =========================================
   GET USERS
========================================= */

app.get("/api/all-users", auth, async (req, res) => {
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

/* ================= UPDATE USER ================= */

app.put("/api/update-user/:id", async (req, res) => {

   console.log("UPDATE BODY =", req.body);
  try {

    const updateData = {
      name: req.body.name,
      email: req.body.email,
      role: req.body.role,
      birth_date: req.body.birth_date
    };

    if (
      req.body.newPassword &&
      req.body.newPassword.trim() !== ""
    ) {

      const bcrypt =
        require("bcryptjs");

      updateData.password =
        await bcrypt.hash(
          req.body.newPassword,
          10
        );

      updateData.passwordChangedAt =
        new Date();
    }

    const user =
      await User.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );

    res.json(user);

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Update failed"
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
  auth,
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
            let duplicateLeads = [];

           for (const data of rows) {

  if (!data["Phone"]) continue;

  const phone = normalizePhone(
    data["Phone"]
  );

  /* =========================
     DUPLICATE CHECK
  ========================= */

  const existingLead = await Lead.findOne({
    phone
  });

  if (existingLead) {

    duplicateLeads.push({


      phone,

      name:
        existingLead.name || "",

      project:
        existingLead.project || "",

      assigned_to:
        existingLead.assigned_to || "",

      status:
        existingLead.status || "New"

    });

    continue;
  }

  await Lead.create({

    name:
      data["Name"] || "",

    phone,

    email:
      data["Email"] || "",

    source:
      data["Lead Source"] || "",

    project:
      data["Project"] || "",

    created_date: new Date(),

    status:
      data["Lead Status"] || "New",

   assigned_to:
  data["assigned_to"]
    ? data["assigned_to"]
        .toLowerCase()
        .trim()
    : assigned_to,

assigned_to_email:
  data["assigned_to"]
    ? data["assigned_to"]
        .toLowerCase()
        .trim()
    : assigned_to,

    created_by

  });

  inserted++;

}           fs.unlinkSync(
              req.file.path
            );

            res.json({

              success: true,

              message:
                "Upload Success ✅",

              inserted,

              duplicates:
                duplicateLeads

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

     const lead = await Lead.findOne({
     phone: normalizePhone(req.params.phone)
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
        bookingStatus,
        calling_by,
        remark,
        assigned_manager
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

       phone: normalizePhone(mobile)
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

          phone: normalizePhone(mobile),
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

      const results = [];

      fs.createReadStream(req.file.path)

        .pipe(csv())

        .on("data", (row) => {

          // EMPTY ROW SKIP
          if (
            !row.phone &&
            !row.Phone &&
            !row.PHONE
          ) {
            return;
          }

          results.push(row);

        })

        .on("end", async () => {

          try {

            let updated = 0;
            let skipped = 0;
            let duplicates = [];

            for (const row of results) {

             /* ======================================
              CLEAN PHONE
               ====================================== */

const rawPhone =
  row["phone"] ||
  row["Phone"] ||
  row["PHONE"] ||
  "";

const phone = normalizePhone(rawPhone);

console.log("INSERT PHONE =>", phone);

/* ======================================
   DUPLICATE CHECK
====================================== */

const projectName =
  row["Enquiry"] ||
  row["Project"] ||
  "";

const existingLead = await Lead.findOne({

  phone,

  project: {
    $regex: new RegExp(
      `^${projectName.trim()}$`,
      "i"
    )
  }

});

if (existingLead) {

duplicates.push({
  phone,

  name:
    existingLead.name ||
    row["name"] ||
    row["Name"] ||
    "No Name",

  email:
    existingLead.email || "",

  project:
    existingLead.project ||
    row["Project"] ||
    row["Enquiry"] ||
    "Unknown Project",

  assigned_to:
  existingLead.assigned_to_email ||
  existingLead.assigned_to ||
  "Unassigned",

  status:
    existingLead.status || "New"

});
  skipped++;

  continue;
}
  await Lead.create({

  name: row["name"] || "",

  phone: normalizePhone(rawPhone),

  email: row["Email"] || "",

  source: row["Lead Source"] || "",

  subSource: row["Sub Source"] || "",

  project:
    row["Enquiry"] ||
    row["Project"] ||
    "",

  status:
    row["Lead Status"] || "New",

  assigned_to:
    row["assigned_to"]
      ?.toLowerCase()
      ?.trim() || "",

  closingExecutive:
    row["Closing Executive"] || "",

  description:
    row["Description"] || ""

         });

        updated++;


        
            }

            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
            }
            res.json({

              success: true,

              updated,

              skipped,

              duplicates

            });
          }

          catch (err) {

            console.log("BULK UPDATE INNER ERROR ❌", err);

            res.status(500).json({
              message: err.message
            });

          }

        });

    }

    catch (err) {

      console.log("BULK UPDATE ERROR ❌", err);

      res.status(500).json({
        message: err.message
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
      assigned_to_email,
      closingExecutive,
      description,
      remark,
      next_call_date
    } = req.body;

    /* REQUIRED ONLY */

    if (!name || !phone) {

      return res.status(400).json({
        message: "Name & Phone required ❌"
      });

    }


    const cleanPhone = normalizePhone(phone);
  
    const lead = await Lead.create({

      name: name.trim(),


      phone: cleanPhone,

      email: email || "",

      source: source || "",

      subSource: subSource || "",

      project: project || "",

      status: status || "New",

      assignedTo:
  assignedTo || "",

assigned_to:
  assigned_to_email
    ?.toLowerCase()
    ?.trim() ||

  assignedTo
    ?.toLowerCase()
    ?.trim() ||

  "",

assigned_to_email:
  assigned_to_email
    ?.toLowerCase()
    ?.trim() ||

  assignedTo
    ?.toLowerCase()
    ?.trim() ||

  "",
      
      closingExecutive:
        closingExecutive || "",

      description:
        description || "",

      remark:
        remark || "",

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

    if (err.code === 11000) {

      return res.status(400).json({
        message: "Phone already exists ❌"
      });

    }

    res.status(500).json({
      message: "Add lead failed ❌"
    });

  }

});
/* =========================================
   EXECUTIVE LEADS
========================================= */

app.get("/api/executive-leads", async (req, res) => {

  try {

    const email = req.query.email
      ?.toLowerCase()
      .trim();

    const leads = await Lead.find({

      $or: [
        { assigned_to: email },
        { assigned_to_email: email }
      ]

    }).sort({

      createdAt: -1

    });

    res.json(leads);

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Fetch error ❌"
    });

  }

});



/* =========================================
   MY LEADS
========================================= */

app.get("/api/my-leads", async (req, res) => {

  try {

    const email = req.query.email
      ?.toLowerCase()
      .trim();

    if (!email) {

      return res.status(400).json({
        message: "Email required ❌"
      });

    }


    const leads =
  await Lead.find({

    $and: [

      {
        $or: [

          {
            assigned_to_email:
              email
          },

          {
            assignedTo:
              user?.name
          }

        ]
      },

      {
        status: {
          $in: [
            "Interested",
            "Very Interested"
          ]
        }
      }

    ]

  }).sort({
    createdAt: -1
  });



    res.json(leads);

  }


  catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Server Error ❌"
    });

  }

});


/* =========================================
   GET ALL USERS
========================================= */

app.get("/api/users", async (req, res) => {

  try {

    const users = await User.find(
      {},
      {
        password: 0
      }
    );

    res.json(users);

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Server Error ❌"
    });

  }

});


/* =========================================
   MANAGER CLIENTS
========================================= */

app.get("/api/manager-clients", async (req, res) => {

  try {

    const email =
      req.query.email
        ?.toLowerCase()
        .trim();

    const user =
      await User.findOne({
        email
      });

    const leads =
      await Lead.find({

        $or: [

          {
            assigned_to_email:
              email
          },

          {
            assignedTo:
              user?.name
          }

        ]

      }).sort({
        createdAt: -1
      });

    res.json(leads);

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Server Error"
    });

  }

});

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
  followup_date,
  visitDate,
  visit_created

} = req.body;

      const updated =
        await Lead.findByIdAndUpdate(

          req.params.id,

          {

            status,
    remark,
    followup_date,
    visitDate,
    visit_created

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
  filters = {},
  search = ""
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

      if (
  filters.status &&
  filters.status.length > 0
) {
  query.status = {
    $in: filters.status.map(
      (s) => s.value
    )
  };
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

      /* SEARCH */

if (search && search.trim()) {

  query.$or = [

    {
      name: {
        $regex: search.trim(),
        $options: "i"
      }
    },

    {
      phone: {
        $regex: search.trim(),
        $options: "i"
      }
    },

    {
      project: {
        $regex: search.trim(),
        $options: "i"
      }
    },

    {
      status: {
        $regex: search.trim(),
        $options: "i"
      }
    },

    {
      assigned_to: {
        $regex: search.trim(),
        $options: "i"
      }
    },

    {
      assigned_manager: {
        $regex: search.trim(),
        $options: "i"
      }
    }

  ];

}


      const total =
        await Lead.countDocuments(
          query
        );

        const totalLeads =
      await Lead.countDocuments();

      const hotLeads = await Lead.countDocuments({
  status: "Interested"
});

const newLeads = await Lead.countDocuments({
  status: "New"
});

const bookedLeads = await Lead.countDocuments({
  status: "Booked"
});

const inactiveLeads = await Lead.countDocuments({
  status: "Not Interested"
});

const today = new Date();
today.setHours(0, 0, 0, 0);

const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const todayFollowups = await Lead.countDocuments({
  next_call_date: {
    $gte: today,
    $lt: tomorrow
  }
});

const backlog = await Lead.countDocuments({
  $or: [
    { next_call_date: null },
    { next_call_date: { $exists: false } }
  ]
});
      const leads =
        await Lead.find(query)

          .sort({
            _id: -1
          })

          .skip(skip)

          .limit(limit);

      res.json({
  data: leads,
  total,
  totalPages: Math.ceil(total / limit),
  totalLeads,
  hotLeads,
  newLeads,
  bookedLeads,
  inactiveLeads,
  todayFollowups,
  backlog
});
    }

    catch {

      res.status(500).json({
        message: "Filter error ❌"
      });

    }

  }

);


app.get("/api/all-leads", async (req, res) => {
  try {

    const leads = await Lead.find({})
      .sort({ createdAt: -1 });

    res.json(leads);

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Error fetching leads"
    });

  }
});
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
   GET BOOKING COUNT
========================================= */

app.get(
  "/api/booking-count",
  async (req, res) => {

    try {

      const count =
        await Booking.countDocuments();

      res.json({
        total: count
      });

    }

    catch (err) {

      console.log(err);

      res.status(500).json({
        message: "Failed"
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

app.delete("/api/delete-lead/:id", auth, adminOnly, async (req, res) => {

  try {

    console.log("DELETE REQUEST");
    console.log("Lead ID:", req.params.id);
    console.log("User:", req.user);

    const deletedLead =
      await Lead.findByIdAndDelete(req.params.id);

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

    console.log("DELETE ERROR:", err);

    res.status(500).json({
      message: "Delete failed ❌"
    });

  }

});


/* =========================================
   DELETE MULTIPLE LEADS
========================================= */

app.post(
  "/api/delete-multiple-leads",
  auth,
  adminOnly,

  async (req, res) => {

    try {

      const { ids } = req.body;

      if (!ids || !Array.isArray(ids)) {

        return res.status(400).json({
          message: "IDs array required ❌"
        });

      }

      await Lead.deleteMany({
        _id: { $in: ids }
      });

      res.json({
        success: true,
        message: "Selected leads deleted ✅"
      });

    }

    catch (err) {

      console.log(err);

      res.status(500).json({
        message: "Bulk delete failed ❌"
      });

    }

  }

);

/* =========================================
   GET LEAD BOOKINGS
========================================= */

app.get(
"/api/lead-bookings/:leadId",

async(req,res)=>{

try{

const bookings =
await Booking.find({

leadId:
req.params.leadId

})
.sort({
createdAt:-1
});

res.json(bookings);

}catch(err){

console.log(err);

res.status(500).json({
message:"Failed"
});

}

});


/* =========================================
   CREATE BOOKING
========================================= */

app.post(
"/api/create-booking",
async(req,res)=>{

try{

const booking =
await Booking.create({

leadId:
req.body.leadId,

clientName:
req.body.clientName,

phone:
req.body.phone,

project:
req.body.project,

unitNo:
req.body.unitNo,

bookingAmount:
req.body.bookingAmount,

executive:
req.body.executive,

attendingOfficer:
req.body.attendingOfficer

});

await Lead.findByIdAndUpdate(
req.body.leadId,
{
$inc:{
totalBookings:1
}
}
);

res.json({
success:true,
booking
});

}catch(err){

console.log(err);

res.status(500).json({
message:"Booking failed"
});

}

});
/* =========================================
   BOOKING HISTORY
========================================= */

app.get(
  "/api/bookings/:leadId",

  async (req, res) => {

    try {

      const bookings =
        await Booking.find({

          leadId:
            req.params.leadId

        }).sort({
          createdAt: -1
        });

      res.json(bookings);

    }

    catch (err) {

      console.log(err);

      res.status(500).json({
        message: "Error"
      });

    }

  }

);
/* =========================================
   GET LEAD BOOKINGS
========================================= */

app.get(
"/api/lead-bookings/:leadId",

async(req,res)=>{

try{

const bookings =
await Booking.find({

leadId:
req.params.leadId

})
.sort({
createdAt:-1
});

res.json(bookings);

}catch(err){

console.log(err);

res.status(500).json({
message:"Failed"
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
   TODAY SITE VISITS
========================================= */

app.get(
  "/api/today-site-visits/:email",

  async (req, res) => {

    try {

      const today =
      new Date();

      today.setHours(
        0,0,0,0
      );

      const tomorrow =
      new Date(today);

      tomorrow.setDate(
        tomorrow.getDate() + 1
      );

      const visits =
      await Lead.find({

        assigned_to:
          req.params.email
            .toLowerCase(),

        visitDate: {

          $gte: today,

          $lt: tomorrow

        }

      });

      res.json(visits);

    }

    catch (err) {

      console.log(err);

      res.status(500).json({
        message:
          "Site visit fetch failed"
      });
    }
  }
);
/* =========================================
   MY FOLLOWUPS
========================================= */

app.get("/api/my-followups", async (req, res) => {

  try {

    const email = req.query.email
      ?.toLowerCase()
      .trim();

    const leads = await Lead.find({

      assigned_to: email,

      next_call_date: {
        $ne: null
      }

    }).sort({

      next_call_date: 1

    });

    res.json(leads);

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Followups fetch failed ❌"
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

                /* TODAY SITE VISITS */

      const todaySiteVisits =
        await Visit.find({

          calling_by: {
            $in: [email]
          },

          visitDate: {

            $gte: today,

            $lt: tomorrow

          }

        })

          .sort({
            visitDate: 1
          })

          .limit(10)
          .select(
            "clientName mobile project visitDate"
          );

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
        todayFollowupsList,
         todaySiteVisits
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

  const user = await User.findOne({
    email
  });

  match = {
    $or: [
      {
        assigned_to_email: email
      },
      {
        assignedTo: user?.name
      }
    ]
  };

}

    console.log("================================");
    console.log("EMAIL =>", email);
    console.log("ROLE =>", role);
    console.log("MATCH =>", match);
    console.log("================================");

    const total = await Lead.countDocuments(match);


    console.log("TOTAL LEADS =>", total);
    const newLeads = await Lead.countDocuments({
      ...match,
      status: "New"
    });

    const booked = await Lead.countDocuments({
  $and: [
    match,
    { status: "Booked" }
  ]
});

    const interested = await Lead.countDocuments({
  $and: [
    match,
    { status: "Interested" }
  ]
});


const pending = await Lead.countDocuments({
  $and: [
    match,
    {
      $or: [
        { status: "New" },
        { status: "" },
        { status: null }
      ]
    }
  ]
});

const visits = await Lead.countDocuments({
  $and: [
    match,
    {
      visit_created: true
    }
  ]
});

const siteVisit = await Lead.countDocuments({
  ...match,
  visit_created: true
});
const today = new Date();
today.setHours(0,0,0,0);

const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);

const followups = await Lead.countDocuments({
  $and: [
    match,
    {
      followup_date: {
        $gte: today,
        $lt: tomorrow
      }
    }
  ]
});

   const notInterested = await Lead.countDocuments({
  $and: [
    match,
    { status: "Not Interested" }
  ]
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



/* RECENT LEADS */

const recentLeads = await Lead.find(match)

  .sort({
    createdAt: -1
  })

  .limit(10)

  .select(
    "name phone status assigned_to createdAt"
  );

    res.json({

      total,
      siteVisit,
      new: newLeads,
      booked,
      interested,
      not_interested: notInterested,
      status,
      recentLeads,
      pending,
      visits,
      followups
    });

  }

catch (err) {

  console.log("DASHBOARD ERROR ❌");
  console.log(err);

  res.status(500).json({
    message: err.message
  });

}
});

/* =========================================
   CREATE PROJECT
========================================= */

app.post("/api/projects", auth, adminOnly, async (req, res) => {
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

app.put("/api/projects/:id", auth, adminOnly, async (req, res) => {
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

app.delete("/api/projects/:id", auth, adminOnly, async (req, res) => {
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
                      GET FOLLOWUPS
     ========================================= */

app.get("/api/followups/:id", async (req, res) => {

  try {

    const user = await User.findById(
      req.params.id
    );

    if (!user) {

      return res.status(404).json({
        message: "User not found ❌"
      });

    }

    const email = user.email
      ?.toLowerCase()
      .trim();

    const followups = await Lead.find({

      assigned_to: email,

      status: "Followup"

    }).sort({

      followup_date: 1

    });

    res.json(followups);

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Followups fetch failed ❌"
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

    status: {
      $regex: /^new$/i
    }
  });
   
    const booked =
      await Lead.countDocuments({

        ...match,

        status: "Booked"

      });

      const interested =
  await Lead.countDocuments({

    ...match,

    status: "Interested"

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

      const newCount =
  await Lead.countDocuments({
    status: { $regex: /^new$/i }
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

    /* =========================================
   TODAY FOLLOWUPS
========================================= */

app.get(
  "/api/today-followups/:email",
  async (req, res) => {

    try {

      const today = new Date();
      today.setHours(0,0,0,0);

      const tomorrow =
        new Date(today);

      tomorrow.setDate(
        tomorrow.getDate() + 1
      );

      const leads =
        await Lead.find({

          assigned_to_email:
            req.params.email,

          followup_date: {

            $gte: today,
            $lt: tomorrow

          }

        });

      res.json(leads);

    }

    catch(err){

      console.log(err);

      res.status(500).json({
        message:"Error"
      });

    }

  }
);

       
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
   GLOBAL ERROR HANDLER
========================================= */

app.use((err, req, res, next) => {

  console.log("GLOBAL ERROR ❌", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Server Error ❌"
  });

});
/* =========================================
   START SERVER
========================================= */


process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION ❌", err);
});

process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION ❌", err);
});

const PORT = process.env.PORT || 5000;

/* =========================================
   99ACRES WEBHOOK
========================================= */

app.post("/api/99acres-webhook", async (req, res) => {

  try {

    console.log("99acres Lead =>", req.body);

    const data = req.body;

    /* =========================
       NORMALIZE PHONE
    ========================= */

    const phone = normalizePhone(
      data.phone || data.mobile || ""
    );

    /* =========================
       DUPLICATE CHECK
    ========================= */

    const exists = await Lead.findOne({
      phone
    });

    if (exists) {

      return res.json({
        success: true,
        message: "Duplicate skipped"
      });

    }

    /* =========================
       CREATE LEAD
    ========================= */

    const lead = await Lead.create({

      name:
        data.name ||
        data.customer_name ||
        "",

      phone,

      email:
        data.email || "",

      source: "99acres",

      subSource: "99acres",

      project:
        data.project ||
        data.project_name ||
        "",

      status: "New",

      assigned_to: "",

      created_by: "99acres"

    });

    res.json({

      success: true,

      message: "Lead Added ✅",

      lead

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Webhook failed ❌"
    });

  }

});


app.get("/", (req, res) => {
  res.send("CRM Backend Running ✅");
});
app.listen(PORT, () => {

  console.log(`🚀 Server Running On Port ${PORT}`);

});