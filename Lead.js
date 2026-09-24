import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    company: { type: String, trim: true },
    service: { type: String, trim: true },
    budget: { type: String, trim: true },
    message: { type: String, trim: true }
  },
  { timestamps: true }
);


export default mongoose.model('Lead', leadSchema);
