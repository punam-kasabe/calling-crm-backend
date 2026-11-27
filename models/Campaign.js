const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema(
  {
    campaignName: {
      type: String,
      required: true,
      trim: true
    },

    project: {
      type: String,
      default: "",
      trim: true
    },

    source: {
      type: String,
      default: "Facebook",
      trim: true
    },

    meta_campaign_id: {
      type: String,
      default: "",
      trim: true
    },

    autoCampaign: {
      type: Boolean,
      default: false
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Campaign", campaignSchema);