
const express = require("express")
const router = express.Router()
const smartHome = require("../controllers/smartHomeController")

const {protect, householdRequired,adminOnly} = require("../middleware/authMiddleware")

router.get("/dashboard",protect, householdRequired, smartHome.getDashboard)

router.get("/groups",protect, householdRequired, smartHome.getGroups)

router.post("/groups", protect, householdRequired, adminOnly, 
  smartHome.createGroup)

router.post("/groups/:id/run",protect, householdRequired, smartHome.runGroup)

router.delete("/groups/:id",protect, householdRequired, adminOnly, 
  smartHome.deleteGroup)

router.post("/emergency", protect, householdRequired, adminOnly, 
  smartHome.emergencyMode)

router.post("/emergency/stop", protect, householdRequired, adminOnly, 
  smartHome.endEmergencyMode)

router.post("/voice", protect, householdRequired, smartHome.voiceCommand)

router.get("/predictions", protect, householdRequired, smartHome.predictUsage)

module.exports = router;
