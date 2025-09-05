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

const UserSchema = new Schema<IUser>(
  {
    firebaseUid: { type: String, required: true, index: true, unique: true },
    personal: { type: PersonalSchema, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    registeredAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'users' }
);

UserSchema.index({ 'personal.email': 1 }, { partialFilterExpression: { 'personal.email': { $exists: true } } });
UserSchema.index({ 'personal.phone': 1 });
UserSchema.index({ 'personal.name': 1 });

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
