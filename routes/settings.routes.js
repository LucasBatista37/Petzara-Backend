const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");
const authMiddleware = require("../middlewares/authMiddleware");

// Rotas protegidas (apenas admin ou colaborador)
router.use(authMiddleware);

router.get("/", settingsController.getSettings);
router.put("/", settingsController.updateSettings);

module.exports = router;
