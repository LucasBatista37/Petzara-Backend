const Transaction = require("../models/Transaction");
const getOwnerId = require("../utils/getOwnerId");
const mongoose = require("mongoose");

exports.createTransaction = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const transaction = await Transaction.create({ ...req.body, user: ownerId });
    res.status(201).json(transaction);
  } catch (err) {
    res.status(500).json({ message: "Erro ao criar transação." });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const {
      page = 1,
      limit = 10,
      search = "",
      type,
      startDate,
      endDate
    } = req.query;

    const query = { user: ownerId };

    if (type) query.type = type;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (search) {
      query.description = { $regex: search, $options: "i" };
    }

    const transactions = await Transaction.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('relatedAppointment');

    const total = await Transaction.countDocuments(query);

    res.json({
      data: transactions,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
    });
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar transações." });
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    // Sanitize: prevent mass-assignment IDOR/ownership vulnerability
    const { user, _id, createdAt, updatedAt, ...updateData } = req.body;

    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: ownerId },
      updateData,
      { new: true }
    );
    if (!transaction) return res.status(404).json({ message: "Transação não encontrada." });
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ message: "Erro ao atualizar transação." });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, user: ownerId });
    if (!transaction) return res.status(404).json({ message: "Transação não encontrada." });
    res.json({ message: "Transação removida com sucesso." });
  } catch (err) {
    res.status(500).json({ message: "Erro ao remover transação." });
  }
};

exports.getDashboardData = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    }

    const matchStage = { user: new mongoose.Types.ObjectId(ownerId), ...dateFilter };

    // Aggregate totals
    const totals = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
        },
      },
    ]);

    const income = totals.find(t => t._id === "income")?.total || 0;
    const expense = totals.find(t => t._id === "expense")?.total || 0;

    // Aggregate by Category (Expenses)
    const expensesByCategory = await Transaction.aggregate([
      { $match: { ...matchStage, type: "expense" } },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
        },
      },
      { $sort: { total: -1 } }
    ]);

    // Aggregate Monthly Income/Expense (Last 6 months or filtered range)
    const monthlyData = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            type: "$type"
          },
          total: { $sum: "$amount" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    res.json({
      summary: {
        income,
        expense,
        balance: income - expense
      },
      expensesByCategory,
      monthlyData
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar dados do dashboard." });
  }
};
