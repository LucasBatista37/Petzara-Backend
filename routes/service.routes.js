const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const subscriptionMiddleware = require("../middlewares/subscriptionMiddleware");
const serviceMiddleware = require("../middlewares/serviceMiddleware");
const {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  deleteService,
  reorderServices,
} = require("../controllers/serviceController");

const {
  serviceValidationRules,
  validateService,
} = require("../validators/serviceValidator");

router.use(authMiddleware);
router.use(subscriptionMiddleware);

router.post("/", serviceValidationRules, validateService, createService);
router.get("/", getAllServices);
router.get("/:id", serviceMiddleware, getServiceById);
router.put(
  "/:id",
  serviceMiddleware,
  serviceValidationRules,
  validateService,
  updateService
);
router.post("/reorder", reorderServices);
router.delete("/:id", serviceMiddleware, deleteService);

module.exports = router;
