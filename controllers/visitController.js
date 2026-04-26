const Visit = require("../models/Visit");
const Lead = require("../models/Lead");

exports.createVisit = async (req, res) => {
  try {
    const visit = await Visit.create(req.body);

    await Lead.findByIdAndUpdate(
      req.body.leadId,
      {
        visitCreated: true,
        assignedManager:
          req.body.attendedManager,
      }
    );

    res.json(visit);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};