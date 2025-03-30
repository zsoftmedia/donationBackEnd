// routes/webhook.js
const express = require("express");
const router = express.Router();
const stripe = require("../config/stripe");
const nodemailer = require("nodemailer");

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
      // 💌 Send email after successful payment
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
        html: `
          <div style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: #007BFF; color: #ffffff; text-align: center; padding: 20px;">
              <h2 style="margin: 0;"> €${(session.amount_total / 100).toFixed(2)}“</h2>
            </td>
          </tr>
  
          <!-- Body -->
          <tr>
            <td style="padding: 30px;">
              <p style="margin-bottom: 25px;">Sie haben eine neue Nachricht vom Kontaktformular Ihrer Website erhalten:</p>
  
              <table width="100%" style="border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px; font-weight: bold; width: 120px;">👤 Name:</td>
                  <td style="padding: 8px;">${session.metadata.name}</td>
                </tr>
                <tr style="background-color: #f9f9f9;">
                  <td style="padding: 8px; font-weight: bold;">✉️ E-Mail:</td>
                  <td style="padding: 8px;"><a href="mailto:${session.customer_email}" style="color: #007BFF;">${session.customer_email}</a></td>
                </tr>
                <tr>
                <td style="padding: 8px; font-weight: bold;">📞 Telefonnummer:</td>
                <td style="padding: 8px;">${session.metadata.phone}</td>
              </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log("📧 Spenden-Bestätigung gesendet");
      } catch (err) {
        console.error("❌ Fehler beim E-Mail-Versand:", err);
      }
    }
  }

  res.status(200).send("✅ Webhook received");
});

module.exports = router;
