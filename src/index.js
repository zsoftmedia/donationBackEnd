const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const paymentRoutes = require('./routes/payment');
const webhookRoute = require('./routes/webhook');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1️⃣ Stripe webhook BEFORE JSON
app.use('/api/payment/webhook',
  express.raw({ type: 'application/json' }),
  webhookRoute
);

// 2️⃣ JSON for normal API routes
app.use(express.json());

// 3️⃣ CORS
const allowedOrigins = [
  "https://ghb-clanstvo.netlify.app",
  "http://localhost:3001"
];
app.use(cors({
  origin: allowedOrigins,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
}));

// 4️⃣ Normal API routes
app.use('/api/payment', paymentRoutes);

app.get('/', (req, res) => {
  res.send(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
