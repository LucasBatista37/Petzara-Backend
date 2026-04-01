const transporter = require("../utils/mailer");

exports.sendSupportMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: "Preencha todos os campos." });
    }

    await transporter.sendMail({
      from: `"Suporte Petzara" <${process.env.EMAIL_USER}>`,
      to: process.env.SUPPORT_EMAIL || process.env.EMAIL_USER, 
      subject: `[Suporte] ${subject}`,
      html: `
        <h3>Nova mensagem de suporte</h3>
        <p><strong>Nome:</strong> ${name}</p>
        <p><strong>E-mail:</strong> ${email}</p>
        <p><strong>Assunto:</strong> ${subject}</p>
        <p><strong>Mensagem:</strong><br/>${message.replace(/\n/g, "<br>")}</p>
      `,
    });

    res.status(200).json({ message: "Mensagem enviada com sucesso!" });
  } catch (err) {
    console.error("Erro ao enviar mensagem de suporte:", err);
    res.status(500).json({ message: "Erro ao enviar mensagem de suporte" });
  }
};
