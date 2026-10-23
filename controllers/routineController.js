const ROUTINE = require("../models/Routine")
const DEVICE = require("../models/Device")

const createRoutine = async (req, res) => {
  try {
    const { name, time, actions } = req.body;

    if (!name || !time) {
      return res.status(400).json({ message: "Enter a name and time in HH:MM format" });
    }

    if (!Array.isArray(actions) || actions.length === 0) {
      return res.status(400).json({ message: "Add at least one device action" })
    }

    for (const action of actions) {
      const device = await DEVICE.findOne({_id: action.device,
        household: req.householdId
      });

      if (!device || typeof action.power !== "boolean") {
        
        return res.status(400).json({
          message: "Each action needs a valid household device and a boolean power state"
        });
      }
    }

    const routine = new ROUTINE({ ...req.body, household: req.householdId
    })

    await routine.save();
    res.status(201).json(routine);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}



const getRoutines = async (req, res) => {
  
  try {

    const routines = await ROUTINE.find({ household: req.householdId }).populate("actions.device", "name type")
    res.json(routines);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateRoutine = async (req, res) => {
  try {
    const routine = await ROUTINE.findOne({ _id: req.params.id,
      household: req.householdId
    });

    if (!routine) {
      return res.status(404).json({ message: "Routine not found" })
    }

    if (req.body.name !== undefined) {
      routine.name = req.body.name;
    }

    if (req.body.time !== undefined) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(req.body.time)) {
        return res.status(400).json({ message: "Invalid time format (HH:MM required)" })
      }
      routine.time = req.body.time;
    }

    if (req.body.active !== undefined) {
      routine.active = req.body.active;
    }

    if (req.body.actions !== undefined) {
      if (!Array.isArray(req.body.actions)) {
        return res.status(400).json({ message: "Actions must be an array" });
      }

      for (const action of req.body.actions) {

        const device = await DEVICE.findOne({ _id: action.device,
          household: req.householdId
        });

        if (!device || typeof action.power !== "boolean") {
          return res.status(400).json({ message: "Invalid device action specified" })
        }
      }
      routine.actions = req.body.actions
    }

    await routine.save();
    res.json({ message: "Routine updated", routine })
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteRoutine = async (req, res) => {
  try {
    const routine = await ROUTINE.findOneAndDelete({ _id: req.params.id,
      household: req.householdId
    });

    if (!routine) {
      return res.status(404).json({ message: "Routine not found" })
    }

    res.json({ message: "Routine deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
};

module.exports = { createRoutine, getRoutines, updateRoutine, deleteRoutine }