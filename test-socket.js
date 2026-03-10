const { io } = require("socket.io-client");
const axios = require("axios");

const start = async () => {
    const login = async (email, password) => {
        const res = await axios.post("http://localhost:5000/api/auth/login", { email, password });
        return res.data;
    };

    console.log("Logging in...");
    const user1 = await login("lucas.batista9734@gmail.com", "Luba@2006");
    const user2 = await login("lucas.batista9437@gmail.com", "Luba@2006");

    const ownerRoom1 = user1.user.owner || user1.user.id;
    const ownerRoom2 = user2.user.owner || user2.user.id;

    console.log("User1 joining room:", ownerRoom1);
    console.log("User2 joining room:", ownerRoom2);

    const s1 = io("http://localhost:5000", { extraHeaders: { Cookie: `refreshToken=${user1.refreshToken}` } });
    const s2 = io("http://localhost:5000", { extraHeaders: { Cookie: `refreshToken=${user2.refreshToken}` } });

    s1.on("connect", () => s1.emit("joinRoom", ownerRoom1));
    s2.on("connect", () => s2.emit("joinRoom", ownerRoom2));

    s2.on("services_updated", () => {
        console.log("✅ USER 2 RECEIVED services_updated EVENT!");
        process.exit(0);
    });

    setTimeout(async () => {
        console.log("Triggering service creation on User 1...");
        try {
            await axios.post("http://localhost:5000/api/services", {
                name: "Test Service Socket",
                price: 10,
                duration: 10,
                extra: false
            }, {
                headers: { Authorization: `Bearer ${user1.accessToken}` }
            });
            console.log("Service created!");
        } catch (e) {
            console.error("Error creating service:", e.message);
        }
    }, 2000);
    
    setTimeout(() => {
        console.log("❌ USER 2 DID NOT RECEIVE EVENT TIMEOUT!");
        process.exit(1);
    }, 6000);
}
start();
