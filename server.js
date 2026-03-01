require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const { checkTrialEndingUsers } = require("./jobs/sendTrialEndingEmails");
require("./workers/emailWorker"); // Initialize BullMQ Worker
const clientRoutes = require("./routes/clientRoutes");
const petRoutes = require("./routes/petRoutes");
const financialRoutes = require("./routes/financialRoutes");

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB();

    app.use("/api/clients", clientRoutes);
    app.use("/api/pets", petRoutes);
    app.use("/api/financial", financialRoutes);

    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    });

    checkTrialEndingUsers()
      .then(() =>
        console.log("📨 Verificação de trials executada na inicialização")
      )
      .catch((err) => console.error("❌ Erro ao verificar trials:", err));

    setInterval(async () => {
      try {
        await checkTrialEndingUsers();
        console.log("📨 Verificação diária de trials concluída");
      } catch (err) {
        console.error("❌ Erro ao executar verificação diária de trials:", err);
      }
    }, 24 * 60 * 60 * 1000);
  } catch (err) {
    console.error("❌ Erro ao iniciar servidor:", err);
    process.exit(1);
  }
})();
