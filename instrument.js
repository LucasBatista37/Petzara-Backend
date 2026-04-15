const Sentry = require('@sentry/node');
require('dotenv').config();

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

module.exports = Sentry;
  