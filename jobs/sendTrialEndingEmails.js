const cron = require("node-cron");
const User = require("../models/User");
const { generateTrialEndingEmail } = require("../utils/emailTemplates");
const transporter = require("../utils/mailer");

async function sendTrialEndingEmail(user) {
  const html = generateTrialEndingEmail(user.name);

  try {
    await transporter.sendMail({
      from: `"PetCare" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Seu trial está acabando! Ative sua assinatura",
      html,
    });
  } catch (err) {
    console.error(`[TRIAL EMAIL FAIL] Falha ao enviar para ${user.email}`, err);
  }
}

async function checkTrialEndingUsers() {
  const now = new Date();

  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + 3);

  const users = await User.find({
    "subscription.status": "trialing",
    "subscription.currentPeriodEnd": {
      $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
      $lte: new Date(targetDate.setHours(23, 59, 59, 999)),
    },
  });

  for (const user of users) {
    try {
      await sendTrialEndingEmail(user);
      console.log(`[TRIAL EMAIL] Enviado para: ${user.email}`);
    } catch (err) {
      console.error(`[TRIAL EMAIL] Erro ao enviar para ${user.email}:`, err.message);
    }
  }
}

cron.schedule("0 9 * * *", () => {
  console.log("[CRON] Verificando trials próximos do fim...");
  checkTrialEndingUsers();
});

module.exports = { checkTrialEndingUsers };
