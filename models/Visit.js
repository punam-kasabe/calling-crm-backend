const mongoose = require("mongoose");

const visitSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
    },

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

    attendedManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    receptionUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    /* 🔥 VISIT STATUS */

    visitStatus: {
      type: String,

      enum: [
        "VISIT_SCHEDULED",
        "IN_OFFICE",
        "SITE_VISIT_DONE",
        "BOOKING_DONE",
      ],

      default: "VISIT_SCHEDULED",
    },

    /* 🔥 BOOKING STATUS */

    bookingStatus: {
      type: String,

      enum: [
        "PENDING",
        "INTERESTED",
        "FOLLOWUP",
        "BOOKED",
        "NOT_INTERESTED",
      ],

      default: "PENDING",
    },

    /* 🔥 REMARKS */

    remarks: {
      type: String,
      default: "",
    },

    /* 🔥 SITE VISIT DATE */

    siteVisitDate: {
      type: Date,
      default: null,
    },

    /* 🔥 BOOKING DATE */

    bookingDate: {
      type: Date,
      default: null,
    },

    /* 🔥 CREATED DATE */

    visitDate: {
      type: Date,
      default: Date.now,
    },
  },

  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Visit",
  visitSchema
);