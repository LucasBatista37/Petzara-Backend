const express = require("express");
const router = express.Router();
const controller = require("../controllers/collaboratorController");
const {
  validateInvite,
  validateAcceptInvite,
} = require("../validators/collaboratorValidator");
const { validationResult } = require("express-validator");
const authMiddleware = require("../middlewares/authMiddleware");
const subscriptionMiddleware = require("../middlewares/subscriptionMiddleware");

const runValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
};

router.post(
  "/accept-invite",
  validateAcceptInvite,
  runValidation,
  controller.acceptInvite
);

router.use(authMiddleware);
router.use(subscriptionMiddleware);

router.post(
  "/invite",
  validateInvite,
  runValidation,
  controller.inviteCollaborator
);
router.post("/reorder", controller.reorderCollaborators);
router.get("/", controller.getAllCollaborators);
router.put("/:id", controller.updateCollaborator);
router.delete("/:id", controller.deleteCollaborator);

module.exports = router;
