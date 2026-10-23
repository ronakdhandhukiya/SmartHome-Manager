
const express = require("express")
const router = express.Router()
const energy = require("../controllers/energyController")

const {protect, householdRequired}= require("../middleware/authMiddleware")

router.get("/", protect, householdRequired, energy.getEnergyReport)

router.get("/alerts", protect, householdRequired, energy.getAlerts)

router.get("/recommendations", protect, householdRequired, 
  energy.getEfficiencyTips)

module.exports = router
