const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const rateLimit = require("express-rate-limit");
const emailCooldown = require("../middlewares/emailCooldown");
const {
  validateRegister,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword,
} = require("../validators/authValidator");

const {
  register,
  verifyEmail,
  resendVerificationEmail,
  login,
  updateProfile,
  deleteProfile,
  getProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
} = require("../controllers/authController");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Muitas tentativas de login. Tente novamente mais tarde.",
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: "Muitas tentativas de cadastro. Tente novamente mais tarde.",
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  message: "Muitas requisições de senha. Tente novamente mais tarde.",
});

router.post("/register", registerLimiter, validateRegister, register);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", emailCooldown, resendVerificationEmail);
router.post("/login", loginLimiter, login);
router.post("/refresh", authMiddleware, refreshToken);
router.post("/logout", authMiddleware, logout);
router.put("/me", authMiddleware, updateProfile);
router.delete("/me", authMiddleware, deleteProfile);
router.get("/me", authMiddleware, getProfile);
router.put(
  "/change-password",
  authMiddleware,
  validateChangePassword,
  changePassword
);
router.post("/forgot-password", passwordResetLimiter, validateForgotPassword, forgotPassword);
router.post("/reset-password", passwordResetLimiter, validateResetPassword, resetPassword);

module.exports = router;
