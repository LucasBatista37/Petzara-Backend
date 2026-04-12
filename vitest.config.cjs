const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setupEnv.cjs"],
    include: ["tests/**/*.test.{js,cjs,mjs}"],
  },
});
