import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBusiness extends Document {
  firebaseUid: string;
  name: string;
  category: string;
  phone?: string;
  email?: string;
  location?: string;
  userId?: mongoose.Types.ObjectId;
}

const BusinessSchema = new Schema<IBusiness>(
  {
    firebaseUid: { type: String, required: true, index: true, unique: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    location: { type: String, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'businesses' }
);

BusinessSchema.index({ category: 1 });

export const Business: Model<IBusiness> =
  mongoose.models.Business || mongoose.model<IBusiness>('Business', BusinessSchema);
