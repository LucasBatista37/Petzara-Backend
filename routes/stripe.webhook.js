const express = require("express");
const webhookRouter = express.Router();
const { getStripe } = require("../utils/stripeClient");
const User = require("../models/User");
const { generateWelcomeEmail, generateTrialEndedEmail } = require("../utils/emailTemplates");
const transporter = require("../utils/mailer");

webhookRouter.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const stripe = getStripe();
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      console.log(`[WEBHOOK] Evento recebido: ${event.type}`);
    } catch (err) {
      console.error("[WEBHOOK] Erro na validação de assinatura:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      const data = event.data.object;

      const updateUserSubscription = async (
        customerId,
        subscriptionId,
        status,
        currentPeriodStart,
        currentPeriodEnd
      ) => {
        const update = {
          subscription: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            status,
            currentPeriodStart,
            currentPeriodEnd,
          },
        };
        console.log(
          `[WEBHOOK] Atualizando usuário: ${customerId}, status: ${status}, currentPeriod: ${currentPeriodStart} - ${currentPeriodEnd}`
        );
        return await User.findOneAndUpdate(
          { "subscription.stripeCustomerId": customerId },
          update,
          { new: true }
        );
      };

      const getFreshSubscription = async (subscriptionId) => {
        console.log(`[WEBHOOK] Buscando assinatura fresca: ${subscriptionId}`);
        return await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ["latest_invoice.payment_intent", "latest_invoice.lines"],
        });
      };

      const resolveCurrentPeriod = (subscription, invoice) => {
        let start = null;
        let end = null;

        if (
          subscription?.current_period_start &&
          subscription?.current_period_end
        ) {
          start = new Date(subscription.current_period_start * 1000);
          end = new Date(subscription.current_period_end * 1000);
        } else if (invoice?.lines?.data?.length) {
          const lastLine = invoice.lines.data[invoice.lines.data.length - 1];
          start = lastLine.period?.start
            ? new Date(lastLine.period.start * 1000)
            : null;
          end = lastLine.period?.end
            ? new Date(lastLine.period.end * 1000)
            : null;
        }

        return { start, end };
      };

      switch (event.type) {
        case "checkout.session.completed":
          if (!data.subscription) break;
          console.log(
            `[WEBHOOK] checkout.session.completed para cliente: ${data.customer}`
          );
          const subscriptionForCheckout = await getFreshSubscription(
            data.subscription
          );
          const { start, end } = resolveCurrentPeriod(
            subscriptionForCheckout,
            subscriptionForCheckout.latest_invoice
          );
          await updateUserSubscription(
            data.customer,
            data.subscription,
            "active",
            start,
            end
          );
          break;

        case "customer.subscription.created":
        case "customer.subscription.updated":
          try {
            const subscription = await getFreshSubscription(data.id);
            const { start, end } = resolveCurrentPeriod(
              subscription,
              subscription.latest_invoice
            );

            const user = await updateUserSubscription(
              subscription.customer,
              subscription.id,
              subscription.status,
              start,
              end
            );

            console.log(
              `[WEBHOOK] Assinatura ${event.type} atualizada: ${subscription.id}, status: ${subscription.status}`
            );

            if (event.type === "customer.subscription.created" && user) {
              console.log(
                `[WEBHOOK] Enviando e-mail de boas-vindas para: ${user.email}`
              );

              try {
                await transporter.sendMail({
                  from: `"Petzara" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
                  to: user.email,
                  subject: "🎉 Bem-vindo ao Petzara!",
                  html: generateWelcomeEmail(user.name),
                });
              } catch (err) {
                console.error(`[WEBHOOK EMAIL FAIL] Erro ao enviar email de boas vindas para ${user.email}`, err);
              }
            } else if (
              event.type === "customer.subscription.updated" &&
              event.data.previous_attributes?.status === "trialing" &&
              ["past_due", "canceled", "incomplete"].includes(subscription.status) &&
              user
            ) {
              console.log(
                `[WEBHOOK] Período de teste terminou para: ${user.email}`
              );

              try {
                await transporter.sendMail({
                  from: `"Petzara" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
                  to: user.email,
                  subject: "⚠️ Seu período de teste terminou",
                  html: generateTrialEndedEmail(user.name),
                });
              } catch (err) {
                console.error(`[WEBHOOK EMAIL FAIL] Erro ao enviar email de fim de trial para ${user.email}`, err);
              }
            }
          } catch (err) {
            console.error(
              `[WEBHOOK] Erro ao atualizar assinatura: ${err.message}`
            );
            return res.status(500).send("Erro interno ao processar assinatura");
          }
          break;

        case "customer.subscription.trial_will_end":
          try {
            const user = await User.findOne({
              "subscription.stripeCustomerId": data.customer,
            });

            if (user) {
              console.log(
                `[WEBHOOK] Trial vai expirar para ${user.email
                }, fim em ${new Date(data.trial_end * 1000)}`
              );

              await transporter.sendMail({
                from: `"Petzara" <${process.env.EMAIL_USER}>`,
                to: user.email,
                subject: "⏰ Seu período de teste está acabando!",
                html: `
                  <p>Olá ${user.name},</p>
                  <p>Seu período de teste gratuito do <strong>Petzara</strong> vai terminar em <strong>${new Date(
                  data.trial_end * 1000
                ).toLocaleDateString("pt-BR")}</strong>.</p>
                  <p>Adicione uma forma de pagamento agora para continuar usando sem interrupções.</p>
                  <a href="${process.env.FRONTEND_URL
                  }/billing" style="background:#4f46e5;color:#fff;padding:10px 20px;border-radius:5px;text-decoration:none;">Adicionar Pagamento</a>
                `,
              });
            }
          } catch (err) {
            console.error(
              `[WEBHOOK] Erro ao processar trial_will_end: ${err.message}`
            );
          }
          break;

        case "invoice.paid":
        case "invoice.payment_succeeded":
          if (!data.subscription) break;
          console.log(
            `[WEBHOOK] Pagamento bem-sucedido para assinatura: ${data.subscription}`
          );
          const subscriptionInvoice = await getFreshSubscription(
            data.subscription
          );
          const { start: startInvoice, end: endInvoice } = resolveCurrentPeriod(
            subscriptionInvoice,
            data
          );
          await updateUserSubscription(
            subscriptionInvoice.customer,
            subscriptionInvoice.id,
            "active",
            startInvoice,
            endInvoice
          );
          break;

        case "invoice.payment_failed":
          console.warn(
            `[WEBHOOK] Pagamento falhou para cliente: ${data.customer}`
          );
          await User.findOneAndUpdate(
            { "subscription.stripeCustomerId": data.customer },
            { "subscription.status": "past_due" },
            { new: true }
          );
          break;

        case "customer.subscription.deleted":
          console.warn(`[WEBHOOK] Assinatura cancelada: ${data.id}`);
          await User.findOneAndUpdate(
            { "subscription.stripeSubscriptionId": data.id },
            { "subscription.status": "canceled" },
            { new: true }
          );
          break;

        default:
          console.log(`[WEBHOOK] Evento não tratado: ${event.type}`);
          break;
      }

      res.sendStatus(200);
    } catch (err) {
      console.error("[WEBHOOK] Erro inesperado:", err.message);
      res.status(500).send("Erro inesperado no servidor");
    }
  }
);

module.exports = webhookRouter;
