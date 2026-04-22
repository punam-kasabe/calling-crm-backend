const express = require("express");
const router = express.Router();
const Lead = require("../models/Lead");

/* ================= DASHBOARD ================= */

router.get("/dashboard", async (req, res) => {
  try {
    const email = req.query.email?.toLowerCase().trim();
    const role = req.query.role?.toLowerCase().trim();

    let match = {};

    // 🔥 Executive la fakt tyachya leads
    if (role === "executive") {
      match.assigned_to = email;
    }

    const stats = await Lead.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          new_leads: {
            $sum: {
              $cond: [{ $eq: ["$status", "New"] }, 1, 0],
            },
          },
          booked: {
            $sum: {
              $cond: [{ $eq: ["$status", "Booked"] }, 1, 0],
            },
          },
          interested: {
            $sum: {
              $cond: [{ $eq: ["$status", "Interested"] }, 1, 0],
            },
          },
          not_interested: {
            $sum: {
              $cond: [{ $eq: ["$status", "Not Interested"] }, 1, 0],
            },
          },
        },
      },
    ]);

    const result = stats[0] || {
      total: 0,
      new_leads: 0,
      booked: 0,
      interested: 0,
      not_interested: 0,
    };

    res.json(result);

  } catch (err) {
    console.log(err);
    res.status(500).json("Dashboard error ❌");
  }
});


/* ================= MY LEADS ================= */

router.get("/my-leads", async (req, res) => {
  try {
    const email = req.query.email?.toLowerCase().trim();

    const leads = await Lead.find({
      assigned_to: email
    }).sort({ createdAt: -1 });

    res.json(leads);

  } catch (err) {
    res.status(500).json("Fetch error ❌");
  }
});


/* ================= FILTER + PAGINATION ================= */

router.post("/filter-leads", async (req, res) => {
  try {
    const { email, role, page = 1, status } = req.body;

    const limit = 10;
    const skip = (page - 1) * limit;

    const r = role?.toLowerCase();
    let query = {};

    if (r === "executive") {
      query.assigned_to = email?.toLowerCase().trim();
    }

    if (status) {
      query.status = status;
    }

    const total = await Lead.countDocuments(query);

    const leads = await Lead.find(query)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      data: leads,
      totalPages: Math.ceil(total / limit),
    });

  } catch (err) {
    res.status(500).json("Filter error ❌");
  }
});

module.exports = router;