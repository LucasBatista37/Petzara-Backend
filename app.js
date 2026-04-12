require("dotenv").config();

if (!process.env.JWT_SECRET?.trim()) {
  throw new Error("❌ JWT_SECRET não está definido!");
}
if (!process.env.STRIPE_SECRET_KEY?.trim()) {
  throw new Error("❌ STRIPE_SECRET_KEY não está definido!");
}
if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
  throw new Error("❌ STRIPE_WEBHOOK_SECRET não está definido!");
}

const express = require("express");
const cors = require("cors");
const Sentry = require("@sentry/node");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const { randomUUID } = require("crypto");

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

const tracesSampleRate = Number(
  process.env.SENTRY_TRACES_SAMPLE_RATE != null &&
    process.env.SENTRY_TRACES_SAMPLE_RATE !== ""
    ? process.env.SENTRY_TRACES_SAMPLE_RATE
    : process.env.NODE_ENV === "production"
      ? 0.1
      : 1.0
);

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate,
});
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

app.set("trust proxy", 1);
app.use(cookieParser());

app.use((req, res, next) => {
  const id = req.headers["x-request-id"] || randomUUID();
  req.id = id;
  res.setHeader("X-Request-Id", id);
  next();
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

const extraOrigins = process.env.CORS_EXTRA_ORIGINS
  ? process.env.CORS_EXTRA_ORIGINS.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : [];

const allowedOrigins = [
  "http://localhost:5173",
  "https://pet-shop-agendamento-sistema.vercel.app",
  "https://app.petzara.app",
  ...extraOrigins,
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

const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_GLOBAL_MAX || 400),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/health",
});

const publicApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_PUBLIC_MAX || 120),
  standardHeaders: true,
  legacyHeaders: false,
});

app.use((req, res, next) => {
  if (!req.path.startsWith("/api")) return next();
  return globalApiLimiter(req, res, next);
});

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
app.use("/api/public", publicApiLimiter, require("./routes/public.routes"));

app.get("/", (req, res) => {
  res.send("🚀 API do PetShop SaaS está no ar!");
});

app.use(Sentry.Handlers.errorHandler());

module.exports = app;
