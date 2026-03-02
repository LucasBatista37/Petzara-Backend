const axios = require('axios');
const { io } = require('socket.io-client');
const mongoose = require('mongoose');

require('dotenv').config({ path: '/Users/lucaspereirabatista/Downloads/PetCare/PetShop-Agendamento-Backend/.env' });

async function runTest() {
    console.log("Conectando ao banco de dados...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Conectado ao MongoDB para preparar os testes.");

    const User = require('/Users/lucaspereirabatista/Downloads/PetCare/PetShop-Agendamento-Backend/models/User.js');

    const user1 = await User.findOne({ email: "lucas.batista9734@gmail.com" });
    const user2 = await User.findOne({ email: "lucas.batista9437@gmail.com" });

    if (!user1 || !user2) {
        console.log("Usuarios nao encontrados.");
        process.exit(1);
    }

    // Forçar User 2 a ser colaborador de User 1
    user2.owner = user1._id;
    user2.role = 'collaborator';
    await user2.save();
    console.log("Atrelado user2 como colaborador do user1 no Banco de Dados!");

    // Agora vamos rodar o teste
    const res1 = await axios.post("http://localhost:5000/api/auth/login", {
        email: "lucas.batista9734@gmail.com",
        password: "Luba@2006"
    });
    const token1 = res1.data.accessToken;
    const ownerId1 = res1.data.user.id || res1.data.user._id || res1.data.user.owner;
    console.log(`[TEST] User 1 Logado: ${res1.data.user.email} (Owner: ${ownerId1})`);

    const res2 = await axios.post("http://localhost:5000/api/auth/login", {
        email: "lucas.batista9437@gmail.com",
        password: "Luba@2006"
    });
    const authCookie2 = res2.headers["set-cookie"]?.join(";");
    const ownerId2 = res2.data.user.owner || res2.data.user._id || res2.data.user.id;
    console.log(`[TEST] User 2 Logado: ${res2.data.user.email} (Owner: ${ownerId2})`);

    const socket = io("http://localhost:5000", {
        extraHeaders: { Cookie: authCookie2 }
    });

    socket.on("connect", () => {
        console.log(`[TEST] User 2 Conectado no Socket: ${socket.id}`);
        socket.emit("joinRoom", ownerId2);
        console.log(`[TEST] User 2 entrou na sala do owner: ${ownerId2}`);
    });

    let updatesReceived = 0;
    socket.on("services_updated", () => {
        console.log("🔔 [TEST] EVENTO RECEBIDO NO USER 2: services_updated");
        updatesReceived++;
    });

    socket.on("clients_updated", () => {
        console.log("🔔 [TEST] EVENTO RECEBIDO NO USER 2: clients_updated");
        updatesReceived++;
    });

    await new Promise(r => setTimeout(r, 1000));

    console.log("[TEST] User 1 (dono) criando um serviço via API...");
    await axios.post("http://localhost:5000/api/services", {
        name: "Serviço Teste Real-Time",
        price: 15,
        duration: 30
    }, {
        headers: { Authorization: `Bearer ${token1}` }
    });

    console.log("[TEST] User 1 (dono) criando um cliente...");
    await axios.post("http://localhost:5000/api/clients", {
        name: "Cliente Socket",
        email: "socket@realtime.com",
        phone: "11999999999"
    }, {
        headers: { Authorization: `Bearer ${token1}` }
    });

    await new Promise(r => setTimeout(r, 2000));

    if (updatesReceived >= 2) {
        console.log(`🚀 SUCESSO ABSOLUTO: As mensagens real-time cruzaram entre as duas contas!`);
        socket.disconnect();
        mongoose.disconnect();
        process.exit(0);
    } else {
        console.log(`❌ FALHA: Faltou mensagens. Recebidos: ${updatesReceived}`);
        socket.disconnect();
        mongoose.disconnect();
        process.exit(1);
    }
}

runTest().catch(err => {
    console.error(err);
    process.exit(1);
});
