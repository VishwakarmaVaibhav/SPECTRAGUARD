const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

const createToken = (_id) => {
  const secret = process.env.JWT_SECRET || "default_super_secret_for_development";
  return jwt.sign({ _id }, secret, { expiresIn: "3d" });
};

/**
 * POST /api/auth/login
 * Verifies credentials and returns JWT
 */
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = createToken(user._id);

    res.status(200).json({
      username: user.username,
      role: user.role,
      token,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;
