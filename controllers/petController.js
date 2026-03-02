const Pet = require("../models/Pet");
const Appointment = require("../models/Appointment");
const getOwnerId = require("../utils/getOwnerId");

exports.createPet = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const pet = await Pet.create({ ...req.body, user: ownerId });

    const io = req.app.get("io");
    if (io) {
      io.to(ownerId.toString()).emit("pets_updated");
    }

    res.status(201).json(pet);
  } catch (err) {
    res.status(500).json({ message: "Erro ao criar pet." });
  }
};

exports.getAllPets = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const { page = 1, limit = 10, search = "", clientId, species, size } = req.query;

    const query = { user: ownerId };
    if (clientId) query.client = clientId;
    if (species) query.species = species;
    if (size) query.size = size;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { breed: { $regex: search, $options: "i" } },
      ];
    }

    const pets = await Pet.find(query)
      .populate("client", "name phone")
      .sort({ order: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Pet.countDocuments(query);

    res.json({
      data: pets,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
    });
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar pets." });
  }
};

exports.getPetById = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const pet = await Pet.findOne({ _id: req.params.id, user: ownerId }).populate("client");
    if (!pet) return res.status(404).json({ message: "Pet não encontrado." });
    res.json(pet);
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar pet." });
  }
};

exports.updatePet = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    // Sanitize: prevent mass-assignment IDOR/ownership vulnerability
    const { user, _id, createdAt, updatedAt, ...updateData } = req.body;

    const pet = await Pet.findOneAndUpdate(
      { _id: req.params.id, user: ownerId },
      updateData,
      { new: true }
    );
    if (!pet) return res.status(404).json({ message: "Pet não encontrado." });

    const io = req.app.get("io");
    if (io) {
      io.to(ownerId.toString()).emit("pets_updated");
    }

    res.json(pet);
  } catch (err) {
    res.status(500).json({ message: "Erro ao atualizar pet." });
  }
};

exports.deletePet = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const pet = await Pet.findOneAndDelete({ _id: req.params.id, user: ownerId });
    if (!pet) return res.status(404).json({ message: "Pet não encontrado." });

    const io = req.app.get("io");
    if (io) {
      io.to(ownerId.toString()).emit("pets_updated");
    }

    res.json({ message: "Pet removido com sucesso." });
  } catch (err) {
    res.status(500).json({ message: "Erro ao remover pet." });
  }
};

exports.getPetHistory = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const pet = await Pet.findOne({ _id: req.params.id, user: ownerId });
    if (!pet) return res.status(404).json({ message: "Pet não encontrado." });

    const appointments = await Appointment.find({
      user: ownerId,
      petName: { $regex: pet.name, $options: "i" } // Match by name for now
    })
      .sort({ date: -1, time: -1 })
      .populate("baseService")
      .limit(20);

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar histórico." });
  }
};

exports.reorderPets = async (req, res) => {
  try {
    const { pets } = req.body;
    const ownerId = getOwnerId(req.user);

    await Promise.all(
      pets.map(async (item) => {
        await Pet.findOneAndUpdate(
          { _id: item._id, user: ownerId },
          { order: item.order }
        );
      })
    );

    const io = req.app.get("io");
    if (io) {
      io.to(ownerId.toString()).emit("pets_updated");
    }

    res.json({ message: "Ordem atualizada com sucesso." });
  } catch (err) {
    console.error("Erro ao reordenar pets:", err);
    res.status(500).json({ message: "Erro ao reordenar pets." });
  }
};
