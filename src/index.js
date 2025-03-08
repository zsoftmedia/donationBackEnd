const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const paymentRoutes = require('./routes/payment');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Allow CORS from frontend (React)
const allowedOrigins = [
  "https://jazakallahu.netlify.app", // Your frontend URL
  "http://localhost:3001" // For local testing
];
app.use(cors({
  origin: allowedOrigins,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true, // Allows sending cookies/authentication headers
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
