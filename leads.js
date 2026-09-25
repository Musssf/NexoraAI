import { Router } from 'express';
import mongoose from 'mongoose';
import Lead from '../models/Lead.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { name, email, company, service, budget, message } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required.' });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        message: 'Lead form is ready, but MongoDB is not connected. Configure MONGO_URI first.'
      });
    }

    const lead = await Lead.create({ name, email, company, service, budget, message });
    res.status(201).json({ message: 'Thanks! Your project request has been received.', id: lead._id });
  } catch (error) {
    res.status(500).json({ message: 'Could not submit your request.' });
  }
});

export default router;
