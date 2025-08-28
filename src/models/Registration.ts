import mongoose, { Schema, Document, Model } from 'mongoose';

export type RegistrationStatus = 'pending' | 'approved' | 'rejected';

export interface IRegistration extends Document {
  firebaseUid: string;
  personal: {
    name: string;
    profilePic?: string;
    phone: string;
    email: string;
    groupId: string;
  };
  business: {
    name: string;
    category: string;
    phone?: string;
    email?: string;
    location: string;
  };
  status: RegistrationStatus;
  registeredAt: Date;
}

const PersonalSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    profilePic: { type: String },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    groupId: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const BusinessSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    phone: { type: String },
    email: { type: String, lowercase: true, trim: true },
    location: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const RegistrationSchema = new Schema<IRegistration>(
  {
    firebaseUid: { type: String, required: true, index: true, unique: true },
    personal: { type: PersonalSchema, required: true },
    business: { type: BusinessSchema, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    registeredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

RegistrationSchema.index({ 'personal.email': 1 }, { partialFilterExpression: { 'personal.email': { $exists: true } } });
RegistrationSchema.index({ 'personal.phone': 1 });

export const Registration: Model<IRegistration> =
  mongoose.models.Registration || mongoose.model<IRegistration>('Registration', RegistrationSchema);
