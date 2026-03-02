const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const Service = require("../models/Service");
const Transaction = require("../models/Transaction");
const getOwnerId = require("../utils/getOwnerId");
const { parseISO } = require("date-fns");
const User = require("../models/User");
const { withTransaction } = require("../utils/withTransaction");

const VALID_STATUSES = ["Pendente", "Confirmado", "Cancelado", "Finalizado"];

function validateAppointmentInput(body) {
  const {
    petName,
    ownerName,
    baseService,
    date,
    time,
    status = "Pendente",
  } = body;

  if (!petName || !ownerName || !baseService || !date || !time) {
    return "Campos obrigatórios ausentes.";
  }

  if (!VALID_STATUSES.includes(status)) {
    return "Status inválido.";
  }

  return null;
}

exports.createAppointment = async (req, res) => {
  const validationError = validateAppointmentInput(req.body);
  if (validationError) {
    console.log("Validação falhou:", validationError);
    return res.status(400).json({ message: validationError });
  }

  try {
    const populated = await withTransaction(async (session) => {
      const {
        petName,
        species,
        breed,
        notes,
        size,
        ownerName,
        ownerPhone,
        baseService,
        extraServices = [],
        date,
        time,
        status = "Pendente",
        responsible,
      } = req.body;

      const base = await Service.findById(baseService).session(session);
      if (!base) {
        throw new Error("Serviço base não encontrado.");
      }

      const extras = await Service.find({
        _id: { $in: extraServices },
      }).session(session);

      const total =
        base.price + extras.reduce((acc, e) => acc + (e.price || 0), 0);

      const ownerId = getOwnerId(req.user);
      const responsibleId = responsible || ownerId; // Default to owner if not provided

      // Check for overlapping appointments
      const overlappingAppointment = await Appointment.findOne({
        user: ownerId,
        responsible: responsibleId,
        date: date,
        time: time,
        status: { $ne: "Cancelado" }
      }).session(session);

      if (overlappingAppointment) {
        throw new Error("Já existe um agendamento para este profissional neste horário.");
      }

      const appoint = await Appointment.create(
        [
          {
            petName,
            species,
            breed,
            notes,
            size,
            ownerName,
            ownerPhone,
            baseService,
            extraServices,
            date,
            time,
            status,
            price: total,
            user: ownerId,
            responsible: responsibleId,
          },
        ],
        { session }
      );

      // Create notification
      const Notification = require("../models/Notification");
      await Notification.create([{
        recipient: ownerId,
        type: 'success',
        message: `Novo agendamento criado para ${petName} em ${date} às ${time}`,
        relatedId: appoint[0]._id,
        onModel: 'Appointment'
      }], { session });

      // Auto-create transaction if status is "Finalizado"
      if (status === "Finalizado") {
        await Transaction.create([{
          description: `Serviço: ${petName} - ${ownerName}`,
          amount: total,
          type: "income",
          category: "Serviço",
          date: new Date(),
          status: "pending", // Pending confirmation
          paymentMethod: "cash", // Default
          relatedAppointment: appoint[0]._id,
          user: ownerId
        }], { session });
      }

      return await Appointment.findById(appoint[0]._id)
        .populate("baseService")
        .populate("extraServices")
        .session(session);
    });

    const io = req.app.get("io");
    if (io) {
      io.to(getOwnerId(req.user).toString()).emit("appointments_updated");
      if (req.body.status === "Finalizado") {
        io.to(getOwnerId(req.user).toString()).emit("financial_updated");
      }
    }

    res.status(201).json(populated);
  } catch (err) {
    res
      .status(500)
      .json({ message: err.message || "Erro ao criar agendamento" });
  }
};

