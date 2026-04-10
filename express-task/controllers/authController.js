import User from "../models/User.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  "your-refresh-secret-key-change-in-production";
const JWT_EXPIRY = "15m";
const REFRESH_EXPIRY = "7d";

// Generate tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  });

  const refreshToken = jwt.sign({ id: userId }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRY,
  });

  return { accessToken, refreshToken };
};

// REGISTER - Create new user account
export const register = async (req, res) => {
  try {
    const { name, email, password, phone, address, city, country } = req.body;

    // Validation
    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password, and phone are required",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Create new user
    const newUser = new User({
      name,
      email,
      password,
      phone,
      address,
      city,
      country,
    });

    await newUser.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(newUser._id);

    // Save refresh token to database
    newUser.refreshToken = refreshToken;
    await newUser.save();

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error registering user",
      error: error.message,
    });
  }
};

// LOGIN - Authenticate user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user and include password field
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Save refresh token to database
    user.refreshToken = refreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error logging in",
      error: error.message,
    });
  }
};

// REFRESH TOKEN - Get new access token
export const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token required",
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    // Find user and verify refresh token
    const user = await User.findById(decoded.id).select("+refreshToken");
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      user._id,
    );

    // Save new refresh token
    user.refreshToken = newRefreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error refreshing token",
      error: error.message,
    });
  }
};

// LOGOUT - Clear refresh token
export const logout = async (req, res) => {
  try {
    const userId = req.user.id;

    // Clear refresh token
    await User.findByIdAndUpdate(userId, { refreshToken: null });

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error logging out",
      error: error.message,
    });
  }
};
