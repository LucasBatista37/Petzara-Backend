const mongoose = require("mongoose");

const defaultPermissions = {
  read: { type: Boolean, default: true },
  write: { type: Boolean, default: true },
  delete: { type: Boolean, default: true },
};

const permissionSchema = new mongoose.Schema(defaultPermissions, { _id: false });

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    petshopName: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String },
    password: { type: String },
    isVerified: { type: Boolean, default: false },
    emailToken: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    role: {
      type: String,
      enum: ["admin", "collaborator"],
      default: "admin",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    refreshToken: { type: String },
    invitedBy: { type: String },
    pendingInvitation: { type: Boolean, default: false },
    inviteExpires: { type: Date },
    inviteAcceptedAt: { type: Date },
    department: { type: String, trim: true },
    subscription: {
      stripeCustomerId: { type: String, default: null },
      stripeSubscriptionId: { type: String, default: null },
      status: {
        type: String,
        enum: ["inactive", "trialing", "active", "past_due", "canceled"],
        default: "inactive",
      },
      currentPeriodStart: { type: Date, default: null },
      currentPeriodEnd: { type: Date, default: null },
      trialEnd: { type: Date, default: null },
    },
    appointmentsSortOrder: {
      type: String,
      enum: ["asc", "desc"],
      default: "asc",
    },
    order: { type: Number, default: 0 },
    customUrl: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    isUrlActive: {
      type: Boolean,
      default: false,
    },
    maxSimultaneousServices: {
      type: Number,
      default: 3,
      min: 1,
    },
    theme: {
      type: String,
      default: "terracotta"
    },
    schedule: {
      workDays: { type: [Number], default: [1, 2, 3, 4, 5] }, // 0=Sun, 1=Mon...
      workHours: {
        start: { type: String, default: "08:00" },
        end: { type: String, default: "18:00" }
      },
      breaks: [
        {
          start: { type: String },
          end: { type: String }
        }
      ],
      serviceDuration: { type: Number, default: 60 } // minutes
    },
    permissions: {
      appointments: { type: permissionSchema, default: () => ({}) },
      clients: { type: permissionSchema, default: () => ({}) },
      pets: { type: permissionSchema, default: () => ({}) },
      services: { type: permissionSchema, default: () => ({}) },
      financial: { type: permissionSchema, default: () => ({}) },
      collaborators: { type: permissionSchema, default: () => ({}) },
      settings: { type: permissionSchema, default: () => ({}) },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
