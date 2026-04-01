const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const subscriptionMiddleware = require("../middlewares/subscriptionMiddleware");
const appointmentMiddleware = require("../middlewares/appointmentMiddleware");
const {
  appointmentValidationRules,
  validateAppointment,
} = require("../validators/appointmentValidator");

const {
  createAppointment,
  getAllAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
  updateSortPreference
} = require("../controllers/appointmentController");

router.use(authMiddleware);
router.use(subscriptionMiddleware);

router.post(
  "/",
  appointmentValidationRules,
  validateAppointment,
  createAppointment
);
router.get("/", getAllAppointments);

router.put("/sort-preference", updateSortPreference);

router.get("/:id", appointmentMiddleware, getAppointmentById);

router.put(
  "/:id",
  appointmentMiddleware,
  appointmentValidationRules,
  validateAppointment,
  updateAppointment
);

router.delete("/:id", appointmentMiddleware, deleteAppointment);

module.exports = router;
