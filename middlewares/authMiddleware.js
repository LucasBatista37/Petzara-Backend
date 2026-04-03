const jwt = require("jsonwebtoken");
const User = require("../models/User");

const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || "15m";

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!accessToken) {
      return res.status(401).json({ message: "Token de acesso não fornecido" });
    }

    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (!user)
        return res.status(401).json({ message: "Usuário não encontrado" });

      req.user = user;
      return next();
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken)
          return res
            .status(401)
            .json({ message: "Refresh token não fornecido" });

        try {
          const decodedRefresh = jwt.verify(
            refreshToken,
            process.env.REFRESH_SECRET
          );
          const user = await User.findById(decodedRefresh.userId);
          if (!user || user.refreshToken !== refreshToken) {
            return res.status(403).json({ message: "Refresh token inválido" });
          }

          const newAccessToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: ACCESS_EXPIRES }
          );
          res.setHeader("x-access-token", newAccessToken);
          req.user = user;
          return next();
        } catch (refreshErr) {
          console.error("Erro no refreshToken:", refreshErr);
          return res
            .status(403)
            .json({ message: "Refresh token inválido ou expirado" });
        }
      } else {
        console.error("Erro na autenticação:", err);
        return res.status(401).json({ message: "Token inválido" });
      }
    }
  } catch (e) {
    console.error("Erro middleware auth:", e);
    return res
      .status(500)
      .json({ message: "Erro no middleware de autenticação" });
  }
};
