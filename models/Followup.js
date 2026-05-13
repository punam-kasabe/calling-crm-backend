const mongoose = require("mongoose");

const followupSchema = new mongoose.Schema({

  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lead",
  },

  clientName: String,

  phone: String,

  project: String,

  note: String,

  followup_date: Date,

  executive: String,

  createdAt: {
    type: Date,
    default: Date.now,
  },

});

module.exports =
  mongoose.model(
    "Followup",
    followupSchema
  );