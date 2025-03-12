const Stripe = require('stripe');
require('dotenv').config();

const stripe = new Stripe(process.env.STRIPE_KEY, {
    apiVersion: '2023-10-16',
});

module.exports = stripe;
