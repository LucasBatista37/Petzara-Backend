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
  subDays,
  addMonths,
  subMonths,
} = require("date-fns");
const getOwnerId = require("../utils/getOwnerId");

const TZ = process.env.APP_TIMEZONE || "America/Sao_Paulo";

const parseMonthParam = (m) => {
  if (m == null) return null;
  if (m === "all") return "all";
  const n = Number(m);
  if (Number.isNaN(n)) return null;
  if (n >= 1 && n <= 12) return n - 1;
  if (n >= 0 && n <= 11) return n;
  return null;
};

/** Match de agendamentos para métricas (sem janela de UI). */
function buildMetricsMatch(ownerId, monthParam, yearParam) {
  const base = { user: ownerId };
  if (monthParam === "all") return base;
  if (
    monthParam != null &&
    yearParam != null &&
    !Number.isNaN(yearParam)
  ) {
    const start = startOfMonth(new Date(yearParam, monthParam, 1));
    const end = endOfMonth(start);
    return {
      ...base,
      date: {
        $gte: start,
        $lt: new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1),
      },
    };
  }
  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  return {
    ...base,
    date: {
      $gte: start,
      $lt: new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1),
    },
  };
}

/** Janela para lista/calendário no painel (evita carregar histórico inteiro). */
function buildUiWindowRange(monthParam, yearParam, isAllPeriod, hasMonthFilter) {
  const now = new Date();
  if (isAllPeriod) {
    return {
      start: startOfDay(subMonths(now, 12)),
      end: addDays(startOfDay(addMonths(now, 3)), 1),
    };
  }
  if (hasMonthFilter && yearParam != null && monthParam != null) {
    const startM = startOfMonth(new Date(yearParam, monthParam, 1));
    const endM = endOfMonth(startM);
    return {
      start: startOfDay(subDays(startM, 14)),
      end: addDays(startOfDay(addDays(endM, 14)), 1),
    };
  }
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  return {
    start: startOfDay(subDays(start, 14)),
    end: addDays(startOfDay(addDays(end, 14)), 1),
  };
}

const statusLabels = ["Concluído", "Confirmado", "Pendente", "Cancelado"];

function displayStatusExpr() {
  return {
    $switch: {
      branches: [
        { case: { $eq: ["$status", "Finalizado"] }, then: "Concluído" },
        { case: { $eq: ["$status", "Confirmado"] }, then: "Confirmado" },
        { case: { $eq: ["$status", "Cancelado"] }, then: "Cancelado" },
        { case: { $eq: ["$status", "Pendente"] }, then: "Pendente" },
      ],
      default: "Pendente",
    },
  };
}

async function aggregateDashboardMetrics(match) {
  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: "services",
        localField: "baseService",
        foreignField: "_id",
        as: "_base",
        pipeline: [{ $project: { name: 1, price: 1 } }],
      },
    },
    { $unwind: { path: "$_base", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "services",
        localField: "extraServices",
        foreignField: "_id",
        as: "_extras",
        pipeline: [{ $project: { price: 1 } }],
      },
    },
    {
      $addFields: {
        basePrice: { $ifNull: ["$_base.price", 0] },
        extrasPrice: {
          $sum: {
            $map: {
              input: "$_extras",
              as: "e",
              in: { $ifNull: ["$$e.price", 0] },
            },
          },
        },
      },
    },
    {
      $addFields: {
        lineTotal: { $add: ["$basePrice", "$extrasPrice"] },
        baseName: { $ifNull: ["$_base.name", "Desconhecido"] },
        dispStatus: displayStatusExpr(),
        hourKey: { $substrBytes: ["$time", 0, 5] },
      },
    },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$lineTotal" },
              totalAppointments: { $sum: 1 },
            },
          },
        ],
        revenueByService: [
          {
            $group: {
              _id: "$baseName",
              total: { $sum: "$lineTotal" },
            },
          },
          { $project: { _id: 0, service: "$_id", total: 1 } },
          { $sort: { total: -1 } },
        ],
        statusCounts: [
          { $group: { _id: "$dispStatus", count: { $sum: 1 } } },
        ],
        services: [
          { $group: { _id: "$baseName", count: { $sum: 1 } } },
          { $project: { _id: 0, service: "$_id", count: 1 } },
          { $sort: { count: -1 } },
        ],
        byHour: [
          { $group: { _id: "$hourKey", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
      },
    },
  ];

  const [row] = await Appointment.aggregate(pipeline).allowDiskUse(true);
  const totals = row?.totals?.[0] || {};
  const totalRevenue = totals.totalRevenue || 0;
  const totalAppointments = totals.totalAppointments || 0;

  const statusMap = Object.fromEntries(statusLabels.map((s) => [s, 0]));
  (row?.statusCounts || []).forEach((s) => {
    if (s._id && statusMap[s._id] != null) statusMap[s._id] = s.count;
  });
  const statusCounts = statusLabels.map((status) => ({
    status,
    count: statusMap[status] || 0,
  }));

  const revenueByService = row?.revenueByService || [];
  const services = row?.services || [];
  const byHour = (row?.byHour || []).map((h) => ({
    hour: h._id && h._id !== "" ? h._id : "Desconhecido",
    count: h.count,
  }));
  const peakHourData = byHour.reduce(
    (prev, curr) => (curr.count > prev.count ? curr : prev),
    { hour: null, count: 0 }
  );
  const peakHour = peakHourData.hour;

  return {
    totalRevenue,
    totalAppointments,
    revenueByService,
    statusCounts,
    services,
    byHour,
    peakHour,
  };
}

