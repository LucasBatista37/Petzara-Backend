const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const subscriptionMiddleware = require("../middlewares/subscriptionMiddleware");
const { getStats, getSetupProgress } = require("../controllers/dashboardController");

router.get("/stats", authMiddleware, subscriptionMiddleware, getStats);
router.get("/setup-progress", authMiddleware, subscriptionMiddleware, getSetupProgress);

module.exports = router;
