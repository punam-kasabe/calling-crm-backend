// FILE: controllers/dashboardController.js

const Lead = require("../models/Lead");
const User = require("../models/User");

/* =========================================
   SIMPLE DASHBOARD
========================================= */

exports.getDashboard = async (req, res) => {

  try {

    const email =
      req.query.email?.toLowerCase();

    const role =
      req.query.role?.toLowerCase();

    let match = {};

    if (role === "executive") {
      match.assigned_to = email;
    }

    if (role === "manager") {
      match.assigned_manager = email;
    }

    const total =
      await Lead.countDocuments(match);

    const newLeads =
      await Lead.countDocuments({

        ...match,

        status: "New"

      });

    const booked =
      await Lead.countDocuments({

        ...match,

        status: "Booked"

      });

    const interested =
      await Lead.countDocuments({

        ...match,

        status: "Interested"

      });

    const notInterested =
      await Lead.countDocuments({

        ...match,

        status: "Not Interested"

      });

    const status =
      await Lead.aggregate([

        {
          $match: match
        },

        {
          $group: {

            _id: "$status",

            count: {
              $sum: 1
            }

          }

        }

      ]);

    res.json({

      total,

      new: newLeads,

      booked,

      interested,

      not_interested: notInterested,

      status

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Dashboard error ❌"
    });

  }

};

/* =========================================
   EXECUTIVE DASHBOARD
========================================= */

