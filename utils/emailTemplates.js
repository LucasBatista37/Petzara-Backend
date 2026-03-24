const COLORS = {
  terracotta: "#E07A5F",
  espresso: "#2C2421",
  sage: "#81B29A",
  cream: "#FAFAF9",
  taupe: "#8C7A6B",
  sand: "#E6DED8",
};

exports.generateVerificationEmail = (name, verifyUrl) => `
  <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; line-height: 1.6; color: ${COLORS.espresso}; background-color: ${COLORS.cream}; padding: 40px; border-radius: 24px; border: 1px solid ${COLORS.sand};">
    <h2 style="color: ${COLORS.terracotta}; font-family: 'Outfit', sans-serif; font-size: 24px; margin-bottom: 20px;">Olá, ${name}!</h2>
    <p style="font-size: 16px;">Obrigado por se cadastrar no <strong style="color: ${COLORS.terracotta};">PetCare</strong>.</p>
    <p style="font-size: 16px;">Para ativar sua conta, clique no botão abaixo:</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="${verifyUrl}" style="display: inline-block; padding: 14px 32px; background-color: ${COLORS.terracotta}; color: #fff; text-decoration: none; border-radius: 12px; font-weight: bold; box-shadow: 0 4px 6px rgba(224, 122, 95, 0.2);">
        Confirmar E-mail
      </a>
    </p>
    <p style="font-size: 14px; color: ${COLORS.taupe};">Ou copie e cole este link no seu navegador:</p>
    <p style="word-break: break-all; font-size: 14px; color: ${COLORS.terracotta}; opacity: 0.8;">${verifyUrl}</p>
    <hr style="margin: 30px 0; border: 0; border-top: 1px solid ${COLORS.sand};" />
    <p style="font-size: 12px; color: ${COLORS.taupe};">
      Se você não se registrou no PetCare, pode ignorar este e-mail.
    </p>
  </div>
`;

exports.generateResetPasswordEmail = (name, resetUrl) => `
  <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; line-height: 1.6; color: ${COLORS.espresso}; background-color: ${COLORS.cream}; padding: 40px; border-radius: 24px; border: 1px solid ${COLORS.sand};">
    <h2 style="color: ${COLORS.terracotta}; font-family: 'Outfit', sans-serif; font-size: 24px; margin-bottom: 20px;">Olá, ${name}!</h2>
    <p style="font-size: 16px;">Recebemos um pedido para redefinir sua senha no <strong style="color: ${COLORS.terracotta};">PetCare</strong>.</p>
    <p style="font-size: 16px;">Clique no botão abaixo para criar uma nova senha (válido por 1 hora):</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background-color: ${COLORS.terracotta}; color: #fff; text-decoration: none; border-radius: 12px; font-weight: bold; box-shadow: 0 4px 6px rgba(224, 122, 95, 0.2);">
        Redefinir Senha
      </a>
    </p>
    <p style="font-size: 14px; color: ${COLORS.taupe};">Ou copie e cole este link no navegador:</p>
    <p style="word-break: break-all; font-size: 14px; color: ${COLORS.terracotta}; opacity: 0.8;">${resetUrl}</p>
    <hr style="margin: 30px 0; border: 0; border-top: 1px solid ${COLORS.sand};" />
    <p style="font-size: 12px; color: ${COLORS.taupe};">
      Se você não solicitou, ignore este e-mail.</p>
  </div>
`;

exports.generateInviteCollaboratorEmail = (inviteUrl) => `
  <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; line-height: 1.6; color: ${COLORS.espresso}; background-color: ${COLORS.cream}; padding: 40px; border-radius: 24px; border: 1px solid ${COLORS.sand};">
    <h2 style="color: ${COLORS.terracotta}; font-family: 'Outfit', sans-serif; font-size: 24px; margin-bottom: 20px;">Olá!</h2>
    <p style="font-size: 16px;">Você foi convidado para colaborar no sistema <strong style="color: ${COLORS.terracotta};">PetCare</strong>.</p>
    <p style="font-size: 16px;">Para aceitar o convite e configurar sua conta, clique no botão abaixo:</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="${inviteUrl}" style="display: inline-block; padding: 14px 32px; background-color: ${COLORS.terracotta}; color: #fff; text-decoration: none; border-radius: 12px; font-weight: bold; box-shadow: 0 4px 6px rgba(224, 122, 95, 0.2);">
        Aceitar Convite
      </a>
    </p>
    <p style="font-size: 14px; color: ${COLORS.taupe};">Ou copie e cole este link no seu navegador:</p>
    <p style="word-break: break-all; font-size: 14px; color: ${COLORS.terracotta}; opacity: 0.8;">${inviteUrl}</p>
    <hr style="margin: 30px 0; border: 0; border-top: 1px solid ${COLORS.sand};" />
    <p style="font-size: 12px; color: ${COLORS.taupe};">
      Se você não esperava esse convite, pode ignorar este e-mail.
    </p>
  </div>
`;

