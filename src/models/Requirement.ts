import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRequirement extends Document {
  firebaseUid: string; // creator uid
  title: string;
  description?: string;
  category?: string;
  budget?: string;
  timeline?: Date; // expected date
  isPublic: boolean;
  taggedMemberUid?: string; // when not public
}

const RequirementSchema = new Schema<IRequirement>(
  {
    firebaseUid: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true },
    budget: { type: String, trim: true },
    timeline: { type: Date },
    isPublic: { type: Boolean, default: true },
    taggedMemberUid: { type: String, trim: true },
  },
  { timestamps: true, collection: 'requirements' }
);

RequirementSchema.index({ isPublic: 1, createdAt: -1 });

export const Requirement: Model<IRequirement> =
  mongoose.models.Requirement || mongoose.model<IRequirement>('Requirement', RequirementSchema);
