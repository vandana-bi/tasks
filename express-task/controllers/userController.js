import User from "../models/User.js";

// GET all users
export const getData = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message,
    });
  }
};

// POST - Create a new user
export const createData = async (req, res) => {
  try {
    const { name, email, phone, address, city, country } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and phone are required",
      });
    }

    const newUser = new User({
      name,
      email,
      phone,
      address,
      city,
      country,
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: newUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating user",
      error: error.message,
    });
  }
};

// PUT - Replace entire user
export const updateData = async (req, res) => {
  try {
    const { id } = req.query;
    const { name, email, phone, address, city, country } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { name, email, phone, address, city, country },
      { new: true, runValidators: true },
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating user",
      error: error.message,
    });
  }
};

// PATCH - Partially update user
export const editData = async (req, res) => {
  try {
    const { id } = req.query;
    const updates = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Only allow specific fields to be updated
    const allowedUpdates = [
      "name",
      "email",
      "phone",
      "address",
      "city",
      "country",
    ];
    const invalidUpdates = Object.keys(updates).filter(
      (key) => !allowedUpdates.includes(key),
    );

    if (invalidUpdates.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid fields: ${invalidUpdates.join(", ")}`,
      });
    }

    const updatedUser = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating user",
      error: error.message,
    });
  }
};

// DELETE - Remove a user
export const deleteData = async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
      data: deletedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting user",
      error: error.message,
    });
  }
};
