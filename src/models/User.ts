import mongoose, { Schema, Document, Model } from 'mongoose';

export type RegistrationStatus = 'pending' | 'approved' | 'rejected';

export interface IUser extends Document {
  firebaseUid: string;
  personal: {
    name: string;
    profilePic?: string;
    phone: string;
    email?: string;
    groupId: string;
  };
  business: {
    name: string;
    category: string;
    phone?: string;
    email?: string;
    location?: string; // optional to allow saving right after OTP
  };
  status: RegistrationStatus;
  registeredAt: Date;
}

const PersonalSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    profilePic: { type: String },
    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
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
    location: { type: String, trim: true },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    firebaseUid: { type: String, required: true, index: true, unique: true },
    personal: { type: PersonalSchema, required: true },
    business: { type: BusinessSchema, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    registeredAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'users' }
);

UserSchema.index({ 'personal.email': 1 }, { partialFilterExpression: { 'personal.email': { $exists: true } } });
UserSchema.index({ 'personal.phone': 1 });

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
