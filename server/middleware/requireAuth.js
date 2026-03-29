const jwt = require("jsonwebtoken");
const User = require("../models/User");

const requireAuth = async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).json({ error: "Authorization token required" });
  }

  const token = authorization.split(" ")[1];

  try {
    const secret = process.env.JWT_SECRET || "default_super_secret_for_development";
    const { _id } = jwt.verify(token, secret);

    req.user = await User.findById(_id).select("_id username role");
    if (!req.user) {
      return res.status(401).json({ error: "User not found" });
    }
    
    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    res.status(401).json({ error: "Request is not authorized" });
  }
};

module.exports = requireAuth;
