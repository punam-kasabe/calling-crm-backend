const express = require("express");

const router = express.Router();

/* =========================================
   CONTROLLERS
========================================= */

const {

  getDashboard,

  getDashboardFull,

  getExecutiveDashboard

} = require("../controllers/dashboardController");

/* =========================================
   DASHBOARD ROUTES
========================================= */

/* =========================================
   SIMPLE DASHBOARD
========================================= */

router.get(
  "/dashboard",
  getDashboard
);

/* =========================================
   FULL PREMIUM DASHBOARD
========================================= */

router.get(
  "/dashboard-full",
  getDashboardFull
);

/* =========================================
   EXECUTIVE DASHBOARD
========================================= */

router.get(
  "/executive/dashboard/:id",
  getExecutiveDashboard
);

/* =========================================
   EXPORT ROUTER
========================================= */

module.exports = router;

