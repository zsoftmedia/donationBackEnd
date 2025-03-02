import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: envFile });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS || '*' }));

// Routes
app.get('/', (req: Request, res: Response) => {
  res.send(`Server running in ${process.env.NODE_ENV} mode`);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});