const Client = require("../models/Client");
const Appointment = require("../models/Appointment");
const getOwnerId = require("../utils/getOwnerId");

exports.createClient = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const client = await Client.create({ ...req.body, user: ownerId });

    const io = req.app.get("io");
    if (io) {
      io.to(ownerId.toString()).emit("clients_updated");
    }

    res.status(201).json(client);
  } catch (err) {
    res.status(500).json({ message: "Erro ao criar cliente." });
  }
};

exports.getAllClients = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const { page = 1, limit = 10, search = "", sortBy = "order" } = req.query;

    const query = { user: ownerId };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    let sort = { order: 1, createdAt: -1 };
    if (sortBy === "name") sort = { name: 1 };
    if (sortBy === "date") sort = { createdAt: -1 };

    const clients = await Client.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Client.countDocuments(query);

    res.json({
      data: clients,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
    });
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar clientes." });
  }
};

exports.getClientById = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const client = await Client.findOne({ _id: req.params.id, user: ownerId });
    if (!client) return res.status(404).json({ message: "Cliente não encontrado." });
    res.json(client);
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar cliente." });
  }
};

exports.updateClient = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    // Sanitize: prevent mass-assignment IDOR/ownership vulnerability
    const { user, _id, createdAt, updatedAt, ...updateData } = req.body;

    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, user: ownerId },
      updateData,
      { new: true }
    );
    if (!client) return res.status(404).json({ message: "Cliente não encontrado." });

    const io = req.app.get("io");
    if (io) {
      io.to(ownerId.toString()).emit("clients_updated");
    }

    res.json(client);
  } catch (err) {
    res.status(500).json({ message: "Erro ao atualizar cliente." });
  }
};

exports.deleteClient = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const client = await Client.findOneAndDelete({ _id: req.params.id, user: ownerId });
    if (!client) return res.status(404).json({ message: "Cliente não encontrado." });

    const io = req.app.get("io");
    if (io) {
      io.to(ownerId.toString()).emit("clients_updated");
    }

    res.json({ message: "Cliente removido com sucesso." });
  } catch (err) {
    res.status(500).json({ message: "Erro ao remover cliente." });
  }
};

exports.getClientHistory = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const client = await Client.findOne({ _id: req.params.id, user: ownerId });
    if (!client) return res.status(404).json({ message: "Cliente não encontrado." });

    const appointments = await Appointment.find({
      user: ownerId,
      $or: [
        { ownerName: { $regex: client.name, $options: "i" } },
        { ownerPhone: { $regex: client.phone, $options: "i" } }
      ]
    })
      .sort({ date: -1, time: -1 })
      .populate("baseService")
      .limit(20);

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar histórico." });
  }
};

exports.reorderClients = async (req, res) => {
  try {
    const { clients } = req.body;
    const ownerId = getOwnerId(req.user);

    await Promise.all(
      clients.map(async (item) => {
        await Client.findOneAndUpdate(
          { _id: item._id, user: ownerId },
          { order: item.order }
        );
      })
    );

    const io = req.app.get("io");
    if (io) {
      io.to(ownerId.toString()).emit("clients_updated");
    }

    res.json({ message: "Ordem atualizada com sucesso." });
  } catch (err) {
    console.error("Erro ao reordenar clientes:", err);
    res.status(500).json({ message: "Erro ao reordenar clientes." });
  }
};
