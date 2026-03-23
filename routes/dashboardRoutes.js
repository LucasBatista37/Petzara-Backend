const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { getStats, getSetupProgress } = require("../controllers/dashboardController");

router.get("/stats", authMiddleware, getStats);
router.get("/setup-progress", authMiddleware, getSetupProgress);

module.exports = router;
