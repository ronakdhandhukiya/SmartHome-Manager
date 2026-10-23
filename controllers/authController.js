const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const User = require("../models/User")

const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" })
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() })

    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = new User({name,email: email.toLowerCase(),password: hashedPassword,role: role || "Member" })

    await user.save()

    res.status(201).json({ message: "Account created successfully",
       userId: user._id
    })

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" })
    }

    const user = await User.findOne({ email: email.toLowerCase() })

    if (!user) {
      return res.status(401).json({ message: "User with this email does not exist" })
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id },process.env.JWT_SECRET,
      { expiresIn: "24h" }
    )

    res.json({message: "Login successful",token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        household: user.household
      }
    });
  } catch (error) {

    res.status(500).json({ message: error.message });
  }
};

const logout = (req, res) => {
  res.json({ message: "Logged out successfully" })
};

const myProfile = async (req, res) => {
  try {
    res.json({
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      household: req.user.household
    });
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
};

module.exports = { register, login, logout, myProfile };