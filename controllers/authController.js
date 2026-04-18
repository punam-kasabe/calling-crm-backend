const db = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.login = (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
    if (err) return res.status(500).json({ error: err });

    if (result.length === 0) {
      return res.status(401).json({ message: "User not found ❌" });
    }

    const user = result[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Wrong password ❌" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful ✅",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        can_import: user.can_import,
        can_export: user.can_export,
        can_delete_lead: user.can_delete_lead,
        can_access_project: user.can_access_project
      }
    });
  });
};