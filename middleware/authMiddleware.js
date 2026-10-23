const jwt = require("jsonwebtoken")
const USER = require("../models/User")

const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization

    
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Please Login First" })
    }

    const token = header.split(" ")[1]

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    
    const person = await USER.findById(decoded.id).select("-password")

    if (!person) {
      return res.status(401).json({ message: "User account not found" })
    }

    req.user = person
    next()
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" })
  }
};

function householdRequired(req, res, next) {
  
  if (!req.user.household) {
    return res.status(400).json({ message: "Create or join a household first" })
  }

  req.householdId = req.user.household;
  next();
}

function adminOnly(req, res, next) {

  if (req.user.role !== "Admin" && req.user.role !== "admin") {

    return res.status(403).json({ message: "Only Admin can perform this action" })
  }

  next()
}

function settingsPermission(req, res, next) {

  if (req.user.role === "Child" || req.user.role === "child") {

    return res.status(403).json({ message: "Children cannot change device settings" })
  }
  next()
}

module.exports = { protect, householdRequired, adminOnly, settingsPermission }