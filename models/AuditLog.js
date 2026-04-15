const mongoose = require("mongoose");

/**
 * Registra ações críticas realizadas por usuários autenticados.
 * Documentos são imutáveis por convenção — nunca usar updateOne/deleteOne nesta coleção.
 * TTL de 1 ano (365 dias) configurado no índice createdAt.
 */
const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        "USER_CREATED",
        "USER_UPDATED",
        "USER_DELETED",
        "USER_LOGIN",
        "USER_LOGOUT",
        "USER_PASSWORD_RESET",
        "APPOINTMENT_CREATED",
        "APPOINTMENT_UPDATED",
        "APPOINTMENT_DELETED",
        "CLIENT_CREATED",
        "CLIENT_UPDATED",
        "CLIENT_DELETED",
        "PET_CREATED",
        "PET_UPDATED",
        "PET_DELETED",
        "TRANSACTION_CREATED",
        "TRANSACTION_UPDATED",
        "TRANSACTION_DELETED",
        "SUBSCRIPTION_CHANGED",
        "INVITE_SENT",
        "INVITE_ACCEPTED",
      ],
    },
    entity: {
      type: String,
      required: true,
      enum: ["User", "Appointment", "Client", "Pet", "Transaction", "Invite", "Subscription"],
    },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorEmail: { type: String },
    requestId: { type: String },
    ip: { type: String },
    // Snapshot antes da mudança (apenas para UPDATE e DELETE)
    before: { type: mongoose.Schema.Types.Mixed },
    // Snapshot depois da mudança (apenas para CREATE e UPDATE)
    after: { type: mongoose.Schema.Types.Mixed },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: true,
    // Coleção imutável — nunca atualizar registros de auditoria
    versionKey: false,
  }
);

// TTL: expira registros após 1 ano
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Queries frequentes: buscar histórico por entidade ou por ator
auditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
