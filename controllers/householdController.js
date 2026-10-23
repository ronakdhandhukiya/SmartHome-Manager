const HOUSEHOLD = require("../models/Household")
const USER = require("../models/User")

const createHousehold = async (req, res) => {
  try {
    if (req.user.household) {
      return res.status(400).json({ message: "You already belong to a household" })
    }

    if (!req.body.name) {
      return res.status(400).json({ message: "Household name is required" });
    }

    const home = new HOUSEHOLD({name: req.body.name, owner: req.user._id,
      members: [req.user._id]
    });
    
    await home.save()

    req.user.household = home._id;
    req.user.role = "Admin";
    await req.user.save();

    res.status(201).json({ message: "Household created successfully", home });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getHousehold = async (req, res) => {
  try {
    const home = await HOUSEHOLD.findById(req.householdId)
    if (!home) {
      return res.status(404).json({ message: "Household not found" });
    }

    const members = await USER.find({ household: req.householdId }).select("name email role");
    res.json({ home, members })
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addMember = async (req, res) => {
  try {
    const { email, role } = req.body

    if (!["Member", "Child", "Guest"].includes(role)) {
      return res.status(400).json({ message: "Role must be Member, Child, or Guest" })
    }

    const person = await USER.findOne({ email });
    if (!person) {
      return res.status(404).json({ message: "Please register this user before adding" })
    }

    if (person.household) {
      return res.status(400).json({ message: "This user already belongs to a household" });
    }

    person.household = req.householdId;
    person.role = role;
    await person.save();

    await HOUSEHOLD.findByIdAndUpdate(req.householdId, {
      $addToSet: { members: person._id }
    });

    res.json({ message: "Member added successfully", person })
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const removeMember = async (req, res) => {
  try {
    const person = await USER.findOne({ _id: req.params.id,
      household: req.householdId
    });

    if (!person) {
      return res.status(404).json({ message: "Member not found" })
    }

    if (person._id.equals(req.user._id)) {
      return res.status(400).json({ message: "You cannot remove yourself" })
    }

    const home = await HOUSEHOLD.findById(req.householdId);

    if (person._id.equals(home.owner)) 
      {
      return res.status(400).json({ message: "Transfer household ownership before removing its owner" });
    }

    person.household = null
    person.role = "Member"

    await person.save();
    

    await HOUSEHOLD.findByIdAndUpdate(req.householdId, {
      $pull: { members: person._id }
    });

    res.json({ message: "Member removed from household" })

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createHousehold, getHousehold, addMember, removeMember };