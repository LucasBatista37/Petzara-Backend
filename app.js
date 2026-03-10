const express = require("express");
const cors = require("cors");
const Sentry = require("@sentry/node");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth.routes");
const serviceRoutes = require("./routes/service.routes");
const indexRoutes = require("./routes/index.routes");
const appointmentRoutes = require("./routes/appointment.routes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const collaboratorRoutes = require("./routes/collaborator");
const supportRoutes = require("./routes/support.routes.js");
const stripeRoutes = require("./routes/stripe.routes");
const stripeWebhook = require("./routes/stripe.webhook");
const clientRoutes = require("./routes/clientRoutes");
const petRoutes = require("./routes/petRoutes");
const financialRoutes = require("./routes/financialRoutes");

const app = express();

Sentry.init({ dsn: process.env.SENTRY_DSN });
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

app.set("trust proxy", 1);
app.use(cookieParser());

const allowedOrigins = [
  "http://localhost:5173",
  "https://pet-shop-agendamento-sistema.vercel.app",
  "https://www.petcarezone.shop",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use("/api/stripe/webhook", stripeWebhook);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api", indexRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/collaborators", collaboratorRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/stripe", stripeRoutes);
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/clients", clientRoutes);
app.use("/api/pets", petRoutes);
app.use("/api/financial", financialRoutes);
app.use("/api/settings", require("./routes/settings.routes"));
app.use("/api/public", require("./routes/public.routes"));

app.get("/", (req, res) => {
  res.send("🚀 API do PetShop SaaS está no ar!");
});

app.use(Sentry.Handlers.errorHandler());

if (!process.env.JWT_SECRET) {
  throw new Error("❌ JWT_SECRET não está definido!");
}

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("❌ STRIPE_SECRET_KEY não está definido!");
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error("❌ STRIPE_WEBHOOK_SECRET não está definido!");
}

module.exports = app;
