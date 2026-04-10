import express from "express";
import {
  getData,
  createData,
  updateData,
  editData,
  deleteData,
} from "../controllers/userController.js";
import {
  register,
  login,
  refreshAccessToken,
  logout,
} from "./authController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// ===== AUTH ROUTES (Public) =====
router.post("/auth/register", register);
router.post("/auth/login", login);
router.post("/auth/refresh", refreshAccessToken);

// ===== PROTECTED ROUTES (Require authentication) =====
router.post("/auth/logout", verifyToken, logout);

// GET all users
router.get("/overview", verifyToken, getData);

// POST - Create new user
router.post("/create", verifyToken, createData);

// PUT - Update entire user
router.put("/add", verifyToken, updateData);

// PATCH - Partially update user
router.patch("/edit", verifyToken, editData);

// DELETE - Remove user
router.delete("/delete", verifyToken, deleteData);

export default router;
