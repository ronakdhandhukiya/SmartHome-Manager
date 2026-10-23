
const express = require("express");
const router = express.Router();
const home = require("../controllers/householdController");

const {protect,householdRequired,adminOnly} = require("../middleware/authMiddleware");

router.post("/", protect, home.createHousehold)
router.get("/", protect, householdRequired, home.getHousehold)
router.post("/members", protect, householdRequired, adminOnly, home.addMember)
router.delete("/members/:id", protect, householdRequired, adminOnly, 
  home.removeMember)

module.exports = router;
