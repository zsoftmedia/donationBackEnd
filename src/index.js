const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const paymentRoutes = require('./routes/payment');
const webhookRoute = require('./routes/webhook');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Apply raw body parser ONLY for Stripe webhook
app.use('/api/payment/webhook', webhookRoute);

// ✅ Apply JSON parsing for everything else
app.use(express.json());

// ✅ CORS setup
const allowedOrigins = [
  "https://ghb-clanstvo.netlify.app",
  "http://localhost:3001"
];

app.use(cors({
  origin: allowedOrigins,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
}));

// ✅ Register other API routes
app.use('/api/payment', paymentRoutes);

app.get('/', (req, res) => {
  res.send(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
