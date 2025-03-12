const express = require("express");
const stripe = require("../config/stripe");

const router = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3001";


router.post("/pay", async (req, res) => {
  try {
    console.log("🔍 FRONTEND_URL:", FRONTEND_URL); 

    const { amount = 15000 } = req.body; 
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card","klarna"], // Add all needed payment methods
      payment_method_options: {
        paypal: { preferred: true }, // ✅ Prioritize PayPal
        ideal: { preferred: true },  // ✅ Prioritize iDEAL
        klarna: { preferred: true }, // ✅ Prioritize Klarna
      },
      automatic_payment_methods: { enabled: true }, // ✅ Enable Google Pay & other auto-detected methods
    
      // ✅ Auto-fill customer details
      customer_email: email,
      phone_number_collection: { enabled: true }, // ✅ Request and auto-fill phone number
      billing_address_collection: "required", // ✅ Force user to enter an address
    
      // ✅ Pre-fill shipping address
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB", "DE", "FR", "NL", "SE", "DK", "NO", "FI", "HR"], // Add more if needed
      },
    
      // ✅ Pre-fill customer data if they have a Stripe account
      customer_creation: "always", // Creates a customer if one doesn’t exist
      mode: "payment",
      submit_type: "donate",
      locale: "hr",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: "Donation" },
            unit_amount: amount * 100, // Convert amount to cents
          },
          quantity: 1,
        },
      ],
    
      // ✅ Store user details to pass to Stripe
      metadata: { name, email, phone, address },
    
      success_url: `https://ghb-clanstvo.netlify.app/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://ghb-clanstvo.netlify.app/`,
    });
    
    
    
    

    console.log("✅ Stripe session created:", session);
    return res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error("❌ Stripe Error:", error);
    return res.status(500).json({ error: error.message }); // Return the actual Stripe error message
  }
});

router.get("/transactions", async (req, res) => {
  try {
    const { startDate, endDate } = req.query; 
    const payments = await stripe.paymentIntents.list({
      created: {
        gte: startDate ? Math.floor(new Date(startDate).getTime() / 1000) : undefined,
        lte: endDate ? Math.floor(new Date(endDate).getTime() / 1000) : undefined,
      },
      limit: 100, 
    });

    let totalAmount = 0;
    let customers = [];
    for (const payment of payments.data) {
      if (payment.status === "succeeded") {
        totalAmount += payment.amount;
        const charge = await stripe.charges.retrieve(payment.latest_charge);
        const billingDetails = charge.billing_details;

        customers.push({
          id: payment.id,
          amountPaid: payment.amount / 100, 
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
      totalAmount: totalAmount / 100, // 
      currency: customers.length > 0 ? customers[0].currency : "EUR",
      customers: customers, 
    });
  } catch (error) {
    console.error("❌ Error fetching transactions:", error);
    res.status(500).json({ error: error.message });
  }
});


router.post("/create-checkout-session", async (req, res) => {
  try {
    const { name, email, phone, address, amount } = req.body;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: email,
      phone_number_collection: phone, 
      billing_address_collection: "required",
      locale: "hr",
      submit_type: "donate",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: "Donation" },
            unit_amount: amount * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: { 
        name: name,
        email: email,
        phone: phone,
        address: address,
      },
      success_url: `https://ghb-clanstvo.netlify.app/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://ghb-clanstvo.netlify.app/`, 
    });
    return res.json({ url: session.url });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
module.exports = router;
