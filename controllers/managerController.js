const Lead = require("../models/Lead");

exports.getManagerClients = async (
  req,
  res
) => {
  try {
    const managerId = req.user.id;

    const leads = await Lead.find({
      assignedManager: managerId,
    });

    res.json(leads);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};