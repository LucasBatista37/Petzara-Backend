const ALLOWED_STATUSES = ["active", "trialing", "past_due"];

module.exports = (req, res, next) => {
  const status = req.user?.subscription?.status;

  if (ALLOWED_STATUSES.includes(status)) {
    return next();
  }

  return res.status(403).json({
    message: "Sua assinatura não está ativa. Assine para continuar usando o sistema.",
    code: "SUBSCRIPTION_INACTIVE",
    subscriptionStatus: status || "inactive",
  });
};
