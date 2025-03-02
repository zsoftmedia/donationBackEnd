const express = require("express");
const stripe = require("../config/stripe");

const router = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3001";

// ✅ Stripe Checkout Session (Redirects to Stripe Checkout)
router.post("/pay", async (req, res) => {
  try {
    console.log("🔍 FRONTEND_URL:", FRONTEND_URL); // Debugging output

    const { amount = 15000 } = req.body; // Default to 150 EUR in cents if no amount is provided

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: "Donation Payment" },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/cancel`,
    });

    console.log("✅ Stripe session created:", session);
    return res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error("❌ Stripe Error:", error);
    return res.status(500).json({ error: error.message }); // Return the actual Stripe error message
  }
});

// ✅ Handle Direct Payment via Payment Intents (Card Form in Frontend)
router.post("/intent", async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount < 100) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "eur",
      payment_method_types: ["card"],
    });

    return res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("❌ Stripe Error:", error);
    return res.status(500).json({ error: error.message });
  }
});

// ✅ Retrieve Payment Details After Success
router.get("/success", async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    // Fetch payment details from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return res.json({
      success: true,
      message: "Payment successful!",
      paymentDetails: {
        id: session.id,
        amount_total: session.amount_total / 100, // Convert cents to EUR
        currency: session.currency.toUpperCase(),
        payment_status: session.payment_status,
        customer_email: session.customer_details?.email || "Not Provided",
      },
    });
  } catch (error) {
    console.error("❌ Error retrieving payment details:", error);
    return res.status(500).json({ error: "Failed to retrieve payment details" });
  }
});

module.exports = router;
