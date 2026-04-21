const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    type: { 
      type: String, 
      required: true, 
      enum: ["income", "expense"] 
    },
    category: { 
      type: String, 
      required: true, 
      trim: true 
    },
    date: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      enum: ["pending", "paid", "overdue"],
      default: "paid",
    },
    paymentMethod: {
      type: String,
      enum: ["credit_card", "debit_card", "cash", "pix", "transfer", "other"],
      default: "cash",
    },
    relatedAppointment: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Appointment" 
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Transaction", transactionSchema);
