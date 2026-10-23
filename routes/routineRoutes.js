
const express = require("express")
const router = express.Router()
const routines = require("../controllers/routineController")

const {protect,householdRequired,adminOnly} = require("../middleware/authMiddleware")

router.get("/", protect, householdRequired, routines.getRoutines)
router.post("/", protect, householdRequired, adminOnly, routines.createRoutine)
router.patch("/:id", protect, householdRequired, adminOnly, 
  routines.updateRoutine)
router.delete("/:id", protect, householdRequired, adminOnly, 
  routines.deleteRoutine)

module.exports = router