exports.getExecutiveDashboard = async (req, res) => {

  try {

    const user =
      await User.findById(
        req.params.id
      );

    if (!user) {

      return res.status(404).json({
        message: "User not found ❌"
      });

    }

    const email =
      user.email
        ?.toLowerCase()
        .trim();

    const totalLeads =
      await Lead.countDocuments({

        assigned_to: email

      });

    const followups =
      await Lead.countDocuments({

        assigned_to: email,

        status: "Followup"

      });

    const converted =
      await Lead.countDocuments({

        assigned_to: email,

        status: "Booked"

      });

    const hotLeads =
      await Lead.countDocuments({

        assigned_to: email,

        status: "Interested"

      });

    const today = new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const tomorrow =
      new Date(today);

    tomorrow.setDate(
      tomorrow.getDate() + 1
    );

    const todayFollowups =
      await Lead.countDocuments({

        assigned_to: email,

        next_call_date: {

          $gte: today,

          $lt: tomorrow

        }

      });

    const pendingCalls =
      await Lead.countDocuments({

        assigned_to: email,

        status: "New"

      });

    const recentLeads =
      await Lead.find({

        assigned_to: email

      })

      .sort({
        createdAt: -1
      })

      .limit(5);

    const calls =
      followups + converted;

    res.json({

      totalLeads,

      followups,

      calls,

      converted,

      todayFollowups,

      hotLeads,

      pendingCalls,

      recentLeads

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({

      message:
        "Executive dashboard error ❌"

    });

  }

};

/* =========================================
   FULL DASHBOARD
========================================= */

exports.getDashboardFull = async (req, res) => {

  try {

    const email =
      req.query.email
        ?.toLowerCase()
        .trim();

    const role =
      req.query.role
        ?.toLowerCase()
        .trim();

    let match = {};

    /* ROLE FILTER */

    if (role === "executive") {

      match.assigned_to = email;

    }

    if (role === "manager") {

      match.assigned_manager = email;

    }

    /* =====================================
       SUMMARY COUNTS
    ===================================== */

    const total =
      await Lead.countDocuments(match);

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const tomorrow =
      new Date(today);

    tomorrow.setDate(
      tomorrow.getDate() + 1
    );

    const newLeads =
      await Lead.countDocuments({

        ...match,

        createdAt: {
          $gte: today,
          $lt: tomorrow
        }

      });

    const interested =
      await Lead.countDocuments({

        ...match,

        status: "Interested"

      });

    const booked =
      await Lead.countDocuments({

        ...match,

        status: "Booked"

      });

    const notInterested =
      await Lead.countDocuments({

        ...match,

        status: "Not Interested"

      });

    const pending =
      await Lead.countDocuments({

        ...match,

        status: {
          $in: [
            "New",
            "Followup"
          ]
        }

      });

    /* =====================================
       STATUS CHART
    ===================================== */

    const statusData =
      await Lead.aggregate([

        {
          $match: match
        },

        {
          $group: {

            _id: "$status",

            count: {
              $sum: 1
            }

          }

        }

      ]);

    /* =====================================
       WEEKLY CHART
    ===================================== */

    const weekly =
      await Lead.aggregate([

        {
          $match: match
        },

        {
          $group: {

            _id: {
              $dayOfWeek: "$createdAt"
            },

            count: {
              $sum: 1
            }

          }

        },

        {
          $sort: {
            _id: 1
          }
        }

      ]);

    const dayMap = {

      1: "Sun",
      2: "Mon",
      3: "Tue",
      4: "Wed",
      5: "Thu",
      6: "Fri",
      7: "Sat"

    };

    const weeklyData =
      weekly.map((w) => ({

        day: dayMap[w._id],

        count: w.count

      }));

    /* =====================================
       EXECUTIVE PERFORMANCE
    ===================================== */

    const executives =
      await Lead.aggregate([

        {
          $match: match
        },

        {
          $group: {

            _id: "$assigned_to",

            total: {
              $sum: 1
            },

            interested: {
              $sum: {

                $cond: [

                  {
                    $eq: [
                      "$status",
                      "Interested"
                    ]
                  },

                  1,

                  0

                ]

              }
            },

            booked: {
              $sum: {

                $cond: [

                  {
                    $eq: [
                      "$status",
                      "Booked"
                    ]
                  },

                  1,

                  0

                ]

              }
            },

            pending: {
              $sum: {

                $cond: [

                  {
                    $in: [

                      "$status",

                      [
                        "New",
                        "Followup"
                      ]

                    ]
                  },

                  1,

                  0

                ]

              }
            }

          }

        }

      ]);

    /* =====================================
       USER NAME MAP
    ===================================== */

    const users =
      await User.find(
        {},
        "name email"
      );

    const userMap = {};

    users.forEach((u) => {

      userMap[
        u.email?.toLowerCase()
      ] = u.name;

    });

    /* =====================================
       FORMAT EXECUTIVES
    ===================================== */

    const executiveData =
      executives.map((e) => ({

        name:
          userMap[
            e._id?.toLowerCase()
          ] ||

          (
            e._id?.includes("@")
              ? e._id.split("@")[0]
              : e._id
          ) ||

          "Unassigned",

        total: e.total,

        interested: e.interested,

        booked: e.booked,

        pending: e.pending

      }));

    /* =====================================
       LEAD ASSIGNMENT
    ===================================== */

    const assignments =
      await Lead.aggregate([

        {
          $match: match
        },

        {
          $group: {

            _id: "$assigned_to",

            count: {
              $sum: 1
            }

          }

        }

      ]);

    const assignmentData =
      assignments.map((a) => ({

        name:
          userMap[
            a._id?.toLowerCase()
          ] ||

          (
            a._id?.includes("@")
              ? a._id.split("@")[0]
              : a._id
          ) ||

          "Unassigned",

        count: a.count

      }));

    /* =====================================
       TEAM LEADERBOARD
    ===================================== */

    const leaderboard =
      [...assignmentData]

        .sort((a, b) =>
          b.count - a.count
        )

        .slice(0, 5);

    /* =====================================
       TODAY FOLLOWUPS
    ===================================== */

    const followups =
      await Lead.find({

        ...match,

        next_call_date: {

          $gte: today,

          $lt: tomorrow

        }

      })

      .select(
        "name phone next_call_date project"
      )

      .limit(10);

    /* =====================================
       MISSED FOLLOWUPS
    ===================================== */

    const missedFollowups =
      await Lead.find({

        ...match,

        next_call_date: {
          $lt: today
        },

        status: {
          $ne: "Booked"
        }

      })

      .select(
        "name phone next_call_date"
      )

      .limit(10);

    /* =====================================
       TODAY SITE VISITS
    ===================================== */

    const todayVisits =
      await Lead.find({

        ...match,

        visit_created: true,

        next_call_date: {

          $gte: today,

          $lt: tomorrow

        }

      })

      .select(
        "name phone project next_call_date"
      )

      .limit(10);

    /* =====================================
       PROJECT ANALYSIS
    ===================================== */

    const projects =
      await Lead.aggregate([

        {
          $match: match
        },

        {
          $group: {

            _id: "$project",

            count: {
              $sum: 1
            }

          }

        }

      ]);

    /* =====================================
       SOURCE ANALYSIS
    ===================================== */

    const sources =
      await Lead.aggregate([

        {
          $match: match
        },

        {
          $group: {

            _id: "$source",

            count: {
              $sum: 1
            }

          }

        }

      ]);

    /* =====================================
       REVENUE CHART
    ===================================== */

    const revenue =
      await Lead.aggregate([

        {
          $match: {

            ...match,

            status: "Booked"

          }
        },

        {
          $group: {

            _id: {
              $month: "$createdAt"
            },

            amount: {
              $sum: 50000
            }

          }

        },

        {
          $sort: {
            _id: 1
          }
        }

      ]);

    const monthMap = {

      1: "Jan",
      2: "Feb",
      3: "Mar",
      4: "Apr",
      5: "May",
      6: "Jun",
      7: "Jul",
      8: "Aug",
      9: "Sep",
      10: "Oct",
      11: "Nov",
      12: "Dec"

    };

    const revenueData =
      revenue.map((r) => ({

        month: monthMap[r._id],

        amount: r.amount

      }));

    /* =====================================
       RECENT ACTIVITIES
    ===================================== */

    const activities =
      await Lead.find(match)

        .sort({
          updatedAt: -1
        })

        .limit(10);

    const activityData =
      activities.map((a) => ({

        user:
          userMap[
            a.assigned_to?.toLowerCase()
          ] ||

          (
            a.assigned_to?.includes("@")
              ? a.assigned_to.split("@")[0]
              : a.assigned_to
          ) ||

          "Admin",

        message:
          `${a.name} marked as ${a.status}`

      }));

    /* =====================================
       EXECUTIVE POPUP DATA
    ===================================== */

    const popupTasks = [

      ...followups.map((f) => ({
        type: "FOLLOWUP",
        name: f.name,
        phone: f.phone,
        project: f.project
      })),

      ...todayVisits.map((v) => ({
        type: "SITE VISIT",
        name: v.name,
        phone: v.phone,
        project: v.project
      }))

    ];

    /* =====================================
       FINAL RESPONSE
    ===================================== */

    res.json({

      total,

      new: newLeads,

      interested,

      booked,

      not_interested: notInterested,

      pending,

      statusData,

      executives: executiveData,

      assignments: assignmentData,

      leaderboard,

      followups,

      missedFollowups,

      todayVisits,

      popupTasks,

      projects,

      sources,

      revenue: revenueData,

      activities: activityData,

      weekly: weeklyData

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({

      message:
        "Dashboard API Error ❌"

    });

  }

};