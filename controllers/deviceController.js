const DEVICE = require("../models/Device")
const ROOM = require("../models/Room")
const UsageLog = require("../models/UsageLog")
const ALERT = require("../models/Alert")
const DeviceGroup = require("../models/DeviceGroup")
const ROUTINE = require("../models/Routine")

const deviceTypes = [
  "Thermostat", "Heater", "Lamp", "Fan", "AC",
  "Washing Machine", "TV", "Coffee Maker", "Door Lock", "Other"
];

async function recordUsage(device) {
  try {
    if (!device.turnedOnAt) return;

    const endedAt = new Date();
    const minutes = Math.max(0, (endedAt - device.turnedOnAt) / 60000);

    await UsageLog.create({
      household: device.household,
      device: device._id,
      deviceName: device.name,
      watts: device.watts,
      startedAt: device.turnedOnAt,
      endedAt,
      minutes,
      kWh: (device.watts * minutes) / 60000
    });

    device.turnedOnAt = null;
  } catch (error) {
    console.error("Error recording usage:", error.message);
  }
}

async function setPower(device, power) {
  if (device.malfunction && power) {
    throw new Error("Reset the malfunctioning device first");
  }
  if (power && !device.connected) {
    throw new Error("Connect this device first");
  }

  if (power && !device.power) {
    device.power = true;
    device.status = "On";
    device.turnedOnAt = new Date();
  }

  if (!power && device.power) {
    await recordUsage(device)
    device.power = false
    device.status = "Off"
  }

  await device.save();
}

function checkFeatures(type, features = {}) {

  if (type === "Lamp") {
    if (features.brightness !== undefined && (!Number.isFinite(Number(features.brightness)) ||  features.brightness < 0 || features.brightness > 100)) {
      throw new Error("Brightness must be from 0 to 100")
    }

    if (features.color !== undefined && !["warm", "cold", "Warm", "Cold"].includes(features.color)) {
      throw new Error("Color must be Warm or Cold");
    }
  }

  if (type === "Fan" && features.speed !== undefined &&
    !["Low", "Medium", "High"].includes(features.speed)) {
    throw new Error("Fan speed must be Low, Medium or High");
  }

  if (["Thermostat", "AC", "Heater"].includes(type) && features.temperature !== undefined &&
    (!Number.isFinite(Number(features.temperature)) || features.temperature < 18 || features.temperature > 30)) {
    throw new Error("Temperature must be from 18°C to 30°C")
  }
}

const createDevice = async (req, res) => {
  try {
    const { name, type, room, watts, features } = req.body;

    if (!name || !deviceTypes.includes(type)) {
      return res.status(400).json({ message: "Enter a device name and valid device type" })
    }

    const roomExist = await ROOM.findOne({ _id: room, household: req.householdId });

    if (!roomExist) {
      return res.status(400).json({ message: "Select a valid room from your household" });
    }

    checkFeatures(type, features);

    const device = new DEVICE({
      ...req.body, household: req.householdId, watts: watts === undefined ? 100 : Number(watts),features: features || {}
    })

    await device.save();
    res.status(201).json({ message: "Device created. Connect it before use", device })

  } catch (error) {
    res.status(400).json({ message: error.message })
  }
};

const connectDevice = async (req, res) => {

  try {
    const device = await DEVICE.findOne({ _id: req.params.id, household: req.householdId })
    
    if (!device) {
      return res.status(404).json({ message: "Device not found" })
    }

    device.connected = true;
    device.status = device.malfunction ? "Malfunctioning" : device.power ? "On" : "Off";
    await device.save()

    res.json({ message: "Device connected", device })

  } catch (error) {
    res.status(400).json({ message: error.message })
  }
};

const disconnectDevice = async (req, res) => {
  try {

    const device = await DEVICE.findOne({ _id: req.params.id, household: req.householdId })

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    await setPower(device, false)
    device.connected = false
    device.status = "Standby"
    await device.save()

    res.json({ message: "Device disconnected", device })

  } catch (error) {
    res.status(400).json({ message: error.message })
  }
};

const changePower = async (req, res) => {
  try {

    if (typeof req.body.power !== "boolean") {
      return res.status(400).json({ message: "Power must be true or false" });
    }

    const device = await DEVICE.findOne({ _id: req.params.id, household: req.householdId })

    if (!device) {
      return res.status(404).json({ message: "Device not found" })
    }

    if (req.user.role === "Child" && device.type === "Door Lock") {
      return res.status(403).json({ message: "Children cannot control door locks" })
    }

    await setPower(device, req.body.power)

    res.json({ message: "Device state changed", device })

  } catch (error) {
    res.status(400).json({ message: error.message })
  }
};

const updateFeatures = async (req, res) => {
  try {

    const device = await DEVICE.findOne({ _id: req.params.id, household: req.householdId })

    if (!device) {
      return res.status(404).json({ message: "Device not found" })
    }

    checkFeatures(device.type, req.body)
    device.features = { ...device.features, ...req.body }
    await device.save()

    res.json({ message: "Settings updated", device })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
};

const deleteDevice = async (req, res) => {
  try {

    const device = await DEVICE.findOne({ _id: req.params.id, household: req.householdId })


    if (!device) {
      return res.status(404).json({ message: "Device not found" })
    }

    await recordUsage(device);
    await device.deleteOne()

    await DeviceGroup.updateMany({ household: req.householdId },
      { $pull: { devices: device._id } }
    );

    await ROUTINE.updateMany( { household: req.householdId },
      { $pull: { actions: { device: device._id } } }
    )

    res.json({ message: "Device deleted successfully" })

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const simulateMalfunction = async (req, res) => {
  try {

    const device = await DEVICE.findOne({ _id: req.params.id, household: req.householdId })

    if (!device) {
      return res.status(404).json({ message: "Device not found" })
    }

    device.malfunction = true
    device.status = "Malfunctioning"
    await device.save()

    await ALERT.create({household: req.householdId,device: device._id,
      message: `${device.name} is malfunctioning Please reset it`
    });

    res.json({ message: "Malfunction alert created", device });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const resetDevice = async (req, res) => {
  try {
    const device = await DEVICE.findOne({ _id: req.params.id, household: req.householdId })
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    await setPower(device, false)
    device.malfunction = false
    device.status = device.connected ? "Off" : "Standby"
    await device.save()

    await ALERT.updateMany({ household: req.householdId, device: device._id },
      { resolved: true }
    );

    res.json({ message: "Device reset successfully", device })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
};

const getDevices = async (req, res) => {
  try {

    const devices = await DEVICE.find({ household: req.householdId }).populate("room", "name")

    res.json(devices)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
};

module.exports = {createDevice,connectDevice,disconnectDevice,changePower,updateFeatures,deleteDevice,simulateMalfunction,resetDevice,getDevices}