const { Resend } = require("resend");

let resend;

const transporter = {
  async sendMail({ from, to, subject, html }) {
    if (!resend) {
      if (!process.env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY não configurada. Emails não podem ser enviados.");
      }
      resend = new Resend(process.env.RESEND_API_KEY);
    }

    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });
    if (error) throw new Error(error.message);
    return data;
  },
};

module.exports = transporter;
