const express = require("express");
const stripe = require("../config/stripe");
const router = express.Router();
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const createEmailTemplate = require("../config/template/reciveAmountDonation");

dotenv.config();
// ✅ GET: Transactions summary
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
      totalAmount: totalAmount / 100,
      currency: customers.length > 0 ? customers[0].currency : "EUR",
      customers,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ POST: Create Stripe session and send email
  router.post("/create-checkout-session", async (req, res) => {
  try {
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
    return res.json({ url: session.url, success: true });
  } catch (error) {
    console.error("Stripe Error:", error);
    return res.status(500).json({ error: error.message || "Payment session could not be created." });
  }
});

// routes/payoutRoute.js
router.get("/payout-details", async (req, res) => {
  try {
    const balance = await stripe.balance.retrieve();
    const payouts = await stripe.payouts.list({ limit: 1 });
    const lastPayout = payouts.data.length > 0 ? payouts.data[0] : null;
    const account = await stripe.accounts.retrieve();
    const payoutSchedule = account.settings.payouts.schedule;
    let nextPayoutDate = "N/A";
    if (payoutSchedule.interval === "daily") {
      nextPayoutDate = "Next business day (daily payout)";
    } else if (payoutSchedule.interval === "weekly") {
      nextPayoutDate = `Next ${payoutSchedule.weekly_anchor}`;
    } else if (payoutSchedule.interval === "monthly") {
      nextPayoutDate = `Every month on day ${payoutSchedule.monthly_anchor}`;
    }

    const available = balance.available.map(b => ({
      currency: b.currency.toUpperCase(),
      amount: b.amount / 100,
    }));

    res.json({
      success: true,
      available,
      nextPayoutDate,
      lastPayout: lastPayout
        ? {
            amount: lastPayout.amount / 100,
            arrival_date: new Date(lastPayout.arrival_date * 1000).toLocaleDateString(),
            status: lastPayout.status,
          }
        : null,
    });
  } catch (error) {
    console.error("❌ Error fetching payout details:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
