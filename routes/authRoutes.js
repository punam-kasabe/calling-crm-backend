const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db");

const router = express.Router();

/* LOGIN */
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE email=?",
    [email.trim().toLowerCase()],
    async (err, result) => {
      if (err) return res.status(500).json(err);

      if (result.length === 0) {
        return res.status(401).json({ message: "User not found ❌" });
      }

      const user = result[0];
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({ message: "Wrong password ❌" });
      }

      let permissions = {
        can_import: user.can_import,
        can_export: user.can_export,
        can_delete_lead: user.can_delete_lead,
        can_access_project: user.can_access_project,
        lead_creation_disabled: user.lead_creation_disabled,
        lead_edit_disabled: user.lead_edit_disabled,
      };

      if (
        user.role.toLowerCase() === "admin" ||
        user.role.toLowerCase() === "super administrator"
      ) {
        permissions = {
          can_import: 1,
          can_export: 1,
          can_delete_lead: 1,
          can_access_project: 1,
          lead_creation_disabled: 0,
          lead_edit_disabled: 0,
        };
      }

      res.json({
        message: "Login successful ✅",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          ...permissions,
        },
      });
    }
  );
});

module.exports = router;