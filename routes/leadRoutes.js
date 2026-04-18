const express = require("express");
const db = require("../db");

const router = express.Router();

/* DASHBOARD */
router.get("/dashboard", (req, res) => {
  const email = req.query.email?.trim().toLowerCase();
  const role = req.query.role?.trim().toLowerCase();

  let where = "";
  let params = [];

  if (role === "executive") {
    where = "WHERE LOWER(TRIM(assigned_to))=?";
    params.push(email);
  }

  const query = `
    SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN status='New' THEN 1 ELSE 0 END) AS new_leads,
      SUM(CASE WHEN status='Booked' THEN 1 ELSE 0 END) AS booked
    FROM leads
    ${where}
  `;

  db.query(query, params, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result[0]);
  });
});

module.exports = router;