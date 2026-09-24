import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import leadRoutes from './routes/leads.js';
import auditRoutes from './routes/audit.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (_, res) => {
  res.json({ ok: true, service: 'Nexora AI API' });
});

app.use('/api/leads', leadRoutes);
app.use('/api/audit', auditRoutes);


async function start() {
  try {
    if (process.env.MONGO_URI) {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('MongoDB connected');
    } else {
      console.log('MONGO_URI not configured; running without database');
    }
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
  }

  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}

start();
