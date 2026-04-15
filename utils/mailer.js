const { Resend } = require("resend");

let resend;

// Em desenvolvimento, o Resend só aceita remetentes de domínios verificados.
// Use onboarding@resend.dev como fallback até o domínio de produção ser verificado.
// Em produção defina NODE_ENV=production e verifique o domínio em https://resend.com/domains
const DEV_FROM = "Petzara <onboarding@resend.dev>";

const transporter = {
  async sendMail({ from, to, subject, html }) {
    if (!resend) {
      if (!process.env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY não configurada. Emails não podem ser enviados.");
      }
      resend = new Resend(process.env.RESEND_API_KEY);
    }

    const resolvedFrom = process.env.NODE_ENV === "production" ? from : DEV_FROM;

    const { data, error } = await resend.emails.send({
      from: resolvedFrom,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });
    if (error) throw new Error(error.message);
    return data;
  },
};

module.exports = transporter;
