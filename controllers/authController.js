const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const crypto = require("crypto");
const transporter = require("../utils/mailer");
const { validationResult } = require("express-validator");
const { generateVerificationEmail, generateResetPasswordEmail } = require("../utils/emailTemplates");
const { createUser } = require("../services/userService");
const { getStripe } = require("../utils/stripeClient");
const { OAuth2Client } = require("google-auth-library");

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;
const EMAIL_USER = process.env.EMAIL_USER;
const BASE_URL = process.env.BASE_URL;
const CLIENT_URL = process.env.CLIENT_URL;
const NODE_ENV = process.env.NODE_ENV || "development";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

if (!JWT_SECRET) throw new Error("Variável JWT_SECRET não definida");
if (!EMAIL_USER) throw new Error("Variável EMAIL_USER não definida");
if (!BASE_URL) throw new Error("Variável BASE_URL não definida");
if (!CLIENT_URL) throw new Error("Variável CLIENT_URL não definida");

const mapStripeStatusToEnum = (subscription) => {
  if (subscription.trial_end && subscription.trial_end * 1000 > Date.now()) {
    return "trialing";
  }

  switch (subscription.status) {
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    case "incomplete":
    default:
      return "inactive";
  }
};

const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || "15m";

const generateAccessToken = (userId) =>
  jwt.sign({ userId }, JWT_SECRET, { expiresIn: ACCESS_EXPIRES });

const generateRefreshToken = (userId) =>
  jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: "30d" });

const cookieOptions = {
  httpOnly: true,
  secure: NODE_ENV === "production",
  sameSite: NODE_ENV === "production" ? "None" : "Lax",
  expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  domain:
    NODE_ENV === "production"
      ? process.env.COOKIE_DOMAIN || ".petzara.app"
      : undefined,
};

exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, petshopName, email, phone, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (!existingUser.isVerified) {
        existingUser.emailToken = crypto.randomBytes(32).toString("hex");
        await existingUser.save();

        const verifyUrl = `${BASE_URL}/api/auth/verify-email?token=${existingUser.emailToken}&email=${email}`;
        try {
          await transporter.sendMail({
            from: `"Petzara" <${EMAIL_USER}>`,
            to: email,
            subject: "Confirme seu e-mail no Petzara",
            html: generateVerificationEmail(existingUser.name, verifyUrl),
          });
        } catch (emailErr) {
          console.error("[Register] Falha ao reenviar verificação:", emailErr.message);
        }

        return res.status(200).json({
          message: "Esse e-mail já foi cadastrado mas ainda não foi verificado. Reenviamos o e-mail de confirmação.",
        });
      }
      return res.status(409).json({ message: "E-mail já cadastrado." });
    }

    const { user, emailToken } = await createUser({
      name,
      petshopName,
      email,
      phone,
      password,
    });

    const stripe = getStripe();
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
    });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: process.env.STRIPE_PRICE_ID }],
      trial_period_days: 30,
      payment_behavior: "allow_incomplete",
      expand: ["latest_invoice.payment_intent"],
    });

    user.subscription = {
      stripeCustomerId: customer.id,
      stripeSubscriptionId: subscription.id,
      status: mapStripeStatusToEnum(subscription),
      currentPeriodStart: subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000)
        : null,
      currentPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
    };

    await user.save();

    const verifyUrl = `${BASE_URL}/api/auth/verify-email?token=${emailToken}&email=${email}`;

    let emailSent = true;
    try {
      await transporter.sendMail({
        from: `"Petzara" <${EMAIL_USER}>`,
        to: email,
        subject: "Confirme seu e-mail no Petzara",
        html: generateVerificationEmail(name, verifyUrl),
      });
    } catch (emailErr) {
      console.error("[Register] Falha ao enviar e-mail de verificação:", emailErr.message);
      emailSent = false;
    }

    res.status(201).json({
      message: emailSent
        ? "Cadastro realizado com sucesso. Você ganhou 30 dias grátis! Verifique seu e-mail para ativar sua conta."
        : "Cadastro realizado com sucesso. Você ganhou 30 dias grátis! Não foi possível enviar o e-mail de verificação. Use a opção 'Reenviar e-mail' para ativá-lo.",
      emailSent,
    });
  } catch (err) {
    console.error("[Register Error]", err);
    if (err.type === "StripeCardError" || err.type?.includes("Stripe")) {
      return res.status(400).json({ message: "Erro ao processar no Stripe." });
    }

    res.status(500).json({ message: "Erro no servidor.", error: err.message });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token, email } = req.query;
    const user = await User.findOne({ email, emailToken: token });

    if (!user) {
      return res.status(400).json({ message: "Token inválido ou expirado." });
    }

    user.emailToken = undefined;
    user.isVerified = true;

    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, cookieOptions);
    res.redirect(`${CLIENT_URL}/email-verificado?verified=1`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao verificar e-mail" });
  }
};

exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "E-mail já foi verificado" });
    }

    user.emailToken = crypto.randomBytes(32).toString("hex");
    await user.save();

    const verifyUrl = `${BASE_URL}/api/auth/verify-email?token=${user.emailToken}&email=${user.email}`;

    const mailOptions = {
      from: `"Petzara" <${EMAIL_USER}>`,
      to: email,
      subject: "Reenvio: Confirme seu e-mail no Petzara",
      html: generateVerificationEmail(user.name, verifyUrl),
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: "E-mail de confirmação reenviado com sucesso." });
  } catch (err) {
    res.status(500).json({ message: "Erro ao reenviar e-mail de verificação" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(400).json({ message: "Credenciais inválidas." });
    }

    const validCredentials = await bcrypt.compare(password, user.password);
    if (!validCredentials || !user.isVerified) {
      return res
        .status(400)
        .json({ message: "Credenciais inválidas ou e-mail não verificado." });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, cookieOptions);

    return res.json({
      accessToken,
      ...(NODE_ENV !== "production" && { refreshToken }),
      user: {
        id: user._id,
        name: user.name,
        petshopName: user.petshopName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        permissions: user.permissions,
        theme: user.theme,
        owner: user.owner,
        onboardingCompleted: user.onboardingCompleted,
        subscription: user.subscription,
      },
    });
  } catch (err) {
    console.error("[Login] Erro:", err);
    return res.status(500).json({ message: "Erro no servidor" });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token)
      return res.status(401).json({ message: "Refresh token não fornecido" });

    const decoded = jwt.verify(token, REFRESH_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || user.refreshToken !== token) {
      return res.status(403).json({ message: "Refresh token inválido" });
    }

    const ROTATE_REFRESH = process.env.ROTATE_REFRESH !== "false";
    let newRefreshToken = token;

    if (ROTATE_REFRESH) {
      newRefreshToken = generateRefreshToken(user._id);
      user.refreshToken = newRefreshToken;
      await user.save();
      res.cookie("refreshToken", newRefreshToken, cookieOptions);
    }

    const newAccessToken = generateAccessToken(user._id);

    return res.json({
      accessToken: newAccessToken,
      ...(NODE_ENV !== "production" && { refreshToken: newRefreshToken }),
    });
  } catch (err) {
    return res
      .status(403)
      .json({ message: "Refresh token inválido ou expirado" });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }
    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ message: "Erro ao buscar perfil" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone },
      { new: true, runValidators: true }
    ).select("-password");

    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar perfil" });
  }
};

exports.deleteProfile = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: "Usuário excluído com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao excluir usuário" });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "É preciso informar senha atual e nova senha." });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Senha atual incorreta." });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: "Senha alterada com sucesso." });
  } catch (err) {
    res.status(500).json({ message: "Erro ao alterar senha." });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email é obrigatório." });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "Usuário não encontrado." });

    const token = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}&email=${email}`;

    await transporter.sendMail({
      from: `"Petzara" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Redefinição de senha Petzara",
      html: generateResetPasswordEmail(user.name, resetUrl),
    });

    res.json({
      message: "Link de redefinição de senha enviado para seu e-mail.",
    });
  } catch (err) {
    console.error("Erro ao enviar email de redefinição:", err.message);
    res.status(500).json({ message: "Não foi possível enviar o email. Tente novamente mais tarde." });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    return res
      .status(400)
      .json({ message: "Email, token e nova senha são obrigatórios." });
  }

  const user = await User.findOne({
    email,
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });
  if (!user) {
    return res.status(400).json({ message: "Token inválido ou expirado." });
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ message: "Senha redefinida com sucesso." });
};

exports.logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      try {
        const decoded = jwt.verify(token, REFRESH_SECRET);
        const user = await User.findById(decoded.userId);
        if (user) {
          user.refreshToken = null;
          await user.save();
        }
      } catch (err) {
        console.warn("[Logout] Token inválido ou expirado:", err.message);
      }
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: NODE_ENV === "production",
      sameSite: "Strict",
      domain: NODE_ENV === "production" ? ".petzara.app" : undefined,
    });
    res.json({ message: "Logout realizado com sucesso." });
  } catch (err) {
    console.error("[Logout] Erro:", err);
    res.status(500).json({ message: "Erro ao sair da conta" });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: "Token do Google não informado." });
    }
    if (!googleClient) {
      return res
        .status(500)
        .json({ message: "Google OAuth não está configurado no servidor." });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    // Try to find user by googleId or by email
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      // Link googleId if not set yet
      if (!user.googleId) {
        user.googleId = googleId;
      }
      // Auto-verify on Google login
      if (!user.isVerified) {
        user.isVerified = true;
      }
    } else {
      // Create new user via Google
      const now = new Date();
      const freeTrialEnd = new Date();
      freeTrialEnd.setMonth(freeTrialEnd.getMonth() + 1);

      const stripe = getStripe();
      const customer = await stripe.customers.create({ email, name });

      user = await User.create({
        name,
        email,
        googleId,
        isVerified: true,
        role: "admin",
        subscription: {
          stripeCustomerId: customer.id,
          stripeSubscriptionId: null,
          status: "trialing",
          currentPeriodStart: now,
          currentPeriodEnd: freeTrialEnd,
        },
      });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshTk = generateRefreshToken(user._id);
    user.refreshToken = refreshTk;
    await user.save();

    res.cookie("refreshToken", refreshTk, cookieOptions);

    return res.json({
      accessToken,
      ...(NODE_ENV !== "production" && { refreshToken: refreshTk }),
      user: {
        id: user._id,
        name: user.name,
        petshopName: user.petshopName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        permissions: user.permissions,
        theme: user.theme,
        owner: user.owner,
        onboardingCompleted: user.onboardingCompleted,
        subscription: user.subscription,
      },
    });
  } catch (err) {
    console.error("[Google Login] Erro:", err);
    return res
      .status(401)
      .json({ message: "Falha na autenticação com Google." });
  }
};
