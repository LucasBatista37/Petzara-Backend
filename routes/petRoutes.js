const express = require("express");
const router = express.Router();
const petController = require("../controllers/petController");
const authMiddleware = require("../middlewares/authMiddleware");
const subscriptionMiddleware = require("../middlewares/subscriptionMiddleware");

router.use(authMiddleware);
router.use(subscriptionMiddleware);

router.post("/", petController.createPet);
router.get("/", petController.getAllPets);
router.get("/:id", petController.getPetById);
router.put("/:id", petController.updatePet);
router.delete("/:id", petController.deletePet);
router.get("/:id/history", petController.getPetHistory);
router.post("/reorder", petController.reorderPets);

module.exports = router;
