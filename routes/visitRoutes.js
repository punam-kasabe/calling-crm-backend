const express = require("express");

const router = express.Router();

const {
  createVisit,
  getAllVisits,
  updateVisitStatus,
} = require("../controllers/visitController");

/* 🔥 CREATE VISIT */

router.post(
  "/create",
  createVisit
);

/* 🔥 GET ALL VISITS */

router.get(
  "/all",
  getAllVisits
);

/* 🔥 UPDATE VISIT STATUS */

router.put(
  "/update-status/:id",
  updateVisitStatus
);

module.exports = router;