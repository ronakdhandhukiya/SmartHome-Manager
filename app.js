require("dotenv").config()
const express = require("express")
const cors = require("cors")
const path = require("path")
const connectDB = require("./config/db")
const { startSchedulers } = require("./services/scheduler")

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, "public")))


app.use("/api/auth", require("./routes/authRoutes"))
app.use("/api/household", require("./routes/householdRoutes"))
app.use("/api/rooms", require("./routes/roomRoutes"))
app.use("/api/devices", require("./routes/deviceRoutes"))
app.use("/api/routines", require("./routes/routineRoutes"))
app.use("/api/energy", require("./routes/energyRoutes"))
app.use("/api/smart-home", require("./routes/smartHomeRoutes"))

app.get("/api", (req, res) => {
  res.json({ message: "SmartHome Manager API is running" })
})


app.use((req, res) => {
  res.status(404).json({ message: "API route not found" })
})

async function startServer() {
  await connectDB()

  startSchedulers()

  const port = process.env.PORT || 5000

  app.listen(port, () => {
    console.log(`SmartHome Manager running on port ${port}`)
  })
}

startServer()