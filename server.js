const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const bcrypt = require("bcrypt");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

/* ================= DB ================= */

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root123",
  database: "crm",
});

db.connect((err) => {
  if (err) console.log("DB Error:", err);
  else console.log("DB Connected ✅");
});

/* ================= FILE ================= */

const upload = multer({ dest: "uploads/" });

/* ================= LOGIN ================= */

app.post("/api/login", (req, res) => {
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

      res.json({
        message: "Login successful ✅",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    }
  );
});

/* ================= USERS ================= */

app.get("/api/all-users", (req, res) => {
  db.query(
    "SELECT id, name, email, mobile AS phone, role, created_at FROM users",
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

app.post("/api/add-user", async (req, res) => {
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
        res.json("User added successfully ✅");
      }
    );
  } catch {
    res.status(500).json("Server error ❌");
  }
});

app.delete("/api/delete-user/:id", (req, res) => {
  db.query("DELETE FROM users WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json("User deleted ✅");
  });
});

/* ================= LEADS FILTER ================= */

app.post("/api/filter-leads", (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const role = req.body.role?.trim().toLowerCase();

  const page = parseInt(req.body.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  let where = "";
  let params = [];

  if (role === "executive") {
    where = "WHERE LOWER(TRIM(assigned_to))=?";
    params.push(email);
  }

  const dataQuery = `
    SELECT * FROM leads
    ${where}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `;

  const countQuery = `
    SELECT COUNT(*) as total FROM leads
    ${where}
  `;

  db.query(countQuery, params, (err, countResult) => {
    if (err) return res.status(500).json(err);

    db.query(dataQuery, [...params, limit, offset], (err, result) => {
      if (err) return res.status(500).json(err);

      res.json({
        data: result,
        totalPages: Math.ceil(countResult[0].total / limit)
      });
    });
  });
});

/* ================= DELETE LEAD ================= */

app.delete("/api/delete-lead/:id", (req, res) => {
  db.query("DELETE FROM leads WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json("Lead deleted ✅");
  });
});

/* ================= UPDATE LEAD ================= */

app.put("/api/update-lead/:id", (req, res) => {
  const { name, phone, status, next_call_date } = req.body;

  db.query(
    `UPDATE leads 
     SET name=?, phone=?, status=?, next_call_date=? 
     WHERE id=?`,
    [name, phone, status, next_call_date, req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json("Lead updated ✅");
    }
  );
});

/* ================= CSV UPLOAD ================= */

app.post("/api/upload", upload.single("file"), (req, res) => {
  const assignedUser = req.body.assigned_to?.trim().toLowerCase();
  const createdBy = req.body.created_by?.trim().toLowerCase();
  const batch = Date.now();

  if (!assignedUser) return res.status(400).json("User not selected ❌");
  if (!req.file) return res.status(400).json("File not found ❌");

  const results = [];

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => {
      results.push([
        data.name || "",
        data.phone || "",
        data.email || "",
        data.source || "",
        "New",
        assignedUser,
        createdBy,
        batch,
      ]);
    })
    .on("end", () => {
      const sql = `
        INSERT INTO leads 
        (name, phone, email, source, status, assigned_to, created_by, upload_batch)
        VALUES ?
      `;

      db.query(sql, [results], (err) => {
        fs.unlinkSync(req.file.path);
        if (err) return res.status(500).json("DB Error ❌");
        res.json("CSV Uploaded ✅");
      });
    });
});

/* ================= DASHBOARD ================= */

app.get("/api/dashboard", (req, res) => {
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
      SUM(CASE WHEN status='New' THEN 1 ELSE 0 END) AS new,
      SUM(CASE WHEN status='Booked' THEN 1 ELSE 0 END) AS booked,
      SUM(CASE WHEN status='Interested' THEN 1 ELSE 0 END) AS hot,
      SUM(CASE WHEN status='Not Interested' THEN 1 ELSE 0 END) AS inactive
    FROM leads
    ${where}
  `;

  db.query(query, params, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result[0]);
  });
});

/* ================= START ================= */

app.listen(5000, () => {
  console.log("Server running on port 5000 🚀");
});