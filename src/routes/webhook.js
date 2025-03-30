const express = require("express");
const router = express.Router();
const stripe = require("../config/stripe");
const nodemailer = require("nodemailer");
const createEmailTemplate = require("../config/template/reciveAmountDonation");

router.post("/", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("❌ Webhook verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    if (session.payment_status === "paid") {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.USER_EMAIL,
          pass: process.env.USER_PASS,
        },
      });

      const mailOptions = {
        from: `"Spende GHB" <${process.env.USER_EMAIL}>`,
        to: "cyberkhan7@gmail.com",
        bcc: "mekhan1900@gmail.com",
        subject: "Neue Spende eingegangen",
        html: createEmailTemplate(session.metadata.name,session.customer_email,(session.amount_total / 100).toFixed(2),session.metadata.phone, (charge.balance_transaction.net / 100).toFixed(2)),
      };

      try {
        await transporter.sendMail(mailOptions);
      } catch (err) {
        console.error("❌ Fehler beim E-Mail-Versand:", err);
      }
    }
  }

  res.status(200).send("✅ Webhook received");
});

module.exports = router;
