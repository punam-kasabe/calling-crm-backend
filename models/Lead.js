const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    /* =========================================
       CUSTOMER DETAILS
    ========================================= */

    customer_name: {
      type: String,
      trim: true,
      default: ""
    },

    // My Leads frontend मध्ये name वापरत असेल तर
    name: {
      type: String,
      trim: true,
      default: ""
    },

    phone: {
      type: String,
      trim: true,
      index: true
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ""
    },

    /* =========================================
       SOURCE
    ========================================= */

    source: {
      type: String,
      trim: true,
      default: ""
    },

    subSource: {
      type: String,
      trim: true,
      default: ""
    },

    /* =========================================
       STATUS
    ========================================= */

    status: {
      type: String,

      default: "New",

      enum: [
        "New",
        "Ringing",
        "Connected",
        "Interested",
        "Old Booking From Old Data",
        "Old Site Visit",
        "Very Interested",
        "Out of Service",
        "Not Interested",
        "Call Cut",
        "Busy",
        "Call Back",
        "Switched Off",
        "Number Not Reachable",
        "Wrong Number",
        "Invalid Number",
        "Duplicate Lead",
        "Follow Up",
        "Follow Up Done",
        "Meeting Scheduled",
        "Site Visit Planned",
        "Site Visit Done",
        "Negotiation",
        "Payment Pending",
        "Booked",
        "Already Booked But 7/12 Pending",
        "Documents Pending",
        "Other Property Booked",
        "Token Received",
        "Cancelled",
        "Future Prospect",
        "No Response"
      ]
    },

    /* =========================================
       ASSIGNMENT
    ========================================= */

    assigned_to: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
      default: ""
    },

    assigned_to_email: {
      type: String,
      lowercase: true,
      trim: true,
      default: ""
    },

    assignedTo: {
      type: String,
      trim: true,
      default: ""
    },

    assignedDate: {
      type: Date,
      default: null
    },

    /* =========================================
       CLOSING EXECUTIVE
    ========================================= */

    closingExecutive: {
      type: String,
      trim: true,
      default: ""
    },

    executive_email: {
      type: String,
      lowercase: true,
      trim: true,
      default: ""
    },

    /* =========================================
       CREATED BY
    ========================================= */

    created_by: {
      type: String,
      lowercase: true,
      trim: true,
      default: ""
    },

    /* =========================================
       UPLOAD BATCH
    ========================================= */

    upload_batch: {
      type: Number,
      index: true
    },

    /* =========================================
       PROJECT
    ========================================= */

    project: {
      type: String,
      trim: true,
      default: ""
    },

    /* =========================================
       CITY / DEPARTMENT
    ========================================= */

    city: {
      type: String,
      trim: true,
      default: ""
    },

    department: {
      type: String,
      trim: true,
      default: ""
    },

    /* =========================================
       DESCRIPTION
    ========================================= */

    description: {
      type: String,
      trim: true,
      default: ""
    },

    /* =========================================
       NEXT CALL
    ========================================= */

    next_call_date: {
      type: Date,
      default: null
    },

    /* =========================================
       DEAD / NOT INTERESTED
    ========================================= */

    deadReason: {
      type: String,
      trim: true,
      default: ""
    },

    deadSubReason: {
      type: String,
      trim: true,
      default: ""
    },

    /* =========================================
       BOOKING
    ========================================= */

    bookingDate: {
      type: Date,
      default: null
    },

    /* =========================================
       ACTIVITY
    ========================================= */

    last_activity_by: {
      type: String,
      trim: true,
      default: ""
    },

    last_activity_date: {
      type: Date,
      default: null
    },

    /* =========================================
       VISIT
    ========================================= */

    visit_created: {
      type: Boolean,
      default: false
    },

    visit_status: {
      type: String,
      trim: true,
      default: ""
    },

    /* =========================================
       REMARK
    ========================================= */

    remark: {
      type: String,
      trim: true,
      default: ""
    }
  },

  {
    timestamps: true
  }
);


/* =========================================
   INDEXES
========================================= */

// Executive-wise filtering
leadSchema.index({
  assigned_to: 1,
  status: 1
});

// Fast filtering by manager/executive
leadSchema.index({
  assigned_to_email: 1,
  status: 1
});

// Next call date filtering
leadSchema.index({
  next_call_date: 1
});

// Created date filtering
leadSchema.index({
  createdAt: -1
});


/* =========================================
   MODEL
========================================= */

module.exports =
  mongoose.models.Lead ||
  mongoose.model("Lead", leadSchema);