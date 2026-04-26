const express = require("express");
const router = express.Router();

const authMiddleware = require(
  "../middleware/authMiddleware"
);

const {
  getManagerClients,
} = require("../controllers/managerController");

router.get(
  "/clients",
  authMiddleware,
  getManagerClients
);

module.exports = router;