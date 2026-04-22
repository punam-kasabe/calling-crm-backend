const express = require("express");
const router = express.Router();
const bulkController = require("../controllers/bulkUpdateController");

router.post("/", bulkController.bulkUpdate);

module.exports = router;