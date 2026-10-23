const Device = require("../models/Device")
const Routine = require("../models/Routine")
const Alert = require("../models/Alert")
const UsageLog = require("../models/UsageLog")

async function checkRoutines() {
  const now = new Date()
  
  const time = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0")
  ].join(":")

  const today = [now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-")

  const routines = await Routine.find({time,active: true,lastRun: { $ne: today }
  })

  for (const routine of routines) {
    try {
      for (const action of routine.actions) {

        const device = await Device.findOne({ _id: action.device,
          household: routine.household
        })

        if (!device) continue

        if (action.power && (!device.connected || device.malfunction)) {

          await Alert.create({household: routine.household,device: device._id,
            message: `Routine "${routine.name}" could not turn on ${device.name}. Check its connection or status`

          })
          continue
        }

        if (action.power && !device.power) {

          device.power = true
          device.status = "On"
          device.turnedOnAt = new Date()

        } else if (!action.power && device.power) {

          const endedAt = new Date()
          const minutes = Math.max(0, (endedAt - device.turnedOnAt) / 60000)

          await UsageLog.create({
            household: device.household,
            device: device._id,
            deviceName: device.name,
            watts: device.watts,
            startedAt: device.turnedOnAt,
            endedAt,
            minutes,
            kWh: (device.watts * minutes) / 60000
          })

          device.power = false
          device.status = "Off"
          device.turnedOnAt = null
        }

        if (action.features) {
          device.features = {...device.features, ...action.features
          }
        }

        await device.save()
      }

      routine.lastRun = today
      await routine.save()

    } catch (error) {

      console.log("Routine error:", error.message)
    }
  }
}

async function checkLongRunningDevices() {

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const devices = await Device.find({
    power: true, turnedOnAt: { $lte: yesterday }
  })

  for (const device of devices) {
    const existingAlert = await Alert.findOne({
      device: device._id,
      resolved: false,
      message: { $regex: "running for more than 24 hours" }
    })

    if (!existingAlert) {
      await Alert.create({
        household: device.household, device: device._id,
        message: `${device.name} has been running for more than 24 hours. Please check or reset it.`
      })
    }
  }
}

function startSchedulers() {
  setInterval(() => {
    checkRoutines().catch(error => console.log("Scheduler error:", error.message))
  }, 60 * 1000)

  setInterval(() => {
    checkLongRunningDevices().catch(error => console.log("Device check error:", error.message))
  }, 60 * 60 * 1000)
}

module.exports = { startSchedulers }