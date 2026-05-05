const mongoose = require("mongoose");

const visitSchema = new mongoose.Schema(
  {
    // 🔥 BASIC DETAILS
    clientName: {
      type: String,
      required: true,
    },

    mobile: {
      type: String,
      required: true,
    },

    project: {
      type: String,
      required: true,
    },

    // 🔥 MANAGER
    attendedManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // or "Manager" (as per your DB)
      default: null,
    },

    assigned_manager: {
      type: String, // manager email
      default: "",
    },

    // 🔥 VISIT STATUS
    visitStatus: {
      type: String,
      enum: [
        "IN_OFFICE",
        "VISIT_DONE",
        "BOOKED",
        "FOLLOWUP",
        "NOT_BOOKED",
      ],
      default: "IN_OFFICE",
    },

    // 🔥 BOOKING STATUS
    bookingStatus: {
      type: String,
      enum: [
        "PENDING",
        "BOOKED",
        "NOT_BOOKED",
      ],
      default: "PENDING",
    },

    // 🔥 CALLING BY (MULTIPLE EXECUTIVES)
    calling_by: [
      {
        type: String, // storing names like "Vrushali"
      },
    ],

    // 🔥 REMARK
    remark: {
      type: String,
      default: "",
    },

    // 🔥 DATES
    visitDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt auto
  }
);

module.exports = mongoose.model("Visit", visitSchema);