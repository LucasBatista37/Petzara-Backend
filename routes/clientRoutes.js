const express = require("express");
const router = express.Router();
const clientController = require("../controllers/clientController");
const authMiddleware = require("../middlewares/authMiddleware");
const subscriptionMiddleware = require("../middlewares/subscriptionMiddleware");

router.use(authMiddleware);
router.use(subscriptionMiddleware);

router.post("/", clientController.createClient);
router.get("/", clientController.getAllClients);
router.get("/:id", clientController.getClientById);
router.put("/:id", clientController.updateClient);
router.delete("/:id", clientController.deleteClient);
router.get("/:id/history", clientController.getClientHistory);
router.post("/reorder", clientController.reorderClients);

module.exports = router;
