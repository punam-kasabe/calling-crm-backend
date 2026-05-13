
const Project = require("../models/Project");

/* =========================================
   CREATE PROJECT
========================================= */

exports.createProject = async (req, res) => {

  try {

    const {
      name,
      city,
      address,
      projectId,
      description,
      active
    } = req.body;

    /* VALIDATION */

    if (!name || !projectId) {

      return res.status(400).json({
        message: "Name & Project ID required ❌"
      });

    }

    const cleanProjectId =
      projectId
        .trim()
        .toLowerCase();

    /* CHECK EXIST */

    const exists =
      await Project.findOne({
        projectId: cleanProjectId
      });

    if (exists) {

      return res.status(400).json({
        message: "Project already exists ❌"
      });

    }

    /* CREATE */

    const project =
      await Project.create({

        name,

        city,

        address,

        projectId: cleanProjectId,

        description,

        active

      });

    res.json({

      success: true,

      message: "Project created ✅",

      data: project

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Create project failed ❌"
    });

  }

};

/* =========================================
   GET PROJECTS
========================================= */

exports.getProjects = async (req, res) => {

  try {

    const projects =
      await Project.find()
        .sort({
          createdAt: -1
        });

    res.json({

      success: true,

      data: projects

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Fetch projects failed ❌"
    });

  }

};

/* =========================================
   UPDATE PROJECT
========================================= */

exports.updateProject = async (req, res) => {

  try {

    const updated =
      await Project.findByIdAndUpdate(

        req.params.id,

        req.body,

        {
          new: true
        }

      );

    if (!updated) {

      return res.status(404).json({
        message: "Project not found ❌"
      });

    }

    res.json({

      success: true,

      message: "Project updated ✅",

      data: updated

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Update failed ❌"
    });

  }

};

/* =========================================
   DELETE PROJECT
========================================= */

exports.deleteProject = async (req, res) => {

  try {

    const deleted =
      await Project.findByIdAndDelete(
        req.params.id
      );

    if (!deleted) {

      return res.status(404).json({
        message: "Project not found ❌"
      });

    }

    res.json({

      success: true,

      message: "Project deleted ✅"

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Delete failed ❌"
    });

  }

};

