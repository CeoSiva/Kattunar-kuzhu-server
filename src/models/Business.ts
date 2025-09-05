import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBusiness extends Document {
  firebaseUid: string;
  name: string;
  category: string;
  phone?: string;
  email?: string;
  location?: string;
  userId?: mongoose.Types.ObjectId;
  logoUrl?: string;
  coverUrl?: string;
  description?: string;
  hours?: Array<{ day: string; open: string; close: string; closed?: boolean }>;
  socials?: {
    website?: string;
    whatsapp?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
    linkedin?: string;
  };
  gallery?: string[];
  products?: Array<{
    id?: string;
    title: string;
    description?: string;
    imageUri?: string;
  }>;
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
    logoUrl: { type: String, trim: true },
    coverUrl: { type: String, trim: true },
    description: { type: String, trim: true },
    hours: [
      {
        day: { type: String, required: true },
        open: { type: String },
        close: { type: String },
        closed: { type: Boolean, default: false },
      },
    ],
    socials: {
      website: { type: String, trim: true },
      whatsapp: { type: String, trim: true },
      facebook: { type: String, trim: true },
      instagram: { type: String, trim: true },
      youtube: { type: String, trim: true },
      linkedin: { type: String, trim: true },
    },
    gallery: [{ type: String, trim: true }],
    products: [
      new Schema(
        {
          id: { type: String, trim: true },
          title: { type: String, required: true, trim: true },
          description: { type: String, trim: true },
          imageUri: { type: String, trim: true },
        },
        { _id: false }
      ),
    ],
  },
  { timestamps: true, collection: 'businesses' }
);

BusinessSchema.index({ category: 1 });
BusinessSchema.index({ name: 1 });

export const Business: Model<IBusiness> =
  mongoose.models.Business || mongoose.model<IBusiness>('Business', BusinessSchema);
