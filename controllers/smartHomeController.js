const DEVICE = require("../models/Device")
const DeviceGroup = require("../models/DeviceGroup")
const HOUSEHOLD = require("../models/Household")
const ROUTINE = require("../models/Routine")
const UsageLog = require("../models/UsageLog")
const ALERT = require("../models/Alert")

async function switchDevice(device, power) {
  if (power && !device.connected) {
    throw new Error(`${device.name} must be connected first`);
  }

  if (power && device.malfunction) {
    throw new Error(`${device.name} is malfunctioning`);
  }

  if (power && !device.power) {
    device.power = true;
    device.status = "On";
    device.turnedOnAt = new Date();
  }

  if (!power && device.power) {
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

    device.power = false;
    device.status = "Off";
    device.turnedOnAt = null;
  }

  await device.save();
}

const createGroup = async (req, res) => {
  try {
    const { name, devices } = req.body;

    if (!name || !Array.isArray(devices) || devices.length === 0) {
      return res.status(400).json({ message: "Provide a group name and at least one device" });
    }

    const foundDevices = await DEVICE.find({
      _id: { $in: devices },
      household: req.householdId
    });

    if (foundDevices.length !== new Set(devices.map(String)).size) {
      return res.status(400).json({ message: "All devices must belong to your household" });
    }

    const group = await DeviceGroup.create({
      name,
      devices,
      household: req.householdId
    });

    res.status(201).json(group);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getGroups = async (req, res) => {
  try {
    const groups = await DeviceGroup.find({ household: req.householdId }).populate(
      "devices",
      "name type power status"
    );
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const runGroup = async (req, res) => {
  try {
    const group = await DeviceGroup.findOne({
      _id: req.params.id,
      household: req.householdId
    }).populate("devices");

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const power = req.body.power;
    if (typeof power !== "boolean") {
      return res.status(400).json({ message: "Power must be true or false" });
    }

    for (const device of group.devices) {
      if (req.user.role === "Child" && device.type === "Door Lock") {
        continue;
      }
      try {
        await switchDevice(device, power);
      } catch (err) {
        // Continue switching remaining devices
      }
    }

    res.json({ message: `${group.name} action completed`, group });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const group = await DeviceGroup.findOneAndDelete({
      _id: req.params.id,
      household: req.householdId
    });

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    res.json({ message: "Group deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const emergencyMode = async (req, res) => {
  try {

    const home = await HOUSEHOLD.findById(req.householdId);
    if (!home) {
      return res.status(404).json({ message: "Household not found" });
    }

    const devices = await DEVICE.find({ household: req.householdId });

    for (const device of devices) {

      if (device.type === "Door Lock") {
        device.features = { ...device.features, locked: true }
        await device.save();
      } else {
        await switchDevice(device, false);
      }
    }

    home.emergencyMode = true
    await home.save()

    res.json({ message: "Emergency mode activated" })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
};

const endEmergencyMode = async (req, res) => {
  try {
    const home = await HOUSEHOLD.findById(req.householdId);
    if (!home) {
      return res.status(404).json({ message: "Household not found" });
    }

    home.emergencyMode = false;
    await home.save();

    res.json({ message: "Emergency mode deactivated" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const voiceCommand = async (req, res) => {
  try {
    const command = (req.body.command || "").toLowerCase().trim();

    if (!command) {
      return res.status(400).json({ message: "Enter a voice command" });
    }

    const devices = await DEVICE.find({ household: req.householdId });
    let targetDevices = [];
    let shouldTurnOn = false;

    if (command.includes("light") || command.includes("lamp")) {
      targetDevices = devices.filter(device => device.type === "Lamp")
    } else if (command.includes("fan")) {
      targetDevices = devices.filter(device => device.type === "Fan")
    } else if (command.includes("all")) {
      targetDevices = devices.filter(device => device.type !== "Door Lock")
    } else {
      const words = command.split(/\s+/)
    
      targetDevices = devices.filter(
        device =>
          words.some(word => device.name.toLowerCase().includes(word)) &&
          device.type !== "Door Lock"
      );
    }

    if (command.startsWith("turn on") || command.startsWith("switch on")) {
      shouldTurnOn = true
    } else if (command.startsWith("turn off") || command.startsWith("switch off")) {
      shouldTurnOn = false;
    } else {
      return res.status(400).json({ message: 'Try "Turn on all lights" or "Turn off all fans"' })
    }

    if (!targetDevices.length) {
      return res.status(404).json({ message: "No matching devices found" })
    }

    const results = [];

    for (const device of targetDevices) {
      if (req.user.role === "Child" && device.type === "Door Lock") {
        continue;
      }

      try {
        await switchDevice(device, shouldTurnOn);
        results.push({ name: device.name, success: true });
      } catch (error) {
        results.push({ name: device.name, success: false, message: error.message });
      }
    }

    res.json({ message: "Voice command processed", results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const predictUsage = async (req, res) => {
  try {
    const logs = await UsageLog.find({ household: req.householdId });
    const devices = await DEVICE.find({ household: req.householdId });
    const suggestions = [];

    for (const device of devices) {
      const deviceLogs = logs.filter(log => String(log.device) === String(device._id))

      const morningLogs = deviceLogs.filter(log => {
        const hour = new Date(log.startedAt).getHours()
        return hour >= 6 && hour <= 9;
      });

      if (morningLogs.length >= 3) {
        suggestions.push({device: device.name,
          suggestion: "This device is often used in the morning. Consider creating a morning routine."
        });
      }

      const hourCounts = {};
      for (const log of deviceLogs) {
        const hour = new Date(log.startedAt).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }

      for (const [hour, count] of Object.entries(hourCounts)) {
        if (count >= 3 && !morningLogs.length) {
          suggestions.push({  device: device.name,  suggestion: `This device has repeated usage around ${hour}:00. Consider scheduling a routine.`
          })
          break
        }
      }
    }

    if (!suggestions.length) {

      suggestions.push({ suggestion: "More usage history is needed before reliable routine suggestions can be made."
      })
    }

    res.json(suggestions)

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

const getDashboard = async (req, res) => {
  try {

    const devices = await DEVICE.find({ household: req.householdId }).populate("room", "name")

    const alerts = await ALERT.find({ household: req.householdId, resolved: false });
    const home = await HOUSEHOLD.findById(req.householdId)

    res.json({household: home,devices,alerts,totalDevices: devices.length,
      runningDevices: devices.filter(device => device.power).length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {createGroup, getGroups,runGroup, deleteGroup, emergencyMode, endEmergencyMode, voiceCommand, predictUsage, getDashboard
}