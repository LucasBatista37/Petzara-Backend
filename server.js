require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const connectDB = require("./config/db");
const { checkTrialEndingUsers } = require("./jobs/sendTrialEndingEmails");
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

    const server = http.createServer(app);

    const allowedOrigins = [
      "http://localhost:5173",
      "https://pet-shop-agendamento-sistema.vercel.app",
      "https://www.petcarezone.shop",
    ];

    const io = new Server(server, {
      cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
      }
    });

    // Make io accessible in controllers
    app.set("io", io);

    io.on("connection", (socket) => {
      console.log("🟢 Cliente Socket conectado:", socket.id);

      socket.on("joinRoom", (room) => {
        socket.join(room);
        console.log(`🏠 Socket ${socket.id} entrou na sala (ownerId): ${room}`);
      });

      socket.on("disconnect", () => {
        console.log("🔴 Cliente Socket desconectado:", socket.id);
      });
    });

    server.listen(PORT, () => {
      console.log(`🚀 Servidor Node.js com Socket.io rodando em http://localhost:${PORT}`);
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
