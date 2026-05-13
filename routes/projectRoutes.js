// FILE: routes/projectRoutes.js

const express = require("express");

const router = express.Router();

/* =========================================
   CONTROLLERS
========================================= */

const {

  createProject,

  getProjects,

  updateProject,

  deleteProject

} = require("../controllers/projectController");

/* =========================================
   PROJECT ROUTES
========================================= */

/* CREATE PROJECT */

router.post(
  "/projects",
  createProject
);

/* GET ALL PROJECTS */

router.get(
  "/projects",
  getProjects
);

/* UPDATE PROJECT */

router.put(
  "/projects/:id",
  updateProject
);

/* DELETE PROJECT */

router.delete(
  "/projects/:id",
  deleteProject
);

module.exports = router;