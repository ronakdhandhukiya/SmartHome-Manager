const DEVICE = require("../models/Device")
const UsageLog = require("../models/UsageLog")
const ALERT = require("../models/Alert")

const getEnergyReport = async (req, res) => {
  try {
    const logs = await UsageLog.find({ household: req.householdId });
    const totals = {};

    function addUsage(name, minutes, kwh) {
      if (!totals[name]) {
        totals[name] = { minutes: 0, kWh: 0 };
      }
      totals[name].minutes += minutes;
      totals[name].kWh += kwh;
    }

    for (const log of logs) {
      addUsage(log.deviceName, log.minutes, log.kWh || 0);
    }

    const runningDevices = await DEVICE.find({
      household: req.householdId,
      power: true,
      turnedOnAt: { $ne: null }
    });

    for (const device of runningDevices) {
      const minutes = Math.max(0, (Date.now() - new Date(device.turnedOnAt).getTime()) / 60000);
      addUsage(device.name, minutes, (device.watts * minutes) / 60000);
    }

    const report = Object.entries(totals).map(([name, usage]) => ({
      deviceName: name,
      minutes: Math.round(usage.minutes * 100) / 100,
      kWh: Math.round(usage.kWh * 1000) / 1000
    }));

    const totalKWh = report.reduce((sum, item) => sum + item.kWh, 0);

    res.json({ report, totalKWh: Math.round(totalKWh * 1000) / 1000 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAlerts = async (req, res) => {
  try {
    const alerts = await ALERT.find({ household: req.householdId }).sort({ createdAt: -1 });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getEfficiencyTips = async (req, res) => {
  try {
    const devices = await DEVICE.find({ household: req.householdId });
    const tips = [];

    for (const device of devices) {
      if (device.power && device.watts >= 1000) {
        tips.push({
          device: device.name,
          suggestion: "Consider switching this high-wattage appliance off when not in use."
        });
      }

      if (device.type === "AC" && device.power) {
        tips.push({
          device: device.name,
          suggestion: "Try a scheduled routine to prevent the AC from running indefinitely."
        });
      }

      if (
        device.type === "Lamp" &&
        device.power &&
        device.features &&
        device.features.brightness > 70
      ) {
        tips.push({
          device: device.name,
          suggestion: "Try lowering the lamp brightness below 70% to conserve energy."
        });
      }
    }

    if (tips.length === 0) {
      tips.push({
        suggestion: "All current device states look optimal. Keep unused appliances turned off."
      });
    }

    res.json(tips);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getEnergyReport, getAlerts, getEfficiencyTips };