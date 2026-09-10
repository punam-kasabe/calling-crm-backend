const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: ""
    },

    customer_name: {
      type: String,
      trim: true,
      default: ""
    },

    phone: {
      type: String,
      trim: true,
      index: true,
      default: ""
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ""
    },

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

    project: {
      type: String,
      trim: true,
      default: ""
    },

    status: {
      type: String,
      trim: true,
      default: "New"
    },

    description: {
      type: String,
      trim: true,
      default: ""
    },

    assignedTo: {
      type: String,
      trim: true,
      default: ""
    },

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
      index: true,
      default: ""
    },

    executive_email: {
      type: String,
      lowercase: true,
      trim: true,
      default: ""
    },

    closingExecutive: {
      type: String,
      trim: true,
      default: ""
    },

    created_by: {
      type: String,
      lowercase: true,
      trim: true,
      default: ""
    },

    next_call_date: {
      type: Date,
      default: null
    },

    assignedDate: {
      type: Date,
      default: null
    },

    bookingDate: {
      type: Date,
      default: null
    },

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

    upload_batch: {
      type: Number,
      index: true
    },

    visit_created: {
      type: Boolean,
      default: false
    },

    visit_status: {
      type: String,
      default: ""
    },

    booking_status: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

/*
=========================================
INDEXES
=========================================
*/

leadSchema.index({
  assigned_to_email: 1,
  status: 1
});

leadSchema.index({
  assigned_to: 1,
  status: 1
});

leadSchema.index({
  phone: 1
});

leadSchema.index({
  next_call_date: 1
});

leadSchema.index({
  assignedDate: 1
});

module.exports = mongoose.model("Lead", leadSchema);