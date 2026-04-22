const Lead = require("../models/Lead");

/* 🔥 GET LEADS (ROLE BASED) */
exports.getLeads = async (req, res) => {
  try {
    let { role, email } = req.query;

    // 🔥 safety
    role = role?.toLowerCase();
    email = email?.toLowerCase().trim();

    let leads;

    if (role === "admin") {
      // 🧑‍💼 admin → all leads
      leads = await Lead.find().sort({ createdAt: -1 });
    } else {
      // 👨‍💻 executive → only assigned leads
      leads = await Lead.find({ assignedTo: email }).sort({ createdAt: -1 });
    }

    res.status(200).json(leads);
  } catch (err) {
    console.error("GET LEADS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch leads" });
  }
};

/* 🔥 CREATE LEAD (MANUAL) */
exports.createLead = async (req, res) => {
  try {
    const { source, name, mobile, email, assignedTo } = req.body;

    // 🔥 validation
    if (!name || !mobile || !assignedTo) {
      return res.status(400).json({
        message: "Name, Mobile & AssignedTo are required",
      });
    }

    const newLead = new Lead({
      source,
      name,
      mobile,
      email,
      assignedTo: assignedTo.toLowerCase().trim(),
    });

    await newLead.save();

    res.status(201).json({
      message: "Lead created successfully",
      data: newLead,
    });
  } catch (err) {
    console.error("CREATE LEAD ERROR:", err);
    res.status(500).json({ message: "Failed to create lead" });
  }
};

/* 🔥 DELETE LEAD */
exports.deleteLead = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Lead.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.status(200).json({
      message: "Lead deleted successfully",
    });
  } catch (err) {
    console.error("DELETE LEAD ERROR:", err);
    res.status(500).json({ message: "Failed to delete lead" });
  }
};