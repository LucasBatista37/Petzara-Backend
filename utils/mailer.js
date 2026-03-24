const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const transporter = {
  async sendMail({ from, to, subject, html }) {
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
