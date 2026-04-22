const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db");
const User = require("../models/User");
const router = express.Router();

/* BULK ADD USERS */
router.post("/bulk-add-users", async (req, res) => {
  const users = req.body;

  if (!Array.isArray(users)) {
    return res.status(400).json("Send array of users ❌");
  }

  try {
    const formattedUsers = await Promise.all(
      users.map(async (u) => ({
        name: u.name,
        email: u.email.trim().toLowerCase(),
        mobile: u.phone,
        password: await bcrypt.hash(u.password, 10),
        role: u.role,
        can_import: u.can_import || 0,
        can_export: u.can_export || 0,
        can_delete_lead: u.can_delete_lead || 0,
        can_access_project: u.can_access_project || 0,
      }))
    );

    db.query(
      `INSERT INTO users 
      (name, email, mobile, password, role, can_import, can_export, can_delete_lead, can_access_project) 
      VALUES ?`,
      [
        formattedUsers.map((u) => [
          u.name,
          u.email,
          u.mobile,
          u.password,
          u.role,
          u.can_import,
          u.can_export,
          u.can_delete_lead,
          u.can_access_project,
        ]),
      ],
      (err) => {
        if (err) return res.status(500).json(err);
        res.json("All users added successfully ✅");
      }
    );
  } catch (err) {
    res.status(500).json("Bulk insert error ❌");
  }
});

module.exports = router;