exports.getAllAppointments = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);

    const user = await User.findById(ownerId);
    const defaultSortOrder = user?.appointmentsSortOrder || "asc";

    const sortOrder = req.query.sortOrder === "desc" ? -1 : 1;
    const finalSortOrder = req.query.sortOrder
      ? sortOrder
      : defaultSortOrder === "desc"
        ? -1
        : 1;

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);

    const search = req.query.search?.trim() || "";
    const filterStatus = req.query.filterStatus || "";
    const filterScope = req.query.filterScope || "";

    const match = { user: ownerId };
    if (search) {
      match.$or = [
        { petName: { $regex: search, $options: "i" } },
        { ownerName: { $regex: search, $options: "i" } },
      ];
    }
    if (filterStatus) match.status = filterStatus;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();

    if (filterScope === "today") {
      const todayUTC = new Date(Date.UTC(currentYear, currentMonth, currentDate));
      match.date = todayUTC;
    } else if (filterScope === "next7days") {
      const todayUTC = new Date(Date.UTC(currentYear, currentMonth, currentDate));
      const next7DaysUTC = new Date(Date.UTC(currentYear, currentMonth, currentDate + 7));
      match.date = { $gte: todayUTC, $lte: next7DaysUTC };
    }

    const results = await Appointment.aggregate([
      { $match: match },
      { $sort: { date: finalSortOrder, time: finalSortOrder } },
      {
        $facet: {
          data: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $lookup: {
                from: "services",
                localField: "baseService",
                foreignField: "_id",
                as: "baseService",
              },
            },
            { $unwind: "$baseService" },
            {
              $lookup: {
                from: "services",
                localField: "extraServices",
                foreignField: "_id",
                as: "extraServices",
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const appointments = results[0].data;
    const totalItems = results[0].totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      data: appointments,
      currentPage: page,
      totalPages,
      totalItems,
      sortOrder: defaultSortOrder,
    });
  } catch (err) {
    console.error("Erro ao listar agendamentos:", err);
    res.status(500).json({ message: "Erro ao listar agendamentos" });
  }
};

exports.updateAppointment = async (req, res) => {
  try {
    const updated = await withTransaction(async (session) => {
      const { id } = req.params;

      const appointment = await Appointment.findById(id).session(session);
      if (!appointment) {
        throw { status: 404, message: "Agendamento não encontrado" };
      }

      const ownerId = getOwnerId(req.user);
      if (appointment.user.toString() !== ownerId.toString()) {
        throw { status: 403, message: "Acesso negado ao agendamento." };
      }

      const oldStatus = appointment.status; // Capture old status

      // Update fields including responsible
      Object.assign(appointment, req.body);

      // Check for overlapping appointments when date, time or responsible changes
      if (req.body.date || req.body.time || req.body.responsible) {
        const checkDate = req.body.date || appointment.date;
        const checkTime = req.body.time || appointment.time;
        const checkResponsible = req.body.responsible || appointment.responsible;

        const overlappingAppointment = await Appointment.findOne({
          _id: { $ne: appointment._id },
          user: ownerId,
          responsible: checkResponsible,
          date: checkDate,
          time: checkTime,
          status: { $ne: "Cancelado" } // Assuming we skip checking if the current updated status is Cancelado... wait, we should check if the new status is not Cancelado
        }).session(session);

        if (overlappingAppointment && appointment.status !== "Cancelado") {
          throw { status: 409, message: "Já existe um agendamento para este profissional neste horário." };
        }
      }

      if (req.body.baseService || req.body.extraServices) {
        const base = await Service.findById(appointment.baseService).session(
          session
        );
        if (!base)
          throw { status: 400, message: "Serviço base não encontrado" };

        const extras = await Service.find({
          _id: { $in: appointment.extraServices },
        }).session(session);

        appointment.price =
          base.price + extras.reduce((acc, e) => acc + (e.price || 0), 0);
      }

      await appointment.save({ session });

      // Create notification for update
      const Notification = require("../models/Notification");
      await Notification.create([{
        recipient: ownerId,
        type: 'info',
        message: `Agendamento de ${appointment.petName} atualizado para ${appointment.status}`,
        relatedId: appointment._id,
        onModel: 'Appointment'
      }], { session });

      // Auto-create transaction if status changed to "Finalizado"
      if (req.body.status === "Finalizado" && oldStatus !== "Finalizado") {
        // Transaction model is already required at the top
        await Transaction.create([{
          description: `Serviço: ${appointment.petName} - ${appointment.ownerName}`,
          amount: appointment.price || 0,
          type: "income",
          category: "Serviço",
          date: new Date(),
          status: "pending", // Pending confirmation
          paymentMethod: "cash", // Default, user can change on confirmation
          relatedAppointment: appointment._id,
          user: ownerId
        }], { session });
      }

      return await Appointment.findById(appointment._id)
        .populate("baseService")
        .populate("extraServices")
        .session(session);
    });

    const io = req.app.get("io");
    if (io) {
      io.to(getOwnerId(req.user).toString()).emit("appointments_updated");
      if (req.body.status === "Finalizado") {
        io.to(getOwnerId(req.user).toString()).emit("financial_updated");
      }
    }

    res.json(updated);
  } catch (err) {
    console.error("Erro ao atualizar agendamento:", err);
    res
      .status(err.status || 500)
      .json({ message: err.message || "Erro ao atualizar agendamento" });
  }
};

exports.deleteAppointment = async (req, res) => {
  try {
    const deleted = await withTransaction(async (session) => {
      const { id } = req.params;

      const appointment = await Appointment.findById(id).session(session);
      if (!appointment) {
        throw { status: 404, message: "Agendamento não encontrado" };
      }

      const ownerId = getOwnerId(req.user);
      if (appointment.user.toString() !== ownerId.toString()) {
        throw { status: 403, message: "Acesso negado ao agendamento." };
      }

      await appointment.deleteOne({ session });

      return { message: "Agendamento excluído com sucesso" };
    });

    const io = req.app.get("io");
    if (io) {
      io.to(getOwnerId(req.user).toString()).emit("appointments_updated");
    }

    return res.json(deleted);
  } catch (err) {
    console.error("Erro ao excluir agendamento:", err);
    return res
      .status(err.status || 500)
      .json({ message: err.message || "Erro ao excluir agendamento" });
  }
};

exports.getAppointmentById = async (req, res) => {
  res.json(req.appointment);
};

exports.updateSortPreference = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const { sortOrder } = req.body;

    if (!["asc", "desc"].includes(sortOrder)) {
      return res.status(400).json({ message: "SortOrder inválido" });
    }

    const user = await User.findByIdAndUpdate(
      ownerId,
      { appointmentsSortOrder: sortOrder },
      { new: true }
    );

    res.json({
      message: "Preferência de ordenação atualizada",
      sortOrder: user.appointmentsSortOrder,
    });
  } catch (err) {
    console.error("Erro ao atualizar preferência:", err);
    res.status(500).json({ message: "Erro ao atualizar preferência" });
  }
};
