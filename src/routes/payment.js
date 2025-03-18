const express = require("express");
const stripe = require("../config/stripe");

const router = express.Router();
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
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: error.message });
  }
});


router.post("/create-checkout-session", async (req, res) => {
  try {  
    // Extract request body
    const { name, email, address, amount, phone } = req.body;
    if (!name || !email || !amount || !phone) {
      console.error("Missing required fields:", req.body);
      return res.status(400).json({ error: "Missing required fields" });
    }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "klarna", "eps"], 
      customer_email: email,
      phone_number_collection: { enabled: true },
      billing_address_collection: "required",
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: "Donation" },
            unit_amount: parseInt(amount) * 100, 
          },
          quantity: 1,
        },
      ],
      metadata: { name, email, phone, address },
      success_url: `${process.env.FRONTEND_URL}success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}cancel`,
      

    });
  
    console.log("✅ Stripe session created:", session.url);
    return res.json({ url: session.url,success:true });
  } catch (error) {
    console.error("Stripe Error:", error);
    return res.status(500).json({ error: error.message || "Payment session could not be created." });
  }
});
module.exports = router;
