const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const paymentRoutes = require('./routes/payment');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Allow CORS from frontend (React)
app.use(cors({
  origin: ['http://localhost:3001','https://lovely-caramel-2e7792.netlify.app'],  // ✅ Allow localhost:3001
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

// ✅ Register API Routes
app.use('/api/payment', paymentRoutes);

app.get('/', (req, res) => {
    res.send(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
