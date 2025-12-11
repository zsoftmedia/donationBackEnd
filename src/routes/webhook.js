// routes/webhook.js
const express = require("express");
const router = express.Router();
const stripe = require("../config/stripe");
const { saveDonationToDB } = require("../services/donationService/donationService");

router.post("/", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Process completed payments
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    if (session.payment_status === "paid") {
      try {
        // Save donation into Supabase
        await saveDonationToDB({
          name: session.metadata.name,
          email: session.customer_email,
          profession: session.metadata.profession,
          address: session.metadata.address,
          addressHomeTown: session.metadata.addressHomeTown,
          amount: session.amount_total / 100,
          phone: session.metadata.phone
        });

        console.log("💾 Donation saved to Supabase");
      } catch (err) {
        console.error("❌ Failed to save to Supabase:", err);
      }
    }
  }

  res.status(200).send("OK");
});

module.exports = router;
