
const mongoose = require("mongoose");

/* =========================================
   PROJECT SCHEMA
========================================= */

const projectSchema = new mongoose.Schema(

  {

    name: {
      type: String,
      required: true,
      trim: true
    },

    city: {
      type: String,
      default: ""
    },

    address: {
      type: String,
      default: ""
    },

    projectId: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    description: {
      type: String,
      default: ""
    },

    active: {
      type: Boolean,
      default: true
    }

  },

  {
    timestamps: true
  }

);

/* =========================================
   EXPORT MODEL
========================================= */

module.exports = mongoose.model(
  "Project",
  projectSchema
);