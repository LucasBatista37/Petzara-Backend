const { body } = require("express-validator");

exports.validateRegister = [
  body("name")
    .isLength({ min: 2 })
    .withMessage("Nome deve ter pelo menos 2 caracteres")
    .trim()
    .escape(),
  body("email").isEmail().withMessage("Email inválido"),
  body("phone").optional({ values: "falsy" }).trim().escape(),
  body("password")
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 0,
    })
    .withMessage(
      "A senha deve ter pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas e números"
    ),
];

exports.validateChangePassword = [
  body("currentPassword").notEmpty().withMessage("Senha atual é obrigatória"),
  body("newPassword")
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 0,
    })
    .withMessage(
      "A nova senha deve ter pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas e números"
    ),
];

exports.validateForgotPassword = [
  body("email").isEmail().withMessage("Email inválido"),
];

exports.validateResetPassword = [
  body("email").isEmail().withMessage("Email inválido"),
  body("token").notEmpty().withMessage("Token é obrigatório"),
  body("newPassword")
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 0,
    })
    .withMessage(
      "A nova senha deve ter pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas e números"
    ),
];
