const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema({
  customer_name: {
    type: String,
    trim: true
  },

  phone: {
    type: String,
    trim: true,
    index: true // 🔥 fast search
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
    default: "New",
    enum: ["New", "Interested", "Not Interested", "Booked"] // 🔥 control values
  },

  assigned_to: {
    type: String,
    lowercase: true,
    trim: true,
    index: true // 🔥 executive filtering fast
  },

  created_by: {
    type: String,
    lowercase: true,
    trim: true
  },

  upload_batch: {
    type: Number, // 🔥 number better than string
    index: true
  },

  project: {
    type: String,
    trim: true,
    default: ""
  },

     // ======================================
  // FACEBOOK META TRACKING
  // ======================================

  meta_lead_id: {
    type: String,
    default: "",
    index: true
  },

  meta_page_id: {
    type: String,
    default: ""
  },

  meta_page_name: {
    type: String,
    default: ""
  },

  meta_campaign_id: {
    type: String,
    default: ""
  },

  meta_campaign_name: {
    type: String,
    default: ""
  },

     ad_id: {
    type: String,
    default: ""
  },

  ad_name: {
    type: String,
    default: ""
  },

  meta_campaign_lookup_status: {
    type: String,
    default: ""
  },
  
  meta_form_id: {
    type: String,
    default: ""
  },

  meta_ad_id: {
    type: String,
    default: ""
  },

  meta_created_time: {
    type: Date,
    default: null
  },

  meta_field_data: {
    type: Array,
    default: []
  },
  
  next_call_date: {
  type: Date,
  index: true // 🔥 fast date filtering
}

}, { timestamps: true });

/* 🔥 Compound Index (powerful for dashboard) */
leadSchema.index({ assigned_to: 1, status: 1 });

module.exports = mongoose.model("Lead", leadSchema);