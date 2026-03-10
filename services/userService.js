const bcrypt = require("bcryptjs");
const User = require("../models/User");
const crypto = require("crypto");

async function createUser({
  name,
  petshopName,
  email,
  phone,
  password,
  department,
  role = "admin",
  owner = null,
  isVerified = false,
  pendingInvitation = false,
  skipEmailToken = false,
}) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const emailToken = skipEmailToken
    ? null
    : crypto.randomBytes(32).toString("hex");

  const now = new Date();
  const freeTrialEnd = new Date();
  freeTrialEnd.setMonth(freeTrialEnd.getMonth() + 1);

  const userData = {
    name,
    petshopName,
    email,
    phone,
    password: hashedPassword,
    department,
    role,
    owner,
    isVerified,
    pendingInvitation,
    subscription: {
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      status: "trialing",
      currentPeriodStart: now,
      currentPeriodEnd: freeTrialEnd,
    },
  };

  if (!skipEmailToken) {
    userData.emailToken = emailToken;
  }

  const user = await User.create(userData);

  return { user, emailToken };
}

module.exports = { createUser };
