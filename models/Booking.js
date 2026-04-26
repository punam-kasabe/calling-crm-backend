const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
    },

    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    bookingAmount: Number,

    bookingStatus: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Booking", bookingSchema);