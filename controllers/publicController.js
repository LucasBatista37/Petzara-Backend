const User = require("../models/User");
const Appointment = require("../models/Appointment");
const Service = require("../models/Service"); // necessário para populate funcionar

exports.getPublicSchedule = async (req, res) => {
    try {
        const { customUrl } = req.params;
        const { date } = req.query; // YYYY-MM-DD

        // 1. Encontrar o usuário através da URL customizada
        const petshopUser = await User.findOne({ customUrl, isUrlActive: true });

        if (!petshopUser) {
            return res.status(404).json({ message: "Pet Shop não encontrado ou URL inativa." });
        }

        const ownerId = petshopUser._id;

        // Se não tiver data, apenas retornamos os detalhes básicos do pet shop
        if (!date) {
            return res.json({
                name: petshopUser.petshopName || petshopUser.name,
                phone: petshopUser.phone,
                theme: petshopUser.theme,
                // poderíamos retornar logo e outras infos se existisse
            });
        }

        // 2. Buscar agendamentos na data específica
        // Use UTC to avoid timezone issues — dates stored as midnight UTC
        const startDate = new Date(`${date}T00:00:00.000Z`);
        const endDate = new Date(`${date}T23:59:59.999Z`);

        const dayAppts = await Appointment.find({
            user: ownerId,
            date: { $gte: startDate, $lte: endDate },
            status: { $ne: "Cancelado" },
        }).populate("baseService", "duration");

        // 3. Calcular horários disponíveis e ocupados
        const maxServices = petshopUser.maxSimultaneousServices || 3;

        console.log(`[PublicSchedule] date=${date} | found=${dayAppts.length} appts | maxServices=${maxServices}`);

        const slots = [];

        // Gerar slots das 08:00 às 18:00 (intervalo de 30 min)
        for (let h = 8; h <= 18; h++) {
            for (let m of [0, 30]) {
                // Ignora 18:30 (último horário é 18:00)
                if (h === 18 && m === 30) continue;

                const hour = String(h).padStart(2, "0");
                const minute = String(m).padStart(2, "0");
                const timeString = `${hour}:${minute}`;
                const slotMinutes = h * 60 + m;

                // Contar agendamentos que OCUPAM este slot
                const apptsAtSlot = dayAppts.filter((a) => {
                    const [aH, aM] = a.time.split(":").map(Number);
                    const apptStart = aH * 60 + aM;
                    const duration = a.baseService?.duration || 30;
                    const apptEnd = apptStart + duration;
                    return slotMinutes >= apptStart && slotMinutes < apptEnd;
                });

                const bookedCount = apptsAtSlot.length;
                const isAvailable = bookedCount < maxServices;

                slots.push({
                    time: timeString,
                    available: isAvailable,
                    bookedCount,
                    maxServices
                });
            }
        }

        res.json({
            name: petshopUser.petshopName || petshopUser.name,
            phone: petshopUser.phone,
            theme: petshopUser.theme,
            date,
            slots
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erro ao carregar agenda." });
    }
};
