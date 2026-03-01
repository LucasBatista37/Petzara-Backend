const { Worker } = require("bullmq");
const redisConnection = require("../config/redis");
const transporter = require("../utils/mailer");

const emailWorker = new Worker("emailQueue", async (job) => {
    const { to, subject, html, from } = job.data;
    console.log(`[EMAIL WORKER] Processando envio de email para ${to} (Job ID: ${job.id})`);

    await transporter.sendMail({
        from: from || `"PetCare" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
        to,
        subject,
        html
    });
}, {
    connection: redisConnection,
    limiter: {
        max: 10,
        duration: 1000
    }
});

emailWorker.on("completed", (job) => {
    console.log(`[EMAIL WORKER] Job ${job.id} concluído. Email enviado para ${job.data.to}`);
});

emailWorker.on("failed", (job, err) => {
    console.error(`[EMAIL WORKER] Job ${job?.id} falhou:`, err.message);
});

module.exports = emailWorker;
