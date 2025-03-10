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
const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/dR6fZya4I8Or9S8cMM"; // 🔹 Replace with your Stripe link

// ✅ Generate Stripe Payment Link
router.post("/create-payment-link", async (req, res) => {
  try {
    const { name, email, amount } = req.body;

    // ✅ Create a Product (if needed)
    const product = await stripe.products.create({
      name: "Donation Payment",
      description: `Donation from ${name}`,
    });

    // ✅ Create a Price for the Product
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: amount * 100, // Convert to cents
      currency: "eur",
    });

    // ✅ Create a Payment Link with Email Pre-filled
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { name, email },
      collect_email: "always", // ✅ Pre-fill email field in checkout
      allow_promotion_codes: true, // Optional discount codes
    });

    console.log(`🔗 Generated Payment Link for ${email}:`, paymentLink.url);
    return res.json({ url: paymentLink.url });
  } catch (error) {
    console.error("❌ Stripe Error:", error);
    return res.status(500).json({ error: error.message });
  }
});


router.get("/transactions", async (req, res) => {
  try {
    const { startDate, endDate } = req.query; // Optional date filters

    const payments = await stripe.paymentIntents.list({
      created: {
        gte: startDate ? Math.floor(new Date(startDate).getTime() / 1000) : undefined,
        lte: endDate ? Math.floor(new Date(endDate).getTime() / 1000) : undefined,
      },
      limit: 100, // ✅ Get last 100 transactions
    });

    let totalAmount = 0;
    let customers = [];

    // ✅ Loop through each successful payment
    for (const payment of payments.data) {
      if (payment.status === "succeeded") {
        totalAmount += payment.amount;

        // ✅ Fetch customer details from metadata (if stored)
        const charge = await stripe.charges.retrieve(payment.latest_charge);
        const billingDetails = charge.billing_details;

        customers.push({
          id: payment.id,
          amountPaid: payment.amount / 100, // Convert cents to EUR
          currency: payment.currency.toUpperCase(),
          name: billingDetails.name || "N/A",
          email: billingDetails.email || "N/A",
          phone: billingDetails.phone || "N/A",
          address: billingDetails.address || "N/A",
          status: payment.status,
        });
      }
    }

    res.json({
      totalTransactions: customers.length,
      totalAmount: totalAmount / 100, // Convert cents to EUR
      currency: customers.length > 0 ? customers[0].currency : "EUR",
      customers: customers, // ✅ Customer details list
    });
  } catch (error) {
    console.error("❌ Error fetching transactions:", error);
    res.status(500).json({ error: error.message });
  }
});


// ✅ Create Stripe Checkout Session
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { name, email, phone, address, amount } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: email, // ✅ Pre-fill email in checkout
      phone_number_collection: phone, // ✅ Collect phone number
      billing_address_collection: "required", // ✅ Collect address
      locale: "hr",
      submit_type: "donate",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: "Donation" },
            unit_amount: amount * 100, // Convert EUR to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",

      metadata: { // ✅ Store full user details
        name: name,
        email: email,
        phone: phone,
        address: address,
      },

      success_url: `http://localhost:3001/success?session_id={CHECKOUT_SESSION_ID}`, // ✅ Redirect after success
      cancel_url: `http://localhost:3001/cancel`, // ✅ Redirect if canceled
    });

    console.log(`🔗 Checkout Session Created:`, session.url);
    return res.json({ url: session.url });
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
