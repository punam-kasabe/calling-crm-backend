const express = require("express");

const router = express.Router();

const {
  createVisit,
  getAllVisits,
  getSingleVisit,        // 🔥 NEW
  updateVisitStatus,
  updateVisit,           // 🔥 NEW (edit full visit)
  deleteVisit            // 🔥 NEW
} = require("../controllers/visitController");

/* 🔥 CREATE VISIT */
router.post("/create", createVisit);

/* 🔥 GET ALL VISITS */
router.get("/all", getAllVisits);

/* 🔥 GET SINGLE VISIT */
router.get("/:id", getSingleVisit);

/* 🔥 UPDATE ONLY STATUS */
router.put("/update-status/:id", updateVisitStatus);

/* 🔥 UPDATE FULL VISIT (calling_by, remark, etc) */
router.put("/update/:id", updateVisit);

/* 🔥 DELETE VISIT */
router.delete("/delete/:id", deleteVisit);

module.exports = router;