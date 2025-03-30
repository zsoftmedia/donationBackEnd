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


// to the information after mayment sucessfull
router.post("/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Listen for checkout session completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    if (session.payment_status === 'paid') {
      // Send email
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.USER_EMAIL,
          pass: process.env.USER_PASS,
        },
      });

      const mailOptions = {
        from: `"GHB Spende" <${process.env.USER_EMAIL}>`,
        to: 'cyberkhan7@gmail.com',
        bcc: 'mekhan1900@gmail.com',
        subject: "ghb Neue Spende erhalten",
        html: `
          <p><strong>Name:</strong> ${session.metadata.name}</p>
          <p><strong>Email:</strong> ${session.customer_email}</p>
          <p><strong>Phone:</strong> ${session.metadata.phone}</p>
          <p><strong>Betrag:</strong> €${(session.amount_total / 100).toFixed(2)}</p>
        `
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log("✅ Donation email sent successfully.");
      } catch (error) {
        console.error("❌ Failed to send donation email:", error);
      }
    }
  }

  res.status(200).send("Webhook received");
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
