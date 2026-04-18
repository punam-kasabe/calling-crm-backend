const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema({
  name: String,
  phone: String,
  email: String,
  source: String,
  status: String,
  assigned_to: String,
  created_by: String,
  upload_batch: String,
  project: String,
  next_call_date: String,
}, { timestamps: true });

module.exports = mongoose.model("Lead", leadSchema);