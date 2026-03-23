const Appointment = require("../models/Appointment");
const Service = require("../models/Service");
const Client = require("../models/Client");
const Pet = require("../models/Pet");
const {
  startOfDay,
  addDays,
  format,
  startOfMonth,
  endOfMonth,
} = require("date-fns");
const getOwnerId = require("../utils/getOwnerId");

const norm = (s) =>
  (s || "")
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const normalizeStatus = (raw) => {
  const s = norm(raw);
  if (s.includes("finaliz") || s.includes("conclu")) return "Concluído";
  if (s.includes("confirm")) return "Confirmado";
  if (s.includes("cancel")) return "Cancelado";
  if (s.includes("pendent") || s.includes("aguard")) return "Pendente";
  return "Pendente";
};

const parseMonthParam = (m) => {
  if (m == null) return null;
  if (m === "all") return "all";
  const n = Number(m);
  if (Number.isNaN(n)) return null;
  if (n >= 1 && n <= 12) return n - 1;
  if (n >= 0 && n <= 11) return n;
  return null;
};

exports.getStats = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);

    const monthParam = parseMonthParam(req.query.month);
    const yearParam = req.query.year ? Number(req.query.year) : null;

    let dateFilter = {};
    let hasMonthFilter = false;
    let isAllPeriod = false;

    if (monthParam === "all") {
      // Novo caso: todo o período (sem filtro de data)
      isAllPeriod = true;
    } else if (
      monthParam != null &&
      yearParam != null &&
      !Number.isNaN(yearParam)
    ) {
      const start = startOfMonth(new Date(yearParam, monthParam, 1));
      const end = endOfMonth(start);
      dateFilter = {
        date: {
          $gte: start,
          $lt: new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1),
        },
      };
      hasMonthFilter = true;
    }

    const baseQuery = { user: ownerId };
    let metricsSource = [];

    if (isAllPeriod) {
      // Busca todos os agendamentos sem filtro de data
      metricsSource = await Appointment.find(baseQuery)
        .sort({ date: 1, time: 1 })
        .populate("baseService")
        .populate("extraServices");
    } else if (hasMonthFilter) {
      metricsSource = await Appointment.find({ ...baseQuery, ...dateFilter })
        .sort({ date: 1, time: 1 })
        .populate("baseService")
        .populate("extraServices");
    } else {
      metricsSource = await Appointment.find(baseQuery)
        .sort({ date: 1, time: 1 })
        .populate("baseService")
        .populate("extraServices");
    }

    // Busca todos os agendamentos para o calendário (sem filtro de mês)
    const calendarAppointments = await Appointment.find(baseQuery)
      .sort({ date: 1, time: 1 })
      .populate("baseService")
      .populate("extraServices");

    const totalRevenue = metricsSource.reduce((sum, a) => {
      const extrasPrice =
        a.extraServices?.reduce((acc, e) => acc + (e.price || 0), 0) || 0;
      return sum + (a.baseService?.price || 0) + extrasPrice;
    }, 0);

    const revenueMap = {};
    metricsSource.forEach((a) => {
      const baseName = a.baseService?.name || "Desconhecido";
      const basePrice = a.baseService?.price || 0;
      const extrasPrice =
        a.extraServices?.reduce((acc, e) => acc + (e.price || 0), 0) || 0;
      const total = basePrice + extrasPrice;
      revenueMap[baseName] = (revenueMap[baseName] || 0) + total;
    });

    const revenueByService = Object.entries(revenueMap).map(
      ([service, total]) => ({ service, total })
    );

    const statusMap = {
      Concluído: 0,
      Confirmado: 0,
      Pendente: 0,
      Cancelado: 0,
    };
    metricsSource.forEach((a) => {
      statusMap[normalizeStatus(a.status || a.situacao || a.state)] += 1;
    });
    const statusCounts = Object.entries(statusMap).map(([status, count]) => ({
      status,
      count,
    }));

    const serviceMap = {};
    metricsSource.forEach((a) => {
      const name = a.baseService?.name || "Desconhecido";
      serviceMap[name] = (serviceMap[name] || 0) + 1;
    });
    const services = Object.entries(serviceMap).map(([service, count]) => ({
      service,
      count,
    }));

    const byHourMap = {};
    metricsSource.forEach((a) => {
      const hour = a.time?.slice(0, 5) || "Desconhecido";
      byHourMap[hour] = (byHourMap[hour] || 0) + 1;
    });
    const byHour = Object.entries(byHourMap).map(([hour, count]) => ({
      hour,
      count,
    }));

    const peakHourData = byHour.reduce(
      (prev, curr) => (curr.count > prev.count ? curr : prev),
      { hour: null, count: 0 }
    );
    const peakHour = peakHourData.hour;

    const today = startOfDay(new Date());
    let end7 = today;
    let start7 = addDays(today, -6);

    if (hasMonthFilter) {
      const startM = startOfMonth(new Date(yearParam, monthParam, 1));
      const endM = endOfMonth(startM);
      end7 = end7 > endM ? endM : end7;
      start7 = start7 < startM ? startM : start7;
    }

    const daysCount = [];
    const totalDays = 7;
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = addDays(end7, -i);
      const dStart = startOfDay(d);
      const dEnd = addDays(dStart, 1);
      const count = metricsSource.filter((a) => {
        if (!a.date) return false;
        // MongoDB stores dates as UTC, so we need to compare using UTC components
        const apptDate = new Date(a.date);
        
        // Get UTC components from MongoDB date
        const apptYear = apptDate.getUTCFullYear();
        const apptMonth = apptDate.getUTCMonth();
        const apptDay = apptDate.getUTCDate();
        
        // Get local components from our comparison date
        const targetYear = d.getFullYear();
        const targetMonth = d.getMonth();
        const targetDay = d.getDate();
        
        return apptYear === targetYear && apptMonth === targetMonth && apptDay === targetDay;
      }).length;
      daysCount.push({ date: format(d, "dd/MM"), count });
    }
    const last7Days = daysCount;

    let byDayInMonth = [];
    if (hasMonthFilter) {
      const startM = startOfMonth(new Date(yearParam, monthParam, 1));
      const endM = endOfMonth(startM);
      const daysInMonth = endM.getDate();
      const arr = Array.from({ length: daysInMonth }, (_, i) => ({
        day: String(i + 1).padStart(2, "0"),
        count: 0,
      }));

      metricsSource.forEach((a) => {
        const d = new Date(a.date);
        if (!Number.isNaN(d)) {
          const idx = d.getDate() - 1;
          if (idx >= 0 && idx < daysInMonth) arr[idx].count += 1;
        }
      });
      byDayInMonth = arr;
    }

    res.json({
      totalRevenue,
      totalAppointments: metricsSource.length,
      peakHour,
      statusCounts,
      services,
      revenueByService,
      last7Days,
      byDayInMonth,
      allAppointments: metricsSource,
      calendarAppointments,
      appliedFilter: isAllPeriod
        ? { all: true }
        : hasMonthFilter
        ? { month0: monthParam, year: yearParam }
        : null,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Erro ao gerar estatísticas do dashboard" });
  }
};

exports.getSetupProgress = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const [services, clients, pets, appointments] = await Promise.all([
      Service.countDocuments({ user: ownerId, extra: false }),
      Client.countDocuments({ user: ownerId }),
      Pet.countDocuments({ user: ownerId }),
      Appointment.countDocuments({ user: ownerId }),
    ]);
    res.json({ services, clients, pets, appointments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar progresso de configuração" });
  }
};
