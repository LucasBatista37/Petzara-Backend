const mongoose = require("mongoose");

const inviteSchema = new mongoose.Schema({
  email: { type: String, required: true },
  department: { type: String },
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  accepted: { type: Boolean, default: false },
  acceptedAt: { type: Date },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  role: { type: String, enum: ["admin", "collaborator"], default: "collaborator" },
  permissions: { type: mongoose.Schema.Types.Mixed, default: {} },
});

module.exports = mongoose.model("Invite", inviteSchema);
