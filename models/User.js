const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: [
        "Admin",
        "Super Administrator",
        "Manager",
        "Executive"
      ],
      default: "Executive",
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    permissions: {
      can_import: { type: Boolean, default: false },
      can_export: { type: Boolean, default: false },
      can_delete_lead: { type: Boolean, default: false },
      can_access_project: { type: Boolean, default: false },
      lead_creation_disabled: { type: Boolean, default: false },
      lead_edit_disabled: { type: Boolean, default: false },
    },

    created_at: {
      type: Date,
      default: Date.now,
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);