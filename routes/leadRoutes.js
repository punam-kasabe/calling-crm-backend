const express = require("express");
const router = express.Router();

const Lead = require("../models/Lead");

/* =========================================
   DASHBOARD
========================================= */

router.get("/dashboard", async (req, res) => {

  try {

    const email = req.query.email
      ?.toLowerCase()
      .trim();

    const role = req.query.role
      ?.toLowerCase()
      .trim();

    let match = {};

    /* 🔥 EXECUTIVE → only own leads */

    if (role === "executive") {

      match.assigned_to = email;

    }

    /* 🔥 MANAGER → only assigned clients */

    if (role === "manager") {

      match.assigned_manager = email;

    }

    const stats = await Lead.aggregate([

      {
        $match: match
      },

      {
        $group: {

          _id: null,

          total: {
            $sum: 1
          },

          new_leads: {
            $sum: {
              $cond: [
                { $eq: ["$status", "New"] },
                1,
                0
              ]
            }
          },

          booked: {
            $sum: {
              $cond: [
                { $eq: ["$status", "Booked"] },
                1,
                0
              ]
            }
          },

          interested: {
            $sum: {
              $cond: [
                { $eq: ["$status", "Interested"] },
                1,
                0
              ]
            }
          },

          followup: {
            $sum: {
              $cond: [
                { $eq: ["$status", "Followup"] },
                1,
                0
              ]
            }
          },

          not_interested: {
            $sum: {
              $cond: [
                { $eq: ["$status", "Not Interested"] },
                1,
                0
              ]
            }
          },

        },

      },

    ]);

    const result = stats[0] || {

      total: 0,

      new_leads: 0,

      booked: 0,

      interested: 0,

      followup: 0,

      not_interested: 0,

    };

    res.json(result);

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Dashboard error ❌"
    });

  }

});


/* =========================================
   MY LEADS (EXECUTIVE)
========================================= */

router.get("/my-leads", async (req, res) => {

  try {

    const email = req.query.email
      ?.toLowerCase()
      .trim();

    const leads = await Lead.find({

      assigned_to: email

    }).sort({

      createdAt: -1

    });

    res.json(leads);

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Fetch error ❌"
    });

  }

});


/* =========================================
   MANAGER CLIENTS
========================================= */

router.get("/manager-clients", async (req, res) => {

  try {

    const email = req.query.email
      ?.toLowerCase()
      .trim();

    /* 🔥 manager ला फक्त assigned clients */

    const leads = await Lead.find({

      assigned_manager: email

    }).sort({

      createdAt: -1

    });

    res.json(leads);

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Manager fetch error ❌"
    });

  }

});


/* =========================================
   SEARCH CLIENT (RECEPTION)
========================================= */

router.get("/search-client/:mobile", async (req, res) => {

  try {

    const mobile = req.params.mobile;

    const lead = await Lead.findOne({

      mobile

    });

    if (!lead) {

      return res.status(404).json({

        message: "Client not found ❌"

      });

    }

    res.json(lead);

  }

  catch (err) {

    console.log(err);

    res.status(500).json({

      message: "Search error ❌"

    });

  }

});


/* =========================================
   CREATE VISIT ENTRY
========================================= */

router.post("/create-visit", async (req, res) => {

  try {

    const {

      leadId,
      managerEmail,
      visit_status

    } = req.body;

    const updated = await Lead.findByIdAndUpdate(

      leadId,

      {

        visit_created: true,

        assigned_manager: managerEmail,

        visit_status: visit_status || "IN_OFFICE"

      },

      {

        new: true

      }

    );

    res.json({

      message: "Visit created ✅",

      data: updated

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({

      message: "Visit creation failed ❌"

    });

  }

});


/* =========================================
   UPDATE STATUS
========================================= */

router.put("/update-status/:id", async (req, res) => {

  try {

    const {

      status,
      remark,
      followup_date

    } = req.body;

    const updated = await Lead.findByIdAndUpdate(

      req.params.id,

      {

        status,

        remark,

        followup_date

      },

      {

        new: true

      }

    );

    res.json(updated);

  }

  catch (err) {

    console.log(err);

    res.status(500).json({

      message: "Status update failed ❌"

    });

  }

});


/* =========================================
   FILTER + PAGINATION
========================================= */

router.post("/filter-leads", async (req, res) => {

  try {

    const {

      email,
      role,
      page = 1,
      status

    } = req.body;

    const limit = 10;

    const skip = (page - 1) * limit;

    const r = role
      ?.toLowerCase();

    let query = {};

    /* 🔥 executive */

    if (r === "executive") {

      query.assigned_to = email
        ?.toLowerCase()
        .trim();

    }

    /* 🔥 manager */

    if (r === "manager") {

      query.assigned_manager = email
        ?.toLowerCase()
        .trim();

    }

    if (status) {

      query.status = status;

    }

    const total = await Lead.countDocuments(query);

    const leads = await Lead.find(query)

      .sort({

        _id: -1

      })

      .skip(skip)

      .limit(limit);

    res.json({

      data: leads,

      totalPages: Math.ceil(
        total / limit
      ),

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({

      message: "Filter error ❌"

    });

  }

});


module.exports = router;