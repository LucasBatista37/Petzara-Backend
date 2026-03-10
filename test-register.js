require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const { createUser } = require('./services/userService');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { generateVerificationEmail } = require("./utils/emailTemplates");
const transporter = require("./utils/mailer");
const EMAIL_USER = process.env.EMAIL_USER;
const BASE_URL = process.env.BASE_URL;

async function test() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");

    try {
        const { user, emailToken } = await createUser({
            name: "Test Node1",
            petshopName: "Test Node Shop",
            email: "testnode222@example.com",
            phone: "111",
            password: "123"
        });
        console.log("created user locally");

        const customer = await stripe.customers.create({
            email: user.email,
            name: user.name,
        });
        console.log("created stripe customer");

        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: process.env.STRIPE_PRICE_ID }],
            trial_period_days: 30,
            payment_behavior: "allow_incomplete",
            expand: ["latest_invoice.payment_intent"],
        });
        console.log("created stripe sub");

        user.subscription = {
            stripeCustomerId: customer.id,
            stripeSubscriptionId: subscription.id,
            status: "inactive",
        };
        await user.save();
        console.log("saved user");

        const verifyUrl = `${BASE_URL}/api/auth/verify-email?token=${emailToken}&email=${user.email}`;

        await transporter.sendMail({
            from: `"PetCare" <${EMAIL_USER}>`,
            to: user.email,
            subject: "Confirme seu e-mail no PetCare",
            html: generateVerificationEmail(user.name, verifyUrl),
        });
        console.log("Email sent!");

    } catch (err) {
        console.error("CAUGHT ERROR:", err);
    } finally {
        process.exit();
    }
}

test();
