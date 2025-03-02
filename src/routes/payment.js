const express = require('express');
const stripe = require('../config/stripe');

const router = express.Router();

// ✅ Create Stripe Checkout Session
router.post('/pay', async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: { name: 'Donation Payment' },
                        unit_amount: 15000, // 150 EUR in cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/cancel`,
        });

        return res.json({ id: session.id, url: session.url });
    } catch (error) {
        console.error('❌ Stripe Error:', error);
        return res.status(500).json({ error: 'Payment session creation failed' });
    }
});

// ✅ Retrieve Payment Details
router.get('/success', async (req, res) => {
    try {
        const sessionId = req.query.session_id;
        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' });
        }

        // Fetch payment details from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        return res.json({
            success: true,
            message: 'Payment successful!',
            paymentDetails: {
                id: session.id,
                amount_total: session.amount_total / 100, // Convert cents to EUR
                currency: session.currency.toUpperCase(),
                payment_status: session.payment_status,
                customer_email: session.customer_details?.email || 'Not Provided',
            },
        });
    } catch (error) {
        console.error('❌ Error retrieving payment details:', error);
        return res.status(500).json({ error: 'Failed to retrieve payment details' });
    }
});

module.exports = router;
