const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db");

const router = express.Router();

/* GET USERS */
router.get("/all-users", (req, res) => {
  db.query(
    "SELECT id, name, email, mobile AS phone, role, created_at FROM users",
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

/* ADD USER */
router.post("/add-user", async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json("Missing fields ❌");
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
      `INSERT INTO users (name, email, mobile, password, role)
       VALUES (?, ?, ?, ?, ?)`,
      [name, email.trim().toLowerCase(), phone, hashedPassword, role],
      (err) => {
        if (err) return res.status(500).json(err);
        res.json("User added ✅");
      }
    );
  } catch {
    res.status(500).json("Server error ❌");
  }
});

/* DELETE USER */
router.delete("/delete-user/:id", (req, res) => {
  db.query("DELETE FROM users WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json("User deleted ✅");
  });
});

module.exports = router;