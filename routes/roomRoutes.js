
const express = require("express")
const router = express.Router()
const rooms = require("../controllers/roomController")

const {protect,householdRequired,adminOnly} = require("../middleware/authMiddleware")

router.get("/", protect, householdRequired, rooms.getRooms)
router.post("/", protect, householdRequired, adminOnly, rooms.createRoom)
router.delete("/:id", protect, householdRequired, adminOnly, rooms.deleteRoom)

module.exports = router;