async function aggregateLast7Days(match, monthParam, yearParam, hasMonthFilter) {
  const now = new Date();
  const today = startOfDay(now);
  let end7 = today;
  let start7 = addDays(today, -6);

  if (hasMonthFilter && yearParam != null && monthParam != null) {
    const startM = startOfMonth(new Date(yearParam, monthParam, 1));
    const endM = endOfMonth(startM);
    end7 = end7 > endM ? endM : end7;
    start7 = start7 < startM ? startM : start7;
  }

  const dayCounts = await Appointment.aggregate([
    {
      $match: {
        ...match,
        date: { $gte: startOfDay(start7), $lt: addDays(startOfDay(end7), 1) },
      },
    },
    {
      $addFields: {
        dayKey: {
          $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: TZ },
        },
      },
    },
    { $group: { _id: "$dayKey", count: { $sum: 1 } } },
  ]);

  const countByKey = new Map(dayCounts.map((d) => [d._id, d.count]));
  const daysCount = [];
  const totalDays = 7;
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = addDays(end7, -i);
    const key = format(d, "yyyy-MM-dd");
    daysCount.push({ date: format(d, "dd/MM"), count: countByKey.get(key) || 0 });
  }
  return daysCount;
}

async function aggregateByDayInMonth(match, yearParam, monthParam) {
  if (yearParam == null || monthParam == null) return [];
  const startM = startOfMonth(new Date(yearParam, monthParam, 1));
  const endM = endOfMonth(startM);
  const daysInMonth = endM.getDate();

  const rows = await Appointment.aggregate([
    {
      $match: {
        ...match,
        date: {
          $gte: startM,
          $lt: new Date(endM.getFullYear(), endM.getMonth(), endM.getDate() + 1),
        },
      },
    },
    {
      $addFields: {
        dom: {
          $dayOfMonth: { date: "$date", timezone: TZ },
        },
      },
    },
    { $group: { _id: "$dom", count: { $sum: 1 } } },
  ]);

  const byDom = new Map(rows.map((r) => [r._id, r.count]));
  return Array.from({ length: daysInMonth }, (_, i) => ({
    day: String(i + 1).padStart(2, "0"),
    count: byDom.get(i + 1) || 0,
  }));
}

exports.getStats = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);

    const monthParam = parseMonthParam(req.query.month);
    const yearParam = req.query.year ? Number(req.query.year) : null;

    const isAllPeriod = monthParam === "all";
    const hasMonthFilter =
      monthParam != null &&
      monthParam !== "all" &&
      yearParam != null &&
      !Number.isNaN(yearParam);

    const match = buildMetricsMatch(ownerId, monthParam, yearParam);

    const metrics = await aggregateDashboardMetrics(match);

    const last7Days = await aggregateLast7Days(
      match,
      monthParam,
      yearParam,
      hasMonthFilter
    );

    let byDayInMonth = [];
    if (hasMonthFilter) {
      byDayInMonth = await aggregateByDayInMonth(
        { user: ownerId },
        yearParam,
        monthParam
      );
    }

    const uiRange = buildUiWindowRange(
      monthParam,
      yearParam,
      isAllPeriod,
      hasMonthFilter
    );

    const uiAppointments = await Appointment.find({
      user: ownerId,
      date: { $gte: uiRange.start, $lt: uiRange.end },
    })
      .sort({ date: 1, time: 1 })
      .populate("baseService", "name price duration")
      .populate("extraServices", "name price")
      .lean();

    const calendarAppointments = uiAppointments;
    const allAppointments = uiAppointments;

    res.json({
      totalRevenue: metrics.totalRevenue,
      totalAppointments: metrics.totalAppointments,
      peakHour: metrics.peakHour,
      statusCounts: metrics.statusCounts,
      services: metrics.services,
      revenueByService: metrics.revenueByService,
      last7Days,
      byDayInMonth,
      allAppointments,
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
