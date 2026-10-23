
const express = require("express")
const router = express.Router()
const devices = require("../controllers/deviceController")

const {protect,householdRequired,adminOnly,settingsPermission} = require("../middleware/authMiddleware")

router.get("/", protect, householdRequired, devices.getDevices)
router.post("/", protect, householdRequired, adminOnly, devices.createDevice)
router.post("/:id/connect", protect, householdRequired, devices.connectDevice)
router.post("/:id/disconnect", protect, householdRequired, devices.disconnectDevice)

router.patch("/:id/power", protect, householdRequired, devices.changePower)

router.patch("/:id/features", protect, householdRequired, settingsPermission, devices.updateFeatures)

router.post("/:id/malfunction", protect, householdRequired, adminOnly, 
  devices.simulateMalfunction)

router.post("/:id/reset", protect, householdRequired, adminOnly, 
  devices.resetDevice)

router.delete("/:id", protect, householdRequired, adminOnly, 
  devices.deleteDevice)

module.exports = router;
