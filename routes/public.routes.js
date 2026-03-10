const express = require("express");
const router = express.Router();
const publicController = require("../controllers/publicController");

// Rota pública para consultar horários 
router.get("/schedule/:customUrl", publicController.getPublicSchedule);

module.exports = router;
