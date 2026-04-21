const mongoose = require("mongoose");

const petSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    species: { type: String, required: true, enum: ["Cachorro", "Gato", "Outro"] },
    breed: { type: String, trim: true },
    size: { type: String, enum: ["Pequeno", "Medio", "Grande"] },
    birthdate: { type: Date },
    notes: { type: String },
    client: { type: mongoose.Schema.Types.ObjectId, ref: "Client" }, // Optional link to Client
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Owner
    order: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

petSchema.index({ user: 1, order: 1 });
petSchema.index({ user: 1, client: 1 });

module.exports = mongoose.model("Pet", petSchema);
