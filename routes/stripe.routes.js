const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const User = require("../models/User");
const rateLimit = require("express-rate-limit");

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: "Muitas tentativas de checkout. Tente novamente mais tarde.",
});

router.post("/create-checkout-session", checkoutLimiter, async (req, res) => {
  try {
    const { priceId, customerEmail } = req.body;
    console.log(
      `[CHECKOUT] Iniciando checkout para: ${customerEmail}, priceId: ${priceId}`
    );

    const user = await User.findOne({ email: customerEmail });
    if (!user) {
      console.warn(`[CHECKOUT] Usuário não encontrado: ${customerEmail}`);
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    if (["active", "trialing"].includes(user.subscription?.status)) {
      console.warn(
        `[CHECKOUT] Usuário já possui assinatura ativa: ${user.email}`
      );
      return res.status(400).json({
        error: "Usuário já possui assinatura ativa",
        subscriptionId: user.subscription.stripeSubscriptionId,
      });
    }

    let customerId = user.subscription?.stripeCustomerId;

    if (!customerId) {
      console.log(`[CHECKOUT] Criando novo cliente Stripe para ${user.email}`);
      const customer = await stripe.customers.create({
        email: customerEmail,
        name: user.name,
      });
      customerId = customer.id;

      user.subscription = Object.assign({}, user.subscription, {
        stripeCustomerId: customerId,
      });
      await user.save();

      console.log(
        `[CHECKOUT] Cliente Stripe criado e vinculado: ${customerId}`
      );
    } else {
      console.log(`[CHECKOUT] Cliente Stripe já existente: ${customerId}`);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
    });

    console.log(
      `[CHECKOUT] Sessão criada com sucesso. sessionId: ${session.id}`
    );

    res.json({ url: session.url });
  } catch (err) {
    console.error("[CHECKOUT] Erro ao criar sessão de checkout:", err.message);
    res.status(500).json({ error: "Erro ao criar sessão de checkout" });
  }
});

module.exports = router;
