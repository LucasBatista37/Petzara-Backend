const cron = require("node-cron");
const Appointment = require("../models/Appointment");
const Transaction = require("../models/Transaction");

/**
 * Combines the stored date (UTC midnight) and time string ("HH:MM") into a
 * single UTC Date. The system stores dates as UTC midnight and times as local
 * clock strings — this treats both as UTC so the math is consistent across
 * timezones. If your shop is not in UTC, set TIMEZONE_OFFSET_HOURS in .env
 * (e.g. -3 for BRT) to shift the window.
 */
function buildStartUTC(date, timeStr) {
  const offsetHours = Number(process.env.TIMEZONE_OFFSET_HOURS || 0);
  const dateStr = new Date(date).toISOString().slice(0, 10);
  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, min] = timeStr.split(":").map(Number);
  // Interpret stored time as local clock → convert to UTC
  return new Date(Date.UTC(y, m - 1, d, h - offsetHours, min));
}

async function autoUpdateAppointmentStatus(io) {
  const now = new Date();

  try {
    // 1. Pendente → Em Andamento
    const pending = await Appointment.find({ status: "Pendente" }).populate("baseService");
    for (const appt of pending) {
      const start = buildStartUTC(appt.date, appt.time);
      if (start <= now) {
        appt.status = "Em Andamento";
        await appt.save();
        if (io) io.to(appt.user.toString()).emit("appointments_updated");
      }
    }

    // 2. Em Andamento → Finalizado
    const inProgress = await Appointment.find({ status: "Em Andamento" }).populate("baseService");
    for (const appt of inProgress) {
      const start = buildStartUTC(appt.date, appt.time);
      const durationMin = appt.baseService?.duration ?? 60;
      const end = new Date(start.getTime() + durationMin * 60 * 1000);
      if (end <= now) {
        appt.status = "Finalizado";
        await appt.save();

        // Auto-create transaction only if one doesn't already exist for this appointment
        const existing = await Transaction.findOne({ relatedAppointment: appt._id });
        if (!existing) {
          await Transaction.create({
            description: `Serviço: ${appt.petName} - ${appt.ownerName}`,
            amount: appt.price || 0,
            type: "income",
            category: "Serviço",
            date: new Date(),
            status: "pending",
            paymentMethod: "cash",
            relatedAppointment: appt._id,
            user: appt.user,
          });
          if (io) io.to(appt.user.toString()).emit("financial_updated");
        }

        if (io) io.to(appt.user.toString()).emit("appointments_updated");
      }
    }
  } catch (err) {
    console.error("[CRON autoStatus] Erro:", err.message);
  }
}

function startAutoStatusCron(io) {
  cron.schedule("*/2 * * * *", () => {
    autoUpdateAppointmentStatus(io);
  });
  console.log("[CRON] autoUpdateAppointmentStatus registrado (a cada 2 min)");
}

module.exports = { startAutoStatusCron, autoUpdateAppointmentStatus };