exports.generateWelcomeEmail = (name) => `
  <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; line-height: 1.6; color: ${COLORS.espresso}; background-color: ${COLORS.cream}; padding: 40px; border-radius: 24px; border: 1px solid ${COLORS.sand};">
    <h2 style="color: ${COLORS.terracotta}; font-family: 'Outfit', sans-serif; font-size: 24px; margin-bottom: 20px;">Bem-vindo ao PetCare, ${name}!</h2>
    <p style="font-size: 16px;">Estamos muito felizes em ter você como assinante 🎉</p>
    <p style="font-size: 16px;">A partir de agora você terá acesso completo ao nosso sistema de agendamento e gestão <strong style="color: ${COLORS.terracotta};">PetCare</strong>.</p>
    <p style="font-size: 16px;">Esperamos que sua experiência seja incrível!</p>
    <hr style="margin: 30px 0; border: 0; border-top: 1px solid ${COLORS.sand};" />
    <p style="font-size: 12px; color: ${COLORS.taupe};">
      Caso tenha dúvidas ou precise de suporte, entre em contato com nossa equipe de atendimento🐾.
    </p>
  </div>
`;

exports.generateTrialEndingEmail = (name) => `
  <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; line-height: 1.6; color: ${COLORS.espresso}; background-color: ${COLORS.cream}; padding: 40px; border-radius: 24px; border: 1px solid ${COLORS.sand};">
    <h2 style="color: ${COLORS.terracotta}; font-family: 'Outfit', sans-serif; font-size: 24px; margin-bottom: 20px;">Olá, ${name} 👋</h2>
    <p style="font-size: 16px;">Seu período de teste de 30 dias no <strong style="color: ${COLORS.terracotta};">PetCare</strong> está quase acabando.</p>
    <p style="font-size: 16px;">Para continuar usando sem interrupções e manter seus dados salvos, adicione uma forma de pagamento no link abaixo:</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="${process.env.CLIENT_URL}/billing" 
         style="display: inline-block; padding: 14px 32px; background-color: ${COLORS.terracotta}; color: #fff; text-decoration: none; border-radius: 12px; font-weight: bold; box-shadow: 0 4px 6px rgba(224, 122, 95, 0.2);">
        Ativar Assinatura
      </a>
    </p>
    <p style="font-size: 16px;">Obrigado por confiar no <strong style="color: ${COLORS.terracotta};">PetCare</strong> 🐾</p>
  </div>
`;

exports.generateTrialEndedEmail = (name) => `
  <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; line-height: 1.6; color: ${COLORS.espresso}; background-color: ${COLORS.cream}; padding: 40px; border-radius: 24px; border: 1px solid ${COLORS.sand};">
    <h2 style="color: ${COLORS.terracotta}; font-family: 'Outfit', sans-serif; font-size: 24px; margin-bottom: 20px;">Olá, ${name} ⚠️</h2>
    <p style="font-size: 16px;">Seu período de teste de 30 dias no <strong style="color: ${COLORS.terracotta};">PetCare</strong> terminou.</p>
    <p style="font-size: 16px;">O seu acesso foi pausado. Para continuar gerenciando seu PetShop, assine nosso plano garantindo o gerenciamento de clientes, agendamentos e seu espaço no mercado:</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="${process.env.CLIENT_URL}/billing" 
         style="display: inline-block; padding: 14px 32px; background-color: ${COLORS.terracotta}; color: #fff; text-decoration: none; border-radius: 12px; font-weight: bold; box-shadow: 0 4px 6px rgba(224, 122, 95, 0.2);">
        Assinar Agora
      </a>
    </p>
    <p style="font-size: 16px;">Esperamos ver você de volta em breve! 🐾</p>
  </div>
`;
