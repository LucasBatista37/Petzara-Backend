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

        // 3. Pegar configurações de agenda
        const schedule = petshopUser.schedule || {
            workDays: [1, 2, 3, 4, 5],
            workHours: { start: "08:00", end: "18:00" },
            breaks: [{ start: "12:00", end: "13:00" }],
            serviceDuration: 60
        };

        const maxServices = petshopUser.maxSimultaneousServices || 3;
        const slots = [];

        // 4. Verificar se o dia solicitado está nos dias trabalhados (Dias da semana 0=Dom a 6=Sab)
        // A data salva como midnight UTC na variável startDate deve ser usada porque se adequa a seleção da UI
        const requestedDayOfWeek = startDate.getUTCDay();

        if (!schedule.workDays.includes(requestedDayOfWeek)) {
            // Rejeita silenciosamente listando 0 horários disponíveis no dia 
            return res.json({
                name: petshopUser.petshopName || petshopUser.name,
                phone: petshopUser.phone,
                theme: petshopUser.theme,
                date,
                slots: []
            });
        }

        // Funções auxiliares para minutos
        const timeToMins = (timeStr) => {
            if (!timeStr) return 0;
            const [h, m] = timeStr.split(":").map(Number);
            return (h * 60) + (m || 0);
        };
        const minsToTime = (mins) => {
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        };

        const startMins = timeToMins(schedule.workHours.start || "08:00");
        const endMins = timeToMins(schedule.workHours.end || "18:00");
        const duration = schedule.serviceDuration || 30;

        const breakRanges = (schedule.breaks || []).map(b => ({
            start: timeToMins(b.start),
            end: timeToMins(b.end)
        }));

        // 5. Gerar slots baseados nos minutos
        let currentMins = startMins;

        while (currentMins + duration <= endMins) {
            const slotStart = currentMins;
            const slotEnd = currentMins + duration;

            // Verificar se este Slot cai no meio de um intervalo (break)
            let isBreak = false;
            for (let b of breakRanges) {
                // Se algum ponto do slot cruzar o break, marca como pausado
                if ((slotStart >= b.start && slotStart < b.end) ||
                    (slotEnd > b.start && slotEnd <= b.end) ||
                    (slotStart <= b.start && slotEnd >= b.end)) {
                    isBreak = true;
                    // Se quisermos pular automaticamente pro fim do intervalo:
                    // currentMins = b.end; 
                    break;
                }
            }

            if (isBreak) {
                // Incrementamos proximo laço em partes pequenas pra pular o break
                currentMins += 15; // steps menores p/ testar bordas de intervalo
                continue;
            }

            const timeString = minsToTime(slotStart);

            // Contar agendamentos que OCUPAM este slot
            const apptsAtSlot = dayAppts.filter((a) => {
                const apptStart = timeToMins(a.time);
                const apptDuration = a.baseService?.duration || duration;
                const apptEnd = apptStart + apptDuration;
                return slotStart >= apptStart && slotStart < apptEnd;
            });

            const bookedCount = apptsAtSlot.length;
            const isAvailable = bookedCount < maxServices;

            slots.push({
                time: timeString,
                available: isAvailable,
                bookedCount,
                maxServices
            });

            currentMins += duration;
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
