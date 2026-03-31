import express from "express";
import {
  login,
  logout,
  signup,
  forgotPassword,
  resetPassword,
  checkAuth,
} from "../controllers/auth.controller.js";

import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// ✅ Check if user is logged in
router.get("/check-auth", verifyToken, checkAuth);

// ✅ Public Routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

// router.post("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPassword);

// ✅ Reset password with token in URL
router.post("/reset-password/:token", resetPassword);

export default router;
