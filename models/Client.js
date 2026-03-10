const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    address: {
      street: { type: String },
      number: { type: String },
      complement: { type: String },
      neighborhood: { type: String },
      city: { type: String },
      state: { type: String },
      zip: { type: String },
    },
    notes: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Owner
    order: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

clientSchema.index({ user: 1, order: 1 });
clientSchema.index({ user: 1, name: 1 });

module.exports = mongoose.model("Client", clientSchema);
