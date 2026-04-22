module.exports = (...allowedRoles) => {
  return (req, res, next) => {
    const role = req.user.role?.toLowerCase();

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ message: "Access Denied ❌" });
    }

    next();
  };
};