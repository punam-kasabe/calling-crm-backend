const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    customer_name: {
      type: String,
      trim: true
    },

    phone: {
      type: String,
      trim: true,
      index: true
    },

    email: {
      type: String,
      trim: true,
      lowercase: true
    },

    source: {
      type: String,
      trim: true,
      default: ""
    },

    status: {
      type: String,
      trim: true,
      default: "New",
      index: true,

      enum: [
        "New",
        "Fresh",

        "Ringing",
        "Connected",

        "Interested",
        "Very Interested",

        "Old Booking From Old Data",

        "Not Interested",

        "Call Cut",
        "Busy",
        "Call Back",
        "Switched Off",
        "Switch Off",

        "Number Not Reachable",
        "Invalid Number",
        "Wrong Number",
        "Duplicate Lead",

        "Follow Up",
        "Followup",
        "Follow Up Done",

        "Meeting Scheduled",

        "Site Visit Planned",
        "Site Visit Done",

        "Negotiation",
        "Payment Pending",

        "Booked",
        "Other Property Booked",
        "Token Received",

        "Cancelled",
        "Future Prospect",
        "No Response",

        "Decision Pending",
        "Site Visit Pending",

        "Direct Site Visit",
        "Office visit",
        "Out of Service"
      ]
    },

    assigned_to: {
      type: String,
      lowercase: true,
      trim: true,
      index: true
    },

    created_by: {
      type: String,
      lowercase: true,
      trim: true
    },

    upload_batch: {
      type: Number,
      index: true
    },

    project: {
      type: String,
      trim: true,
      default: "",
      index: true
    },

    next_call_date: {
      type: Date,
      index: true
    }
  },
  {
    timestamps: true
  }
);


// =====================================================
// PERFORMANCE INDEXES
// =====================================================

// Executive + Status
leadSchema.index({
  assigned_to: 1,
  status: 1
});

// Executive + Latest Leads
leadSchema.index({
  assigned_to: 1,
  createdAt: -1
});

// Status + Latest Leads
leadSchema.index({
  status: 1,
  createdAt: -1
});

// Project + Latest Leads
leadSchema.index({
  project: 1,
  createdAt: -1
});

// Source filtering
leadSchema.index({
  source: 1
});

// Next Call Date filtering
leadSchema.index({
  next_call_date: 1
});


// =====================================================
// MODEL
// =====================================================

const Lead =
  mongoose.models.Lead ||
  mongoose.model("Lead", leadSchema);

module.exports = Lead;
