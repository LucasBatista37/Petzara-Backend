process.env.JWT_SECRET =
  process.env.JWT_SECRET || "test-jwt-secret-at-least-32-characters-long";
process.env.REFRESH_SECRET =
  process.env.REFRESH_SECRET || "test-refresh-secret-at-least-32-characters";
process.env.EMAIL_USER =
  process.env.EMAIL_USER || "ci-test@example.com";
process.env.BASE_URL =
  process.env.BASE_URL || "http://127.0.0.1:5050";
process.env.CLIENT_URL =
  process.env.CLIENT_URL || "http://127.0.0.1:5173";
process.env.STRIPE_SECRET_KEY =
  process.env.STRIPE_SECRET_KEY || "sk_test_ci_dummy_key_32_chars_min";
process.env.STRIPE_WEBHOOK_SECRET =
  process.env.STRIPE_WEBHOOK_SECRET || "whsec_ci_dummy_secret_value_here";
process.env.SENTRY_DSN = process.env.SENTRY_DSN || "";
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || "re_ci_dummy_not_used_in_health_test";
